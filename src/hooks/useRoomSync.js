import { useEffect } from 'react';
import { useAuctionStore } from '../store/auctionStore.js';
import { subscribeToRoom, setupPresenceSystem } from '../firebase/rooms.js';

/**
 * Keeps the store in step with `rooms/{code}` while an online room is active.
 * Attaches presence and detaches every listener when the room changes or the
 * app leaves online mode.
 */
export function useRoomSync() {
  const gameMode = useAuctionStore(s => s.gameMode);
  const roomCode = useAuctionStore(s => s.currentRoomCode);
  const userId = useAuctionStore(s => s.currentUserId);

  useEffect(() => {
    if (gameMode !== 'online' || !roomCode || !userId) return undefined;

    setupPresenceSystem(roomCode, userId);

    const unsubscribe = subscribeToRoom(roomCode, {
      onParticipants: participants => {
        useAuctionStore.getState().setParticipants(participants);
      },
      onAuctionState: state => {
        const store = useAuctionStore.getState();
        // The auctioneer is the writer; echoing its own state back would fight
        // with local optimistic updates.
        if (store.isAuctioneer) {
          if (state.isAuctionStarted && store.screen === 'lobby') store.goToScreen('auction');
          return;
        }
        store.applyRemoteAuctionState(state);
        if (state.isAuctionStarted && store.screen === 'lobby') store.goToScreen('auction');
      },
      onTeams: teamsData => {
        const store = useAuctionStore.getState();
        if (store.isAuctioneer && store.isAuctionStarted) {
          store.mergeRemoteTeamLineups(teamsData);
          return;
        }
        store.applyRemoteTeams(teamsData);
      },
      onUnsold: unsold => {
        const store = useAuctionStore.getState();
        if (store.isAuctioneer) return;
        store.applyRemoteUnsold(unsold);
      },
      onConfig: config => {
        const store = useAuctionStore.getState();
        if (store.isAuctioneer && store.isAuctionStarted) return;
        store.applyRemoteConfig(config);
      }
    });

    return unsubscribe;
  }, [gameMode, roomCode, userId]);
}
