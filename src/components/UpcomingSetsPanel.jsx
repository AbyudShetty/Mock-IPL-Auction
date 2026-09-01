import { useAuctionStore } from '../store/auctionStore.js';
import { extractPlayerName } from '../lib/utils.js';

export default function UpcomingSetsPanel() {
  const { isAuctionStarted, isSecondRound, isSetAnnounced, currentSetIndex, sets, players } = useAuctionStore();

  if (!isAuctionStarted || isSecondRound) return null;

  const startIndex = isSetAnnounced ? currentSetIndex : currentSetIndex + 1;
  const entries = [];
  for (let i = startIndex; i < sets.length; i++) {
    const setName = sets[i];
    const list = players[setName] || [];
    if (list.length === 0) continue;
    entries.push({ setName, list });
  }

  if (entries.length === 0) return null;

  return (
    <div id="upcoming-sets-container" style={{ display: 'block' }}>
      <h3>📅 Upcoming Sets</h3>
      <div id="upcoming-sets-list">
        {entries.map(({ setName, list }) => (
          <div className="set-entry" key={setName}>
            <div className="set-entry-header">
              <span>{setName}</span>
              <span className="player-count">{list.length} players</span>
            </div>
            <div className="set-entry-players">
              {list.map((entry, index) => (
                <span className="player-name-item" key={`${setName}-${index}`}>
                  {extractPlayerName(entry)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
