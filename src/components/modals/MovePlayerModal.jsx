import { useEffect, useState } from 'react';
import { useAuctionStore } from '../../store/auctionStore.js';
import Modal from './Modal.jsx';

export default function MovePlayerModal() {
  const playerToMove = useAuctionStore(s => s.playerToMove);
  const teams = useAuctionStore(s => s.teams);
  const movePlayer = useAuctionStore(s => s.movePlayer);
  const closeMoveModal = useAuctionStore(s => s.closeMoveModal);

  const [price, setPrice] = useState('');
  const [targetTeamId, setTargetTeamId] = useState('');

  useEffect(() => {
    if (playerToMove) {
      setPrice(String(playerToMove.price));
      setTargetTeamId('');
    }
  }, [playerToMove]);

  const open = Boolean(playerToMove);

  const confirm = () => {
    const error = movePlayer(targetTeamId, parseFloat(price));
    if (error) window.alert(error);
  };

  return (
    <Modal id="move-player-modal" open={open} onClose={closeMoveModal}>
      <h3>🔄 Correction: Move Player</h3>
      <p id="move-player-name" style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '18px' }}>
        {playerToMove?.name}
      </p>
      <p style={{ fontSize: '13px' }}>
        Currently in:{' '}
        <span id="move-current-team" style={{ color: '#e74c3c', fontWeight: 'bold' }}>
          {playerToMove?.teamName}
        </span>
      </p>

      <div style={{ width: '100%', textAlign: 'left', marginTop: '15px' }}>
        <label style={{ fontSize: '11px', color: '#a0a0c0', textTransform: 'uppercase', fontWeight: 600 }}>
          New Price (Crores)
        </label>
        <input
          type="number"
          id="move-player-price"
          step="0.25"
          style={{ marginTop: '5px' }}
          value={price}
          onChange={event => setPrice(event.target.value)}
        />
      </div>

      <div style={{ width: '100%', textAlign: 'left', marginTop: '15px' }}>
        <label style={{ fontSize: '11px', color: '#a0a0c0', textTransform: 'uppercase', fontWeight: 600 }}>
          Move To Team
        </label>
        <select
          id="move-target-team"
          value={targetTeamId}
          onChange={event => setTargetTeamId(event.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            marginTop: '5px',
            background: '#1e1e2f',
            color: 'white',
            border: '2px solid #444',
            borderRadius: '6px',
            fontFamily: 'inherit'
          }}
        >
          <option value="">Select Target Team</option>
          {teams
            .filter(team => team.id !== playerToMove?.teamId)
            .map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
        </select>
      </div>

      <div className="modal-buttons" style={{ marginTop: '25px' }}>
        <button id="confirm-move-player" onClick={confirm}>
          Confirm Move
        </button>
        <button id="cancel-move-player" style={{ backgroundColor: '#e74c3c' }} onClick={closeMoveModal}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
