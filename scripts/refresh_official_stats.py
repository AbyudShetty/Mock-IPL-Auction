#!/usr/bin/env python3
import json
import re
import csv
from pathlib import Path
import requests

BASE = "https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/feeds/stats"
SEASONS = {
    "2026": "284",
    "2025": "203",
    "2024": "148",
}
OUT_DIR = Path(__file__).resolve().parents[1] / "public"
CSV_PATH = OUT_DIR / "cricket_data_2026.csv"

BOWLING_FEEDS = [
    "mostwickets",
    "besteconomyrates",
    "bestbowlingfigures",
    "bestaverages",
]


def get_ipl_competition_ids():
    data = parse_jsonp(
        requests.get(
            "https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/mc/competition.js",
            timeout=45,
        ).text
    )
    competitions = data.get("competition", [])
    ids = []
    for comp in competitions:
        if str(comp.get("DivisionName", "")).strip().lower() == "ipl":
            cid = str(comp.get("CompetitionID", "")).strip()
            if cid:
                ids.append(cid)
    return ids


def parse_jsonp(text):
    start = text.find("(")
    end = text.rfind(")")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Invalid JSONP payload")
    return json.loads(text[start + 1 : end])


def norm(name):
    value = (name or "").lower().replace("️", "")
    value = re.sub(r"[🌀-🫿☀-➿]", " ", value)
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def parse_num(value):
    try:
        text = str(value or "").strip()
        if not text or text == "-":
            return 0.0
        return float(text)
    except Exception:
        return 0.0


def parse_int(value):
    return int(parse_num(value))


def normalize_best_figures(entry):
    if entry.get("InningsWickets") is not None and entry.get("InningsRuns") is not None:
        w = parse_int(entry.get("InningsWickets"))
        r = parse_int(entry.get("InningsRuns"))
        if w > 0 or r > 0:
            return f"{w}/{r}"

    bb = str(entry.get("BBIW") or entry.get("BBM") or "").strip()
    if bb and bb != "-":
        if "/" in bb:
            parts = bb.split("/")
            if len(parts) >= 2:
                a, b = parse_int(parts[0]), parse_int(parts[1])
                if b <= 10 and a > b:
                    return f"{b}/{a}"
                return f"{a}/{b}"
        return bb

    wickets = parse_int(entry.get("InningsWickets") or entry.get("Wickets"))
    runs = parse_int(
        entry.get("InningsRuns") or entry.get("TotalRunsConceded") or entry.get("Runs")
    )
    if wickets > 0 or runs > 0:
        return f"{wickets}/{runs}"
    return "0/0"


def normalize_career_best_figures(value):
    text = str(value or "").strip()
    if not text or text in {"-", "0", "0/0"}:
        return None
    nums = re.findall(r"\d+", text)
    if len(nums) >= 2:
        a = int(nums[0])
        b = int(nums[1])
        if a > 10 and b <= 10:
            return f"{b}/{a}"
        return f"{a}/{b}"
    return None


def parse_highest_score(value):
    text = str(value or "").strip()
    if not text or text in {"-", "None", "null"}:
        return (0, "0")
    nums = re.findall(r"\d+", text)
    if not nums:
        return (0, "0")
    return (int(nums[0]), text)


def merge_historical_career_enrichment(snapshot):
    comp_ids = get_ipl_competition_ids()
    computed_best_bowl = {}
    computed_highest = {}

    for comp_id in comp_ids:
        try:
            best_bowling = fetch_feed(comp_id, "bestbowlingfigures")
            for entry in best_bowling:
                name = entry.get("BowlerName") or entry.get("PlayerName")
                if not name:
                    continue
                key = norm(name)
                best = normalize_best_figures(entry)
                w, r = [parse_int(x) for x in best.split("/")]
                current = computed_best_bowl.get(key)
                if (
                    not current
                    or w > current[0]
                    or (w == current[0] and r < current[1])
                ):
                    computed_best_bowl[key] = (w, r, best)
        except Exception:
            pass

        try:
            batting = fetch_feed(comp_id, "toprunsscorers")
            for entry in batting:
                name = entry.get("StrikerName") or entry.get("PlayerName")
                if not name:
                    continue
                key = norm(name)
                hs_num, hs_text = parse_highest_score(entry.get("HighestScore"))
                cur = computed_highest.get(key)
                if not cur or hs_num > cur[0]:
                    computed_highest[key] = (hs_num, hs_text)
        except Exception:
            pass

    for key, player in snapshot.get("players", {}).items():
        career = player.get("career") or {}
        batting = career.get("batting") or {}
        bowling = career.get("bowling") or {}

        if key in computed_highest:
            batting["highestComputed"] = computed_highest[key][1]

        if key in computed_best_bowl:
            bowling["bestBowlComputed"] = computed_best_bowl[key][2]

        career["batting"] = batting
        career["bowling"] = bowling
        player["career"] = career


def load_csv_best_bowling():
    best = {}
    if not CSV_PATH.exists():
        return best

    with CSV_PATH.open(encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            if len(row) < 25:
                continue
            key = norm(row[0])
            text = str(row[19] or "").strip()
            if not text or text.lower() == "no stats" or text in {"-", "0", "0/0"}:
                continue
            m = re.search(r"(\d+)\/(\d+)", text)
            if not m:
                continue
            w, r = int(m.group(1)), int(m.group(2))
            cand = f"{w}/{r}"
            cur = best.get(key)
            if not cur or w > cur[0] or (w == cur[0] and r < cur[1]):
                best[key] = (w, r, cand)
    return best


def merge_csv_career_best_bowling(snapshot):
    csv_best = load_csv_best_bowling()
    for key, player in snapshot.get("players", {}).items():
        career = player.get("career") or {}
        bowling = career.get("bowling") or {}
        if key in csv_best:
            bowling["bestBowlCsv"] = csv_best[key][2]
        career["bowling"] = bowling
        player["career"] = career


def choose_final_career_best(snapshot):
    def parse_best_pair(best):
        if not best:
            return None
        m = re.match(r"^(\d+)/(\d+)$", str(best).strip())
        if not m:
            return None
        return (int(m.group(1)), int(m.group(2)))

    for _key, player in snapshot.get("players", {}).items():
        career = player.get("career") or {}
        bowling = career.get("bowling") or {}
        official = normalize_career_best_figures(bowling.get("bestBowl"))
        computed = normalize_career_best_figures(bowling.get("bestBowlComputed"))
        csv_best = normalize_career_best_figures(bowling.get("bestBowlCsv"))

        final = None
        if official:
            final = official
        else:
            cp = parse_best_pair(computed)
            sp = parse_best_pair(csv_best)
            if cp and sp:
                final = (
                    computed
                    if (cp[0] > sp[0] or (cp[0] == sp[0] and cp[1] <= sp[1]))
                    else csv_best
                )
            elif cp:
                final = computed
            elif sp:
                final = csv_best

        bowling["bestBowlFinal"] = final

        try:
            wkts = parse_int(bowling.get("wickets"))
            if wkts == 0:
                min_runs = bowling.get("minRunsWhenZeroWkts")
                if min_runs not in {None, ""}:
                    bowling["bestBowlFinal"] = f"0/{parse_int(min_runs)}"
        except Exception:
            pass
        career["bowling"] = bowling
        player["career"] = career


def fetch_feed(comp_id, key):
    url = f"{BASE}/{comp_id}-{key}.js"
    return parse_jsonp(requests.get(url, timeout=45).text).get(key, [])


def season_snapshot(year, comp_id):
    batting_data = fetch_feed(comp_id, "toprunsscorers")

    snapshot = {
        "season": year,
        "competitionId": comp_id,
        "source": "official_iplt20",
        "players": {},
    }

    for entry in batting_data:
        name = entry.get("StrikerName") or entry.get("PlayerName")
        if not name:
            continue
        key = norm(name)
        player = snapshot["players"].setdefault(
            key, {"name": name, "batting": None, "bowling": None}
        )
        player["name"] = name
        if entry.get("PlayerId"):
            player["playerId"] = str(entry.get("PlayerId"))
        player["batting"] = {
            "innings": entry.get("Innings", "0"),
            "notOuts": entry.get("NotOuts", "0"),
            "runs": entry.get("TotalRuns", "0"),
            "ballsFaced": entry.get("Balls", "0"),
            "strikeRate": entry.get("StrikeRate", "0"),
            "average": entry.get("BattingAverage", "0"),
            "fours": entry.get("Fours", "0"),
            "sixes": entry.get("Sixes", "0"),
            "highest": entry.get("HighestScore") or "0",
            "fifties": entry.get("FiftyPlusRuns", "0"),
            "hundreds": entry.get("Centuries", "0"),
            "catches": entry.get("Catches", "0"),
            "stumpings": entry.get("Stumpings", "0"),
        }
        if entry.get("PlayerDOB"):
            player["playerDob"] = entry.get("PlayerDOB")

    for feed in BOWLING_FEEDS:
        bowling_data = fetch_feed(comp_id, feed)
        for entry in bowling_data:
            name = entry.get("BowlerName") or entry.get("PlayerName")
            if not name:
                continue

            key = norm(name)
            player = snapshot["players"].setdefault(
                key, {"name": name, "batting": None, "bowling": None}
            )
            player["name"] = name
            if entry.get("PlayerId") and not player.get("playerId"):
                player["playerId"] = str(entry.get("PlayerId"))
            if not player.get("bowling"):
                player["bowling"] = {
                    "matches": "0",
                    "innings": "0",
                    "wickets": "0",
                    "runsConceded": "0",
                    "ballsBowled": "0",
                    "economy": "0",
                    "average": "0",
                    "fourW": "0",
                    "fiveW": "0",
                    "bestBowl": None,
                    "minRunsWhenZeroWkts": None,
                }

            bowling = player["bowling"]
            matches = parse_int(entry.get("Matches"))
            innings = parse_int(entry.get("Innings"))
            wickets = parse_int(entry.get("Wickets"))
            runs = parse_int(entry.get("TotalRunsConceded") or entry.get("InningsRuns"))
            balls = parse_int(entry.get("LegalBallsBowled"))
            economy = parse_num(entry.get("EconomyRate"))
            average = parse_num(entry.get("BowlingAverage"))
            fourw = parse_int(entry.get("FourWickets"))
            fivew = parse_int(entry.get("FiveWickets"))

            bowling["matches"] = str(max(parse_int(bowling.get("matches")), matches))
            bowling["innings"] = str(max(parse_int(bowling.get("innings")), innings))
            bowling["wickets"] = str(max(parse_int(bowling.get("wickets")), wickets))
            bowling["runsConceded"] = str(
                max(parse_int(bowling.get("runsConceded")), runs)
            )
            bowling["ballsBowled"] = str(
                max(parse_int(bowling.get("ballsBowled")), balls)
            )
            if economy > 0:
                bowling["economy"] = str(economy)
            if average > 0 or wickets == 0:
                bowling["average"] = str(average)
            bowling["fourW"] = str(max(parse_int(bowling.get("fourW")), fourw))
            bowling["fiveW"] = str(max(parse_int(bowling.get("fiveW")), fivew))

            if wickets == 0 and runs > 0:
                current_min = (
                    parse_int(bowling.get("minRunsWhenZeroWkts"))
                    if bowling.get("minRunsWhenZeroWkts") not in {None, ""}
                    else None
                )
                if current_min is None or runs < current_min:
                    bowling["minRunsWhenZeroWkts"] = str(runs)

            candidate_best = normalize_best_figures(entry)
            current_best = (
                normalize_best_figures({"BBIW": bowling.get("bestBowl")})
                if bowling.get("bestBowl")
                else "0/9999"
            )
            cw, cr = [parse_int(x) for x in current_best.split("/")]
            nw, nr = [parse_int(x) for x in candidate_best.split("/")]
            if nw > cw or (nw == cw and nr < cr):
                bowling["bestBowl"] = candidate_best

            if parse_int(bowling.get("wickets")) == 0:
                min_runs = bowling.get("minRunsWhenZeroWkts")
                if min_runs not in {None, ""}:
                    bowling["bestBowl"] = f"0/{parse_int(min_runs)}"

            if entry.get("PlayerDOB") and not player.get("playerDob"):
                player["playerDob"] = entry.get("PlayerDOB")

    return snapshot


def career_snapshot():
    url = f"{BASE}/player/allPlayerCarrierStats.js"
    data = parse_jsonp(requests.get(url, timeout=60).text)
    batting_data = data.get("Batting", [])
    bowling_data = data.get("Bowling", [])

    snapshot = {"season": "career", "source": "official_iplt20", "players": {}}

    for entry in batting_data:
        name = entry.get("PlayerName")
        if not name:
            continue
        key = norm(name)
        player = snapshot["players"].setdefault(
            key, {"name": name, "career": {"batting": None, "bowling": None}}
        )
        player["name"] = name
        if entry.get("PlayerId"):
            player["playerId"] = str(entry.get("PlayerId"))
        player["career"]["batting"] = {
            "innings": entry.get("Innings", "0"),
            "notOuts": entry.get("NotOuts", "0"),
            "runs": entry.get("Runs", "0"),
            "ballsFaced": entry.get("Balls", "0"),
            "fours": entry.get("Fours", "0"),
            "sixes": entry.get("Sixes", "0"),
            "fifties": entry.get("Fifties", "0"),
            "hundreds": entry.get("Hundreds", "0"),
            "catches": entry.get("Catches", "0"),
            "stumpings": entry.get("Stumpings", "0"),
            "highest": entry.get("HighestScore") or "0",
        }

    for entry in bowling_data:
        name = entry.get("PlayerName")
        if not name:
            continue
        key = norm(name)
        player = snapshot["players"].setdefault(
            key, {"name": name, "career": {"batting": None, "bowling": None}}
        )
        player["name"] = name
        if entry.get("PlayerId") and not player.get("playerId"):
            player["playerId"] = str(entry.get("PlayerId"))
        player["career"]["bowling"] = {
            "innings": entry.get("Innings", "0"),
            "wickets": entry.get("Wickets", "0"),
            "runsConceded": entry.get("Runs", "0"),
            "ballsBowled": entry.get("Balls", "0"),
            "economy": entry.get("Econ", "0"),
            "average": entry.get("Average", "0"),
            "fourW": entry.get("FourWkts", "0"),
            "fiveW": entry.get("FiveWkts", "0"),
            "bestBowl": normalize_career_best_figures(entry.get("BBM")),
        }

    return snapshot


def write_snapshot(path, payload):
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"Updated {path.name} ({len(payload.get('players', {}))} players)")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for year, comp_id in SEASONS.items():
        payload = season_snapshot(year, comp_id)
        write_snapshot(OUT_DIR / f"official_ipl_{year}_stats.json", payload)

    career = career_snapshot()
    merge_historical_career_enrichment(career)
    merge_csv_career_best_bowling(career)
    choose_final_career_best(career)
    write_snapshot(OUT_DIR / "official_ipl_career_stats.json", career)
    print("All official IPL snapshots refreshed successfully.")


if __name__ == "__main__":
    main()
