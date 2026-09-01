import { useAuctionStore } from '../store/auctionStore.js';
import { extractPlayerName } from '../lib/utils.js';

export default function UnsoldPlayersPanel() {
  const { isSecondRound, isSetAnnounced, currentSetIndex, sets, unsoldPlayers } = useAuctionStore();

  // Round one lists every set that has unsold names; the unsold round only
  // lists what is still ahead.
  const setsWithUnsold = [];
  if (isSecondRound) {
    const startIndex = isSetAnnounced ? currentSetIndex : currentSetIndex + 1;
    for (let i = startIndex; i < sets.length; i++) {
      const setName = sets[i];
      if (unsoldPlayers[setName]?.length > 0) setsWithUnsold.push(setName);
    }
  } else {
    Object.keys(unsoldPlayers).forEach(setName => {
      if (unsoldPlayers[setName]?.length > 0) setsWithUnsold.push(setName);
    });
  }

  if (setsWithUnsold.length === 0) return null;

  const accent = isSecondRound ? '#f39c12' : '#e74c3c';

  return (
    <div id="unsold-players-container" style={{ display: 'block', borderLeftColor: accent }}>
      <h3 style={{ color: accent }}>{isSecondRound ? '🔄 Unsold Round' : '⏳ Unsold Players'}</h3>
      <div id="unsold-players-list">
        {setsWithUnsold.map(setName => {
          const list = unsoldPlayers[setName] || [];
          return (
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
          );
        })}
      </div>
    </div>
  );
}
