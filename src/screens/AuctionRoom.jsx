import CurrentPlayerPanel from '../components/CurrentPlayerPanel.jsx';
import TeamsGrid from '../components/TeamsGrid.jsx';
import StatsPanel from '../components/StatsPanel.jsx';
import UpcomingSetsPanel from '../components/UpcomingSetsPanel.jsx';
import UnsoldPlayersPanel from '../components/UnsoldPlayersPanel.jsx';
import ResetControls from '../components/ResetControls.jsx';

export default function AuctionRoom() {
  return (
    <>
      <CurrentPlayerPanel />
      <TeamsGrid />
      <StatsPanel />
      <UpcomingSetsPanel />
      <UnsoldPlayersPanel />
      <ResetControls />
    </>
  );
}
