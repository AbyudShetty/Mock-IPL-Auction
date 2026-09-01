import { useEffect, useState } from 'react';
import { useAuctionStore } from '../store/auctionStore.js';

export default function ModeSelection() {
  const [mode, setMode] = useState('online');
  const handleModeSelection = useAuctionStore(s => s.handleModeSelection);

  // Enter anywhere on this screen advances, as in the original build.
  useEffect(() => {
    const onKeyDown = event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      handleModeSelection(mode);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mode, handleModeSelection]);

  return (
    <div id="mode-selection">
      <div className="setup-card">
        <h2 className="setup-heading">🎮 Choose Game Mode</h2>

        <div className="mode-selector">
          <label className="mode-option">
            <input
              type="radio"
              name="game-mode"
              value="online"
              checked={mode === 'online'}
              onChange={() => setMode('online')}
            />
            <span className="mode-card">
              <span className="mode-icon">🌐</span>
              <span className="mode-title">Online Multiplayer</span>
              <span className="mode-desc">Play with friends remotely</span>
            </span>
          </label>
          <label className="mode-option">
            <input
              type="radio"
              name="game-mode"
              value="offline"
              checked={mode === 'offline'}
              onChange={() => setMode('offline')}
            />
            <span className="mode-card">
              <span className="mode-icon">💻</span>
              <span className="mode-title">Offline Local</span>
              <span className="mode-desc">Play on same device</span>
            </span>
          </label>
        </div>

        <button id="mode-continue-button" className="primary-button" onClick={() => handleModeSelection(mode)}>
          <span>Continue</span>
          <span className="button-icon">➡️</span>
        </button>
      </div>
    </div>
  );
}
