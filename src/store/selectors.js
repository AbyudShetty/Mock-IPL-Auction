import {
  extractPlayerName,
  getCategoryFromPlayerData,
  getSetTypeFromName,
  isOverseasEntry,
  normalizePlayerName,
  parsePlayerEntry,
  sanitizeDisplayPlayerName
} from '../lib/utils.js';
import { resolvePlayerContext } from '../lib/statsEngine.js';

export const CATEGORY_SECTIONS = [
  { key: 'Wicket Keeper', title: 'Wicket Keepers', className: 'wicket-keepers' },
  { key: 'Batsman', title: 'Batsmen', className: 'batsmen' },
  { key: 'Fast Bowler', title: 'Fast Bowlers', className: 'fast-bowlers' },
  { key: 'Spinner', title: 'Spinners', className: 'spinners' },
  { key: 'All-rounder', title: 'All-rounders', className: 'all-rounders' }
];

/** Sold players of a team as an array, in the order they were bought. */
export function getTeamPlayers(team) {
  if (!team || !team.players) return [];
  return Object.entries(team.players)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
}

/** Groups a team's players into the five squad sections. */
export function groupPlayersByCategory(team) {
  const grouped = {};
  CATEGORY_SECTIONS.forEach(section => {
    grouped[section.key] = [];
  });
  getTeamPlayers(team).forEach(player => {
    const category = getCategoryFromPlayerData(player);
    (grouped[category] || grouped.Batsman).push(player);
  });
  return grouped;
}

/**
 * Everything the team card and the qualification rules need.
 *
 * Nationality comes from the pool entry (which carries the ✈️ marker), not the
 * display name — the display name has emoji stripped for the player button.
 */
export function getTeamSummary(team, config) {
  const { budget, minPlayers, maxPlayers } = config;
  const players = getTeamPlayers(team);
  const total = players.length;
  const overseas = players.filter(p => isOverseasEntry(p.fullEntry || p.name)).length;
  const indians = total - overseas;
  const purse = team.purse === undefined || team.purse === null ? budget : team.purse;

  const isFinished = purse <= 0 || total >= maxPlayers;
  let reason = null;
  if (team.manualDisq) reason = '⚠️ Disqualified';
  else if (isFinished) {
    if (total < minPlayers) reason = '⚠️ Minimum players not reached';
    else if (indians < 8) reason = '⚠️ Need 8 Indians';
  }

  return {
    players,
    total,
    overseas,
    indians,
    purse,
    spent: budget - purse,
    isFinished,
    reason,
    disqualified: Boolean(reason),
    maxReached: !reason && isFinished,
    countLabel: total < minPlayers ? `Players: ${total} / ${minPlayers}` : `Players: ${total} / ${maxPlayers}`
  };
}

/** Purse colour thresholds, unchanged from updatePurseColor(). */
export function getPurseColor(purse, budget) {
  const percent = (purse / budget) * 100;
  if (percent <= 10) return '#e74c3c';
  if (percent <= 20) return '#e67e22';
  if (percent <= 40) return '#f39c12';
  return '#27ae60';
}

/** Recomputed from the teams themselves so it survives undo and moves. */
export function computeAuctionStats(teams) {
  const stats = {
    mostExpensivePlayer: { name: '', price: 0, team: '' },
    totalPlayersSold: 0,
    totalMoneySpent: 0
  };
  teams.forEach(team => {
    getTeamPlayers(team).forEach(player => {
      const price = parseFloat(player.price) || 0;
      stats.totalPlayersSold++;
      stats.totalMoneySpent += price;
      if (price > stats.mostExpensivePlayer.price) {
        stats.mostExpensivePlayer = { name: player.name, price, team: team.name };
      }
    });
  });
  return stats;
}

export function countUnsold(unsoldPlayers) {
  return Object.values(unsoldPlayers || {}).reduce(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0
  );
}

/** True when any team already owns this player (name-normalised comparison). */
export function isPlayerSold(teams, playerName) {
  const target = normalizePlayerName(playerName);
  return teams.some(team => getTeamPlayers(team).some(p => normalizePlayerName(p.name) === target));
}

/**
 * Everything the auction header needs about whoever is currently on the block.
 * Returns null while a set is only announced, or once the pool is exhausted.
 */
export function getCurrentPlayerView(state) {
  const currentSet = state.sets[state.currentSetIndex];
  if (!currentSet || !state.players[currentSet]) return null;
  if (state.isSetAnnounced) return null;

  const playerList = state.isSecondRound ? state.unsoldPlayers[currentSet] : state.players[currentSet];
  if (!playerList || playerList.length === 0 || state.currentPlayerIndex >= playerList.length) return null;

  const fullEntry = playerList[state.currentPlayerIndex];
  const displayName = extractPlayerName(fullEntry);
  const parsed = parsePlayerEntry(fullEntry, getSetTypeFromName(currentSet));
  const cleanedPlayerName = sanitizeDisplayPlayerName(parsed?.name || displayName);
  const resolved = resolvePlayerContext(cleanedPlayerName);
  // The official feeds file him under his legal name; the auction shows the one people use.
  const displayOverride =
    normalizePlayerName(cleanedPlayerName) === 'digvesh singh' ? 'Digvesh Rathi' : cleanedPlayerName;
  const displayResolvedName = resolved ? resolved.officialName : displayOverride;

  return {
    currentSet,
    fullEntry,
    displayName,
    cleanedPlayerName,
    displayOverride,
    buttonLabel: displayOverride || cleanedPlayerName || displayName,
    imageNames: [displayResolvedName, displayOverride, cleanedPlayerName, displayName],
    resolved,
    statsPlayer: parsed?.name ? { name: cleanedPlayerName, tag: parsed.tag } : null,
    remaining: playerList.slice(state.currentPlayerIndex + 1).map(extractPlayerName)
  };
}

export function findPlayerOwner(teams, playerName) {
  const target = normalizePlayerName(playerName);
  for (const team of teams) {
    const match = getTeamPlayers(team).find(p => normalizePlayerName(p.name) === target);
    if (match) return { team, player: match };
  }
  return null;
}
