import { useRef, useState } from 'react';
import { useAuctionStore } from '../store/auctionStore.js';
import FieldError from '../components/FieldError.jsx';

const FIELD_ORDER = ['auctioneerName', 'teamCount', 'teamBudget', 'minPlayers', 'maxPlayers'];

export default function InitialSetup() {
  const gameMode = useAuctionStore(s => s.gameMode);
  const isAuctioneer = useAuctionStore(s => s.isAuctioneer);
  const isEditingConfig = useAuctionStore(s => s.isEditingConfig);
  const participants = useAuctionStore(s => s.participants);
  const applyConfig = useAuctionStore(s => s.applyConfig);
  const useDefaultPlayerPool = useAuctionStore(s => s.useDefaultPlayerPool);
  const createLocalTeams = useAuctionStore(s => s.createLocalTeams);
  const createOnlineRoom = useAuctionStore(s => s.createOnlineRoom);
  const updateOnlineRoomConfig = useAuctionStore(s => s.updateOnlineRoomConfig);
  const goToScreen = useAuctionStore(s => s.goToScreen);
  const backFromSetup = useAuctionStore(s => s.backFromSetup);

  const savedAuctioneerName = useAuctionStore(s => s.auctioneerName);
  // Re-opening the config editor pre-fills from the live room settings.
  const [values, setValues] = useState(() => {
    const s = useAuctionStore.getState();
    return {
      auctioneerName: s.auctioneerName || '',
      teamCount: isEditingConfig ? String(s.teamCount) : '',
      teamBudget: isEditingConfig ? String(s.budget) : '',
      minPlayers: isEditingConfig ? String(s.minPlayers) : '',
      maxPlayers: isEditingConfig ? String(s.maxPlayers) : '',
      playerMode: isEditingConfig ? s.playerMode : 'default'
    };
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const refs = useRef({});

  const showAuctioneerName = gameMode === 'online' && !isEditingConfig;

  const setValue = (field, value) => setValues(prev => ({ ...prev, [field]: value }));

  /** Mirrors the original per-field validateInput() rules. */
  const validateField = field => {
    const raw = String(values[field] ?? '').trim();
    const num = parseInt(raw, 10);
    let error = '';

    switch (field) {
      case 'auctioneerName':
        if (gameMode === 'online' && !isEditingConfig && !raw) error = 'Auctioneer name is required';
        break;
      case 'teamCount':
        if (!num || num < 2 || num > 10) error = 'Enter between 2 and 10 teams';
        break;
      case 'teamBudget':
        if (!num || num < 1) error = 'Budget must be greater than 0';
        break;
      case 'minPlayers':
        if (!num || num < 12) error = 'Minimum 12 players required';
        break;
      case 'maxPlayers': {
        const minVal = parseInt(String(values.minPlayers ?? '').trim(), 10);
        if (!num || num < minVal) error = `Must be at least ${minVal} (Min Players)`;
        break;
      }
      default:
        break;
    }

    setErrors(prev => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
    return !error;
  };

  const focusNext = field => {
    const index = FIELD_ORDER.indexOf(field);
    for (let i = index + 1; i < FIELD_ORDER.length; i++) {
      const next = refs.current[FIELD_ORDER[i]];
      if (next) {
        next.focus();
        return;
      }
    }
  };

  const handleFieldEnter = (event, field) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (validateField(field)) focusNext(field);
  };

  const handleContinue = async () => {
    const checks = ['teamCount', 'teamBudget', 'minPlayers'];
    if (showAuctioneerName) checks.unshift('auctioneerName');
    // Every field reports its own error; max-players is only meaningful once
    // min-players is valid, matching the original chained validation.
    const results = checks.map(validateField);
    const minOk = results[results.length - 1];
    const maxOk = minOk ? validateField('maxPlayers') : true;
    if (!results.every(Boolean) || !maxOk) return;

    const count = parseInt(values.teamCount, 10);
    if (isEditingConfig && gameMode === 'online') {
      const joinedCount = Object.keys(participants || {}).length;
      if (count < joinedCount) {
        setErrors(prev => ({ ...prev, teamCount: `Cannot be less than ${joinedCount} (teams already joined)` }));
        return;
      }
    }

    applyConfig({
      teamCount: count,
      budget: parseInt(values.teamBudget, 10),
      minPlayers: parseInt(values.minPlayers, 10),
      maxPlayers: parseInt(values.maxPlayers, 10),
      playerMode: values.playerMode,
      auctioneerName: values.auctioneerName.trim() || savedAuctioneerName
    });

    if (values.playerMode === 'custom') {
      goToScreen('customPlayers');
      return;
    }

    useDefaultPlayerPool();

    if (gameMode === 'online' && isAuctioneer) {
      setBusy(true);
      try {
        if (isEditingConfig) await updateOnlineRoomConfig();
        else await createOnlineRoom(values.auctioneerName.trim());
      } catch (error) {
        console.error('Error creating room:', error);
        window.alert('Failed to create room: ' + error.message);
      } finally {
        setBusy(false);
      }
    } else {
      createLocalTeams();
    }
  };

  return (
    <div id="initial-setup">
      <div className="setup-card">
        <h2 className="setup-heading">⚙️ Auction Configuration</h2>

        {showAuctioneerName && (
          <div className="input-group" id="auctioneer-name-group">
            <label htmlFor="auctioneer-name">👤 Your Team Name (Auctioneer)</label>
            <input
              type="text"
              id="auctioneer-name"
              autoFocus
              className={errors.auctioneerName ? 'input-error' : ''}
              placeholder="Enter your team name"
              value={values.auctioneerName}
              ref={el => {
                refs.current.auctioneerName = el;
              }}
              onChange={event => setValue('auctioneerName', event.target.value)}
              onKeyDown={event => handleFieldEnter(event, 'auctioneerName')}
            />
            <FieldError message={errors.auctioneerName} />
          </div>
        )}

        <div className="input-group">
          <label htmlFor="team-count">👥 Number of Teams</label>
          <input
            type="number"
            id="team-count"
            autoFocus={!showAuctioneerName}
            className={errors.teamCount ? 'input-error' : ''}
            placeholder="2-10 teams"
            min="2"
            max="10"
            value={values.teamCount}
            ref={el => {
              refs.current.teamCount = el;
            }}
            onChange={event => setValue('teamCount', event.target.value)}
            onKeyDown={event => handleFieldEnter(event, 'teamCount')}
          />
          <FieldError message={errors.teamCount} />
        </div>

        <div className="input-group">
          <label htmlFor="team-budget">💰 Budget per Team (Crores)</label>
          <input
            type="number"
            id="team-budget"
            className={errors.teamBudget ? 'input-error' : ''}
            placeholder="e.g., 120"
            min="1"
            value={values.teamBudget}
            ref={el => {
              refs.current.teamBudget = el;
            }}
            onChange={event => setValue('teamBudget', event.target.value)}
            onKeyDown={event => handleFieldEnter(event, 'teamBudget')}
          />
          <FieldError message={errors.teamBudget} />
        </div>

        <div className="input-row">
          <div className="input-group">
            <label htmlFor="min-players">📊 Min Players</label>
            <input
              type="number"
              id="min-players"
              className={errors.minPlayers ? 'input-error' : ''}
              placeholder="Min 12"
              min="12"
              value={values.minPlayers}
              ref={el => {
                refs.current.minPlayers = el;
              }}
              onChange={event => setValue('minPlayers', event.target.value)}
              onKeyDown={event => handleFieldEnter(event, 'minPlayers')}
            />
            <FieldError message={errors.minPlayers} />
          </div>

          <div className="input-group">
            <label htmlFor="max-players">📈 Max Players</label>
            <input
              type="number"
              id="max-players"
              className={errors.maxPlayers ? 'input-error' : ''}
              placeholder="e.g., 20"
              min="12"
              value={values.maxPlayers}
              ref={el => {
                refs.current.maxPlayers = el;
              }}
              onChange={event => setValue('maxPlayers', event.target.value)}
              onKeyDown={event => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                if (validateField('maxPlayers')) refs.current.playerMode?.focus();
              }}
            />
            <FieldError message={errors.maxPlayers} />
          </div>
        </div>

        <div className="mode-selector-container">
          <h3 className="mode-heading">🎯 Player Mode</h3>
          <div className="mode-selector">
            <label className="mode-option">
              <input
                type="radio"
                name="player-mode"
                value="default"
                checked={values.playerMode === 'default'}
                ref={el => {
                  refs.current.playerMode = el;
                }}
                onChange={() => setValue('playerMode', 'default')}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleContinue();
                  }
                }}
              />
              <span className="mode-card">
                <span className="mode-icon">📋</span>
                <span className="mode-title">Default Players</span>
                <span className="mode-desc">Pre-loaded IPL stars</span>
              </span>
            </label>
            <label className="mode-option">
              <input
                type="radio"
                name="player-mode"
                value="custom"
                checked={values.playerMode === 'custom'}
                onChange={() => setValue('playerMode', 'custom')}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleContinue();
                  }
                }}
              />
              <span className="mode-card">
                <span className="mode-icon">✨</span>
                <span className="mode-title">Custom Players</span>
                <span className="mode-desc">Create your own sets</span>
              </span>
            </label>
          </div>
        </div>

        <button id="setup-button" className="primary-button" onClick={handleContinue} disabled={busy}>
          <span>{busy ? 'Creating room…' : 'Continue'}</span>
          <span className="button-icon">🚀</span>
        </button>

        <button className="secondary-button" onClick={backFromSetup} style={{ marginTop: '10px', width: '100%' }}>
          ← Back
        </button>
      </div>
    </div>
  );
}
