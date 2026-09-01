import { useAuctionStore } from '../store/auctionStore.js';
import TeamCard from './TeamCard.jsx';

export default function TeamsGrid() {
  const teams = useAuctionStore(s => s.teams);
  if (teams.length === 0) return null;

  return (
    <div id="teams-container" style={{ display: 'flex' }}>
      {teams.map(team => (
        <TeamCard key={team.id} team={team} />
      ))}
    </div>
  );
}
