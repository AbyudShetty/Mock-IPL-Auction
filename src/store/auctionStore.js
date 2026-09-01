import { create } from 'zustand';
import { defaultPlayers } from '../lib/config.js';
import {
  extractPlayerName,
  generatePlayerId,
  generateRoomCode,
  getCategoryFromPlayerData,
  getSetTypeFromName,
  getTeamLineupKey,
  getUserId,
  normalizePlayerName,
  parsePlayerEntry,
  shuffleArray
} from '../lib/utils.js';
import { triggerBlockbusterCelebration } from '../lib/celebration.js';
import { computeAuctionStats, findPlayerOwner, getTeamPlayers, getTeamSummary, isPlayerSold } from './selectors.js';
import * as rooms from '../firebase/rooms.js';

const emptyStats = () => ({
  mostExpensivePlayer: { name: '', price: 0, team: '' },
  totalPlayersSold: 0,
  totalMoneySpent: 0
});

const initialState = {
  // --- navigation -----------------------------------------------------
  screen: 'mode', // mode | onlineChoice | join | setup | customPlayers | lobby | auction
  gameMode: 'offline',
  isEditingConfig: false,

  // --- multiplayer identity -------------------------------------------
  isAuctioneer: false,
  currentRoomCode: null,
  currentUserId: null,
  myTeamId: null,
  auctioneerName: '',
  prefilledRoomCode: null,
  participants: {},
  lastCelebrationTime: 0,

  // --- configuration ---------------------------------------------------
  teamCount: 0,
  budget: 120,
  minPlayers: 15,
  maxPlayers: 20,
  playerMode: 'default',
  players: {},
  sets: [],
  customSetCards: [],

  // --- auction progress -------------------------------------------------
  isAuctionStarted: false,
  currentSetIndex: 0,
  currentPlayerIndex: 0,
  isSetAnnounced: false,
  isSecondRound: false,
  auctionComplete: false,
  unsoldPlayers: {},

  // --- teams ------------------------------------------------------------
  teams: [],

  // --- transient UI ------------------------------------------------------
  formErrors: {},
  pendingSale: null, // { playerData, teamId }
  playerToMove: null,
  managedTeamId: null,
  showUnsoldRoundModal: false,
  statsModalPlayer: null,
  activeStatsPlayer: null
};

export const useAuctionStore = create((set, get) => ({
  ...initialState,

  // ===================================================================
  // NAVIGATION
  // ===================================================================

  goToScreen: screen => set({ screen }),

  handleModeSelection: mode =>
    set({ gameMode: mode, screen: mode === 'online' ? 'onlineChoice' : 'setup' }),

  handleOnlineChoice: choice =>
    set({ isAuctioneer: choice === 'create', screen: choice === 'create' ? 'setup' : 'join' }),

  backFromSetup: () => {
    const { isEditingConfig, gameMode } = get();
    if (isEditingConfig) {
      set({ isEditingConfig: false, screen: 'lobby' });
      return;
    }
    set({ screen: gameMode === 'online' ? 'onlineChoice' : 'mode' });
  },

  openConfigEditor: () => set({ isEditingConfig: true, screen: 'setup' }),

  // ===================================================================
  // FORM ERRORS
  // ===================================================================

  setFieldError: (field, message) =>
    set(state => ({ formErrors: { ...state.formErrors, [field]: message } })),

  clearFieldError: field =>
    set(state => {
      const next = { ...state.formErrors };
      delete next[field];
      return { formErrors: next };
    }),

  clearAllErrors: () => set({ formErrors: {} }),

  // ===================================================================
  // CONFIGURATION
  // ===================================================================

  applyConfig: config => set(config),

  useDefaultPlayerPool: () =>
    set({
      players: JSON.parse(JSON.stringify(defaultPlayers)),
      sets: Object.keys(defaultPlayers)
    }),

  setCustomSetCards: customSetCards => set({ customSetCards }),

  applyCustomPlayerPool: customPlayers =>
    set({ players: JSON.parse(JSON.stringify(customPlayers)), sets: Object.keys(customPlayers) }),

  // ===================================================================
  // TEAM CREATION (offline)
  // ===================================================================

  createLocalTeams: () => {
    const { teamCount, budget } = get();
    const teams = Array.from({ length: teamCount }, (_, i) => ({
      id: `team_${i}`,
      name: `Team ${i + 1}`,
      purse: budget,
      players: {},
      playingXI: [],
      bench: [],
      manualDisq: false
    }));
    set({ teams, screen: 'auction' });
    get().announceSet();
  },

  renameTeam: (teamId, newName) =>
    set(state => ({
      teams: state.teams.map(team => (team.id === teamId ? { ...team, name: newName } : team))
    })),

  // ===================================================================
  // MULTIPLAYER SESSION
  // ===================================================================

  setSession: session => set(session),

  setParticipants: participants => set({ participants }),

  createOnlineRoom: async auctioneerName => {
    const s = get();
    await rooms.cleanupOldRooms();
    const roomCode = generateRoomCode();
    const userId = getUserId();
    const config = {
      auctioneerName,
      teamCount: s.teamCount,
      budget: s.budget,
      minPlayers: s.minPlayers,
      maxPlayers: s.maxPlayers,
      playerMode: s.playerMode,
      players: s.players,
      sets: s.sets
    };
    await rooms.createRoom(roomCode, userId, config);
    set({
      currentRoomCode: roomCode,
      currentUserId: userId,
      myTeamId: userId,
      isAuctioneer: true,
      auctioneerName,
      screen: 'lobby'
    });
  },

  updateOnlineRoomConfig: async () => {
    const s = get();
    if (!s.currentRoomCode || !s.isAuctioneer) return;
    await rooms.pushConfig(s.currentRoomCode, {
      auctioneerName: s.auctioneerName || 'Auctioneer',
      teamCount: s.teamCount,
      budget: s.budget,
      minPlayers: s.minPlayers,
      maxPlayers: s.maxPlayers,
      playerMode: s.playerMode,
      players: s.players,
      sets: s.sets
    });
    set({ isEditingConfig: false, screen: 'lobby' });
  },

  /** Auctioneer: shuffle every set, flip the room to started, and enter. */
  startAuctionFromLobby: async () => {
    const s = get();
    if (!s.isAuctioneer) return;
    const players = { ...s.players };
    s.sets.forEach(setName => {
      if (players[setName]) players[setName] = shuffleArray([...players[setName]]);
    });
    set({
      players,
      isAuctionStarted: true,
      isSetAnnounced: true,
      currentSetIndex: 0,
      currentPlayerIndex: 0,
      screen: 'auction'
    });
    try {
      await rooms.startAuction(s.currentRoomCode, players);
    } catch (error) {
      console.error('Error starting auction:', error);
      window.alert('Failed to start auction');
    }
  },

  /** Replaces local teams with the authoritative Firebase snapshot. */
  applyRemoteTeams: teamsData => {
    const order = get().teams.map(t => t.id);
    const incoming = Object.entries(teamsData || {}).map(([id, data]) => ({
      id,
      name: data.name,
      purse: data.purse === undefined || data.purse === null ? get().budget : data.purse,
      players: data.players || {},
      playingXI: data.playingXI || [],
      bench: data.bench || [],
      manualDisq: false
    }));
    // Keep a stable on-screen ordering across snapshots.
    incoming.sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    set({ teams: incoming });
  },

  /**
   * Auctioneer variant: the auctioneer owns purse and squad, each owner owns
   * their own lineup — so only names and lineups are taken from the snapshot.
   * Prevents an unrelated lineup write from clobbering an in-flight sale.
   */
  mergeRemoteTeamLineups: teamsData => {
    const data = teamsData || {};
    set(state => ({
      teams: state.teams.map(team => {
        const remote = data[team.id];
        if (!remote) return team;
        return {
          ...team,
          name: remote.name || team.name,
          playingXI: remote.playingXI || [],
          bench: remote.bench || []
        };
      })
    }));
  },

  applyRemoteAuctionState: state => {
    const current = get();
    if (state.isSecondRound && !current.isSecondRound) set({ showUnsoldRoundModal: true });
    if (
      state.celebrationTime &&
      state.celebrationTime !== current.lastCelebrationTime &&
      current.lastCelebrationTime !== 0 &&
      !current.isAuctioneer
    ) {
      triggerBlockbusterCelebration();
    }
    set({
      isAuctionStarted: state.isAuctionStarted,
      currentSetIndex: state.currentSetIndex,
      currentPlayerIndex: state.currentPlayerIndex,
      isSetAnnounced: state.isSetAnnounced,
      isSecondRound: state.isSecondRound || false,
      lastCelebrationTime: state.celebrationTime || current.lastCelebrationTime
    });
  },

  applyRemoteUnsold: unsoldPlayers => set({ unsoldPlayers: unsoldPlayers || {} }),

  applyRemoteConfig: config =>
    set({
      budget: config.budget,
      teamCount: config.teamCount,
      minPlayers: config.minPlayers,
      maxPlayers: config.maxPlayers,
      playerMode: config.playerMode,
      players: config.players || {},
      sets: config.sets || []
    }),

  // ===================================================================
  // FIREBASE PUSH HELPERS
  // ===================================================================

  /** No-ops unless we are the online auctioneer. */
  syncAuctionState: () => {
    const s = get();
    if (s.gameMode !== 'online' || !s.isAuctioneer || !s.currentRoomCode) return;
    rooms.pushAuctionState(s.currentRoomCode, s);
  },

  syncUnsold: () => {
    const s = get();
    if (s.gameMode !== 'online' || !s.isAuctioneer || !s.currentRoomCode) return;
    rooms.pushUnsoldPlayers(s.currentRoomCode, s.unsoldPlayers);
  },

  // ===================================================================
  // AUCTION FLOW
  // ===================================================================

  announceSet: () => {
    const s = get();
    const currentSet = s.sets[s.currentSetIndex];

    if (s.isSecondRound) {
      const list = s.unsoldPlayers[currentSet];
      if (list && list.length > 0) {
        if ((s.gameMode === 'offline' || s.isAuctioneer) && s.currentPlayerIndex === 0) {
          const shuffled = shuffleArray([...list]);
          set(state => ({ unsoldPlayers: { ...state.unsoldPlayers, [currentSet]: shuffled } }));
        }
      } else {
        const nextIndex = s.currentSetIndex + 1;
        if (nextIndex >= s.sets.length) {
          window.alert('Auction is over! All unsold players have been processed.');
          return;
        }
        set({ currentSetIndex: nextIndex });
        get().announceSet();
        return;
      }
    }

    set({ isSetAnnounced: true });
    get().syncAuctionState();
  },

  startSetAuction: () => {
    const s = get();
    if (s.gameMode === 'online' && !s.isAuctioneer) return;
    set({ isAuctionStarted: true });
    if (s.isSetAnnounced) {
      set({ isSetAnnounced: false });
    }
    get().syncAuctionState();
  },

  nextPlayer: () => {
    const s = get();
    if (s.gameMode === 'online' && !s.isAuctioneer) return;

    const currentSet = s.sets[s.currentSetIndex];
    const playerList = s.isSecondRound ? s.unsoldPlayers[currentSet] : s.players[currentSet];

    // Skipping a player in round one queues them for the unsold round.
    let unsoldPlayers = s.unsoldPlayers;
    if (playerList && playerList.length > 0 && s.currentPlayerIndex < playerList.length) {
      const entry = playerList[s.currentPlayerIndex];
      const name = extractPlayerName(entry);
      if (!isPlayerSold(s.teams, name) && !s.isSecondRound) {
        const setList = unsoldPlayers[currentSet] || [];
        const setType = getSetTypeFromName(currentSet);
        const already = setList.some(
          e => normalizePlayerName(parsePlayerEntry(e, setType).name) === normalizePlayerName(name)
        );
        if (!already) {
          unsoldPlayers = { ...unsoldPlayers, [currentSet]: [...setList, entry] };
        }
      }
    }

    const nextPlayerIndex = s.currentPlayerIndex + 1;
    const listLength = playerList ? playerList.length : 0;

    if (listLength === 0 || nextPlayerIndex >= listLength) {
      const nextSetIndex = s.currentSetIndex + 1;
      if (nextSetIndex >= s.sets.length) {
        set({ unsoldPlayers });
        get().handleEndOfSets();
        return;
      }
      set({ unsoldPlayers, currentPlayerIndex: 0, currentSetIndex: nextSetIndex });
      get().announceSet();
    } else {
      set({ unsoldPlayers, currentPlayerIndex: nextPlayerIndex });
      get().syncAuctionState();
    }

    get().syncUnsold();
  },

  handleEndOfSets: () => {
    const s = get();
    if (s.isSecondRound) {
      get().checkTeamQualification();
      return;
    }

    const unsoldPlayers = get().collectAllUnsoldPlayers();
    const hasUnsoldPlayers = Object.values(unsoldPlayers).some(list => list && list.length > 0);

    set({ unsoldPlayers, isSecondRound: true, currentSetIndex: 0, currentPlayerIndex: 0 });

    if (!hasUnsoldPlayers) {
      get().checkTeamQualification();
      return;
    }

    set({ showUnsoldRoundModal: true });
    get().syncAuctionState();
    get().syncUnsold();
    get().announceSet();
  },

  /** Everyone in the pool who never found a buyer, per set. */
  collectAllUnsoldPlayers: () => {
    const s = get();
    const unsold = { ...s.unsoldPlayers };
    s.sets.forEach(setName => {
      const pool = s.players[setName];
      if (!pool) {
        unsold[setName] = unsold[setName] || [];
        return;
      }
      unsold[setName] = pool.filter(entry => !isPlayerSold(s.teams, extractPlayerName(entry)));
    });
    return unsold;
  },

  checkTeamQualification: () => {
    const s = get();
    const config = { budget: s.budget, minPlayers: s.minPlayers, maxPlayers: s.maxPlayers };
    const disqualifiedTeams = [];

    const teams = s.teams.map(team => {
      const summary = getTeamSummary({ ...team, manualDisq: false }, config);
      let reason = '';
      if (summary.total < s.minPlayers) reason = 'Minimum players not reached';
      else if (summary.indians < 8) reason = 'Need 8 Indians';
      if (reason) disqualifiedTeams.push(`${team.name}: ${reason}`);
      return { ...team, manualDisq: Boolean(reason) };
    });

    set({ teams, auctionComplete: true, activeStatsPlayer: null, statsModalPlayer: null });

    if (disqualifiedTeams.length > 0) {
      window.alert('Auction over!\n\nDisqualified teams:\n' + disqualifiedTeams.join('\n'));
    } else {
      window.alert('Auction is over! All teams qualified.');
    }
  },

  // ===================================================================
  // SELLING
  // ===================================================================

  openPriceModal: (playerData, teamId) => set({ pendingSale: { playerData, teamId } }),
  closePriceModal: () => set({ pendingSale: null }),

  /** Returns an error string, or null on success. */
  sellPlayer: cost => {
    const s = get();
    if (!s.pendingSale) return 'No pending sale';
    const { playerData, teamId } = s.pendingSale;
    const team = s.teams.find(t => t.id === teamId);
    if (!team) return 'Team not found';

    const newPurse = team.purse - cost;
    if (newPurse < 0) return 'Not enough budget!';

    const playerId = generatePlayerId();
    const record = {
      name: playerData.player,
      price: cost,
      set: playerData.set,
      fullEntry: playerData.fullEntry,
      addedAt: Date.now()
    };

    const totalAfterSale = getTeamPlayers(team).length + 1;
    const shouldCelebrate = cost >= 18 || totalAfterSale === s.minPlayers;

    set(state => ({
      teams: state.teams.map(t =>
        t.id === teamId
          ? { ...t, purse: newPurse, manualDisq: false, players: { ...t.players, [playerId]: record } }
          : t
      ),
      pendingSale: null
    }));

    if (shouldCelebrate) triggerBlockbusterCelebration();

    if (s.gameMode === 'online' && s.isAuctioneer && s.currentRoomCode) {
      rooms.pushPlayerSale(s.currentRoomCode, teamId, newPurse, playerId, record);
      if (shouldCelebrate) rooms.pushCelebration(s.currentRoomCode);
    }

    get().nextPlayer();
    return null;
  },

  // ===================================================================
  // CORRECTIONS (right-click move)
  // ===================================================================

  openMoveModal: playerToMove => set({ playerToMove }),
  closeMoveModal: () => set({ playerToMove: null }),

  /** Returns an error string, or null on success. */
  movePlayer: (targetTeamId, newPrice) => {
    const s = get();
    const move = s.playerToMove;
    if (!move) return 'Nothing to move';
    if (!targetTeamId) return 'Please select a team to move to.';
    if (Number.isNaN(newPrice) || newPrice < 0) return 'Please enter a valid price.';

    const sourceTeam = s.teams.find(t => t.id === move.teamId);
    const targetTeam = s.teams.find(t => t.id === targetTeamId);
    if (!sourceTeam || !targetTeam) return 'Team not found';

    const existing = sourceTeam.players[move.playerId];
    const fullEntry = existing?.fullEntry || get().findFullEntry(move.name) || move.name;
    const setName = existing?.set || getSetTypeFromName(fullEntry);

    const sourcePurse = sourceTeam.purse + move.price;
    const targetPurse = targetTeam.purse - newPrice;
    const record = { name: move.name, price: newPrice, set: setName, fullEntry, addedAt: Date.now() };

    set(state => ({
      teams: state.teams.map(team => {
        if (team.id === move.teamId) {
          const players = { ...team.players };
          delete players[move.playerId];
          return { ...team, purse: sourcePurse, players, manualDisq: false };
        }
        if (team.id === targetTeamId) {
          return {
            ...team,
            purse: targetPurse,
            manualDisq: false,
            players: { ...team.players, [move.playerId]: record }
          };
        }
        return team;
      }),
      playerToMove: null
    }));

    if (s.gameMode === 'online' && s.isAuctioneer && s.currentRoomCode) {
      rooms.pushPlayerMove(
        s.currentRoomCode,
        { teamId: move.teamId, purse: sourcePurse, playerId: move.playerId },
        { teamId: targetTeamId, purse: targetPurse, playerId: move.playerId, playerRecord: record }
      );
    }

    return null;
  },

  /** Looks a player's original pool entry back up, for tag/nationality data. */
  findFullEntry: playerName => {
    const s = get();
    const target = normalizePlayerName(playerName);
    for (const pool of [s.players, s.unsoldPlayers]) {
      for (const list of Object.values(pool)) {
        if (!Array.isArray(list)) continue;
        const found = list.find(entry => normalizePlayerName(extractPlayerName(entry)) === target);
        if (found) return found;
      }
    }
    return '';
  },

  // ===================================================================
  // UNDO
  // ===================================================================

  globalUndo: () => {
    const s = get();
    if (s.gameMode === 'online' && !s.isAuctioneer) return;

    let prevSetIndex = s.currentSetIndex;
    let prevPlayerIndex = s.currentPlayerIndex - 1;

    if (prevPlayerIndex < 0) {
      prevSetIndex--;
      if (prevSetIndex < 0) {
        window.alert('This is the start of the auction. Cannot undo further.');
        return;
      }
      const prevSetName = s.sets[prevSetIndex];
      const prevList = s.isSecondRound ? s.unsoldPlayers[prevSetName] : s.players[prevSetName];
      prevPlayerIndex = !prevList || prevList.length === 0 ? 0 : prevList.length - 1;
    }

    const targetSet = s.sets[prevSetIndex];
    const targetList = s.isSecondRound ? s.unsoldPlayers[targetSet] : s.players[targetSet];

    if (!targetList || !targetList[prevPlayerIndex]) {
      set({ currentSetIndex: prevSetIndex, currentPlayerIndex: 0, isSetAnnounced: false });
      get().syncAuctionState();
      return;
    }

    const playerName = extractPlayerName(targetList[prevPlayerIndex]);
    let actionReversed = false;
    let unsoldPlayers = s.unsoldPlayers;

    // Case 1: the player was skipped — pull them back out of the unsold queue.
    if (!s.isSecondRound && unsoldPlayers[targetSet]) {
      const foundIndex = unsoldPlayers[targetSet].findIndex(
        entry => normalizePlayerName(extractPlayerName(entry)) === normalizePlayerName(playerName)
      );
      if (foundIndex !== -1) {
        const list = [...unsoldPlayers[targetSet]];
        list.splice(foundIndex, 1);
        unsoldPlayers = { ...unsoldPlayers, [targetSet]: list };
        actionReversed = true;
      }
    }

    // Case 2: the player was sold — refund the buyer and remove them.
    if (!actionReversed) {
      const owner = findPlayerOwner(s.teams, playerName);
      if (owner) {
        get().undoPlayerSale(owner.team.id, owner.player.id, owner.player.price, owner.player.name);
      }
    }

    set({
      unsoldPlayers,
      currentSetIndex: prevSetIndex,
      currentPlayerIndex: prevPlayerIndex,
      isSetAnnounced: false,
      auctionComplete: false
    });
    get().syncAuctionState();
    get().syncUnsold();
  },

  undoPlayerSale: (teamId, playerId, cost, playerName) => {
    const s = get();
    const team = s.teams.find(t => t.id === teamId);
    if (!team) return;
    const newPurse = team.purse + parseFloat(cost);

    set(state => ({
      teams: state.teams.map(t => {
        if (t.id !== teamId) return t;
        const players = { ...t.players };
        delete players[playerId];
        return { ...t, purse: newPurse, players, manualDisq: false };
      })
    }));

    // Drop the player out of any saved lineup for this team.
    try {
      const key = getTeamLineupKey(team.name);
      const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (saved) {
        saved.playingXI = (saved.playingXI || []).filter(p => p.name !== playerName);
        saved.bench = (saved.bench || []).filter(p => p.name !== playerName);
        sessionStorage.setItem(key, JSON.stringify(saved));
      }
    } catch {
      /* lineup cache is best-effort */
    }

    if (s.gameMode === 'online' && s.isAuctioneer && s.currentRoomCode) {
      rooms.pushPlayerRemoval(s.currentRoomCode, teamId, newPurse, playerId);
    }
  },

  // ===================================================================
  // TEAM MANAGEMENT MODAL
  // ===================================================================

  openTeamManagement: teamId => set({ managedTeamId: teamId }),
  closeTeamManagement: () => set({ managedTeamId: null }),

  saveLineup: (teamId, lineup) => {
    const s = get();
    const team = s.teams.find(t => t.id === teamId);
    if (!team) return;
    sessionStorage.setItem(getTeamLineupKey(team.name), JSON.stringify(lineup));
    set(state => ({
      teams: state.teams.map(t =>
        t.id === teamId ? { ...t, playingXI: lineup.playingXI, bench: lineup.bench } : t
      )
    }));
    if (s.gameMode === 'online' && s.currentRoomCode && teamId === s.myTeamId) {
      rooms.pushLineup(s.currentRoomCode, teamId, lineup);
    }
  },

  // ===================================================================
  // MODALS
  // ===================================================================

  setActiveStatsPlayer: activeStatsPlayer => set({ activeStatsPlayer }),
  openStatsModal: player => set({ statsModalPlayer: player }),
  closeStatsModal: () => set({ statsModalPlayer: null }),
  closeUnsoldRoundModal: () => set({ showUnsoldRoundModal: false }),

  // ===================================================================
  // RESET
  // ===================================================================

  restartAuction: () => {
    const s = get();
    if (s.gameMode === 'online' && !s.isAuctioneer) {
      window.alert('Only the auctioneer can restart the auction!');
      return;
    }
    if (
      !window.confirm(
        'Are you sure you want to restart the auction? All player assignments will be cleared but teams will remain.'
      )
    ) {
      return;
    }
    sessionStorage.clear();
    set(state => ({
      currentSetIndex: 0,
      currentPlayerIndex: 0,
      isSetAnnounced: false,
      isSecondRound: false,
      unsoldPlayers: {},
      isAuctionStarted: false,
      auctionComplete: false,
      activeStatsPlayer: null,
      statsModalPlayer: null,
      managedTeamId: null,
      teams: state.teams.map(team => ({
        ...team,
        purse: state.budget,
        players: {},
        playingXI: [],
        bench: [],
        manualDisq: false
      }))
    }));
    get().announceSet();
  },

  resetAuction: () => {
    const s = get();
    if (s.gameMode === 'online' && !s.isAuctioneer) {
      window.alert('Only the auctioneer can reset the auction!');
      return;
    }
    if (!window.confirm('Are you sure you want to reset the entire auction? All progress will be lost.')) return;
    if (s.gameMode === 'online' && s.currentRoomCode) rooms.deleteRoom(s.currentRoomCode);
    sessionStorage.clear();
    set({ ...initialState });
  }
}));

/** Convenience selectors used across components. */
export const selectConfig = state => ({
  budget: state.budget,
  minPlayers: state.minPlayers,
  maxPlayers: state.maxPlayers
});

export const selectAuctionStats = state => computeAuctionStats(state.teams);

export const selectCurrentSet = state => state.sets[state.currentSetIndex];

export const selectCurrentPlayerList = state => {
  const setName = state.sets[state.currentSetIndex];
  return (state.isSecondRound ? state.unsoldPlayers[setName] : state.players[setName]) || [];
};

export const selectCanControl = state =>
  state.gameMode === 'offline' || (state.gameMode === 'online' && state.isAuctioneer);

export { getCategoryFromPlayerData, emptyStats };
