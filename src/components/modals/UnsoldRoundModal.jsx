import { useAuctionStore } from '../../store/auctionStore.js';
import Modal from './Modal.jsx';

export default function UnsoldRoundModal() {
  const open = useAuctionStore(s => s.showUnsoldRoundModal);
  const close = useAuctionStore(s => s.closeUnsoldRoundModal);

  return (
    <Modal
      id="unsold-round-modal"
      className="modal-overlay"
      contentClassName="modal-content text-center"
      contentStyle={{ position: 'relative' }}
      open={open}
      onClose={close}
    >
      <span className="close-modal-x" onClick={close}>
        &times;
      </span>

      <h3>🔄 Round 1 Completed!</h3>
      <p style={{ fontSize: '16px', color: '#a0a0c0', margin: '15px 0' }}>
        All sets have been auctioned.
        <br />
        <strong>Starting Unsold Player Round.</strong>
      </p>
      <button id="close-unsold-modal-btn" autoFocus onClick={close}>
        Let&apos;s Go 🚀
      </button>
    </Modal>
  );
}
