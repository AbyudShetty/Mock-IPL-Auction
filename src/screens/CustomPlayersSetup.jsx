import { useRef, useState } from 'react';
import { useAuctionStore } from '../store/auctionStore.js';
import { defaultPlayers } from '../lib/config.js';
import { getSetTypeFromName, parsePlayerEntry } from '../lib/utils.js';

const SET_TYPES = [
  { value: 'Marquee', label: '⭐ Marquee (Mixed - Tags Required)' },
  { value: 'Wicket Keeper', label: '🧤 Wicket Keeper' },
  { value: 'Batsman', label: '🏏 Batsman' },
  { value: 'Fast Bowler', label: '⚡ Fast Bowler' },
  { value: 'Spinner', label: '🌀 Spinner' },
  { value: 'All-rounder', label: '🔀 All-rounder' }
];

const DEFAULT_SET_ORDER = [
  'Marquee Set', 'Wicket Keeper 1', 'Batsman 1', 'Fast Bowler 1', 'Spinner 1', 'All-rounder 1',
  'Wicket Keeper 2', 'Batsman 2', 'Fast Bowler 2', 'Spinner 2', 'All-rounder 2',
  'Batsman 3', 'Fast Bowler 3', 'All-rounder 3', 'Batsman 4', 'Fast Bowler 4'
];

let cardSeq = 0;
const newCardId = () => `set-${Date.now()}-${cardSeq++}`;

function placeholderFor(setType) {
  if (setType === 'Marquee') {
    return [
      'Enter player names with tags (required):',
      'Format: Player Name - tag',
      'Tags: wk (Wicket Keeper), b (Batsman), fb (Fast Bowler), s (Spinner), ar (All-rounder)',
      'Example: MS Dhoni - wk, Virat Kohli - b, Jasprit Bumrah - fb'
    ].join('\n');
  }
  return [
    `Enter ${setType} names (no tags needed):`,
    'Example: Player 1, Player 2, Player 3',
    `Players will be auto-tagged as ${setType}`
  ].join('\n');
}

/** Set names are positional: the nth Batsman card is always "Batsman n". */
function withDisplayNames(cards) {
  const counts = {};
  return cards.map(card => {
    counts[card.setType] = (counts[card.setType] || 0) + 1;
    const displayName = card.setType === 'Marquee' ? 'Marquee Set' : `${card.setType} ${counts[card.setType]}`;
    return { ...card, displayName };
  });
}

const splitEntries = text =>
  text
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);

export default function CustomPlayersSetup() {
  const gameMode = useAuctionStore(s => s.gameMode);
  const isAuctioneer = useAuctionStore(s => s.isAuctioneer);
  const isEditingConfig = useAuctionStore(s => s.isEditingConfig);
  const applyCustomPlayerPool = useAuctionStore(s => s.applyCustomPlayerPool);
  const createLocalTeams = useAuctionStore(s => s.createLocalTeams);
  const createOnlineRoom = useAuctionStore(s => s.createOnlineRoom);
  const updateOnlineRoomConfig = useAuctionStore(s => s.updateOnlineRoomConfig);
  const auctioneerName = useAuctionStore(s => s.auctioneerName);
  const storedCards = useAuctionStore(s => s.customSetCards);
  const setCustomSetCards = useAuctionStore(s => s.setCustomSetCards);
  const goToScreen = useAuctionStore(s => s.goToScreen);

  const [cards, setCards] = useState(storedCards);
  const [selectedType, setSelectedType] = useState('');
  const [busy, setBusy] = useState(false);
  const dragIdRef = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  const named = withDisplayNames(cards);

  const commit = next => {
    setCards(next);
    setCustomSetCards(next);
  };

  const loadDefaultSets = () => {
    commit(
      DEFAULT_SET_ORDER.filter(name => defaultPlayers[name]).map(name => ({
        id: newCardId(),
        setType: getSetTypeFromName(name),
        text: defaultPlayers[name].join(', ')
      }))
    );
  };

  const addNewSet = () => {
    if (!selectedType) {
      window.alert('Please select a set type first!');
      return;
    }
    if (selectedType === 'Marquee' && cards.some(card => card.setType === 'Marquee')) {
      window.alert('Only one Marquee set is allowed!');
      return;
    }
    commit([...cards, { id: newCardId(), setType: selectedType, text: '' }]);
    setSelectedType('');
  };

  const deleteSet = id => {
    if (!window.confirm('Are you sure you want to delete this set?')) return;
    commit(cards.filter(card => card.id !== id));
  };

  const updateText = (id, text) => commit(cards.map(card => (card.id === id ? { ...card, text } : card)));

  const handleDrop = targetId => {
    const sourceId = dragIdRef.current;
    setDragOverId(null);
    dragIdRef.current = null;
    if (!sourceId || sourceId === targetId) return;
    const next = [...cards];
    const from = next.findIndex(card => card.id === sourceId);
    const to = next.findIndex(card => card.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  };

  const handleConfirm = async () => {
    if (named.length === 0) {
      window.alert('Please add at least one player set!');
      return;
    }

    // Marquee is auctioned first regardless of where its card sits.
    const sorted = [...named].sort((a, b) => {
      if (a.setType === 'Marquee') return -1;
      if (b.setType === 'Marquee') return 1;
      return 0;
    });

    // Pass 1: index every valid player so cross-set duplicates can be reported.
    const playerOccurrences = new Map();
    for (const card of sorted) {
      const text = card.text.trim();
      if (!text) {
        window.alert(`Set "${card.displayName}" has no players!`);
        return;
      }
      const entries = splitEntries(text);
      if (entries.length === 0) {
        window.alert(`Set "${card.displayName}" has no valid players!`);
        return;
      }
      for (const entry of entries) {
        const parsed = parsePlayerEntry(entry, card.setType);
        if (parsed.isValid && parsed.normalizedName) {
          if (!playerOccurrences.has(parsed.normalizedName)) playerOccurrences.set(parsed.normalizedName, []);
          playerOccurrences.get(parsed.normalizedName).push({ setName: card.displayName, originalName: parsed.name });
        }
      }
    }

    const duplicatePlayers = new Map();
    for (const [normalizedName, occurrences] of playerOccurrences.entries()) {
      if (occurrences.length > 1) {
        duplicatePlayers.set(normalizedName, {
          setNames: [...new Set(occurrences.map(o => o.setName))],
          originalName: occurrences[0].originalName
        });
      }
    }

    // Pass 2: build the pool, collecting tag errors and duplicate reports.
    const customPlayers = {};
    const allValidationErrors = [];
    const alreadyReportedDuplicates = new Set();

    for (const card of sorted) {
      const entries = splitEntries(card.text.trim());
      const parsedPlayers = [];
      const setErrors = [];

      for (const entry of entries) {
        const parsed = parsePlayerEntry(entry, card.setType);
        if (!parsed.isValid) {
          let displayEntry = entry;
          if (parsed.name) {
            displayEntry = parsed.name + (entry.includes('-') ? ` - ${entry.split('-')[1]?.trim() || ''}` : '');
          }
          setErrors.push(`${displayEntry} - ${parsed.error}`);
        } else if (parsed.normalizedName) {
          const duplicate = duplicatePlayers.get(parsed.normalizedName);
          if (duplicate) {
            if (!alreadyReportedDuplicates.has(parsed.normalizedName)) {
              alreadyReportedDuplicates.add(parsed.normalizedName);
              allValidationErrors.push(`${parsed.name} - repeated in ${duplicate.setNames.join(', ')}`);
              allValidationErrors.push('');
            }
          } else {
            parsedPlayers.push(`${parsed.name} - ${parsed.tag}`);
          }
        }
      }

      if (setErrors.length > 0) {
        if (card.setType === 'Marquee' && !allValidationErrors.includes('=== Marquee Set ===')) {
          allValidationErrors.push('=== Marquee Set ===');
        }
        allValidationErrors.push(...setErrors);
      }
      if (parsedPlayers.length === 0 && setErrors.length === 0) {
        window.alert(`Set "${card.displayName}" has no valid players after parsing!`);
        return;
      }
      if (setErrors.length === 0 && parsedPlayers.length > 0) {
        customPlayers[card.displayName] = parsedPlayers;
      }
    }

    if (allValidationErrors.length > 0) {
      window.alert(
        `Validation Errors:\n\n${allValidationErrors.join('\n')}\n\n` +
          'Valid tags: wk (Wicket Keeper), b (Batsman), fb (Fast Bowler), s (Spinner), ar (All-rounder)\n' +
          'Format: Player Name - tag (for Marquee sets)\n' +
          'Note: Each player can only appear in one set.'
      );
      return;
    }
    if (Object.keys(customPlayers).length === 0) {
      window.alert('No valid player sets found!');
      return;
    }

    applyCustomPlayerPool(customPlayers);

    if (gameMode === 'online' && isAuctioneer) {
      setBusy(true);
      try {
        if (isEditingConfig) await updateOnlineRoomConfig();
        else await createOnlineRoom(auctioneerName);
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
    <div id="custom-players-setup" style={{ display: 'block' }}>
      <h2 className="page-title">Configure Player Sets</h2>

      <div className="custom-actions-top">
        <button id="load-default-button" onClick={loadDefaultSets} className="secondary-button">
          🔥 Load Default Sets
        </button>
      </div>

      <div className="set-creation-controls">
        <select id="set-type-select" value={selectedType} onChange={event => setSelectedType(event.target.value)}>
          <option value="">Select Set Type</option>
          {SET_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <button id="add-set-button" onClick={addNewSet}>
          ➕ Add Set
        </button>
      </div>

      <div id="sets-container">
        {named.map(card => {
          const count = splitEntries(card.text).length;
          return (
            <div
              key={card.id}
              className={`set-card${dragOverId === card.id ? ' drag-over' : ''}`}
              data-set-type={card.setType}
              draggable
              onDragStart={() => {
                dragIdRef.current = card.id;
              }}
              onDragEnd={() => {
                dragIdRef.current = null;
                setDragOverId(null);
              }}
              onDragOver={event => {
                event.preventDefault();
                setDragOverId(card.id);
              }}
              onDragLeave={() => setDragOverId(current => (current === card.id ? null : current))}
              onDrop={event => {
                event.preventDefault();
                handleDrop(card.id);
              }}
            >
              <div className="drag-handle">☰</div>
              <div className="set-header">
                <span className="set-name-display">{card.displayName}</span>
                <button className="delete-set-btn" onClick={() => deleteSet(card.id)}>
                  🗑️
                </button>
              </div>
              <textarea
                className="player-list-input"
                placeholder={placeholderFor(card.setType)}
                value={card.text}
                onChange={event => updateText(card.id, event.target.value)}
              />
              <div className="set-stats">
                <span className="player-count-badge">
                  {count} player{count !== 1 ? 's' : ''}
                </span>
                {card.setType === 'Marquee' && <span className="tag-info">(tags required)</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="setup-actions">
        <button id="back-to-setup-button" onClick={() => goToScreen('setup')}>
          ← Back
        </button>
        <button id="confirm-custom-button" onClick={handleConfirm} disabled={busy}>
          {busy ? 'Creating room…' : 'Confirm & Continue →'}
        </button>
      </div>
    </div>
  );
}
