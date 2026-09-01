import { useEffect, useRef } from 'react';
import { useAuctionStore, selectCanControl } from '../store/auctionStore.js';
import { CATEGORY_SECTIONS, getPurseColor, getTeamSummary, groupPlayersByCategory } from '../store/selectors.js';

/**
 * Renders no children, so React never reconciles the text the user is typing.
 * The name is written imperatively and only read back on blur.
 */
function TeamNameText({ name, editable, onCommit }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== name) ref.current.textContent = name;
  }, [name]);

  return (
    <span
      ref={ref}
      className="team-name-text"
      contentEditable={editable}
      suppressContentEditableWarning
      style={{ cursor: editable ? 'text' : 'default', pointerEvents: editable ? 'auto' : 'none' }}
      onBlur={event => {
        const newName = event.currentTarget.textContent.trim();
        if (newName && newName !== name) onCommit(newName);
        else event.currentTarget.textContent = name;
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export default function TeamCard({ team }) {
  const state = useAuctionStore();
  const {
    gameMode,
    myTeamId,
    budget,
    minPlayers,
    maxPlayers,
    isAuctionStarted,
    renameTeam,
    openPriceModal,
    openMoveModal,
    openTeamManagement
  } = state;
  const canControl = selectCanControl(state);

  const summary = getTeamSummary(team, { budget, minPlayers, maxPlayers });
  const grouped = groupPlayersByCategory(team);
  const nameEditable = gameMode === 'offline' && !isAuctionStarted;

  const borderStyle = summary.disqualified
    ? '3px solid #e74c3c'
    : summary.maxReached
      ? '3px solid #27ae60'
      : 'none';

  const handleDrop = event => {
    event.preventDefault();
    if (!canControl) return;
    if (summary.disqualified || summary.maxReached) return;
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch {
      return;
    }
    if (!data || !data.player) return;
    openPriceModal(data, team.id);
  };

  return (
    <div
      className="team"
      data-team-id={team.id}
      data-max-reached={String(summary.maxReached)}
      data-disqualified={String(summary.disqualified)}
      style={{
        border: borderStyle,
        cursor: summary.disqualified ? 'not-allowed' : 'pointer',
        ...(team.id === myTeamId ? { position: 'relative' } : {})
      }}
      onDragOver={event => event.preventDefault()}
      onDrop={handleDrop}
      onClick={event => {
        if (event.target.closest('.team-name-text')) return;
        if (summary.disqualified) return;
        openTeamManagement(team.id);
      }}
    >
      {gameMode === 'online' && team.id === myTeamId && <div className="my-team-indicator">MY TEAM</div>}

      <div className="team-header-editable">
        <h3>
          <TeamNameText
            name={team.name}
            editable={nameEditable}
            onCommit={newName => renameTeam(team.id, newName)}
          />
          {summary.disqualified && <span style={{ fontWeight: 700 }}>- DISQUALIFIED</span>}
        </h3>
      </div>

      {summary.reason && (
        <div
          className="team-warning-text"
          style={{
            color: '#e74c3c',
            fontSize: '11px',
            fontWeight: 'bold',
            marginTop: '4px',
            marginBottom: '8px'
          }}
        >
          {summary.reason}
        </div>
      )}

      <p>
        Purse Remaining:{' '}
        <span
          className="purse-amount"
          style={{
            fontWeight: 'bold',
            color: summary.disqualified && summary.purse <= 0 ? '#e74c3c' : getPurseColor(summary.purse, budget)
          }}
        >
          {summary.purse}
        </span>{' '}
        Crores
      </p>
      <p className="player-count" style={{ color: '#a0a0c0' }}>
        {summary.countLabel}
      </p>
      <p className="player-composition">
        🇮🇳 {summary.indians} | ✈️ {summary.overseas}
      </p>

      {CATEGORY_SECTIONS.map(section => (
        <div className="section" key={section.key}>
          <h4>
            {section.title} ({grouped[section.key].length})
          </h4>
          <ul className={section.className}>
            {grouped[section.key].map(player => (
              <li
                key={player.id}
                data-player-id={player.id}
                onContextMenu={event => {
                  if (!canControl) return;
                  event.preventDefault();
                  openMoveModal({
                    playerId: player.id,
                    name: player.name,
                    price: parseFloat(player.price),
                    teamId: team.id,
                    teamName: team.name
                  });
                }}
              >
                {player.name} - {player.price} Crores
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
