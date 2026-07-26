import { S } from './state.js';
import {
  IPL_2026_COMPETITION_ID, IPL_STATS_BASE, OFFICIAL_2026_LOCAL_FILE,
  OFFICIAL_2025_LOCAL_FILE, OFFICIAL_2024_LOCAL_FILE, OFFICIAL_CAREER_LOCAL_FILE,
  IPL_2026_FEEDS, STATS_SEASONS, PLAYER_PLACEHOLDER_IMAGE, playerNameAliases
} from './config.js';
import {
  parseStatNumber, noStatValue, naValue, parseBestBowling,
  normalizeCareerBestBowling, formatStatValue, isNoStatYearData, hasAnyYearStats,
  sanitizeDisplayPlayerName, normalizePlayerName, toDisplayNameFromNormalized,
  getNormalizedNameCandidates, tagToCategory,
  setPlayerImageWithContext, calculateAge, isValidDob
} from './utils.js';

export function resolvePlayerContext(name) {
  const candidates = getNormalizedNameCandidates(name);

  for (const key of candidates) {
    if (S.playerStatsDB[key]) {
      const meta = S.playerMetaDB[key] || {};
      const officialName = sanitizeDisplayPlayerName(meta.officialName || toDisplayNameFromNormalized(key) || name);
      return { key, data: S.playerStatsDB[key], officialName, dob: meta.dob || null, playerId: meta.playerId || null };
    }
  }

  const compact = normalizePlayerName(name).replace(/\s+/g, '');
  for (const [key, value] of Object.entries(S.playerStatsDB)) {
    if (key.replace(/\s+/g, '') === compact) {
      const meta = S.playerMetaDB[key] || {};
      const officialName = sanitizeDisplayPlayerName(meta.officialName || toDisplayNameFromNormalized(key) || name);
      return { key, data: value, officialName, dob: meta.dob || null, playerId: meta.playerId || null };
    }
  }

  return null;
}

export function getPlayerStatsByName(name) {
  const resolved = resolvePlayerContext(name);
  return resolved ? resolved.data : null;
}

export function buildBattingRowFromYear(playerData, year) {
  const yearData = playerData.years[year];
  if (!yearData || isNoStatYearData(yearData)) return { noStatsForYear: true };
  return {
    innings: yearData.batting.innings, runs: yearData.batting.runs,
    strikeRate: formatStatValue(yearData.batting.strikeRate, 2),
    average: formatStatValue(yearData.batting.average, 2),
    fours: yearData.batting.fours, sixes: yearData.batting.sixes,
    highest: yearData.batting.highest, fifties: yearData.batting.fifties,
    hundreds: yearData.batting.hundreds, catches: yearData.batting.catches,
    stumpings: yearData.batting.stumpings
  };
}

export function createEmptyPlayerData() {
  return {
    career: {
      batting: { innings: 0, notOuts: 0, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, catches: 0, stumpings: 0, highest: '0', highestComputed: '', highestScoreNumeric: 0 },
      bowling: { innings: 0, ballsBowled: 0, runsConceded: 0, wickets: 0, fourW: 0, fiveW: 0, bestBowl: '0/0', bestBowlComputed: '', bestBowlCsv: '', bestBowlFinal: '', bestBowlParsed: { wickets: 0, runs: Number.MAX_SAFE_INTEGER, raw: '0/0' } }
    },
    years: {}
  };
}

export function ensurePlayerRecord(name) {
  const normalized = normalizePlayerName(name);
  if (!S.playerStatsDB[normalized]) S.playerStatsDB[normalized] = createEmptyPlayerData();
  return S.playerStatsDB[normalized];
}

export function recomputeCareerStats(playerData) {
  const career = createEmptyPlayerData().career;
  Object.values(playerData.years).forEach(yearData => {
    if (!yearData) return;
    const bat = yearData.batting || {};
    const bowl = yearData.bowling || {};
    career.batting.innings += parseStatNumber(bat.innings);
    career.batting.notOuts += parseStatNumber(bat.notOuts);
    career.batting.runs += parseStatNumber(bat.runs);
    career.batting.ballsFaced += parseStatNumber(bat.ballsFaced);
    career.batting.fours += parseStatNumber(bat.fours);
    career.batting.sixes += parseStatNumber(bat.sixes);
    career.batting.fifties += parseStatNumber(bat.fifties);
    career.batting.hundreds += parseStatNumber(bat.hundreds);
    career.batting.catches += parseStatNumber(bat.catches);
    career.batting.stumpings += parseStatNumber(bat.stumpings);
    const highest = String(bat.highest || '0');
    const highestNum = parseInt(highest.replace('*', ''), 10) || 0;
    if (highestNum > career.batting.highestScoreNumeric) { career.batting.highestScoreNumeric = highestNum; career.batting.highest = highest; }
    career.bowling.innings += parseStatNumber(bowl.innings);
    career.bowling.ballsBowled += parseStatNumber(bowl.ballsBowled);
    career.bowling.runsConceded += parseStatNumber(bowl.runsConceded);
    career.bowling.wickets += parseStatNumber(bowl.wickets);
    career.bowling.fourW += parseStatNumber(bowl.fourW);
    career.bowling.fiveW += parseStatNumber(bowl.fiveW);
    const best = parseBestBowling(bowl.bestBowl || '0/0');
    if (best.wickets > career.bowling.bestBowlParsed.wickets || (best.wickets === career.bowling.bestBowlParsed.wickets && best.runs < career.bowling.bestBowlParsed.runs)) {
      career.bowling.bestBowlParsed = best;
      career.bowling.bestBowl = best.raw;
    }
  });
  playerData.career = career;
}

export function buildBowlingRowFromYear(playerData, year) {
  const yearData = playerData.years[year];
  if (!yearData || isNoStatYearData(yearData)) return { noStatsForYear: true };
  return {
    innings: yearData.bowling.innings, wickets: yearData.bowling.wickets,
    runsConceded: yearData.bowling.runsConceded, ballsBowled: yearData.bowling.ballsBowled,
    economy: formatStatValue(yearData.bowling.economy, 2),
    average: formatStatValue(yearData.bowling.average, 2),
    fourW: yearData.bowling.fourW, fiveW: yearData.bowling.fiveW,
    bestBowl: yearData.bowling.bestBowl || noStatValue()
  };
}

export function buildCareerBattingRow(playerData) {
  const c = playerData.career.batting;
  const dismissals = Math.max(c.innings - c.notOuts, 0);
  const average = dismissals > 0 ? c.runs / dismissals : 0;
  const strikeRate = c.ballsFaced > 0 ? (c.runs / c.ballsFaced) * 100 : 0;
  const resolvedHighest = c.highest && String(c.highest) !== '0' ? c.highest : (c.highestComputed || naValue());
  return {
    innings: c.innings, runs: c.runs, strikeRate: formatStatValue(strikeRate, 2),
    average: formatStatValue(average, 2), fours: c.fours, sixes: c.sixes,
    highest: resolvedHighest, fifties: c.fifties, hundreds: c.hundreds,
    catches: c.catches, stumpings: c.stumpings
  };
}

export function buildCareerBowlingRow(playerData) {
  const c = playerData.career.bowling;
  const economy = c.ballsBowled > 0 ? c.runsConceded / (c.ballsBowled / 6) : 0;
  const average = c.wickets > 0 ? c.runsConceded / c.wickets : 0;
  const hasBowlingRecord = c.innings > 0 || c.wickets > 0 || c.ballsBowled > 0;
  const officialBest = normalizeCareerBestBowling(c.bestBowlFinal || c.bestBowl, c.wickets, c.runsConceded);
  const bestFigure = hasBowlingRecord
    ? (officialBest && officialBest !== noStatValue() && officialBest !== 'NA' ? officialBest : (normalizeCareerBestBowling(c.bestBowlComputed, c.wickets, c.runsConceded) || normalizeCareerBestBowling(c.bestBowlCsv, c.wickets, c.runsConceded) || 'NA'))
    : noStatValue();
  return {
    innings: c.innings, wickets: c.wickets, runsConceded: c.runsConceded,
    ballsBowled: c.ballsBowled, economy: formatStatValue(economy, 2),
    average: formatStatValue(average, 2), fourW: c.fourW, fiveW: c.fiveW, bestBowl: bestFigure
  };
}

export function createStatsSection(sectionTitle, columns, rows) {
  let html = `<div class="stats-section"><h4>${sectionTitle}</h4><div class="stats-table-container"><table class="stats-table expanded"><thead><tr><th>Season</th>`;
  columns.forEach(col => { html += `<th>${col.label}</th>`; });
  html += '</tr></thead><tbody>';
  rows.forEach(row => {
    const seasonClass = row.season === 'Career' ? 'career-label' : 'year-label';
    html += `<tr><td class="${seasonClass}">${row.season}</td>`;
    if (row.data && row.data.noStatsForYear) {
      html += `<td class="no-stats-cell" colspan="${columns.length}">No stats available for year ${row.season}</td></tr>`;
      return;
    }
    columns.forEach(col => { html += `<td>${formatStatValue(row.data[col.key])}</td>`; });
    html += '</tr>';
  });
  html += '</tbody></table></div></div>';
  return html;
}

export function buildEmptySeasonRecord() {
  return {
    batting: { innings: 0, notOuts: 0, runs: 0, ballsFaced: 0, strikeRate: 0, average: 0, fours: 0, sixes: 0, highest: '0', fifties: 0, hundreds: 0, catches: 0, stumpings: 0 },
    bowling: { innings: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, economy: 0, average: 0, fourW: 0, fiveW: 0, bestBowl: '0/0' }
  };
}

function ensureSeasonMeta(record, year) {
  record.seasonMeta = record.seasonMeta || {};
  record.seasonMeta[year] = record.seasonMeta[year] || { matches: 0, hasStats: false };
  return record.seasonMeta[year];
}

function mergeBowlingFromEntry(targetBowling, entry) {
  const innings = parseStatNumber(entry.Innings);
  const wickets = parseStatNumber(entry.Wickets);
  const runsConceded = parseStatNumber(entry.TotalRunsConceded || entry.InningsRuns);
  const legalBalls = parseStatNumber(entry.LegalBallsBowled);
  const overs = parseStatNumber(entry.OversBowled);
  const ballsBowled = legalBalls > 0 ? legalBalls : Math.round(overs * 6);
  const economy = parseStatNumber(entry.EconomyRate);
  const average = parseStatNumber(entry.BowlingAverage);
  const fourW = parseStatNumber(entry.FourWickets);
  const fiveW = parseStatNumber(entry.FiveWickets);
  if (innings > targetBowling.innings) targetBowling.innings = innings;
  if (wickets > targetBowling.wickets) targetBowling.wickets = wickets;
  if (runsConceded > targetBowling.runsConceded) targetBowling.runsConceded = runsConceded;
  if (ballsBowled > targetBowling.ballsBowled) targetBowling.ballsBowled = ballsBowled;
  if (economy > 0) targetBowling.economy = economy;
  if (average > 0 || wickets === 0) targetBowling.average = average;
  if (fourW > targetBowling.fourW) targetBowling.fourW = fourW;
  if (fiveW > targetBowling.fiveW) targetBowling.fiveW = fiveW;
  const rawBest = entry.BBIW || entry.BBM || targetBowling.bestBowl;
  if (rawBest && rawBest !== '-' && rawBest !== '0' && rawBest !== '0/0') {
    let normalizedBest = String(rawBest);
    if (!normalizedBest.includes('/')) {
      const w = parseStatNumber(entry.InningsWickets);
      const r = parseStatNumber(entry.InningsRuns || entry.TotalRunsConceded);
      if (w >= 0 && r >= 0) normalizedBest = `${w}/${r}`;
    }
    const candidate = parseBestBowling(normalizedBest);
    const current = parseBestBowling(targetBowling.bestBowl || '0/0');
    if (candidate.wickets > current.wickets || (candidate.wickets === current.wickets && candidate.runs < current.runs)) {
      targetBowling.bestBowl = candidate.raw;
    }
  }
}

async function fetchOfficialFeedList(compId, key) {
  const url = `${IPL_STATS_BASE}/${compId}-${key}.js`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const text = await res.text();
  const data = parseJsonpPayload(text);
  return data && data[key] ? data[key] : [];
}

async function patchSeasonBowlingFromOfficialFeeds(year, compId) {
  try {
    const [economyRows, figuresRows, averagesRows] = await Promise.all([
      fetchOfficialFeedList(compId, 'besteconomyrates'),
      fetchOfficialFeedList(compId, 'bestbowlingfigures'),
      fetchOfficialFeedList(compId, 'bestaverages')
    ]);
    const enrichRows = [...economyRows, ...figuresRows, ...averagesRows];
    enrichRows.forEach(row => {
      const bowlerName = row.BowlerName || row.PlayerName;
      if (!bowlerName) return;
      const record = ensurePlayerRecord(bowlerName);
      if (!record.years[year]) record.years[year] = buildEmptySeasonRecord();
      mergeBowlingFromEntry(record.years[year].bowling, row);
      const seasonMeta = ensureSeasonMeta(record, year);
      const matches = parseStatNumber(row.Matches);
      if (matches > seasonMeta.matches) seasonMeta.matches = matches;
      seasonMeta.hasStats = hasAnyYearStats(record.years[year]) || seasonMeta.matches > 0;
      const normalizedName = normalizePlayerName(bowlerName);
      S.playerMetaDB[normalizedName] = S.playerMetaDB[normalizedName] || {};
      S.playerMetaDB[normalizedName].officialName = bowlerName;
      if (row.PlayerId) S.playerMetaDB[normalizedName].playerId = String(row.PlayerId);
    });
  } catch (error) {
    console.warn(`⚠️ Could not patch bowling feeds for ${year}.`, error);
  }
}

function parseJsonpPayload(text) {
  const start = text.indexOf('(');
  const end = text.lastIndexOf(')');
  if (start === -1 || end === -1 || end <= start) return null;
  const payload = text.slice(start + 1, end);
  try { return JSON.parse(payload); } catch (error) { return null; }
}

async function loadOfficialSeasonSnapshot(fileName) {
  const res = await fetch(fileName);
  if (!res.ok) return null;
  return res.json();
}

function applySeasonSnapshot(year, snapshot) {
  if (!snapshot || !snapshot.players) return;
  Object.values(snapshot.players).forEach(player => {
    if (!player || !player.name) return;
    const normalizedName = normalizePlayerName(player.name);
    const record = ensurePlayerRecord(player.name);
    S.playerMetaDB[normalizedName] = S.playerMetaDB[normalizedName] || {};
    S.playerMetaDB[normalizedName].officialName = player.name;
    if (player.playerId) S.playerMetaDB[normalizedName].playerId = String(player.playerId);
    const dobValue = player.dob || player.playerDob || player.playerDOB || null;
    if (isValidDob(dobValue)) S.playerMetaDB[normalizedName].dob = String(dobValue);
    if (!record.years[year]) record.years[year] = buildEmptySeasonRecord();
    const seasonMeta = ensureSeasonMeta(record, year);
    if (player.batting) {
      record.years[year].batting = { innings: parseStatNumber(player.batting.innings), notOuts: parseStatNumber(player.batting.notOuts), runs: parseStatNumber(player.batting.runs), ballsFaced: parseStatNumber(player.batting.ballsFaced), strikeRate: parseStatNumber(player.batting.strikeRate), average: parseStatNumber(player.batting.average), fours: parseStatNumber(player.batting.fours), sixes: parseStatNumber(player.batting.sixes), highest: String(player.batting.highest || '0'), fifties: parseStatNumber(player.batting.fifties), hundreds: parseStatNumber(player.batting.hundreds), catches: parseStatNumber(player.batting.catches), stumpings: parseStatNumber(player.batting.stumpings) };
      if (parseStatNumber(record.years[year].batting.innings) > seasonMeta.matches) seasonMeta.matches = parseStatNumber(record.years[year].batting.innings);
    }
    if (player.bowling) {
      record.years[year].bowling = { innings: parseStatNumber(player.bowling.innings), wickets: parseStatNumber(player.bowling.wickets), runsConceded: parseStatNumber(player.bowling.runsConceded), ballsBowled: parseStatNumber(player.bowling.ballsBowled), economy: parseStatNumber(player.bowling.economy), average: parseStatNumber(player.bowling.average), fourW: parseStatNumber(player.bowling.fourW), fiveW: parseStatNumber(player.bowling.fiveW), bestBowl: String(player.bowling.bestBowl || '0/0') };
      if (parseStatNumber(record.years[year].bowling.innings) > seasonMeta.matches) seasonMeta.matches = parseStatNumber(record.years[year].bowling.innings);
    }
    seasonMeta.hasStats = hasAnyYearStats(record.years[year]) || seasonMeta.matches > 0;
    const normalizedFromOfficial = normalizePlayerName(player.name);
    for (const [aliasFrom, aliasTo] of Object.entries(playerNameAliases)) {
      if (aliasTo === normalizedFromOfficial) {
        if (!S.playerStatsDB[aliasFrom]) S.playerStatsDB[aliasFrom] = record;
        S.playerMetaDB[aliasFrom] = S.playerMetaDB[normalizedName];
      }
    }
  });
}

function applyCareerSnapshot(snapshot) {
  if (!snapshot || !snapshot.players) return;
  Object.values(snapshot.players).forEach(player => {
    if (!player || !player.name || !player.career) return;
    const battingCareer = player.career.batting || {};
    const bowlingCareer = player.career.bowling || {};
    const normalizedName = normalizePlayerName(player.name);
    const record = ensurePlayerRecord(player.name);
    S.playerMetaDB[normalizedName] = S.playerMetaDB[normalizedName] || {};
    S.playerMetaDB[normalizedName].officialName = player.name;
    if (player.playerId) S.playerMetaDB[normalizedName].playerId = String(player.playerId);
    const dobValue = player.dob || player.playerDob || player.playerDOB || null;
    if (isValidDob(dobValue)) S.playerMetaDB[normalizedName].dob = String(dobValue);
    const normalizedBest = normalizeCareerBestBowling(bowlingCareer.bestBowl, bowlingCareer.wickets, bowlingCareer.runsConceded);
    const normalizedBestComputed = normalizeCareerBestBowling(bowlingCareer.bestBowlComputed, bowlingCareer.wickets, bowlingCareer.runsConceded);
    const normalizedBestCsv = normalizeCareerBestBowling(bowlingCareer.bestBowlCsv, bowlingCareer.wickets, bowlingCareer.runsConceded);
    const normalizedBestFinal = normalizeCareerBestBowling(bowlingCareer.bestBowlFinal, bowlingCareer.wickets, bowlingCareer.runsConceded);
    record.career = {
      batting: { innings: parseStatNumber(battingCareer.innings), notOuts: parseStatNumber(battingCareer.notOuts), runs: parseStatNumber(battingCareer.runs), ballsFaced: parseStatNumber(battingCareer.ballsFaced), fours: parseStatNumber(battingCareer.fours), sixes: parseStatNumber(battingCareer.sixes), fifties: parseStatNumber(battingCareer.fifties), hundreds: parseStatNumber(battingCareer.hundreds), catches: parseStatNumber(battingCareer.catches), stumpings: parseStatNumber(battingCareer.stumpings), highest: String(battingCareer.highest || '0'), highestComputed: String(battingCareer.highestComputed || ''), highestScoreNumeric: parseInt(String(battingCareer.highest || '0').replace('*', ''), 10) || 0 },
      bowling: { innings: parseStatNumber(bowlingCareer.innings), ballsBowled: parseStatNumber(bowlingCareer.ballsBowled), runsConceded: parseStatNumber(bowlingCareer.runsConceded), wickets: parseStatNumber(bowlingCareer.wickets), fourW: parseStatNumber(bowlingCareer.fourW), fiveW: parseStatNumber(bowlingCareer.fiveW), bestBowl: normalizedBest, bestBowlComputed: String(bowlingCareer.bestBowlComputed || ''), bestBowlCsv: String(bowlingCareer.bestBowlCsv || ''), bestBowlFinal: normalizedBestFinal, bestBowlParsed: parseBestBowling(normalizedBest) }
    };
  });
}

function applyOfficial2026BattingStats(entry) {
  const name = entry.StrikerName || entry.PlayerName;
  if (!name) return;
  const playerRecord = ensurePlayerRecord(name);
  playerRecord.years['2026'] = playerRecord.years['2026'] || buildEmptySeasonRecord();
  playerRecord.years['2026'].batting = {
    innings: parseStatNumber(entry.Innings), notOuts: parseStatNumber(entry.NotOuts),
    runs: parseStatNumber(entry.TotalRuns), ballsFaced: parseStatNumber(entry.Balls),
    strikeRate: parseStatNumber(entry.StrikeRate), average: parseStatNumber(entry.BattingAverage),
    fours: parseStatNumber(entry.Fours), sixes: parseStatNumber(entry.Sixes),
    highest: String(entry.HighestScore || '0'), fifties: parseStatNumber(entry.FiftyPlusRuns),
    hundreds: parseStatNumber(entry.Centuries), catches: parseStatNumber(entry.Catches),
    stumpings: parseStatNumber(entry.Stumpings)
  };
}

function applyOfficial2026BowlingStats(entry) {
  const name = entry.BowlerName || entry.PlayerName;
  if (!name) return;
  const playerRecord = ensurePlayerRecord(name);
  playerRecord.years['2026'] = playerRecord.years['2026'] || buildEmptySeasonRecord();
  const legalBalls = parseStatNumber(entry.LegalBallsBowled);
  const overs = parseStatNumber(entry.OversBowled);
  const computedBalls = legalBalls > 0 ? legalBalls : Math.round(overs * 6);
  const bestFigure = `${parseStatNumber(entry.BBIW)}/${parseStatNumber(entry.BBMW)}`;
  playerRecord.years['2026'].bowling = {
    innings: parseStatNumber(entry.Innings), wickets: parseStatNumber(entry.Wickets),
    runsConceded: parseStatNumber(entry.TotalRunsConceded), ballsBowled: computedBalls,
    economy: parseStatNumber(entry.EconomyRate), average: parseStatNumber(entry.BowlingAverage),
    fourW: parseStatNumber(entry.FourWickets), fiveW: parseStatNumber(entry.FiveWickets),
    bestBowl: bestFigure
  };
}

async function loadOfficial2026Stats() {
  try {
    let mergedFromLocal = false;
    const localRes = await fetch(OFFICIAL_2026_LOCAL_FILE);
    if (localRes.ok) {
      const localData = await localRes.json();
      const players = localData && localData.players ? Object.values(localData.players) : [];
      players.forEach(player => {
        if (player.batting) {
          applyOfficial2026BattingStats({
            StrikerName: player.name, Innings: player.batting.innings, NotOuts: player.batting.notOuts,
            TotalRuns: player.batting.runs, Balls: player.batting.ballsFaced, StrikeRate: player.batting.strikeRate,
            BattingAverage: player.batting.average, Fours: player.batting.fours, Sixes: player.batting.sixes,
            HighestScore: player.batting.highest, FiftyPlusRuns: player.batting.fifties,
            Centuries: player.batting.hundreds, Catches: player.batting.catches, Stumpings: player.batting.stumpings
          });
        }
        if (player.bowling) {
          const best = String(player.bowling.bestBowl || '0/0').split('/');
          applyOfficial2026BowlingStats({
            BowlerName: player.name, Innings: player.bowling.innings, Wickets: player.bowling.wickets,
            TotalRunsConceded: player.bowling.runsConceded, LegalBallsBowled: player.bowling.ballsBowled,
            EconomyRate: player.bowling.economy, BowlingAverage: player.bowling.average,
            FourWickets: player.bowling.fourW, FiveWickets: player.bowling.fiveW,
            BBIW: best[0] || '0', BBMW: best[1] || '0'
          });
        }
      });
      mergedFromLocal = true;
    }
    if (!mergedFromLocal) {
      const [batRes, bowlRes] = await Promise.all([fetch(IPL_2026_FEEDS.batting), fetch(IPL_2026_FEEDS.bowling)]);
      if (!batRes.ok || !bowlRes.ok) throw new Error('Official 2026 stats feeds unavailable');
      const [batText, bowlText] = await Promise.all([batRes.text(), bowlRes.text()]);
      const batData = parseJsonpPayload(batText);
      const bowlData = parseJsonpPayload(bowlText);
      const battingList = (batData && batData.toprunsscorers) ? batData.toprunsscorers : [];
      const bowlingList = (bowlData && bowlData.mostwickets) ? bowlData.mostwickets : [];
      battingList.forEach(applyOfficial2026BattingStats);
      bowlingList.forEach(applyOfficial2026BowlingStats);
    }
    Object.values(S.playerStatsDB).forEach(recomputeCareerStats);
    console.log('✅ Official IPL 2026 stats merged successfully!');
  } catch (error) {
    console.warn('⚠️ Could not load official IPL 2026 feeds.', error);
  }
}

export async function loadOfficialStatsBundle() {
  const [season2026, season2025, season2024, careerSnapshot] = await Promise.all([
    loadOfficialSeasonSnapshot(OFFICIAL_2026_LOCAL_FILE),
    loadOfficialSeasonSnapshot(OFFICIAL_2025_LOCAL_FILE),
    loadOfficialSeasonSnapshot(OFFICIAL_2024_LOCAL_FILE),
    loadOfficialSeasonSnapshot(OFFICIAL_CAREER_LOCAL_FILE)
  ]);
  if (season2026) applySeasonSnapshot('2026', season2026);
  else await loadOfficial2026Stats();
  if (season2025) applySeasonSnapshot('2025', season2025);
  if (season2024) applySeasonSnapshot('2024', season2024);
  await Promise.all([
    patchSeasonBowlingFromOfficialFeeds('2026', '284'),
    patchSeasonBowlingFromOfficialFeeds('2025', '203'),
    patchSeasonBowlingFromOfficialFeeds('2024', '148')
  ]);
  if (careerSnapshot) applyCareerSnapshot(careerSnapshot);
  else Object.values(S.playerStatsDB).forEach(recomputeCareerStats);
}

export async function loadPlayerStats() {
  try {
    await loadOfficialStatsBundle();
    console.log("✅ Official Stats Engine Loaded Successfully!");
  } catch (error) {
    console.warn("⚠️ Could not load official stats snapshots.", error);
  }
}

export function renderStatsModal(playerName, tag) {
  const cleanName = sanitizeDisplayPlayerName(playerName);
  const resolved = resolvePlayerContext(cleanName);
  const statsNameEl = document.getElementById('stats-name');
  const statsRoleBadge = document.getElementById('stats-role-badge');
  const statsImg = document.getElementById('stats-player-img');
  const statsAgeEl = document.getElementById('stats-age');
  const metricsContainer = document.getElementById('stats-metrics-container');
  const playerData = resolved ? resolved.data : null;
  const resolvedName = resolved ? resolved.officialName : cleanName;

  if (statsNameEl) statsNameEl.textContent = resolvedName || cleanName || playerName;
  if (statsRoleBadge) statsRoleBadge.textContent = tagToCategory(tag);

  const ageValue = resolved && resolved.dob ? calculateAge(resolved.dob) : null;
  if (statsAgeEl) {
    if (ageValue !== null) { statsAgeEl.textContent = `Age: ${ageValue}`; statsAgeEl.style.display = 'block'; }
    else { statsAgeEl.style.display = 'none'; statsAgeEl.textContent = ''; }
  }

  setPlayerImageWithContext(statsImg, [resolvedName, cleanName, playerName], resolved);

  if (!metricsContainer) return;
  if (!playerData) {
    metricsContainer.innerHTML = '<div class="stats-section"><h4>Stats</h4><p style="margin:0;color:#a0a0c0;">No official stats available for this player yet.</p></div>';
    return;
  }

  const battingColumns = [
    { key: 'innings', label: 'Innings' }, { key: 'runs', label: 'Runs' }, { key: 'strikeRate', label: 'SR' },
    { key: 'average', label: 'Avg' }, { key: 'fours', label: '4s' }, { key: 'sixes', label: '6s' },
    { key: 'highest', label: 'HS' }, { key: 'fifties', label: '50s' }, { key: 'hundreds', label: '100s' }
  ];
  const wicketKeeperExtraColumns = [{ key: 'catches', label: 'Catches' }, { key: 'stumpings', label: 'Stumpings' }];
  const bowlingColumns = [
    { key: 'innings', label: 'Innings' }, { key: 'wickets', label: 'Wkts' }, { key: 'runsConceded', label: 'Runs Given' },
    { key: 'ballsBowled', label: 'Balls' }, { key: 'economy', label: 'Econ' }, { key: 'average', label: 'Bowl Avg' },
    { key: 'fourW', label: '4W' }, { key: 'fiveW', label: '5W' }, { key: 'bestBowl', label: 'Best Figures' }
  ];

  const battingRows = STATS_SEASONS.map(season => ({ season, data: buildBattingRowFromYear(playerData, season) }));
  battingRows.push({ season: 'Career', data: buildCareerBattingRow(playerData) });
  const bowlingRows = STATS_SEASONS.map(season => ({ season, data: buildBowlingRowFromYear(playerData, season) }));
  bowlingRows.push({ season: 'Career', data: buildCareerBowlingRow(playerData) });

  let statsHtml = '';
  if (tag === 'fb' || tag === 's') statsHtml = createStatsSection('Bowling', bowlingColumns, bowlingRows);
  else if (tag === 'wk') statsHtml = createStatsSection('Batting + Keeping', [...battingColumns, ...wicketKeeperExtraColumns], battingRows);
  else if (tag === 'ar') { statsHtml = createStatsSection('Batting', battingColumns, battingRows); statsHtml += createStatsSection('Bowling', bowlingColumns, bowlingRows); }
  else statsHtml = createStatsSection('Batting', battingColumns, battingRows);

  metricsContainer.innerHTML = statsHtml;
}

export function openPlayerStatsModal() {
  if (!S.activeStatsPlayer) return;
  renderStatsModal(S.activeStatsPlayer.name, S.activeStatsPlayer.tag);
  const modal = document.getElementById('player-stats-modal');
  if (modal) modal.style.display = 'block';
}

export function closePlayerStatsModal() {
  const modal = document.getElementById('player-stats-modal');
  if (modal) modal.style.display = 'none';
}
