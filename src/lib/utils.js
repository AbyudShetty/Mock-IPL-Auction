import {
  playerNameAliases,
  playerImageNameAliases,
  whiteBackgroundPlayers,
  PLAYER_PLACEHOLDER_IMAGE
} from './config.js';

// =====================================================================
// STAT VALUE PARSING / FORMATTING
// =====================================================================

export function parseStatNumber(value) {
  const cleaned = String(value || '').trim();
  if (!cleaned || cleaned.toLowerCase() === 'no stats') return 0;
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function noStatValue() {
  return 'No stats available';
}

export function naValue() {
  return 'NA';
}

export function cleanBestBowling(value) {
  const text = String(value || '').trim();
  if (!text || text.toLowerCase() === 'no stats' || text === '0') return '0/0';
  return text;
}

export function parseBestBowling(value) {
  const cleaned = cleanBestBowling(value);
  const match = cleaned.match(/(\d+)\/(\d+)/);
  if (!match) return { wickets: 0, runs: Number.MAX_SAFE_INTEGER, raw: '0/0' };
  return {
    wickets: parseInt(match[1], 10) || 0,
    runs: parseInt(match[2], 10) || 0,
    raw: cleaned
  };
}

export function normalizeCareerBestBowling(value, wickets) {
  const text = String(value || '').trim();
  const wkts = parseStatNumber(wickets);

  if (text && text !== '-' && text !== '0' && text !== '0/0') {
    const nums = text.match(/\d+/g) || [];
    if (nums.length >= 2) {
      const a = parseInt(nums[0], 10) || 0;
      const b = parseInt(nums[1], 10) || 0;
      const likelyWicketsFirst = a <= 10 && b > 10;
      const likelyRunsFirst = a > 10 && b <= 10;

      if (likelyRunsFirst) return `${b}/${a}`;
      if (likelyWicketsFirst) return `${a}/${b}`;

      if (wkts > 0) {
        if (a === wkts) return `${a}/${b}`;
        if (b === wkts) return `${b}/${a}`;
      }

      return `${a}/${b}`;
    }
  }

  if (wkts > 0) return 'NA';

  return noStatValue();
}

export function formatStatValue(value, digits = 2) {
  if (value === '-' || value === null || value === undefined || value === '') return naValue();
  if (typeof value === 'string') {
    const cleaned = value.trim();
    if (!cleaned || cleaned === '-' || cleaned.toLowerCase() === 'no stats') return naValue();
    return cleaned;
  }
  if (!Number.isFinite(value)) return noStatValue();
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

export function hasAnyYearStats(yearData) {
  if (!yearData) return false;
  const batting = yearData.batting || {};
  const bowling = yearData.bowling || {};

  const batHas =
    parseStatNumber(batting.innings) > 0 ||
    parseStatNumber(batting.runs) > 0 ||
    parseStatNumber(batting.ballsFaced) > 0 ||
    parseStatNumber(batting.fours) > 0 ||
    parseStatNumber(batting.sixes) > 0 ||
    parseStatNumber(batting.fifties) > 0 ||
    parseStatNumber(batting.hundreds) > 0 ||
    parseStatNumber(batting.catches) > 0 ||
    parseStatNumber(batting.stumpings) > 0;

  const bowlHas =
    parseStatNumber(bowling.innings) > 0 ||
    parseStatNumber(bowling.wickets) > 0 ||
    parseStatNumber(bowling.ballsBowled) > 0 ||
    parseStatNumber(bowling.runsConceded) > 0 ||
    parseStatNumber(bowling.fourW) > 0 ||
    parseStatNumber(bowling.fiveW) > 0;

  return batHas || bowlHas;
}

export function isNoStatYearData(yearData) {
  return !hasAnyYearStats(yearData);
}

// =====================================================================
// PLAYER NAME HANDLING
// =====================================================================

export function sanitizeDisplayPlayerName(name) {
  return String(name || '')
    .replace(/\uFE0F/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePlayerName(name) {
  return String(name || '')
    .replace(/\uFE0F/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export const OVERSEAS_MARKER = '\u2708';

/** A player is overseas when their original pool entry carries the plane marker. */
export function isOverseasEntry(fullEntry) {
  return String(fullEntry || '').includes(OVERSEAS_MARKER);
}

export function extractPlayerName(fullEntry) {
  const parsed = parsePlayerEntry(fullEntry);
  return parsed.name || String(fullEntry).split(' - ')[0].trim();
}

export function tagToCategory(tag) {
  const tagMap = {
    wk: 'Wicket Keeper',
    b: 'Batsman',
    fb: 'Fast Bowler',
    s: 'Spinner',
    ar: 'All-rounder'
  };
  return tagMap[tag] || 'Batsman';
}

export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function getTeamLineupKey(teamName) {
  return `teamLineup_${teamName}`;
}

export function getSetTypeFromName(setName) {
  const name = String(setName || '');
  if (name.includes('Marquee')) return 'Marquee';
  if (name.includes('Wicket Keeper')) return 'Wicket Keeper';
  if (name.includes('Batsman')) return 'Batsman';
  if (name.includes('Fast Bowler')) return 'Fast Bowler';
  if (name.includes('Spinner')) return 'Spinner';
  if (name.includes('All-rounder')) return 'All-rounder';
  return 'Batsman';
}

export function parsePlayerEntry(entry, setType = null) {
  const trimmed = String(entry || '').trim();
  if (!trimmed) {
    return { name: '', tag: null, isValid: false, error: 'Player name is empty' };
  }

  const dashIndex = trimmed.indexOf('-');
  if (dashIndex !== -1) {
    const beforeDash = trimmed.substring(0, dashIndex).trim();
    const afterDash = trimmed.substring(dashIndex + 1).trim();

    if (!afterDash) {
      return {
        name: beforeDash,
        normalizedName: normalizePlayerName(beforeDash),
        tag: null,
        isValid: false,
        error: 'Missing tag after dash'
      };
    }
    if (!beforeDash) {
      return { name: '', normalizedName: '', tag: null, isValid: false, error: 'Missing player name before dash' };
    }

    const tag = afterDash.toLowerCase();
    const validTags = ['wk', 'b', 'fb', 's', 'ar'];

    if (!validTags.includes(tag)) {
      return {
        name: beforeDash,
        normalizedName: normalizePlayerName(beforeDash),
        tag,
        isValid: false,
        error: `Invalid tag "${afterDash}"`
      };
    }

    return { name: beforeDash, normalizedName: normalizePlayerName(beforeDash), tag, isValid: true, error: null };
  }

  const name = trimmed;
  if (setType === 'Marquee') {
    return {
      name,
      normalizedName: normalizePlayerName(name),
      tag: null,
      isValid: false,
      error: 'Marquee set requires tags (use: Name - tag)'
    };
  }

  const setTypeToTag = {
    'Wicket Keeper': 'wk',
    Batsman: 'b',
    'Fast Bowler': 'fb',
    Spinner: 's',
    'All-rounder': 'ar'
  };

  const autoTag = setTypeToTag[setType] || 'b';
  return { name, normalizedName: normalizePlayerName(name), tag: autoTag, isValid: true, error: null, autoTagged: true };
}

/** Category for a sold player, derived from the set it was auctioned in. */
export function getCategoryFromPlayerData(playerData) {
  const setType = getSetTypeFromName(playerData.set);
  const parsed = parsePlayerEntry(playerData.fullEntry, setType);
  return tagToCategory(parsed.tag);
}

// =====================================================================
// IDENTITY
// =====================================================================

export function getUserId() {
  let userId = localStorage.getItem('auctionUserId');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    localStorage.setItem('auctionUserId', userId);
  }
  return userId;
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generatePlayerId() {
  return Date.now() + '_' + Math.random().toString(36).slice(2, 11);
}

export function toDisplayNameFromNormalized(normalizedName) {
  return String(normalizedName || '')
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// =====================================================================
// PLAYER IMAGES
// =====================================================================

export function getPlayerImageUrl(playerName) {
  const cleanName = sanitizeDisplayPlayerName(playerName);
  if (!cleanName) return PLAYER_PLACEHOLDER_IMAGE;
  return `https://scores.iplt20.com/ipl/playerimages/${encodeURIComponent(cleanName)}.png?v=2026`;
}

export function getPlayerHeadshotUrlsById(playerId) {
  const id = String(playerId || '').trim();
  if (!id) return [];
  return [
    `https://documents.iplt20.com/ipl/IPLHeadshot2026/${encodeURIComponent(id)}.png?v=2026`,
    `https://documents.iplt20.com/ipl/IPLHeadshot2025/${encodeURIComponent(id)}.png?v=2026`,
    `https://documents.iplt20.com/ipl/IPLHeadshot2024/${encodeURIComponent(id)}.png?v=2026`
  ];
}

export function getImageNameCandidates(inputNames = []) {
  const candidates = [];
  const normalizedSeen = new Set();

  inputNames.forEach(name => {
    const normalized = normalizePlayerName(name);
    if (!normalized || normalizedSeen.has(normalized)) return;
    normalizedSeen.add(normalized);

    const forced = playerImageNameAliases[normalized] || [];
    forced.forEach(forceName => {
      const cleanForce = sanitizeDisplayPlayerName(forceName);
      if (cleanForce && !candidates.includes(cleanForce)) candidates.push(cleanForce);
    });
  });

  inputNames.forEach(name => {
    const clean = sanitizeDisplayPlayerName(name);
    if (!clean) return;
    if (!candidates.includes(clean)) candidates.push(clean);

    const normalized = normalizePlayerName(clean);
    const aliasTarget = playerNameAliases[normalized];
    if (aliasTarget) {
      const aliasDisplay = toDisplayNameFromNormalized(aliasTarget);
      if (aliasDisplay && !candidates.includes(aliasDisplay)) candidates.push(aliasDisplay);
    }

    const imageAliases = playerImageNameAliases[normalized] || [];
    imageAliases.forEach(aliasName => {
      const aliasClean = sanitizeDisplayPlayerName(aliasName);
      if (aliasClean && !candidates.includes(aliasClean)) candidates.push(aliasClean);
    });
  });
  return candidates;
}

export function needsWhiteBackgroundFix(preferredNames = []) {
  return preferredNames.some(name => whiteBackgroundPlayers.has(normalizePlayerName(name)));
}

export function getNormalizedNameCandidates(name) {
  const normalized = normalizePlayerName(name);
  const candidates = [normalized];

  if (playerNameAliases[normalized]) candidates.push(playerNameAliases[normalized]);

  const compact = normalized.replace(/\s+/g, '');
  for (const [key, value] of Object.entries(playerNameAliases)) {
    if (key.replace(/\s+/g, '') === compact) candidates.push(value);
    if (value.replace(/\s+/g, '') === compact) candidates.push(key);
  }

  return [...new Set(candidates.filter(Boolean))];
}

function verifyImage(url) {
  return new Promise(resolve => {
    const testImg = new Image();
    testImg.onload = () => resolve(true);
    testImg.onerror = () => resolve(false);
    testImg.src = url;
  });
}

/**
 * Walks the candidate URL list in order and resolves with the first one that
 * actually loads, falling back to the IPL placeholder. Same probing order as
 * the original setPlayerImageWithContext().
 */
export async function resolvePlayerImageUrl(preferredNames = [], playerContext = null) {
  const uniqueNames = getImageNameCandidates(preferredNames);
  const imageQueue = [
    ...getPlayerHeadshotUrlsById(playerContext ? playerContext.playerId : null),
    ...uniqueNames.map(getPlayerImageUrl),
    PLAYER_PLACEHOLDER_IMAGE
  ];
  for (const url of imageQueue) {
    // eslint-disable-next-line no-await-in-loop
    if (await verifyImage(url)) return url;
  }
  return PLAYER_PLACEHOLDER_IMAGE;
}

// =====================================================================
// AGE
// =====================================================================

export function isValidDob(dob) {
  if (!dob) return false;
  const value = String(dob).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (value.startsWith('0000-00-00')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}

export function calculateAge(dob) {
  if (!isValidDob(dob)) return null;
  const birthDate = new Date(`${dob}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birthDate.getUTCMonth();
  const dayDiff = now.getUTCDate() - birthDate.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;

  return age >= 0 ? age : null;
}
