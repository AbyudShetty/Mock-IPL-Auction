import { useEffect } from 'react';
import { useAuctionStore } from './store/auctionStore.js';
import { useRoomSync } from './hooks/useRoomSync.js';
import { loadPlayerStats } from './lib/statsEngine.js';

import ModeSelection from './screens/ModeSelection.jsx';
import OnlineChoice from './screens/OnlineChoice.jsx';
import JoinRoom from './screens/JoinRoom.jsx';
import WaitingLobby from './screens/WaitingLobby.jsx';
import InitialSetup from './screens/InitialSetup.jsx';
import CustomPlayersSetup from './screens/CustomPlayersSetup.jsx';
import AuctionRoom from './screens/AuctionRoom.jsx';

import PriceModal from './components/modals/PriceModal.jsx';
import MovePlayerModal from './components/modals/MovePlayerModal.jsx';
import PlayerStatsModal from './components/modals/PlayerStatsModal.jsx';
import TeamManagementModal from './components/modals/TeamManagementModal.jsx';
import UnsoldRoundModal from './components/modals/UnsoldRoundModal.jsx';

export default function App() {
  const screen = useAuctionStore(s => s.screen);
  const setSession = useAuctionStore(s => s.setSession);

  useRoomSync();

  // Stats snapshots are fetched once and cached in the stats-engine module.
  useEffect(() => {
    loadPlayerStats();
  }, []);

  // A ?room=CODE deep link drops straight into the join screen.
  useEffect(() => {
    const roomCode = new URLSearchParams(window.location.search).get('room');
    if (roomCode) {
      setSession({ gameMode: 'online', screen: 'join', prefilledRoomCode: roomCode.toUpperCase() });
    }
  }, [setSession]);

  return (
    <>
      <div className="container">
        <h1 className="main-title">🐐 GOATED AUCTION 🐐</h1>

        {screen === 'mode' && <ModeSelection />}
        {screen === 'onlineChoice' && <OnlineChoice />}
        {screen === 'join' && <JoinRoom />}
        {screen === 'lobby' && <WaitingLobby />}
        {screen === 'setup' && <InitialSetup />}
        {screen === 'customPlayers' && <CustomPlayersSetup />}
        {screen === 'auction' && <AuctionRoom />}
      </div>

      <PriceModal />
      <MovePlayerModal />
      <PlayerStatsModal />
      <TeamManagementModal />
      <UnsoldRoundModal />
    </>
  );
}
