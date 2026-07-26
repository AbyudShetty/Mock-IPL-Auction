import {
  ref, set, onValue, update, get, remove, onDisconnect
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { database } from './firebase-init.js';
import { S } from './state.js';
import { getUserId, generateRoomCode, shuffleArray } from './utils.js';

export function setupPresenceSystem(roomCode, userId) {
  const myStatusRef = ref(database, `rooms/${roomCode}/participants/${userId}/isOnline`);
  const lastActiveRef = ref(database, `rooms/${roomCode}/lastActive`);
  set(myStatusRef, true);
  onDisconnect(myStatusRef).set(false);
  set(lastActiveRef, Date.now());
}

export async function cleanupOldRooms() {
  console.log("🧹 Running Janitor to clean old rooms...");
  const roomsRef = ref(database, 'rooms');
  try {
    const snapshot = await get(roomsRef);
    if (!snapshot.exists()) return;
    const rooms = snapshot.val();
    const now = Date.now();
    const TEN_MINUTES = 10 * 60 * 1000;
    const updates = {};
    let deletedCount = 0;
    for (const [code, room] of Object.entries(rooms)) {
      const lastActive = room.lastActive || room.createdAt || 0;
      if ((now - lastActive) > TEN_MINUTES) {
        let anyoneOnline = false;
        if (room.participants) anyoneOnline = Object.values(room.participants).some(p => p.isOnline === true);
        if (!anyoneOnline) { updates[code] = null; deletedCount++; }
      }
    }
    if (deletedCount > 0) { await update(roomsRef, updates); console.log(`🧹 Janitor: Deleted ${deletedCount} inactive rooms.`); }
  } catch (error) { console.error("Janitor Error:", error); }
}

export function setupWaitingLobby(roomCode, isHost) {
  document.getElementById('display-room-code').textContent = roomCode;
  document.getElementById('teams-total-count').textContent = S.teamCount;
  const roomLink = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  document.getElementById('room-link-input').value = roomLink;
  document.getElementById('start-auction-button').style.display = isHost ? 'block' : 'none';
  document.getElementById('edit-config-button').style.display = isHost ? 'flex' : 'none';
}

export function updateLobbyTeamsList(participants) {
  const container = document.getElementById('lobby-teams-list');
  const participantCount = Object.keys(participants).length;
  document.getElementById('teams-joined-count').textContent = participantCount;

  const existingItemsMap = new Map();
  container.querySelectorAll('.lobby-team-item').forEach(item => {
    const userId = item.dataset.userId;
    if (userId) existingItemsMap.set(userId, item);
  });

  const processedUserIds = new Set();
  Object.entries(participants).forEach(([userId, data]) => {
    processedUserIds.add(userId);
    const editBtnHtml = userId === S.currentUserId
      ? `<span class="edit-name-btn" onclick="window.enableInlineNameEdit(this)" title="Edit Name">✏️</span>`
      : '';
    const expectedRole = data.role === 'auctioneer' ? '👑 Auctioneer' : '🎮 Player';

    if (existingItemsMap.has(userId)) {
      const existingItem = existingItemsMap.get(userId);
      const nameSpan = existingItem.querySelector('.lobby-team-name');
      const roleSpan = existingItem.querySelector('.lobby-team-role');
      if (!existingItem.querySelector('.inline-edit-input')) {
        if (nameSpan.textContent !== data.name) nameSpan.textContent = data.name;
      }
      if (roleSpan.textContent !== expectedRole) {
        roleSpan.textContent = expectedRole;
        roleSpan.className = `lobby-team-role ${data.role}`;
      }
      const rightContainer = existingItem.querySelector('.role-container');
      if (rightContainer) rightContainer.innerHTML = `${editBtnHtml}<span class="lobby-team-role ${data.role}">${expectedRole}</span>`;
    } else {
      const teamItem = document.createElement('div');
      teamItem.className = 'lobby-team-item';
      teamItem.dataset.userId = userId;
      teamItem.innerHTML = `<span class="lobby-team-name">${data.name}</span><div class="role-container" style="display:flex;align-items:center;">${editBtnHtml}<span class="lobby-team-role ${data.role}">${expectedRole}</span></div>`;
      container.appendChild(teamItem);
    }
  });

  existingItemsMap.forEach((item, userId) => { if (!processedUserIds.has(userId)) item.remove(); });

  if (S.isAuctioneer) {
    const showStart = participantCount === S.teamCount;
    document.getElementById('start-auction-button').style.display = showStart ? 'block' : 'none';
    document.getElementById('lobby-waiting-message').style.display = showStart ? 'none' : 'block';
  }
}

export function listenToRoomUpdates(roomCode) {
  const participantsRef = ref(database, `rooms/${roomCode}/participants`);
  S.firebaseListeners.push(onValue(participantsRef, (snapshot) => {
    if (snapshot.exists()) { S.currentParticipants = snapshot.val(); updateLobbyTeamsList(S.currentParticipants); }
  }));

  const auctionStateRef = ref(database, `rooms/${roomCode}/auctionState`);
  S.firebaseListeners.push(onValue(auctionStateRef, (snapshot) => {
    if (snapshot.exists()) {
      const state = snapshot.val();
      if (state.celebrationTime && state.celebrationTime !== S.lastCelebrationTime) {
        if (S.lastCelebrationTime !== 0 && !S.isAuctioneer && typeof window.triggerBlockbusterCelebration === 'function') {
          window.triggerBlockbusterCelebration();
        }
        S.lastCelebrationTime = state.celebrationTime;
      }
      if (state.isAuctionStarted && document.getElementById('waiting-lobby').style.display !== 'none') {
        window.transitionToAuction();
      }
      if (!S.isAuctioneer && state.isAuctionStarted) {
        window.syncAuctionStateFromFirebase(state);
      }
    }
  }));

  const teamsRef = ref(database, `rooms/${roomCode}/teams`);
  S.firebaseListeners.push(onValue(teamsRef, (snapshot) => {
    if (snapshot.exists() && S.isAuctionStarted && Object.keys(S.teamIdMapping).length > 0) {
      window.syncTeamsFromFirebase(snapshot.val());
    }
  }));

  const unsoldRef = ref(database, `rooms/${roomCode}/unsoldPlayers`);
  S.firebaseListeners.push(onValue(unsoldRef, (snapshot) => {
    if (S.isAuctionStarted) {
      S.unsoldPlayers = snapshot.exists() ? snapshot.val() : {};
      if (typeof window.updateUnsoldPlayersList === 'function') window.updateUnsoldPlayersList();
      if (typeof window.updateStatistics === 'function') window.updateStatistics();
    }
  }));

  const configRef = ref(database, `rooms/${roomCode}/config`);
  S.firebaseListeners.push(onValue(configRef, (snapshot) => {
    if (snapshot.exists()) {
      const config = snapshot.val();
      Object.assign(S, { budget: config.budget, teamCount: config.teamCount, minPlayers: config.minPlayers, maxPlayers: config.maxPlayers, playerMode: config.playerMode, players: config.players, sets: config.sets });
      const el = document.getElementById('teams-total-count');
      if (el) el.textContent = S.teamCount;
      if (S.currentParticipants) updateLobbyTeamsList(S.currentParticipants);
      if (typeof window.updateAllVisibilityPanels === 'function') window.updateAllVisibilityPanels();
      if (!S.isAuctioneer && S.isAuctionStarted && typeof window.updateCurrentPlayerDisplay === 'function') window.updateCurrentPlayerDisplay();
    }
  }));
}

export function syncAuctionStateFromFirebase(state) {
  if (state.isSecondRound && !S.isSecondRound && typeof window.showUnsoldRoundModal === 'function') window.showUnsoldRoundModal();
  S.isAuctionStarted = state.isAuctionStarted;
  S.currentSetIndex = state.currentSetIndex;
  S.currentPlayerIndex = state.currentPlayerIndex;
  S.isSetAnnounced = state.isSetAnnounced;
  S.isSecondRound = state.isSecondRound || false;
  if (typeof window.updateCurrentPlayerDisplay === 'function') window.updateCurrentPlayerDisplay();
  if (typeof window.updateAllVisibilityPanels === 'function') window.updateAllVisibilityPanels();
}
window.syncAuctionStateFromFirebase = syncAuctionStateFromFirebase;

export function syncTeamsFromFirebase(teamsData) {
  S.allTeamsData = teamsData;
  Object.entries(teamsData).forEach(([teamId, teamData]) => {
    const teamName = S.teamIdMapping[teamId];
    if (!teamName) return;
    document.querySelectorAll('.team').forEach(div => {
      const divTeamName = div.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
      if (divTeamName !== teamName) return;
      const purse = (teamData.purse !== undefined && teamData.purse !== null) ? teamData.purse : S.budget;
      div.querySelector('.purse-amount').textContent = purse;
      window.updatePurseColor(div);

      const current = new Map();
      div.querySelectorAll('.section ul li').forEach(li => { const id = li.dataset.playerId; if (id) current.set(id, li); });
      const fbPlayers = new Set();

      if (teamData.players) {
        Object.entries(teamData.players).forEach(([pid, pd]) => {
          fbPlayers.add(pid);
          if (!current.has(pid)) {
            const cat = window.getCategoryFromPlayerData(pd);
            const sec = window.getSectionByCategory(div, cat);
            if (sec) {
              const li = document.createElement('li');
              li.textContent = `${pd.name} - ${pd.price} Crores`;
              li.dataset.playerId = pid;
              li.addEventListener('contextmenu', (e) => window.handlePlayerContextMenu(e, div, pid, pd.name, pd.price));
              sec.appendChild(li);
            }
          }
        });
      }
      current.forEach((li, pid) => { if (!fbPlayers.has(pid)) li.remove(); });
      window.updateTeamCounts(div);
    });
  });

  const modal = document.getElementById('team-management-modal');
  if (modal.style.display === 'block' && S.currentManagedTeam) {
    const watchedTeamId = S.currentManagedTeam.dataset.teamId;
    if (watchedTeamId !== S.myTeamId) { window.displayTeamLineupReadOnly(S.currentManagedTeam); }
    else {
      const remote = S.allTeamsData[watchedTeamId];
      if (remote && remote.players) {
        const fpMap = new Map(Object.values(remote.players).map(p => [p.name, p]));
        const domNames = new Set();
        document.querySelectorAll('.player-slot .player-item').forEach(item => {
          domNames.add(item.dataset.name);
          if (!fpMap.has(item.dataset.name)) {
            const slot = item.parentElement;
            slot.innerHTML = slot.dataset.slot ? `Slot ${slot.dataset.slot}` : 'Empty Slot';
            slot.classList.remove('filled');
            slot.dataset.filled = 'false';
          }
        });
        if (remote.playingXI) {
          remote.playingXI.forEach(p => {
            const slot = document.querySelector(`.player-slot[data-slot="${p.slot}"]`);
            const item = slot ? slot.querySelector('.player-item') : null;
            if (item && item.dataset.name === p.name) {
              const r = p.roles || {};
              if (r.c) item.dataset.c = 'true'; else delete item.dataset.c;
              if (r.vc) item.dataset.vc = 'true'; else delete item.dataset.vc;
              if (r.wk) item.dataset.wk = 'true'; else delete item.dataset.wk;
              window.updatePlayerBadges(item);
            }
          });
        }
        document.querySelectorAll('#bench-list .player-item').forEach(item => { domNames.add(item.dataset.name); if (!fpMap.has(item.dataset.name)) item.remove(); });
        const benchList = document.getElementById('bench-list');
        fpMap.forEach((pd, pn) => { if (!domNames.has(pn)) benchList.appendChild(window.createPlayerItem(pd.name, pd.price)); });
        window.updateXICount();
      }
    }
  }
  window.recalculateAuctionStats();
  window.updateStatistics();
}
window.syncTeamsFromFirebase = syncTeamsFromFirebase;

export function syncToFirebase() {
  if (S.gameMode !== 'online' || !S.isAuctioneer || !S.currentRoomCode) return;
  const state = { currentSetIndex: S.currentSetIndex, currentPlayerIndex: S.currentPlayerIndex, isSetAnnounced: S.isSetAnnounced, isSecondRound: S.isSecondRound, isAuctionStarted: S.isAuctionStarted };
  update(ref(database), { [`rooms/${S.currentRoomCode}/auctionState`]: state, [`rooms/${S.currentRoomCode}/lastActive`]: Date.now() });
}

export function syncPlayerSaleToFirebase(teamDiv, playerData, price, playerId) {
  if (S.gameMode !== 'online' || !S.isAuctioneer || !S.currentRoomCode) return;
  const teamName = teamDiv.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
  let teamId = null;
  Object.entries(S.teamIdMapping).forEach(([id, name]) => { if (name === teamName) teamId = id; });
  if (!teamId) return;
  get(ref(database, `rooms/${S.currentRoomCode}/teams/${teamId}`)).then(snapshot => {
    if (!snapshot.exists()) return;
    const team = snapshot.val();
    update(ref(database, `rooms/${S.currentRoomCode}`), {
      [`teams/${teamId}/purse`]: team.purse - price,
      [`teams/${teamId}/players/${playerId}`]: { name: playerData.player, price, set: playerData.set, fullEntry: playerData.fullEntry, addedAt: Date.now() }
    });
  });
}

export function syncUnsoldToFirebase() {
  if (S.gameMode !== 'online' || !S.isAuctioneer || !S.currentRoomCode) return;
  update(ref(database, `rooms/${S.currentRoomCode}`), { unsoldPlayers: S.unsoldPlayers });
}

export async function createOnlineRoom() {
  try {
    await cleanupOldRooms();
    const roomCode = generateRoomCode();
    S.currentUserId = getUserId();
    S.currentRoomCode = roomCode;
    S.myTeamId = S.currentUserId;
    const auctioneerName = document.getElementById('auctioneer-name').value.trim();
    const roomData = {
      config: { auctioneerName, teamCount: S.teamCount, budget: S.budget, minPlayers: S.minPlayers, maxPlayers: S.maxPlayers, playerMode: S.playerMode, players: S.players, sets: S.sets },
      auctionState: { currentSetIndex: 0, currentPlayerIndex: 0, isSetAnnounced: false, isSecondRound: false, isAuctionStarted: false },
      auctioneer: S.currentUserId, participants: {}, teams: {}, unsoldPlayers: {},
      stats: { mostExpensivePlayer: { name: '', price: 0, team: '' }, totalPlayersSold: 0, totalMoneySpent: 0 },
      createdAt: Date.now(), lastActive: Date.now()
    };
    roomData.participants[S.currentUserId] = { name: auctioneerName, role: 'auctioneer', joinedAt: Date.now(), isOnline: true };
    roomData.teams[S.currentUserId] = { name: auctioneerName, purse: S.budget, players: {}, playingXI: [], bench: [] };
    await set(ref(database, `rooms/${roomCode}`), roomData);
    setupPresenceSystem(roomCode, S.currentUserId);
    document.getElementById('initial-setup').style.display = 'none';
    document.getElementById('custom-players-setup').style.display = 'none';
    document.getElementById('waiting-lobby').style.display = 'flex';
    setupWaitingLobby(roomCode, true);
    listenToRoomUpdates(roomCode);
  } catch (error) { console.error('Error creating room:', error); alert('Failed to create room: ' + error.message); }
}

export async function handleJoinRoom() {
  const roomCodeInput = document.getElementById('join-room-code');
  const teamNameInput = document.getElementById('join-team-name');
  const roomCode = roomCodeInput.value.trim().toUpperCase();
  const teamName = teamNameInput.value.trim();

  let isValid = true;
  if (!roomCode || roomCode.length !== 6) { window.showError('join-room-code', "Enter a valid 6-character code"); isValid = false; } else window.clearError('join-room-code');
  if (!teamName) { window.showError('join-team-name', "Team name is required"); isValid = false; } else window.clearError('join-team-name');
  if (!isValid) return;

  try {
    const snapshot = await get(ref(database, `rooms/${roomCode}`));
    if (!snapshot.exists()) { window.showError('join-room-code', "Room not found!"); return; }
    const roomData = snapshot.val();
    const participants = roomData.participants || {};

    let existingUserId = null, isRejoining = false, isCurrentlyOnline = false;
    for (const [uid, pData] of Object.entries(participants)) {
      if (pData.name.toLowerCase() === teamName.toLowerCase()) { existingUserId = uid; isRejoining = true; isCurrentlyOnline = pData.isOnline === true; break; }
    }

    if (isRejoining) {
      if (isCurrentlyOnline) { window.showError('join-team-name', "Player is currently active in the room!"); return; }
      S.currentUserId = existingUserId; S.currentRoomCode = roomCode; S.myTeamId = existingUserId;
      S.isAuctioneer = participants[existingUserId].role === 'auctioneer';
      localStorage.setItem('auctionUserId', existingUserId);
      await update(ref(database, `rooms/${roomCode}/participants/${existingUserId}`), { isOnline: true });
    } else {
      const count = Object.keys(participants).length;
      if (count >= roomData.config.teamCount) { window.showError('join-room-code', "Room is full!"); return; }
      if (roomData.auctionState.isAuctionStarted) { window.showError('join-room-code', "Auction has already started!"); return; }
      S.currentUserId = getUserId(); S.currentRoomCode = roomCode; S.myTeamId = S.currentUserId; S.isAuctioneer = false;
      await update(ref(database, `rooms/${roomCode}`), {
        [`participants/${S.currentUserId}`]: { name: teamName, role: 'player', joinedAt: Date.now(), isOnline: true },
        [`teams/${S.currentUserId}`]: { name: teamName, purse: roomData.config.budget, players: {}, playingXI: [], bench: [] }
      });
    }

    setupPresenceSystem(roomCode, S.currentUserId);
    S.budget = roomData.config.budget; S.teamCount = roomData.config.teamCount; S.minPlayers = roomData.config.minPlayers;
    S.maxPlayers = roomData.config.maxPlayers; S.playerMode = roomData.config.playerMode; S.players = roomData.config.players; S.sets = roomData.config.sets;

    document.getElementById('join-room-screen').style.display = 'none';
    document.getElementById('waiting-lobby').style.display = 'flex';
    document.getElementById('start-auction-button').style.display = S.isAuctioneer ? 'block' : 'none';
    document.getElementById('lobby-waiting-message').style.display = S.isAuctioneer ? 'none' : 'block';

    setupWaitingLobby(roomCode, S.isAuctioneer);
    listenToRoomUpdates(roomCode);
    if (roomData.auctionState.isAuctionStarted) {
      window.transitionToAuction();
      setTimeout(() => { syncAuctionStateFromFirebase(roomData.auctionState); syncTeamsFromFirebase(roomData.teams); }, 500);
    }
  } catch (error) { console.error('Error joining room:', error); window.showError('join-room-code', "Connection failed. Try again."); }
}
window.handleJoinRoom = handleJoinRoom;

export async function startAuctionFromLobby() {
  if (!S.isAuctioneer) return;
  try {
    S.sets.forEach(setName => { if (S.players[setName]) shuffleArray(S.players[setName]); });
    await update(ref(database, `rooms/${S.currentRoomCode}`), {
      'auctionState/isAuctionStarted': true, 'auctionState/isSetAnnounced': true,
      'auctionState/currentSetIndex': 0, 'auctionState/currentPlayerIndex': 0, 'config/players': S.players
    });
    window.transitionToAuction();
  } catch (error) { console.error('Error starting auction:', error); alert('Failed to start auction'); }
}
window.startAuctionFromLobby = startAuctionFromLobby;

export async function updateOnlineRoomConfig() {
  if (!S.currentRoomCode || !S.isAuctioneer) return;
  try {
    await update(ref(database), {
      [`rooms/${S.currentRoomCode}/config`]: {
        auctioneerName: S.teamNames?.[0] || 'Auctioneer',
        teamCount: S.teamCount,
        budget: S.budget,
        minPlayers: S.minPlayers,
        maxPlayers: S.maxPlayers,
        playerMode: S.playerMode,
        players: S.players,
        sets: S.sets
      }
    });
  } catch (error) {
    console.error('Error updating config:', error);
  }
}
