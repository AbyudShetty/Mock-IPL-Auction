import { useState } from 'react';
import { useAuctionStore } from '../store/auctionStore.js';
import { renameParticipant } from '../firebase/rooms.js';

function CopyButton({ id, className, idleLabel, idleBackground, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      id={id}
      className={className}
      style={copied ? { background: 'linear-gradient(135deg, #27ae60, #2ecc71)' } : { background: idleBackground }}
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? '✓ Copied!' : idleLabel}
    </button>
  );
}

function LobbyTeam({ userId, data, isMe, roomCode, participants }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.name);
  const [invalid, setInvalid] = useState(false);
  const [saving, setSaving] = useState(false);

  const roleLabel = data.role === 'auctioneer' ? '👑 Auctioneer' : '🎮 Player';

  const save = async () => {
    const newName = draft.trim();
    if (!newName || newName === data.name) {
      setEditing(false);
      setDraft(data.name);
      return;
    }
    const isTaken = Object.values(participants).some(
      p => p.name.toLowerCase() === newName.toLowerCase() && p.name.toLowerCase() !== data.name.toLowerCase()
    );
    if (isTaken) {
      setInvalid(true);
      setTimeout(() => setInvalid(false), 1000);
      return;
    }
    setSaving(true);
    try {
      await renameParticipant(roomCode, userId, newName);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update name:', error);
      setInvalid(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lobby-team-item" data-user-id={userId}>
      {editing ? (
        <input
          className="inline-edit-input"
          autoFocus
          disabled={saving}
          value={draft}
          style={{
            background: invalid ? 'rgba(231,76,60,0.1)' : 'rgba(0,0,0,0.2)',
            border: `1px solid ${invalid ? '#e74c3c' : '#3498db'}`,
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'inherit',
            outline: 'none',
            width: '150px',
            opacity: saving ? 0.5 : 1,
            transition: 'border-color 0.2s'
          }}
          onChange={event => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === 'Escape') {
              setDraft(data.name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <span className="lobby-team-name">{data.name}</span>
      )}
      <div className="role-container" style={{ display: 'flex', alignItems: 'center' }}>
        {isMe && !editing && (
          <span
            className="edit-name-btn"
            title="Edit Name"
            onClick={() => {
              setDraft(data.name);
              setEditing(true);
            }}
          >
            ✏️
          </span>
        )}
        <span className={`lobby-team-role ${data.role}`}>{roleLabel}</span>
      </div>
    </div>
  );
}

export default function WaitingLobby() {
  const roomCode = useAuctionStore(s => s.currentRoomCode);
  const currentUserId = useAuctionStore(s => s.currentUserId);
  const isAuctioneer = useAuctionStore(s => s.isAuctioneer);
  const teamCount = useAuctionStore(s => s.teamCount);
  const participants = useAuctionStore(s => s.participants);
  const openConfigEditor = useAuctionStore(s => s.openConfigEditor);
  const startAuctionFromLobby = useAuctionStore(s => s.startAuctionFromLobby);

  const entries = Object.entries(participants || {});
  const joinedCount = entries.length;
  const allJoined = joinedCount === teamCount;
  const roomLink = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  return (
    <div id="waiting-lobby" style={{ display: 'flex' }}>
      <div className="setup-card" style={{ maxWidth: '700px', position: 'relative' }}>
        {isAuctioneer && (
          <button
            id="edit-config-button"
            className="edit-config-btn"
            onClick={openConfigEditor}
            title="Edit Configuration"
            style={{ display: 'flex' }}
          >
            ⚙️ Edit Config
          </button>
        )}

        <h2 className="setup-heading">⏳ Waiting Lobby</h2>

        <div className="room-info-box">
          <div className="room-code-display">
            <span className="room-code-label">Room Code:</span>
            <span id="display-room-code" className="room-code-value">
              {roomCode || '------'}
            </span>
            <CopyButton
              id="copy-code-button"
              className="copy-code-btn"
              idleLabel="📋 Copy"
              idleBackground="linear-gradient(135deg, #3498db, #2980b9)"
              value={roomCode || ''}
            />
          </div>

          <div className="room-link-display">
            <span className="room-link-label">Share Link:</span>
            <input type="text" id="room-link-input" readOnly value={roomLink} />
            <CopyButton
              id="copy-link-button"
              className="copy-link-btn"
              idleLabel="📋 Copy Link"
              idleBackground="linear-gradient(135deg, #9b59b6, #8e44ad)"
              value={roomLink}
            />
          </div>
        </div>

        <div className="lobby-status">
          <h3>
            👥 Teams Joined: <span id="teams-joined-count">{joinedCount}</span> /{' '}
            <span id="teams-total-count">{teamCount}</span>
          </h3>
        </div>

        <div id="lobby-teams-list" className="lobby-teams-container">
          {entries.map(([userId, data]) => (
            <LobbyTeam
              key={userId}
              userId={userId}
              data={data}
              isMe={userId === currentUserId}
              roomCode={roomCode}
              participants={participants}
            />
          ))}
        </div>

        {isAuctioneer && allJoined && (
          <button id="start-auction-button" className="primary-button" onClick={startAuctionFromLobby}>
            <span>Start Auction</span>
            <span className="button-icon">🎬</span>
          </button>
        )}

        {!(isAuctioneer && allJoined) && (
          <div className="lobby-waiting-message" id="lobby-waiting-message">
            <p>⏳ Waiting for all teams to join...</p>
          </div>
        )}
      </div>
    </div>
  );
}
