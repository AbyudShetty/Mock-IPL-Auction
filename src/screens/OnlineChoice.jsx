import { useEffect, useState } from 'react';
import { useAuctionStore } from '../store/auctionStore.js';

export default function OnlineChoice() {
  const [choice, setChoice] = useState('create');
  const handleOnlineChoice = useAuctionStore(s => s.handleOnlineChoice);
  const goToScreen = useAuctionStore(s => s.goToScreen);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      handleOnlineChoice(choice);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [choice, handleOnlineChoice]);

  return (
    <div id="online-choice" style={{ display: 'flex' }}>
      <div className="setup-card">
        <h2 className="setup-heading">🌐 Online Multiplayer</h2>

        <div className="mode-selector">
          <label className="mode-option">
            <input
              type="radio"
              name="online-mode"
              value="create"
              checked={choice === 'create'}
              onChange={() => setChoice('create')}
            />
            <span className="mode-card">
              <span className="mode-icon">➕</span>
              <span className="mode-title">Create Room</span>
              <span className="mode-desc">Host the auction</span>
            </span>
          </label>
          <label className="mode-option">
            <input
              type="radio"
              name="online-mode"
              value="join"
              checked={choice === 'join'}
              onChange={() => setChoice('join')}
            />
            <span className="mode-card">
              <span className="mode-icon">🔗</span>
              <span className="mode-title">Join Room</span>
              <span className="mode-desc">Enter with code</span>
            </span>
          </label>
        </div>

        <button id="online-choice-button" className="primary-button" onClick={() => handleOnlineChoice(choice)}>
          <span>Continue</span>
          <span className="button-icon">➡️</span>
        </button>

        <button
          className="secondary-button"
          onClick={() => goToScreen('mode')}
          style={{ marginTop: '10px', width: '100%' }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
