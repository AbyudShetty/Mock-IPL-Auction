# 🐐 Goated Auction — Mock IPL Auction Simulator

A feature-rich, real-time **IPL-style cricket auction simulator** you can play with friends online or locally on the same device. React + Vite front end, Firebase Realtime Database for multiplayer sync, deployed on Firebase Hosting.

![React](https://img.shields.io/badge/React-18-61dafb?logo=react) ![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite) ![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-orange?logo=firebase) ![Hosted](https://img.shields.io/badge/Hosted-Firebase_Hosting-red)

🔗 **Live App:** [goated-auction-2b1d8.web.app](https://goated-auction-2b1d8.web.app)

---

## ✨ Features

- **Online Multiplayer** — create a room, share a 6-character code, and friends join from anywhere; all auction state syncs in real time via Firebase Realtime Database
- **Offline Local Mode** — run the entire auction on one device, passing it between players
- **200+ Real Players** — a full pool of IPL 2026 auction-eligible players, organized into 16 sets (Marquee, Wicketkeepers, Batsmen, Fast Bowlers, Spinners, All-rounders)
- **Live Player Stats** — clicking a player shows their IPL batting and bowling stats for 2024, 2025, and 2026, plus full career numbers, pulled from official IPL data feeds
- **Configurable Auction** — set your team count, team budget (default ₹120 Cr), minimum/maximum squad size, and player pool before the auction starts
- **Custom Player Pool** — replace the default set with your own custom player list, drag to reorder sets
- **Second-Round Unsold** — unsold players are automatically queued for a second round
- **Team Management** — drag-and-drop Playing XII builder, captain / vice-captain / keeper roles, inline team name editing, move players between teams
- **Global Undo** — step back through sales and skips, refunding purses as it goes
- **Celebration Animations** — confetti burst when a big buy lands
- **Auction Statistics** — live tracking of most expensive player, total money spent, players sold, and spend per team
- **Room Presence & Auto-Cleanup** — stale rooms (10+ minutes inactive, no one online) are automatically removed on new room creation

---

## 🎮 How to Play

### Online Multiplayer

1. Open the app and select **Online Multiplayer**
2. One person selects **Create Room** and configures the auction (teams, budget, player mode)
3. Share the 6-character room code, or the `?room=CODE` link, with all participants
4. Each participant selects **Join Room**, enters the code and their team name
5. The room creator (Auctioneer) starts the auction and calls bids
6. The auctioneer drags the player on the block onto the winning team and enters the price
7. The auction proceeds set by set through all player groups

### Offline Local

1. Select **Offline Local** and configure the auction
2. Pass the device between team owners during bidding
3. The auctioneer controls the flow; all team state is on one screen

---

## 🗂️ Project Structure

```
index.html                     # Vite entry point
vite.config.js
firebase.json                  # Firebase Hosting (serves dist/, SPA rewrite)
refresh_official_stats.py      # Refreshes the bundled stats snapshots

public/                        # Copied verbatim into dist/
├── logo.png
├── cricket_data_2026.csv
└── official_ipl_*.json        # Bundled IPL 2024/2025/2026 + career stats

src/
├── main.jsx                   # React root
├── App.jsx                    # Screen router + always-mounted modals
├── styles.css                 # Full UI styling (unchanged from the vanilla build)
├── lib/                       # Framework-agnostic logic
│   ├── config.js              # Default player pool, name aliases, feed URLs
│   ├── utils.js               # Name parsing/normalising, image resolution, stat formatting
│   ├── statsEngine.js         # Loads + merges official stat snapshots, builds table rows
│   ├── celebration.js         # Confetti
│   └── api.js                 # Client for the Cloud Functions API (AI seam)
├── firebase/
│   ├── client.js              # SDK init (env-driven config)
│   └── rooms.js               # Every Realtime Database read/write
├── store/
│   ├── auctionStore.js        # Zustand store — the single source of truth
│   └── selectors.js           # Derived state (team summaries, current player, stats)
├── hooks/
│   ├── useRoomSync.js         # Subscribes the store to rooms/{code}
│   └── usePlayerImage.js      # Probes IPL headshot URLs
├── screens/                   # ModeSelection, OnlineChoice, JoinRoom, WaitingLobby,
│                              # InitialSetup, CustomPlayersSetup, AuctionRoom
└── components/                # Team cards, panels, and modals/

functions/                     # Firebase Cloud Functions (optional, see below)
├── index.js                   # /health, /rooms/summary, /ai/scout
└── package.json
```

### Architecture notes

The vanilla build used the DOM as its source of truth — purses were read back out of
`<span class="purse-amount">`, squads out of `<li>` text. The React version inverts
that: **`src/store/auctionStore.js` holds all state and the UI is a pure function of
it.** Everything the team cards show (squad counts, nationality split, disqualification,
purse colour) is derived in `src/store/selectors.js`.

The Realtime Database schema under `rooms/{code}` is **unchanged**, so this version is
wire-compatible with the old one. In an online room the auctioneer is authoritative for
purses and squads; each owner is authoritative for their own Playing XII.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18 |
| Build | Vite 5 |
| State | Zustand |
| Realtime Sync | Firebase Realtime Database |
| Hosting | Firebase Hosting |
| Backend (optional) | Firebase Cloud Functions + Anthropic SDK |
| Stats Source | IPL official stats feeds + bundled JSON/CSV |

---

## 🚀 Running Locally

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run build        # production bundle into dist/
npm run preview      # serve the built bundle
npm run deploy       # build + firebase deploy --only hosting
```

### Firebase configuration

`src/firebase/client.js` falls back to the existing `goated-auction-2b1d8` project, so
the app runs with no setup. To point it at your own project, copy `.env.example` to
`.env` and fill in the `VITE_FIREBASE_*` values. (A Firebase web config is public by
design — access control belongs in your Realtime Database rules.)

### Deploying

```bash
npm run build
firebase deploy --only hosting
```

`firebase.json` serves `dist/` with a SPA rewrite, so the `?room=CODE` share links work
on any path.

---

## 🤖 Backend & AI (optional)

`functions/` holds a Cloud Functions API with a `/ai/scout` endpoint that asks Claude
for a bid/pass verdict on the player currently on the block. **It is deliberately not
referenced from `firebase.json`**, so a plain `firebase deploy` stays a hosting-only
deploy that works on the free Spark plan.

To enable it:

1. Upgrade the Firebase project to the **Blaze** plan (Cloud Functions requires it)
2. `cd functions && npm install`
3. `firebase functions:secrets:set ANTHROPIC_API_KEY`
4. Add to `firebase.json`:
   ```json
   "functions": { "source": "functions" }
   ```
   and, inside `"hosting"`, put this rewrite **before** the catch-all:
   ```json
   { "source": "/api/**", "function": "api" }
   ```
5. `firebase deploy`

The front end calls it through `src/lib/api.js`. With the rewrite in place requests are
same-origin, so there is no CORS preflight and the API key never reaches the browser.

---

## 📊 Refreshing Stats

Pulls fresh stats from the IPL feeds into `public/official_ipl_*.json`:

```bash
pip install requests
python refresh_official_stats.py
```
