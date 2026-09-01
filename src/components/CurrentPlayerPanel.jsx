import { useAuctionStore, selectCanControl } from '../store/auctionStore.js';
import { getCurrentPlayerView } from '../store/selectors.js';
import { usePlayerImage } from '../hooks/usePlayerImage.js';
import { PLAYER_PLACEHOLDER_IMAGE } from '../lib/config.js';
import { needsWhiteBackgroundFix } from '../lib/utils.js';

export default function CurrentPlayerPanel() {
  const state = useAuctionStore();
  const canControl = selectCanControl(state);
  const {
    sets,
    currentSetIndex,
    currentPlayerIndex,
    isSetAnnounced,
    auctionComplete,
    startSetAuction,
    nextPlayer,
    globalUndo,
    openStatsModal
  } = state;

  const currentSet = sets[currentSetIndex];
  const view = auctionComplete ? null : getCurrentPlayerView(state);
  const hasHistory = currentSetIndex > 0 || currentPlayerIndex > 0;

  const heroSrc = usePlayerImage(view ? view.imageNames : [], view ? view.resolved : null);
  const heroToneClass = view && needsWhiteBackgroundFix(view.imageNames) ? 'white-bg-fix' : '';

  let buttonLabel;
  if (auctionComplete) buttonLabel = 'Auction Completed';
  else if (isSetAnnounced) buttonLabel = canControl ? 'Click to Start' : 'Auction will start soon...';
  else buttonLabel = view ? view.buttonLabel : 'Click to Start';

  const draggable = Boolean(view) && canControl && !auctionComplete;

  const handleDragStart = event => {
    if (!view) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ player: view.buttonLabel, set: view.currentSet, fullEntry: view.fullEntry })
    );
  };

  return (
    <div id="auction-interface" style={{ display: 'block' }}>
      <div id="current-player">
        {!auctionComplete && (
          <p>
            <strong>Current Set:</strong> <span id="current-set">{currentSet}</span>
          </p>
        )}

        <div className="player-control-container">
          {canControl && hasHistory && !auctionComplete && (
            <button id="global-undo-button" onClick={globalUndo} title="Undo Last Action" style={{ display: 'flex' }}>
              ←
            </button>
          )}

          <button
            id="current-player-name"
            draggable={draggable}
            style={{
              cursor: auctionComplete ? 'default' : canControl ? (view ? 'grab' : 'pointer') : 'default',
              ...(auctionComplete ? { backgroundColor: '#27ae60' } : {})
            }}
            onClick={() => {
              if (isSetAnnounced && canControl && !auctionComplete) startSetAuction();
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' && isSetAnnounced && canControl && !auctionComplete) startSetAuction();
            }}
            onDragStart={handleDragStart}
          >
            {buttonLabel}
          </button>

          {view && (
            <button
              id="view-stats-button"
              type="button"
              title="View Player Stats"
              disabled={!view.statsPlayer}
              style={{ display: 'inline-flex' }}
              onClick={() => view.statsPlayer && openStatsModal(view.statsPlayer)}
            >
              View Stats
            </button>
          )}

          {canControl && !isSetAnnounced && !auctionComplete && (
            <button id="next-player-button" onClick={nextPlayer} style={{ display: 'block' }}>
              Next Player
            </button>
          )}
        </div>

        <div id="current-player-hero" style={{ display: view ? 'flex' : 'none' }}>
          <img
            id="current-player-hero-img"
            className={heroToneClass}
            src={view ? heroSrc : PLAYER_PLACEHOLDER_IMAGE}
            alt="Current player"
            onError={event => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = PLAYER_PLACEHOLDER_IMAGE;
            }}
          />
        </div>

        <div
          id="remaining-in-set"
          style={{
            marginTop: '15px',
            fontSize: '13px',
            color: '#a0a0c0',
            display: view && view.remaining.length > 0 ? 'block' : 'none'
          }}
        >
          {view && view.remaining.length > 0 && (
            <>
              <strong>Remaining in this set:</strong> {view.remaining.join(', ')}
            </>
          )}
        </div>
      </div>

      <div id="remaining-players" style={{ marginTop: '10px', fontSize: '14px', color: '#a0a0c0' }} />
    </div>
  );
}
