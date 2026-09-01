import { useAuctionStore } from '../../store/auctionStore.js';
import { getStatsSectionsForTag, resolvePlayerContext } from '../../lib/statsEngine.js';
import {
  calculateAge,
  formatStatValue,
  needsWhiteBackgroundFix,
  sanitizeDisplayPlayerName,
  tagToCategory
} from '../../lib/utils.js';
import { usePlayerImage } from '../../hooks/usePlayerImage.js';
import Modal from './Modal.jsx';

function StatsSection({ title, columns, rows }) {
  return (
    <div className="stats-section">
      <h4>{title}</h4>
      <div className="stats-table-container">
        <table className="stats-table expanded">
          <thead>
            <tr>
              <th>Season</th>
              {columns.map(col => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.season}>
                <td className={row.season === 'Career' ? 'career-label' : 'year-label'}>{row.season}</td>
                {row.data && row.data.noStatsForYear ? (
                  <td className="no-stats-cell" colSpan={columns.length}>
                    No stats available for year {row.season}
                  </td>
                ) : (
                  columns.map(col => <td key={col.key}>{formatStatValue(row.data[col.key])}</td>)
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PlayerStatsModal() {
  const player = useAuctionStore(s => s.statsModalPlayer);
  const closeStatsModal = useAuctionStore(s => s.closeStatsModal);

  const cleanName = player ? sanitizeDisplayPlayerName(player.name) : '';
  const resolved = player ? resolvePlayerContext(cleanName) : null;
  const resolvedName = resolved ? resolved.officialName : cleanName;
  const imageNames = player ? [resolvedName, cleanName, player.name] : [];
  const imageSrc = usePlayerImage(imageNames, resolved);
  const age = resolved && resolved.dob ? calculateAge(resolved.dob) : null;
  const playerData = resolved ? resolved.data : null;
  const sections = playerData ? getStatsSectionsForTag(playerData, player.tag) : [];

  return (
    <Modal
      id="player-stats-modal"
      open={Boolean(player)}
      onClose={closeStatsModal}
      contentClassName="modal-content stats-modal-content"
    >
      <button id="close-player-stats" className="close-stats-btn" type="button" onClick={closeStatsModal}>
        &times;
      </button>

      <div id="live-stats-card" className="broadcast-card" style={{ display: 'block' }}>
        <div className="card-header">
          <img
            id="stats-player-img"
            className={needsWhiteBackgroundFix(imageNames) ? 'white-bg-fix' : ''}
            src={imageSrc}
            alt={resolvedName || 'Player'}
          />
          <div className="header-info">
            <h3 id="stats-name">{resolvedName || cleanName || 'Player Name'}</h3>
            <span id="stats-role-badge" className="role-badge">
              {player ? tagToCategory(player.tag) : 'ROLE'}
            </span>
            {age !== null && (
              <p
                id="stats-age"
                style={{ display: 'block', margin: '6px 0 0 0', fontSize: '12px', color: '#b9d8ff', fontWeight: 600 }}
              >
                Age: {age}
              </p>
            )}
          </div>
        </div>

        <div id="stats-metrics-container" className="stats-sections">
          {playerData ? (
            sections.map(section => (
              <StatsSection key={section.title} title={section.title} columns={section.columns} rows={section.rows} />
            ))
          ) : (
            <div className="stats-section">
              <h4>Stats</h4>
              <p style={{ margin: 0, color: '#a0a0c0' }}>No official stats available for this player yet.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
