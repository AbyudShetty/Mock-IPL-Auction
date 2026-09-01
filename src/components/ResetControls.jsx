import { useAuctionStore, selectCanControl } from '../store/auctionStore.js';

export default function ResetControls() {
  const state = useAuctionStore();
  if (!selectCanControl(state)) return null;

  return (
    <div id="reset-controls" style={{ display: 'flex' }}>
      <button id="restart-auction-button" onClick={state.restartAuction}>
        Restart Auction
      </button>
      <button id="reset-auction-button" onClick={state.resetAuction}>
        Reset Auction
      </button>
    </div>
  );
}
