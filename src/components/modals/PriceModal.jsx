import { useState } from 'react';
import { useAuctionStore } from '../../store/auctionStore.js';
import Modal from './Modal.jsx';

export default function PriceModal() {
  const pendingSale = useAuctionStore(s => s.pendingSale);
  const teams = useAuctionStore(s => s.teams);
  const sellPlayer = useAuctionStore(s => s.sellPlayer);
  const closePriceModal = useAuctionStore(s => s.closePriceModal);
  const [price, setPrice] = useState('');

  const open = Boolean(pendingSale);
  const team = open ? teams.find(t => t.id === pendingSale.teamId) : null;

  const close = () => {
    setPrice('');
    closePriceModal();
  };

  const confirm = () => {
    const cost = parseFloat(price);
    if (cost && !Number.isNaN(cost)) {
      const error = sellPlayer(cost);
      if (error) {
        window.alert(error);
        return;
      }
    } else {
      // Matches the original: a blank or invalid price just dismisses.
      closePriceModal();
    }
    setPrice('');
  };

  return (
    <Modal id="price-modal" open={open} onClose={close}>
      <p id="modal-player-name">{pendingSale ? `Enter price for ${pendingSale.playerData.player}` : ''}</p>
      <p id="modal-team-name">{team ? `Selling to: ${team.name}` : ''}</p>
      <input
        type="number"
        id="price-input"
        placeholder="Enter Price (in Crores)"
        min="1"
        autoFocus
        value={price}
        onChange={event => setPrice(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') confirm();
        }}
      />
      <div className="modal-buttons">
        <button id="confirm-price" onClick={confirm}>
          Confirm
        </button>
        <button id="cancel-price" onClick={close}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
