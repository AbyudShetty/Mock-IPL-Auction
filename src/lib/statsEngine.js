import {
  IPL_STATS_BASE,
  OFFICIAL_2026_LOCAL_FILE,
  OFFICIAL_2025_LOCAL_FILE,
  OFFICIAL_2024_LOCAL_FILE,
  OFFICIAL_CAREER_LOCAL_FILE,
  IPL_2026_FEEDS,
  STATS_SEASONS,
  playerNameAliases
} from './config.js';
import {
  parseStatNumber,
  noStatValue,
  naValue,
  parseBestBowling,
  normalizeCareerBestBowling,
  formatStatValue,
  isNoStatYearData,
  hasAnyYearStats,
  sanitizeDisplayPlayerName,
  normalizePlayerName,
  toDisplayNameFromNormalized,
  getNormalizedNameCandidates,
  isValidDob
} from './utils.js';

// =====================================================================
// STATS DATABASE
//
// A module-level singleton rather than React state: it is written once at
// startup by loadPlayerStats() and only ever read afterwards, so keeping it
// out of the store avoids re-rendering the whole app for ~1500 players.
// =====================================================================

export const playerStatsDB = {};
export const playerMetaDB = {};

let loadPromise = null;

// =====================================================================
// RECORD SHAPES
// =====================================================================

export function createEmptyPlayerData() {
  return {
    career: {
      batting: {
        innings: 0, notOuts: 0, runs: 0, ballsFaced: 0, fours: 0, sixes: 0,
        fifties: 0, hundreds: 0, catches: 0, stumpings: 0,
        highest: '0', highestComputed: '', highestScoreNumeric: 0
      },
      bowling: {
        innings: 0, ballsBowled: 0, runsConceded: 0, wickets: 0, fourW: 0, fiveW: 0,
        bestBowl: '0/0', bestBowlComputed: '', bestBowlCsv: '', bestBowlFinal: '',
        bestBowlParsed: { wickets: 0, runs: Number.MAX_SAFE_INTEGER, raw: '0/0' }
      }
    },
    years: {}
  };
}

export function buildEmptySeasonRecord() {
  return {
    batting: {
      innings: 0, notOuts: 0, runs: 0, ballsFaced: 0, strikeRate: 0, average: 0,
      fours: 0, sixes: 0, highest: '0', fifties: 0, hundreds: 0, catches: 0, stumpings: 0
    },
    bowling: {
      innings: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, economy: 0,
      average: 0, fourW: 0, fiveW: 0, bestBowl: '0/0'
    }
  };
}

function ensurePlayerRecord(name) {
  const normalized = normalizePlayerName(name);
  if (!playerStatsDB[normalized]) playerStatsDB[normalized] = createEmptyPlayerData();
  return playerStatsDB[normalized];
}

function ensureSeasonMeta(record, year) {
  record.seasonMeta = record.seasonMeta || {};
  record.seasonMeta[year] = record.seasonMeta[year] || { matches: 0, hasStats: false };
  return record.seasonMeta[year];
}

// =====================================================================
// LOOKUP
// =====================================================================

export function resolvePlayerContext(name) {
  const candidates = getNormalizedNameCandidates(name);

  for (const key of candidates) {
    if (playerStatsDB[key]) {
      const meta = playerMetaDB[key] || {};
      const officialName = sanitizeDisplayPlayerName(meta.officialName || toDisplayNameFromNormalized(key) || name);
      return { key, data: playerStatsDB[key], officialName, dob: meta.dob || null, playerId: meta.playerId || null };
    }
  }

  const compact = normalizePlayerName(name).replace(/\s+/g, '');
  for (const [key, value] of Object.entries(playerStatsDB)) {
    if (key.replace(/\s+/g, '') === compact) {
      const meta = playerMetaDB[key] || {};
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

// =====================================================================
// ROW BUILDERS
// =====================================================================

export function buildBattingRowFromYear(playerData, year) {
  const yearData = playerData.years[year];
  if (!yearData || isNoStatYearData(yearData)) return { noStatsForYear: true };
  const b = yearData.batting;
  return {
    innings: b.innings,
    runs: b.runs,
    strikeRate: formatStatValue(b.strikeRate, 2),
    average: formatStatValue(b.average, 2),
    fours: b.fours,
    sixes: b.sixes,
    highest: b.highest,
    fifties: b.fifties,
    hundreds: b.hundreds,
    catches: b.catches,
    stumpings: b.stumpings
  };
}

export function buildBowlingRowFromYear(playerData, year) {
  const yearData = playerData.years[year];
  if (!yearData || isNoStatYearData(yearData)) return { noStatsForYear: true };
  const b = yearData.bowling;
  return {
    innings: b.innings,
    wickets: b.wickets,
    runsConceded: b.runsConceded,
    ballsBowled: b.ballsBowled,
    economy: formatStatValue(b.economy, 2),
    average: formatStatValue(b.average, 2),
    fourW: b.fourW,
    fiveW: b.fiveW,
    bestBowl: b.bestBowl || noStatValue()
  };
}

export function buildCareerBattingRow(playerData) {
  const c = playerData.career.batting;
  const dismissals = Math.max(c.innings - c.notOuts, 0);
  const average = dismissals > 0 ? c.runs / dismissals : 0;
  const strikeRate = c.ballsFaced > 0 ? (c.runs / c.ballsFaced) * 100 : 0;
  const resolvedHighest = c.highest && String(c.highest) !== '0' ? c.highest : c.highestComputed || naValue();
  return {
    innings: c.innings,
    runs: c.runs,
    strikeRate: formatStatValue(strikeRate, 2),
    average: formatStatValue(average, 2),
    fours: c.fours,
    sixes: c.sixes,
    highest: resolvedHighest,
    fifties: c.fifties,
    hundreds: c.hundreds,
    catches: c.catches,
    stumpings: c.stumpings
  };
}

export function buildCareerBowlingRow(playerData) {
  const c = playerData.career.bowling;
  const economy = c.ballsBowled > 0 ? c.runsConceded / (c.ballsBowled / 6) : 0;
  const average = c.wickets > 0 ? c.runsConceded / c.wickets : 0;
  const hasBowlingRecord = c.innings > 0 || c.wickets > 0 || c.ballsBowled > 0;
  const officialBest = normalizeCareerBestBowling(c.bestBowlFinal || c.bestBowl, c.wickets);
  const bestFigure = hasBowlingRecord
    ? officialBest && officialBest !== noStatValue() && officialBest !== 'NA'
      ? officialBest
      : normalizeCareerBestBowling(c.bestBowlComputed, c.wickets) ||
        normalizeCareerBestBowling(c.bestBowlCsv, c.wickets) ||
        'NA'
    : noStatValue();
  return {
    innings: c.innings,
    wickets: c.wickets,
    runsConceded: c.runsConceded,
    ballsBowled: c.ballsBowled,
    economy: formatStatValue(economy, 2),
    average: formatStatValue(average, 2),
    fourW: c.fourW,
    fiveW: c.fiveW,
    bestBowl: bestFigure
  };
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
    if (highestNum > career.batting.highestScoreNumeric) {
      career.batting.highestScoreNumeric = highestNum;
      career.batting.highest = highest;
    }
    career.bowling.innings += parseStatNumber(bowl.innings);
    career.bowling.ballsBowled += parseStatNumber(bowl.ballsBowled);
    career.bowling.runsConceded += parseStatNumber(bowl.runsConceded);
    career.bowling.wickets += parseStatNumber(bowl.wickets);
    career.bowling.fourW += parseStatNumber(bowl.fourW);
    career.bowling.fiveW += parseStatNumber(bowl.fiveW);
    const best = parseBestBowling(bowl.bestBowl || '0/0');
    if (
      best.wickets > career.bowling.bestBowlParsed.wickets ||
      (best.wickets === career.bowling.bestBowlParsed.wickets && best.runs < career.bowling.bestBowlParsed.runs)
    ) {
      career.bowling.bestBowlParsed = best;
      career.bowling.bestBowl = best.raw;
    }
  });
  playerData.career = career;
}

// =====================================================================
// FEED PARSING
// =====================================================================

function parseJsonpPayload(text) {
  const start = text.indexOf('(');
  const end = text.lastIndexOf(')');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start + 1, end));
  } catch {
    return null;
  }
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
  const res = await fetch(`${IPL_STATS_BASE}/${compId}-${key}.js`);
  if (!res.ok) return [];
  const data = parseJsonpPayload(await res.text());
  return data && data[key] ? data[key] : [];
}

async function patchSeasonBowlingFromOfficialFeeds(year, compId) {
  try {
    const [economyRows, figuresRows, averagesRows] = await Promise.all([
      fetchOfficialFeedList(compId, 'besteconomyrates'),
      fetchOfficialFeedList(compId, 'bestbowlingfigures'),
      fetchOfficialFeedList(compId, 'bestaverages')
    ]);
    [...economyRows, ...figuresRows, ...averagesRows].forEach(row => {
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
      playerMetaDB[normalizedName] = playerMetaDB[normalizedName] || {};
      playerMetaDB[normalizedName].officialName = bowlerName;
      if (row.PlayerId) playerMetaDB[normalizedName].playerId = String(row.PlayerId);
    });
  } catch (error) {
    console.warn(`⚠️ Could not patch bowling feeds for ${year}.`, error);
  }
}

// =====================================================================
// SNAPSHOT LOADING
// =====================================================================

async function loadOfficialSeasonSnapshot(fileName) {
  try {
    const res = await fetch(fileName);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function applySeasonSnapshot(year, snapshot) {
  if (!snapshot || !snapshot.players) return;
  Object.values(snapshot.players).forEach(player => {
    if (!player || !player.name) return;
    const normalizedName = normalizePlayerName(player.name);
    const record = ensurePlayerRecord(player.name);
    playerMetaDB[normalizedName] = playerMetaDB[normalizedName] || {};
    playerMetaDB[normalizedName].officialName = player.name;
    if (player.playerId) playerMetaDB[normalizedName].playerId = String(player.playerId);
    const dobValue = player.dob || player.playerDob || player.playerDOB || null;
    if (isValidDob(dobValue)) playerMetaDB[normalizedName].dob = String(dobValue);
    if (!record.years[year]) record.years[year] = buildEmptySeasonRecord();
    const seasonMeta = ensureSeasonMeta(record, year);

    if (player.batting) {
      record.years[year].batting = {
        innings: parseStatNumber(player.batting.innings),
        notOuts: parseStatNumber(player.batting.notOuts),
        runs: parseStatNumber(player.batting.runs),
        ballsFaced: parseStatNumber(player.batting.ballsFaced),
        strikeRate: parseStatNumber(player.batting.strikeRate),
        average: parseStatNumber(player.batting.average),
        fours: parseStatNumber(player.batting.fours),
        sixes: parseStatNumber(player.batting.sixes),
        highest: String(player.batting.highest || '0'),
        fifties: parseStatNumber(player.batting.fifties),
        hundreds: parseStatNumber(player.batting.hundreds),
        catches: parseStatNumber(player.batting.catches),
        stumpings: parseStatNumber(player.batting.stumpings)
      };
      const inn = parseStatNumber(record.years[year].batting.innings);
      if (inn > seasonMeta.matches) seasonMeta.matches = inn;
    }

    if (player.bowling) {
      record.years[year].bowling = {
        innings: parseStatNumber(player.bowling.innings),
        wickets: parseStatNumber(player.bowling.wickets),
        runsConceded: parseStatNumber(player.bowling.runsConceded),
        ballsBowled: parseStatNumber(player.bowling.ballsBowled),
        economy: parseStatNumber(player.bowling.economy),
        average: parseStatNumber(player.bowling.average),
        fourW: parseStatNumber(player.bowling.fourW),
        fiveW: parseStatNumber(player.bowling.fiveW),
        bestBowl: String(player.bowling.bestBowl || '0/0')
      };
      const inn = parseStatNumber(record.years[year].bowling.innings);
      if (inn > seasonMeta.matches) seasonMeta.matches = inn;
    }

    seasonMeta.hasStats = hasAnyYearStats(record.years[year]) || seasonMeta.matches > 0;

    // Point every alias that maps onto this official name at the same record.
    for (const [aliasFrom, aliasTo] of Object.entries(playerNameAliases)) {
      if (aliasTo === normalizedName) {
        if (!playerStatsDB[aliasFrom]) playerStatsDB[aliasFrom] = record;
        playerMetaDB[aliasFrom] = playerMetaDB[normalizedName];
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
    playerMetaDB[normalizedName] = playerMetaDB[normalizedName] || {};
    playerMetaDB[normalizedName].officialName = player.name;
    if (player.playerId) playerMetaDB[normalizedName].playerId = String(player.playerId);
    const dobValue = player.dob || player.playerDob || player.playerDOB || null;
    if (isValidDob(dobValue)) playerMetaDB[normalizedName].dob = String(dobValue);

    const normalizedBest = normalizeCareerBestBowling(bowlingCareer.bestBowl, bowlingCareer.wickets);
    const normalizedBestFinal = normalizeCareerBestBowling(bowlingCareer.bestBowlFinal, bowlingCareer.wickets);

    record.career = {
      batting: {
        innings: parseStatNumber(battingCareer.innings),
        notOuts: parseStatNumber(battingCareer.notOuts),
        runs: parseStatNumber(battingCareer.runs),
        ballsFaced: parseStatNumber(battingCareer.ballsFaced),
        fours: parseStatNumber(battingCareer.fours),
        sixes: parseStatNumber(battingCareer.sixes),
        fifties: parseStatNumber(battingCareer.fifties),
        hundreds: parseStatNumber(battingCareer.hundreds),
        catches: parseStatNumber(battingCareer.catches),
        stumpings: parseStatNumber(battingCareer.stumpings),
        highest: String(battingCareer.highest || '0'),
        highestComputed: String(battingCareer.highestComputed || ''),
        highestScoreNumeric: parseInt(String(battingCareer.highest || '0').replace('*', ''), 10) || 0
      },
      bowling: {
        innings: parseStatNumber(bowlingCareer.innings),
        ballsBowled: parseStatNumber(bowlingCareer.ballsBowled),
        runsConceded: parseStatNumber(bowlingCareer.runsConceded),
        wickets: parseStatNumber(bowlingCareer.wickets),
        fourW: parseStatNumber(bowlingCareer.fourW),
        fiveW: parseStatNumber(bowlingCareer.fiveW),
        bestBowl: normalizedBest,
        bestBowlComputed: String(bowlingCareer.bestBowlComputed || ''),
        bestBowlCsv: String(bowlingCareer.bestBowlCsv || ''),
        bestBowlFinal: normalizedBestFinal,
        bestBowlParsed: parseBestBowling(normalizedBest)
      }
    };
  });
}

// =====================================================================
// LIVE 2026 FEED FALLBACK (used only when the bundled snapshot is missing)
// =====================================================================

function applyOfficial2026BattingStats(entry) {
  const name = entry.StrikerName || entry.PlayerName;
  if (!name) return;
  const record = ensurePlayerRecord(name);
  record.years['2026'] = record.years['2026'] || buildEmptySeasonRecord();
  record.years['2026'].batting = {
    innings: parseStatNumber(entry.Innings),
    notOuts: parseStatNumber(entry.NotOuts),
    runs: parseStatNumber(entry.TotalRuns),
    ballsFaced: parseStatNumber(entry.Balls),
    strikeRate: parseStatNumber(entry.StrikeRate),
    average: parseStatNumber(entry.BattingAverage),
    fours: parseStatNumber(entry.Fours),
    sixes: parseStatNumber(entry.Sixes),
    highest: String(entry.HighestScore || '0'),
    fifties: parseStatNumber(entry.FiftyPlusRuns),
    hundreds: parseStatNumber(entry.Centuries),
    catches: parseStatNumber(entry.Catches),
    stumpings: parseStatNumber(entry.Stumpings)
  };
}

function applyOfficial2026BowlingStats(entry) {
  const name = entry.BowlerName || entry.PlayerName;
  if (!name) return;
  const record = ensurePlayerRecord(name);
  record.years['2026'] = record.years['2026'] || buildEmptySeasonRecord();
  const legalBalls = parseStatNumber(entry.LegalBallsBowled);
  const overs = parseStatNumber(entry.OversBowled);
  record.years['2026'].bowling = {
    innings: parseStatNumber(entry.Innings),
    wickets: parseStatNumber(entry.Wickets),
    runsConceded: parseStatNumber(entry.TotalRunsConceded),
    ballsBowled: legalBalls > 0 ? legalBalls : Math.round(overs * 6),
    economy: parseStatNumber(entry.EconomyRate),
    average: parseStatNumber(entry.BowlingAverage),
    fourW: parseStatNumber(entry.FourWickets),
    fiveW: parseStatNumber(entry.FiveWickets),
    bestBowl: `${parseStatNumber(entry.BBIW)}/${parseStatNumber(entry.BBMW)}`
  };
}

async function loadOfficial2026StatsFromFeeds() {
  try {
    const [batRes, bowlRes] = await Promise.all([fetch(IPL_2026_FEEDS.batting), fetch(IPL_2026_FEEDS.bowling)]);
    if (!batRes.ok || !bowlRes.ok) throw new Error('Official 2026 stats feeds unavailable');
    const [batText, bowlText] = await Promise.all([batRes.text(), bowlRes.text()]);
    const batData = parseJsonpPayload(batText);
    const bowlData = parseJsonpPayload(bowlText);
    (batData?.toprunsscorers || []).forEach(applyOfficial2026BattingStats);
    (bowlData?.mostwickets || []).forEach(applyOfficial2026BowlingStats);
    Object.values(playerStatsDB).forEach(recomputeCareerStats);
    console.log('✅ Official IPL 2026 stats merged successfully!');
  } catch (error) {
    console.warn('⚠️ Could not load official IPL 2026 feeds.', error);
  }
}

// =====================================================================
// PUBLIC ENTRY POINT
// =====================================================================

export async function loadOfficialStatsBundle() {
  const [season2026, season2025, season2024, careerSnapshot] = await Promise.all([
    loadOfficialSeasonSnapshot(OFFICIAL_2026_LOCAL_FILE),
    loadOfficialSeasonSnapshot(OFFICIAL_2025_LOCAL_FILE),
    loadOfficialSeasonSnapshot(OFFICIAL_2024_LOCAL_FILE),
    loadOfficialSeasonSnapshot(OFFICIAL_CAREER_LOCAL_FILE)
  ]);

  if (season2026) applySeasonSnapshot('2026', season2026);
  else await loadOfficial2026StatsFromFeeds();
  if (season2025) applySeasonSnapshot('2025', season2025);
  if (season2024) applySeasonSnapshot('2024', season2024);

  await Promise.all([
    patchSeasonBowlingFromOfficialFeeds('2026', '284'),
    patchSeasonBowlingFromOfficialFeeds('2025', '203'),
    patchSeasonBowlingFromOfficialFeeds('2024', '148')
  ]);

  if (careerSnapshot) applyCareerSnapshot(careerSnapshot);
  else Object.values(playerStatsDB).forEach(recomputeCareerStats);
}

/** Idempotent — safe to call from a React effect that may run twice. */
export function loadPlayerStats() {
  if (!loadPromise) {
    loadPromise = loadOfficialStatsBundle()
      .then(() => console.log('✅ Official Stats Engine Loaded Successfully!'))
      .catch(error => console.warn('⚠️ Could not load official stats snapshots.', error));
  }
  return loadPromise;
}

// =====================================================================
// TABLE DEFINITIONS (consumed by <PlayerStatsModal />)
// =====================================================================

export const BATTING_COLUMNS = [
  { key: 'innings', label: 'Innings' },
  { key: 'runs', label: 'Runs' },
  { key: 'strikeRate', label: 'SR' },
  { key: 'average', label: 'Avg' },
  { key: 'fours', label: '4s' },
  { key: 'sixes', label: '6s' },
  { key: 'highest', label: 'HS' },
  { key: 'fifties', label: '50s' },
  { key: 'hundreds', label: '100s' }
];

export const WICKET_KEEPER_EXTRA_COLUMNS = [
  { key: 'catches', label: 'Catches' },
  { key: 'stumpings', label: 'Stumpings' }
];

export const BOWLING_COLUMNS = [
  { key: 'innings', label: 'Innings' },
  { key: 'wickets', label: 'Wkts' },
  { key: 'runsConceded', label: 'Runs Given' },
  { key: 'ballsBowled', label: 'Balls' },
  { key: 'economy', label: 'Econ' },
  { key: 'average', label: 'Bowl Avg' },
  { key: 'fourW', label: '4W' },
  { key: 'fiveW', label: '5W' },
  { key: 'bestBowl', label: 'Best Figures' }
];

/** Season rows + a Career row, in the order the original tables rendered them. */
export function buildBattingRows(playerData) {
  const rows = STATS_SEASONS.map(season => ({ season, data: buildBattingRowFromYear(playerData, season) }));
  rows.push({ season: 'Career', data: buildCareerBattingRow(playerData) });
  return rows;
}

export function buildBowlingRows(playerData) {
  const rows = STATS_SEASONS.map(season => ({ season, data: buildBowlingRowFromYear(playerData, season) }));
  rows.push({ season: 'Career', data: buildCareerBowlingRow(playerData) });
  return rows;
}

/** Which tables a player gets, keyed off their role tag. */
export function getStatsSectionsForTag(playerData, tag) {
  if (tag === 'fb' || tag === 's') {
    return [{ title: 'Bowling', columns: BOWLING_COLUMNS, rows: buildBowlingRows(playerData) }];
  }
  if (tag === 'wk') {
    return [
      {
        title: 'Batting + Keeping',
        columns: [...BATTING_COLUMNS, ...WICKET_KEEPER_EXTRA_COLUMNS],
        rows: buildBattingRows(playerData)
      }
    ];
  }
  if (tag === 'ar') {
    return [
      { title: 'Batting', columns: BATTING_COLUMNS, rows: buildBattingRows(playerData) },
      { title: 'Bowling', columns: BOWLING_COLUMNS, rows: buildBowlingRows(playerData) }
    ];
  }
  return [{ title: 'Batting', columns: BATTING_COLUMNS, rows: buildBattingRows(playerData) }];
}
