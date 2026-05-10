# 🐐 Goated Auction — Mock IPL Auction Simulator

A feature-rich, real-time **IPL-style cricket auction simulator** you can play with friends online or locally on the same device. Built as a pure frontend web app hosted on Firebase, it features live player stats from IPL 2024–2026, Firebase-powered multiplayer rooms, and a full auction flow — from bidding to team management.

![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-orange?logo=firebase) ![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow?logo=javascript) ![HTML5](https://img.shields.io/badge/HTML5-CSS3-blue?logo=html5) ![Hosted](https://img.shields.io/badge/Hosted-Firebase_Hosting-red)

🔗 **Live App:** [goated-auction-2b1d8.web.app](https://goated-auction-2b1d8.web.app)

---

## ✨ Features

- **Online Multiplayer** — create a room, share a 6-character code, and friends join from anywhere; all auction state syncs in real time via Firebase Realtime Database
- **Offline Local Mode** — run the entire auction on one device, passing it between players
- **200+ Real Players** — a full pool of IPL 2026 auction-eligible players, organized into 16 sets (Marquee, Wicketkeepers, Batsmen, Fast Bowlers, Spinners, All-rounders)
- **Live Player Stats** — clicking a player shows their IPL batting and bowling stats for 2024, 2025, and 2026, plus full career numbers, pulled from official IPL data feeds
- **Configurable Auction** — set your team count, team budget (default ₹120 Cr), minimum/maximum squad size, and player pool before the auction starts
- **Custom Player Pool** — replace the default set with your own custom player list
- **Second-Round Unsold** — unsold players are automatically queued for a second round
- **Team Management** — drag-and-drop to reorder your squad, inline team name editing, move players between teams
- **Celebration Animations** — confetti burst when a big buy lands
- **Auction Statistics** — live tracking of most expensive player, total money spent, and total players sold
- **Room Presence & Auto-Cleanup** — stale rooms (10+ minutes inactive, no one online) are automatically removed on new room creation

---

## 🎮 How to Play

### Online Multiplayer

1. Open the app and select **Online Multiplayer**
2. One person selects **Create Room** and configures the auction (teams, budget, player mode)
3. Share the 6-character room code with all participants
4. Each participant selects **Join Room**, enters the code and their team name
5. The room creator (Auctioneer) starts the auction and calls bids
6. Teams place bids; the auctioneer hammers the final sale
7. The auction proceeds set by set through all player groups

### Offline Local

1. Select **Offline Local** and configure the auction
2. Pass the device between team owners during bidding
3. The auctioneer controls the flow; all team state is on one screen

---

## 🏏 Player Pool

Players are organized into **16 sets** auctioned in sequence:

| Set | Example Players |
|---|---|
| Marquee Set | Virat Kohli, Jasprit Bumrah, Hardik Pandya, Ravindra Jadeja |
| Wicket Keeper 1 | Rishabh Pant, MS Dhoni, Sanju Samson, Jos Buttler |
| Batsman 1 | Rohit Sharma, Yashasvi Jaiswal, Shubman Gill, Travis Head |
| Fast Bowler 1 | Mohammed Shami, Trent Boult, Kagiso Rabada, Jofra Archer |
| Spinner 1 | Rashid Khan, Kuldeep Yadav, Yuzvendra Chahal, Varun Chakravarthy |
| All-rounder 1 | Andre Russell, Sam Curran, Sunil Narine, Mitchell Marsh |
| ... | 10 more sets of WKs, Batsmen, Bowlers, Spinners & All-rounders |

✈️ denotes overseas players.

---

## 📊 Player Stats

Each player card shows:
- **Recent seasons** — per-season batting (runs, SR, avg, 50s, 100s) and bowling (wickets, economy, avg, best figures) for IPL 2024, 2025, and 2026
- **Career totals** — full IPL career aggregates
- Stats are sourced from bundled JSON files (`official_ipl_2024_stats.json`, `official_ipl_2025_stats.json`, `official_ipl_2026_stats.json`, `official_ipl_career_stats.json`) and a supplementary CSV (`cricket_data_2026.csv`)

---

## 🗂️ Project Structure

```
public/
├── index.html                    # Main app (mode selection, setup, auction UI)
├── script.js                     # All game logic, Firebase sync, stats rendering
├── styles.css                    # Full UI styling
├── players.html                  # Standalone player pool browser (by set/role)
├── official_ipl_2024_stats.json  # Bundled IPL 2024 batting & bowling stats
├── official_ipl_2025_stats.json  # Bundled IPL 2025 stats
├── official_ipl_2026_stats.json  # Bundled IPL 2026 stats
├── official_ipl_career_stats.json# Bundled IPL career stats
├── cricket_data_2026.csv         # Supplementary per-season stats (2008–2026)
├── firebase.json                 # Firebase Hosting config
└── logo.png                      # App icon
scripts/
└── refresh_official_stats.py     # Script to refresh bundled stats from IPL feeds
firebase.json                     # Root Firebase config
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5, CSS3, ES6 JavaScript (modules) |
| Realtime Sync | Firebase Realtime Database |
| Hosting | Firebase Hosting |
| Stats Source | IPL official stats feeds + bundled JSON/CSV |
| Build | No build step — static files served directly |

---

## 🚀 Running Locally

No build tools needed. Clone and open directly in a browser, or serve with any static server:

```bash
git clone https://github.com/AbyudShetty/Mock-IPL-Auction.git
cd Mock-IPL-Auction/public

/* use your API KEY in index.html */

# Option A: Python
python3 -m http.server 8000

# Option B: Node
npx serve .
```

Then open **http://localhost:8000**.

> Online multiplayer uses the hosted Firebase project. To use your own Firebase backend, update the Firebase config in `index.html` and `script.js`.

### Refreshing Stats

To pull fresh stats from the IPL feeds into the bundled JSON files:

```bash
pip install requests
python scripts/refresh_official_stats.py
```
