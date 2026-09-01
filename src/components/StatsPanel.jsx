import { useMemo, useState } from 'react';
import { useAuctionStore } from '../store/auctionStore.js';
import {
  computeAuctionStats,
  countUnsold,
  getCurrentPlayerView,
  getTeamPlayers
} from '../store/selectors.js';
import { extractPlayerName } from '../lib/utils.js';

/** Word-start matching, so "starc" finds "Mitchell Starc" but not "Starcher". */
const matchesSearch = (name, query) => {
  const lower = name.toLowerCase();
  return lower.startsWith(query) || lower.includes(' ' + query);
};

function useSearchResults(query) {
  const state = useAuctionStore();
  return useMemo(() => {
    if (query.length < 2) return null;
    const results = [];
    const seen = new Set();
    const push = result => {
      if (seen.has(result.name)) return;
      seen.add(result.name);
      results.push(result);
    };

    state.teams.forEach(team => {
      getTeamPlayers(team).forEach(player => {
        if (matchesSearch(player.name, query)) {
          push({ name: player.name, status: team.name, price: `${player.price} Cr`, type: 'sold' });
        }
      });
    });

    const onBlock = getCurrentPlayerView(state);
    const onBlockName = onBlock ? onBlock.buttonLabel : null;

    const scan = (pool, upcomingType, upcomingWhen, fallbackStatus) => {
      Object.entries(pool).forEach(([setName, list]) => {
        if (!Array.isArray(list)) return;
        list.forEach(entry => {
          const playerName = extractPlayerName(entry);
          if (!matchesSearch(playerName, query)) return;
          if (onBlockName === playerName) {
            push({ name: playerName, status: 'On The Block', price: 'BID NOW', type: 'current' });
          } else if (upcomingWhen) {
            push({ name: playerName, status: `Upcoming (${setName})`, price: '-', type: upcomingType });
          } else if (fallbackStatus) {
            push({ name: playerName, status: fallbackStatus, price: '-', type: 'unsold' });
          }
        });
      });
    };

    scan(state.unsoldPlayers, 'unsold-upcoming', state.isSecondRound, 'Unsold');
    scan(state.players, 'upcoming', !state.isSecondRound, null);

    return results;
  }, [query, state]);
}

export default function StatsPanel() {
  const teams = useAuctionStore(s => s.teams);
  const budget = useAuctionStore(s => s.budget);
  const unsoldPlayers = useAuctionStore(s => s.unsoldPlayers);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const normalizedQuery = query.toLowerCase().trim();
  const results = useSearchResults(normalizedQuery);

  const stats = useMemo(() => computeAuctionStats(teams), [teams]);
  const teamStats = useMemo(
    () =>
      teams
        .map(team => {
          const players = getTeamPlayers(team).length;
          const spent = budget - team.purse;
          return { name: team.name, spent, players };
        })
        .sort((a, b) => b.spent - a.spent),
    [teams, budget]
  );

  const totalUnsold = countUnsold(unsoldPlayers);
  const avgCost = stats.totalPlayersSold > 0 ? (stats.totalMoneySpent / stats.totalPlayersSold).toFixed(2) : 0;

  return (
    <div id="stats-panel" style={{ display: 'block' }}>
      <h3>📊 Auction Statistics</h3>

      <div className="global-search-container">
        <input
          type="text"
          id="global-player-search"
          placeholder="🔍 Search any player (e.g., Virat Kohli, Starc)..."
          autoComplete="off"
          value={query}
          onChange={event => {
            setQuery(event.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
        />
        {searchOpen && results && (
          <div id="search-results-dropdown" className="search-dropdown" style={{ display: 'block' }}>
            {results.length > 0 ? (
              results.map(result => (
                <div className="search-result-item" key={result.name}>
                  <div className="result-name">{result.name}</div>
                  <div className="result-status">
                    <span className={`status-badge ${result.type}`}>{result.status}</span>
                    {result.price !== '-' && <span className="result-price">{result.price}</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="search-result-item" style={{ justifyContent: 'center', color: '#a0a0c0' }}>
                No players found
              </div>
            )}
          </div>
        )}
      </div>

      <div id="stats-content">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Most Expensive:</span>
            <span className="stat-value">
              {stats.mostExpensivePlayer.name || 'N/A'} - {stats.mostExpensivePlayer.price} Cr
            </span>
            <span className="stat-subvalue">{stats.mostExpensivePlayer.team || ''}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Sold:</span>
            <span className="stat-value">{stats.totalPlayersSold} Players</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Unsold:</span>
            <span className="stat-value" style={{ color: '#27ae60' }}>
              {totalUnsold} Players
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg Cost:</span>
            <span className="stat-value">{avgCost} Cr</span>
          </div>
          {teamStats.length > 0 && (
            <>
              <div className="stat-item">
                <span className="stat-label">Highest Spender:</span>
                <span className="stat-value">{teamStats[0].name}</span>
                <span className="stat-subvalue">
                  {teamStats[0].spent} Cr ({teamStats[0].players} players)
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Lowest Spender:</span>
                <span className="stat-value">{teamStats[teamStats.length - 1].name}</span>
                <span className="stat-subvalue">
                  {teamStats[teamStats.length - 1].spent} Cr ({teamStats[teamStats.length - 1].players} players)
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
