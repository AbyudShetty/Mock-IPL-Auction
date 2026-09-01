import { ref, set, get, update, remove, onValue, onDisconnect } from 'firebase/database';
import { database } from './client.js';

/**
 * Thin wrapper over the Realtime Database paths the auction uses.
 * The `rooms/{code}` schema is unchanged from the vanilla build, so rooms
 * created by either version stay compatible.
 */

const roomPath = code => `rooms/${code}`;

export function roomRef(code, child = '') {
  return ref(database, child ? `${roomPath(code)}/${child}` : roomPath(code));
}

// =====================================================================
// PRESENCE
// =====================================================================

export function setupPresenceSystem(roomCode, userId) {
  const myStatusRef = roomRef(roomCode, `participants/${userId}/isOnline`);
  set(myStatusRef, true);
  onDisconnect(myStatusRef).set(false);
  set(roomRef(roomCode, 'lastActive'), Date.now());
}

/** Deletes rooms idle for 10+ minutes with nobody online. */
export async function cleanupOldRooms() {
  const roomsRef = ref(database, 'rooms');
  try {
    const snapshot = await get(roomsRef);
    if (!snapshot.exists()) return;
    const now = Date.now();
    const TEN_MINUTES = 10 * 60 * 1000;
    const updates = {};
    let deletedCount = 0;

    for (const [code, room] of Object.entries(snapshot.val())) {
      const lastActive = room.lastActive || room.createdAt || 0;
      if (now - lastActive <= TEN_MINUTES) continue;
      const anyoneOnline = room.participants
        ? Object.values(room.participants).some(p => p.isOnline === true)
        : false;
      if (!anyoneOnline) {
        updates[code] = null;
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      await update(roomsRef, updates);
      console.log(`🧹 Janitor: Deleted ${deletedCount} inactive rooms.`);
    }
  } catch (error) {
    console.error('Janitor Error:', error);
  }
}

// =====================================================================
// ROOM LIFECYCLE
// =====================================================================

export async function createRoom(roomCode, userId, config) {
  const roomData = {
    config: {
      auctioneerName: config.auctioneerName,
      teamCount: config.teamCount,
      budget: config.budget,
      minPlayers: config.minPlayers,
      maxPlayers: config.maxPlayers,
      playerMode: config.playerMode,
      players: config.players,
      sets: config.sets
    },
    auctionState: {
      currentSetIndex: 0,
      currentPlayerIndex: 0,
      isSetAnnounced: false,
      isSecondRound: false,
      isAuctionStarted: false
    },
    auctioneer: userId,
    participants: {
      [userId]: { name: config.auctioneerName, role: 'auctioneer', joinedAt: Date.now(), isOnline: true }
    },
    teams: {
      [userId]: { name: config.auctioneerName, purse: config.budget, players: {}, playingXI: [], bench: [] }
    },
    unsoldPlayers: {},
    stats: { mostExpensivePlayer: { name: '', price: 0, team: '' }, totalPlayersSold: 0, totalMoneySpent: 0 },
    createdAt: Date.now(),
    lastActive: Date.now()
  };
  await set(roomRef(roomCode), roomData);
  return roomData;
}

export async function fetchRoom(roomCode) {
  const snapshot = await get(roomRef(roomCode));
  return snapshot.exists() ? snapshot.val() : null;
}

export function deleteRoom(roomCode) {
  return remove(roomRef(roomCode));
}

export async function joinRoomAsNewPlayer(roomCode, userId, teamName, budget) {
  await update(roomRef(roomCode), {
    [`participants/${userId}`]: { name: teamName, role: 'player', joinedAt: Date.now(), isOnline: true },
    [`teams/${userId}`]: { name: teamName, purse: budget, players: {}, playingXI: [], bench: [] }
  });
}

export function markParticipantOnline(roomCode, userId) {
  return update(roomRef(roomCode, `participants/${userId}`), { isOnline: true });
}

export function renameParticipant(roomCode, userId, newName) {
  return update(roomRef(roomCode), {
    [`participants/${userId}/name`]: newName,
    [`teams/${userId}/name`]: newName
  });
}

// =====================================================================
// LISTENERS
// =====================================================================

/**
 * Subscribes to every branch the client cares about.
 * Returns a single unsubscribe function that detaches all of them.
 */
export function subscribeToRoom(roomCode, handlers) {
  const unsubscribers = [
    onValue(roomRef(roomCode, 'participants'), snap => {
      if (snap.exists()) handlers.onParticipants(snap.val());
    }),
    onValue(roomRef(roomCode, 'auctionState'), snap => {
      if (snap.exists()) handlers.onAuctionState(snap.val());
    }),
    onValue(roomRef(roomCode, 'teams'), snap => {
      handlers.onTeams(snap.exists() ? snap.val() : {});
    }),
    onValue(roomRef(roomCode, 'unsoldPlayers'), snap => {
      handlers.onUnsold(snap.exists() ? snap.val() : {});
    }),
    onValue(roomRef(roomCode, 'config'), snap => {
      if (snap.exists()) handlers.onConfig(snap.val());
    })
  ];

  return () => unsubscribers.forEach(fn => typeof fn === 'function' && fn());
}

// =====================================================================
// WRITES (auctioneer only, except lineups)
// =====================================================================

export function pushAuctionState(roomCode, state) {
  return update(roomRef(roomCode), {
    auctionState: {
      currentSetIndex: state.currentSetIndex,
      currentPlayerIndex: state.currentPlayerIndex,
      isSetAnnounced: state.isSetAnnounced,
      isSecondRound: state.isSecondRound,
      isAuctionStarted: state.isAuctionStarted,
      ...(state.celebrationTime ? { celebrationTime: state.celebrationTime } : {})
    },
    lastActive: Date.now()
  });
}

export function pushCelebration(roomCode) {
  return update(roomRef(roomCode), { 'auctionState/celebrationTime': Date.now() });
}

export function pushUnsoldPlayers(roomCode, unsoldPlayers) {
  return update(roomRef(roomCode), { unsoldPlayers });
}

export function pushConfig(roomCode, config) {
  return update(roomRef(roomCode), { config });
}

export function pushPlayerSale(roomCode, teamId, newPurse, playerId, playerRecord) {
  return update(roomRef(roomCode), {
    [`teams/${teamId}/purse`]: newPurse,
    [`teams/${teamId}/players/${playerId}`]: playerRecord
  });
}

export function pushPlayerRemoval(roomCode, teamId, newPurse, playerId) {
  return update(roomRef(roomCode), {
    [`teams/${teamId}/purse`]: newPurse,
    [`teams/${teamId}/players/${playerId}`]: null
  });
}

export function pushPlayerMove(roomCode, from, to) {
  return update(roomRef(roomCode), {
    [`teams/${from.teamId}/purse`]: from.purse,
    [`teams/${from.teamId}/players/${from.playerId}`]: null,
    [`teams/${to.teamId}/purse`]: to.purse,
    [`teams/${to.teamId}/players/${to.playerId}`]: to.playerRecord
  });
}

export function pushLineup(roomCode, teamId, lineup) {
  return update(roomRef(roomCode), {
    [`teams/${teamId}/playingXI`]: lineup.playingXI,
    [`teams/${teamId}/bench`]: lineup.bench
  });
}

export function startAuction(roomCode, players) {
  return update(roomRef(roomCode), {
    'auctionState/isAuctionStarted': true,
    'auctionState/isSetAnnounced': true,
    'auctionState/currentSetIndex': 0,
    'auctionState/currentPlayerIndex': 0,
    'config/players': players
  });
}
