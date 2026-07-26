import {
  ref, update, get, remove
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { database } from './firebase-init.js';
import { S } from './state.js';
import { defaultPlayers, PLAYER_PLACEHOLDER_IMAGE } from './config.js';
import {
  shuffleArray, extractPlayerName, parsePlayerEntry, getSetTypeFromName,
  tagToCategory, getSectionByCategory, normalizePlayerName, sanitizeDisplayPlayerName,
  getCategoryFromPlayerData, getTeamLineupKey, getUserId,
  setPlayerImageWithContext, detachAllListeners
} from './utils.js';
import { loadPlayerStats, resolvePlayerContext, openPlayerStatsModal, closePlayerStatsModal } from './stats-engine.js';
import {
  syncToFirebase, syncPlayerSaleToFirebase, syncUnsoldToFirebase,
  createOnlineRoom, updateOnlineRoomConfig, setupPresenceSystem,
  syncAuctionStateFromFirebase, syncTeamsFromFirebase, setupWaitingLobby, listenToRoomUpdates
} from './multiplayer.js';

loadPlayerStats();

// =====================================================================
// SCREEN NAVIGATION
// =====================================================================

window.handleModeSelection = function() {
  const selectedMode = document.querySelector('input[name="game-mode"]:checked').value;
  S.gameMode = selectedMode;
  document.getElementById('mode-selection').style.display = 'none';
  if (selectedMode === 'online') {
    document.getElementById('online-choice').style.display = 'flex';
  } else {
    document.getElementById('initial-setup').style.display = 'flex';
    document.getElementById('auctioneer-name-group').style.display = 'none';
    document.getElementById('team-count').focus();
  }
};

window.backToModeSelection = function() {
  document.getElementById('online-choice').style.display = 'none';
  document.getElementById('mode-selection').style.display = 'flex';
};

window.handleOnlineChoice = function() {
  const choice = document.querySelector('input[name="online-mode"]:checked').value;
  document.getElementById('online-choice').style.display = 'none';
  ['upcoming-sets-container', 'stats-panel', 'auction-interface', 'unsold-players-container', 'reset-controls', 'teams-container'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  if (choice === 'create') {
    S.isAuctioneer = true;
    document.getElementById('initial-setup').style.display = 'flex';
    document.getElementById('auctioneer-name-group').style.display = 'block';
    document.getElementById('auctioneer-name').focus();
  } else {
    S.isAuctioneer = false;
    document.getElementById('join-room-screen').style.display = 'flex';
    document.getElementById('join-room-code').focus();
  }
};

window.backToOnlineChoice = function() {
  document.getElementById('join-room-screen').style.display = 'none';
  document.getElementById('online-choice').style.display = 'flex';
};

window.backFromSetup = function() {
  if (S.isEditingConfig) {
    S.isEditingConfig = false;
    document.getElementById('initial-setup').style.display = 'none';
    document.getElementById('waiting-lobby').style.display = 'flex';
    return;
  }
  document.getElementById('initial-setup').style.display = 'none';
  document.getElementById(S.gameMode === 'online' ? 'online-choice' : 'mode-selection').style.display = 'flex';
};

// =====================================================================
// VALIDATION HELPERS
// =====================================================================

window.showError = function(inputId, message) {
  const input = document.getElementById(inputId);
  input.classList.add('input-error');
  let errorMsg = input.parentNode.querySelector('.error-message-text');
  if (!errorMsg) {
    errorMsg = document.createElement('small');
    errorMsg.className = 'error-message-text';
    input.parentNode.appendChild(errorMsg);
  }
  errorMsg.textContent = message;
};

window.clearError = function(inputId) {
  const input = document.getElementById(inputId);
  input.classList.remove('input-error');
  const errorMsg = input.parentNode.querySelector('.error-message-text');
  if (errorMsg) errorMsg.remove();
};

function validateInput(inputId, nextInputId = null) {
  const input = document.getElementById(inputId);
  const value = input.value.trim();
  const numValue = parseInt(value);
  let isValid = true, errorText = '';

  switch(inputId) {
    case 'auctioneer-name':
      if (S.gameMode === 'online' && !value) { isValid = false; errorText = "Auctioneer name is required"; }
      break;
    case 'team-count':
      if (!numValue || numValue < 2 || numValue > 10) { isValid = false; errorText = "Enter between 2 and 10 teams"; }
      break;
    case 'team-budget':
      if (!numValue || numValue < 1) { isValid = false; errorText = "Budget must be greater than 0"; }
      break;
    case 'min-players':
      if (!numValue || numValue < 12) { isValid = false; errorText = "Minimum 12 players required"; }
      break;
    case 'max-players':
      const minVal = parseInt(document.getElementById('min-players').value);
      if (!numValue || numValue < minVal) { isValid = false; errorText = `Must be at least ${minVal} (Min Players)`; }
      break;
  }

  if (!isValid) { window.showError(inputId, errorText); input.focus(); return false; }
  else { window.clearError(inputId); if (nextInputId) document.getElementById(nextInputId).focus(); else input.blur(); return true; }
}

// =====================================================================
// SETUP CONTINUE
// =====================================================================

window.openConfigEditor = function() {
  S.isEditingConfig = true;
  document.getElementById('team-count').value = S.teamCount;
  document.getElementById('team-budget').value = S.budget;
  document.getElementById('min-players').value = S.minPlayers;
  document.getElementById('max-players').value = S.maxPlayers;
  document.querySelector(`input[name="player-mode"][value="${S.playerMode}"]`).checked = true;
  document.getElementById('auctioneer-name-group').style.display = 'none';
  document.getElementById('waiting-lobby').style.display = 'none';
  document.getElementById('initial-setup').style.display = 'flex';
};

window.handleSetupContinue = function() {
  let v1 = true, v2, v3, v4, v5 = true;
  if (S.gameMode === 'online' && !S.isEditingConfig) v1 = validateInput('auctioneer-name');
  v2 = validateInput('team-count');
  v3 = validateInput('team-budget');
  v4 = validateInput('min-players');
  if (v4) v5 = validateInput('max-players');
  if (!v1 || !v2 || !v3 || !v4 || !v5) return;

  const count = parseInt(document.getElementById('team-count').value);
  if (S.isEditingConfig && S.gameMode === 'online' && typeof S.currentParticipants === 'object') {
    const joinedCount = Object.keys(S.currentParticipants).length;
    if (count < joinedCount) { window.showError('team-count', `Cannot be less than ${joinedCount} (teams already joined)`); return; }
    else window.clearError('team-count');
  }

  S.teamCount = count;
  S.budget = parseInt(document.getElementById('team-budget').value);
  S.minPlayers = parseInt(document.getElementById('min-players').value);
  S.maxPlayers = parseInt(document.getElementById('max-players').value);
  S.playerMode = document.querySelector('input[name="player-mode"]:checked')?.value || 'default';

  if (S.playerMode === 'custom') {
    document.getElementById('initial-setup').style.display = 'none';
    document.getElementById('custom-players-setup').style.display = 'block';
    if (!S.isEditingConfig) initializeCustomSets();
  } else {
    S.players = JSON.parse(JSON.stringify(defaultPlayers));
    S.sets = Object.keys(defaultPlayers);
    if (S.gameMode === 'online' && S.isAuctioneer) {
      if (S.isEditingConfig) updateOnlineRoomConfig();
      else createOnlineRoom();
    } else {
      createTeamsDirectly();
    }
  }
};

window.enableInlineNameEdit = function(btnElement) {
  const teamItem = btnElement.closest('.lobby-team-item');
  const nameSpan = teamItem.querySelector('.lobby-team-name');
  const currentName = nameSpan.textContent;
  if (teamItem.querySelector('.inline-edit-input')) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.className = 'inline-edit-input';
  Object.assign(input.style, { background: 'rgba(0,0,0,0.2)', border: '1px solid #3498db', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', width: '150px', transition: 'border-color 0.2s' });

  nameSpan.style.display = 'none';
  teamItem.insertBefore(input, nameSpan);
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  const save = async () => {
    const newName = input.value.trim();
    if (!newName || newName === currentName) { input.remove(); nameSpan.style.display = 'inline'; return; }
    const isTaken = Object.values(S.currentParticipants).some(p => p.name.toLowerCase() === newName.toLowerCase() && p.name.toLowerCase() !== currentName.toLowerCase());
    if (isTaken) { input.style.border = '1px solid #e74c3c'; input.style.background = 'rgba(231,76,60,0.1)'; setTimeout(() => { input.style.border = '1px solid #3498db'; input.style.background = 'rgba(0,0,0,0.2)'; }, 1000); return; }
    input.disabled = true; input.style.opacity = '0.5';
    try {
      await update(ref(database), { [`rooms/${S.currentRoomCode}/participants/${S.currentUserId}/name`]: newName, [`rooms/${S.currentRoomCode}/teams/${S.currentUserId}/name`]: newName });
      nameSpan.textContent = newName; input.remove(); nameSpan.style.display = 'inline';
    } catch (error) { console.error("Failed to update name:", error); input.disabled = false; input.style.opacity = '1'; input.style.border = '1px solid #e74c3c'; }
  };

  input.addEventListener('blur', save);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } else if (e.key === 'Escape') { input.remove(); nameSpan.style.display = 'inline'; } });
};

window.copyRoomCode = function() {
  const code = document.getElementById('display-room-code').textContent;
  navigator.clipboard.writeText(code);
  const btn = document.getElementById('copy-code-button');
  btn.textContent = '✓ Copied!';
  btn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
  setTimeout(() => { btn.textContent = '📋 Copy'; btn.style.background = 'linear-gradient(135deg, #3498db, #2980b9)'; }, 2000);
};

window.copyRoomLink = function() {
  navigator.clipboard.writeText(document.getElementById('room-link-input').value);
  const btn = document.getElementById('copy-link-button');
  btn.textContent = '✓ Copied!';
  btn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
  setTimeout(() => { btn.textContent = '📋 Copy Link'; btn.style.background = 'linear-gradient(135deg, #9b59b6, #8e44ad)'; }, 2000);
};

// =====================================================================
// CUSTOM SETS
// =====================================================================

function initializeCustomSets() {
  S.customPlayers = {};
  S.setCounter = 0;
  S.allPlayersInAuction.clear();
  S.setTypeCounts = { Marquee: 0, 'Wicket Keeper': 0, Batsman: 0, 'Fast Bowler': 0, Spinner: 0, 'All-rounder': 0 };
  document.getElementById('sets-container').innerHTML = '';
}

window.loadDefaultSets = function() {
  const setsContainer = document.getElementById('sets-container');
  setsContainer.innerHTML = '';
  S.setCounter = 0;
  S.allPlayersInAuction.clear();
  S.setTypeCounts = { Marquee: 0, 'Wicket Keeper': 0, Batsman: 0, 'Fast Bowler': 0, Spinner: 0, 'All-rounder': 0 };

  const defaultSetOrder = [
    "Marquee Set", "Wicket Keeper 1", "Batsman 1", "Fast Bowler 1", "Spinner 1", "All-rounder 1",
    "Wicket Keeper 2", "Batsman 2", "Fast Bowler 2", "Spinner 2", "All-rounder 2",
    "Batsman 3", "Fast Bowler 3", "All-rounder 3", "Batsman 4", "Fast Bowler 4"
  ];

  defaultSetOrder.forEach(setName => {
    if (defaultPlayers[setName]) {
      const setType = getSetTypeFromName(setName);
      S.setTypeCounts[setType]++;
      const placeholder = setType === "Marquee"
        ? "Enter player names with tags (required):\nFormat: Player Name - tag\nExample: MS Dhoni - wk, Virat Kohli - b, Jasprit Bumrah - fb"
        : `Enter ${setType} names (no tags needed):\nExample: Player 1, Player 2, Player 3`;

      const setCard = document.createElement('div');
      setCard.className = 'set-card';
      setCard.id = `set-${Date.now()}-${setType}`;
      setCard.dataset.setType = setType;
      setCard.dataset.originalName = setName;
      setCard.draggable = true;
      setCard.innerHTML = `<div class="drag-handle">☰</div><div class="set-header"><span class="set-name-display">${setName}</span><button class="delete-set-btn" onclick="deleteSet('${setCard.id}')">🗑️</button></div><textarea class="player-list-input" placeholder="${placeholder}">${defaultPlayers[setName].join(', ')}</textarea><div class="set-stats"><span class="player-count-badge">${defaultPlayers[setName].length} players</span><span class="tag-info" ${setType === "Marquee" ? "" : "style='display:none;'"}>${setType === "Marquee" ? "(tags required)" : ""}</span></div>`;
      setsContainer.appendChild(setCard);
      setupSetDragAndDrop(setCard);
      setCard.querySelector('.player-list-input').addEventListener('input', function() { updatePlayerCount(setCard.id); });
    }
  });
  setupSetsContainerDragAndDrop();
};

window.addNewSet = function() {
  const setTypeSelect = document.getElementById('set-type-select');
  const selectedType = setTypeSelect.value;
  if (!selectedType) { alert('Please select a set type first!'); return; }
  if (selectedType === "Marquee" && S.setTypeCounts["Marquee"] > 0) { alert('Only one Marquee set is allowed!'); return; }

  S.setTypeCounts[selectedType]++;
  const setNumber = S.setTypeCounts[selectedType];
  const displayName = selectedType === "Marquee" ? "Marquee Set" : `${selectedType} ${setNumber}`;
  const setId = `set-${Date.now()}-${selectedType}`;

  const placeholder = selectedType === "Marquee"
    ? "Enter player names with tags (required):\nFormat: Player Name - tag\nTags: wk (Wicket Keeper), b (Batsman), fb (Fast Bowler), s (Spinner), ar (All-rounder)\nExample: MS Dhoni - wk, Virat Kohli - b, Jasprit Bumrah - fb"
    : `Enter ${selectedType} names (no tags needed):\nExample: Player 1, Player 2, Player 3\nPlayers will be auto-tagged as ${selectedType === "Wicket Keeper" ? "Wicket Keeper" : selectedType}`;

  const setCard = document.createElement('div');
  setCard.className = 'set-card';
  setCard.id = setId;
  setCard.dataset.setType = selectedType;
  setCard.dataset.originalName = displayName;
  setCard.draggable = true;
  setCard.innerHTML = `<div class="drag-handle">☰</div><div class="set-header"><span class="set-name-display">${displayName}</span><button class="delete-set-btn" onclick="deleteSet('${setId}')">🗑️</button></div><textarea class="player-list-input" placeholder="${placeholder}"></textarea><div class="set-stats"><span class="player-count-badge">0 players</span><span class="tag-info" ${selectedType === "Marquee" ? "" : "style='display:none;'"}>${selectedType === "Marquee" ? "(tags required)" : ""}</span></div>`;
  document.getElementById('sets-container').appendChild(setCard);
  setupSetDragAndDrop(setCard);
  setCard.querySelector('.player-list-input').addEventListener('input', function() { updatePlayerCount(setId); });
  setTypeSelect.value = "";
  updatePlayerCount(setId);
};

function updatePlayerCount(setId) {
  const setCard = document.getElementById(setId);
  const entries = setCard.querySelector('.player-list-input').value.split(',').map(p => p.trim()).filter(p => p.length > 0);
  setCard.querySelector('.player-count-badge').textContent = `${entries.length} player${entries.length !== 1 ? 's' : ''}`;
}

window.deleteSet = function(setId) {
  if (confirm('Are you sure you want to delete this set?')) { document.getElementById(setId).remove(); updateSetNumbersAfterDrag(); }
};

function setupSetDragAndDrop(setCard) {
  setCard.addEventListener('dragstart', function(e) {
    S.draggedSet = this;
    setTimeout(() => this.classList.add('dragging'), 0);
    e.dataTransfer.setData('text/plain', this.id);
    startAutoScrollCheck();
  });
  setCard.addEventListener('dragend', function() {
    this.classList.remove('dragging'); S.draggedSet = null;
    document.querySelectorAll('.set-card').forEach(c => c.classList.remove('drag-over'));
    stopAutoScrollCheck();
  });
}

function setupSetsContainerDragAndDrop() {
  const container = document.getElementById('sets-container');
  container.addEventListener('dragover', function(e) {
    e.preventDefault();
    const after = getDragAfterElement(container, e.clientY);
    document.querySelectorAll('.set-card').forEach(c => c.classList.remove('drag-over'));
    if (after) after.classList.add('drag-over');
    checkAutoScroll(e.clientY, container);
  });
  container.addEventListener('dragenter', e => e.preventDefault());
  container.addEventListener('dragleave', function(e) { if (!isMouseInContainer(e, container)) stopAutoScrollCheck(); });
  container.addEventListener('drop', function(e) {
    e.preventDefault();
    const after = getDragAfterElement(container, e.clientY);
    const draggable = document.querySelector('.set-card.dragging');
    if (draggable && container) {
      after == null ? container.appendChild(draggable) : container.insertBefore(draggable, after);
    }
    document.querySelectorAll('.set-card').forEach(c => c.classList.remove('drag-over'));
    stopAutoScrollCheck();
    updateSetNumbersAfterDrag();
  });
}

function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll('.set-card:not(.dragging)')];
  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function isMouseInContainer(e, container) {
  const rect = container.getBoundingClientRect();
  return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
}

function updateSetNumbersAfterDrag() {
  S.setTypeCounts = { Marquee: 0, 'Wicket Keeper': 0, Batsman: 0, 'Fast Bowler': 0, Spinner: 0, 'All-rounder': 0 };
  document.querySelectorAll('.set-card').forEach(card => {
    const st = card.dataset.setType;
    S.setTypeCounts[st]++;
    card.querySelector('.set-name-display').textContent = st === "Marquee" ? "Marquee Set" : `${st} ${S.setTypeCounts[st]}`;
  });
}

function startAutoScrollCheck() {
  if (S.autoScrollInterval) clearInterval(S.autoScrollInterval);
  S.autoScrollInterval = setInterval(() => {
    if (S.draggedSet && S.isAutoScrolling) document.getElementById('sets-container').scrollTop += S.autoScrollDirection;
  }, 20);
}

function stopAutoScrollCheck() {
  if (S.autoScrollInterval) { clearInterval(S.autoScrollInterval); S.autoScrollInterval = null; }
  S.isAutoScrolling = false;
}

function checkAutoScroll(mouseY, container) {
  const rect = container.getBoundingClientRect();
  const threshold = 50, speed = 20;
  const fromTop = mouseY - rect.top;
  const fromBottom = rect.bottom - mouseY;
  if (fromTop < threshold) { S.isAutoScrolling = true; S.autoScrollDirection = -speed; }
  else if (fromBottom < threshold) { S.isAutoScrolling = true; S.autoScrollDirection = speed; }
  else { S.isAutoScrolling = false; S.autoScrollDirection = 0; }
}

window.confirmCustomPlayers = function() {
  const setCards = document.querySelectorAll('.set-card');
  if (setCards.length === 0) { alert('Please add at least one player set!'); return; }

  S.customPlayers = {};
  S.allPlayersInAuction.clear();

  const sortedCards = Array.from(setCards).sort((a, b) => {
    if (a.dataset.setType === "Marquee") return -1;
    if (b.dataset.setType === "Marquee") return 1;
    return 0;
  });

  const playerOccurrences = new Map();
  const allValidationErrors = [];
  const alreadyReportedDuplicates = new Set();

  for (const card of sortedCards) {
    const setType = card.dataset.setType;
    const displayName = card.querySelector('.set-name-display').textContent;
    const text = card.querySelector('.player-list-input').value.trim();
    if (!text) { alert(`Set "${displayName}" has no players!`); return; }

    const entries = text.split(',').map(p => p.trim()).filter(p => p.length > 0);
    if (entries.length === 0) { alert(`Set "${displayName}" has no valid players!`); return; }

    for (const entry of entries) {
      const parsed = parsePlayerEntry(entry, setType);
      if (parsed.isValid && parsed.normalizedName) {
        if (!playerOccurrences.has(parsed.normalizedName)) playerOccurrences.set(parsed.normalizedName, []);
        playerOccurrences.get(parsed.normalizedName).push({ setName: displayName, originalName: parsed.name, setType });
      }
    }
  }

  const duplicatePlayers = new Map();
  for (const [normalizedName, occurrences] of playerOccurrences.entries()) {
    if (occurrences.length > 1) {
      duplicatePlayers.set(normalizedName, { setNames: [...new Set(occurrences.map(o => o.setName))], originalName: occurrences[0].originalName });
    }
  }

  for (const card of sortedCards) {
    const setType = card.dataset.setType;
    const displayName = card.querySelector('.set-name-display').textContent;
    const text = card.querySelector('.player-list-input').value.trim();
    const entries = text.split(',').map(p => p.trim()).filter(p => p.length > 0);
    const parsedPlayers = [];
    const setErrors = [];

    for (const entry of entries) {
      const parsed = parsePlayerEntry(entry, setType);
      if (!parsed.isValid) {
        let displayEntry = entry;
        if (parsed.name) displayEntry = parsed.name + (entry.includes('-') ? ` - ${entry.split('-')[1]?.trim() || ''}` : '');
        setErrors.push(`${displayEntry} - ${parsed.error}`);
      } else if (parsed.normalizedName) {
        const dup = duplicatePlayers.get(parsed.normalizedName);
        if (dup) {
          if (!alreadyReportedDuplicates.has(parsed.normalizedName)) {
            alreadyReportedDuplicates.add(parsed.normalizedName);
            allValidationErrors.push(`${parsed.name} - repeated in ${dup.setNames.join(', ')}`);
            allValidationErrors.push(``);
          }
        } else {
          parsedPlayers.push(`${parsed.name} - ${parsed.tag}`);
        }
      }
    }

    if (setErrors.length > 0) {
      if (setType === "Marquee" && setErrors.length > 0 && !allValidationErrors.includes('=== Marquee Set ===')) {
        allValidationErrors.push('=== Marquee Set ===');
      }
      allValidationErrors.push(...setErrors);
    }
    if (parsedPlayers.length === 0 && setErrors.length === 0) { alert(`Set "${displayName}" has no valid players after parsing!`); return; }
    if (setErrors.length === 0 && parsedPlayers.length > 0) S.customPlayers[displayName] = parsedPlayers;
  }

  if (allValidationErrors.length > 0) {
    alert(`Validation Errors:\n\n${allValidationErrors.join('\n')}\n\nValid tags: wk (Wicket Keeper), b (Batsman), fb (Fast Bowler), s (Spinner), ar (All-rounder)\nFormat: Player Name - tag (for Marquee sets)\nNote: Each player can only appear in one set.`);
    return;
  }
  if (Object.keys(S.customPlayers).length === 0) { alert('No valid player sets found!'); return; }

  S.players = JSON.parse(JSON.stringify(S.customPlayers));
  S.sets = Object.keys(S.customPlayers);

  if (S.gameMode === 'online' && S.isAuctioneer) {
    if (S.isEditingConfig) updateOnlineRoomConfig();
    else createOnlineRoom();
  } else {
    createTeamsDirectly();
  }
};

window.backToInitialSetup = function() {
  document.getElementById('custom-players-setup').style.display = 'none';
  document.getElementById('initial-setup').style.display = 'flex';
};

// =====================================================================
// TEAM CREATION
// =====================================================================

function createTeamsDirectly() {
  if (S.gameMode === 'online') {
    const container = document.getElementById('teams-container');
    container.innerHTML = '';
    container.style.display = 'flex';

    Object.entries(S.teamIdMapping).forEach(([teamId, teamName]) => {
      const teamDiv = document.createElement('div');
      teamDiv.className = 'team';
      teamDiv.dataset.teamId = teamId;
      teamDiv.dataset.maxReached = 'false';
      teamDiv.dataset.disqualified = 'false';
      let html = '';
      if (teamId === S.myTeamId) { teamDiv.style.position = 'relative'; html += '<div class="my-team-indicator">MY TEAM</div>'; }
      html += `<div class="team-header-editable"><h3><span class="team-name-text">${teamName}</span></h3></div><p>Purse Remaining: <span class="purse-amount">${S.budget}</span> Crores</p><p class="player-count">Players: 0 / ${S.minPlayers}</p><p class="player-composition">🇮🇳 0 | ✈️ 0</p><div class="section"><h4>Wicket Keepers (0)</h4><ul class="wicket-keepers"></ul></div><div class="section"><h4>Batsmen (0)</h4><ul class="batsmen"></ul></div><div class="section"><h4>Fast Bowlers (0)</h4><ul class="fast-bowlers"></ul></div><div class="section"><h4>Spinners (0)</h4><ul class="spinners"></ul></div><div class="section"><h4>All-rounders (0)</h4><ul class="all-rounders"></ul></div>`;
      teamDiv.innerHTML = html;
      container.appendChild(teamDiv);
    });
  } else {
    S.teamNames = Array.from({ length: S.teamCount }, (_, i) => `Team ${i + 1}`);
    S.editableTeams = new Set(S.teamNames);
    const container = document.getElementById('teams-container');
    container.innerHTML = '';
    container.style.display = 'flex';

    S.teamNames.forEach(name => {
      const teamDiv = document.createElement('div');
      teamDiv.className = 'team';
      teamDiv.dataset.maxReached = 'false';
      teamDiv.dataset.disqualified = 'false';
      teamDiv.innerHTML = `<div class="team-header-editable"><h3><span class="team-name-text" contenteditable="true" onclick="makeTeamNameEditable(this)" onblur="saveTeamName(this)" onkeydown="handleTeamNameKey(event, this)">${name}</span></h3></div><p>Purse Remaining: <span class="purse-amount">${S.budget}</span> Crores</p><p class="player-count">Players: 0 / ${S.minPlayers}</p><p class="player-composition">🇮🇳 0 | ✈️ 0</p><div class="section"><h4>Wicket Keepers (0)</h4><ul class="wicket-keepers"></ul></div><div class="section"><h4>Batsmen (0)</h4><ul class="batsmen"></ul></div><div class="section"><h4>Fast Bowlers (0)</h4><ul class="fast-bowlers"></ul></div><div class="section"><h4>Spinners (0)</h4><ul class="spinners"></ul></div><div class="section"><h4>All-rounders (0)</h4><ul class="all-rounders"></ul></div>`;
      container.appendChild(teamDiv);
    });
  }

  setupTeamManagement();
  if (S.isAuctionStarted) {
    document.getElementById('auction-interface').style.display = 'block';
    document.getElementById('stats-panel').style.display = 'block';
    document.getElementById('upcoming-sets-container').style.display = 'block';
  }
  document.getElementById('unsold-players-container').style.display = 'none';

  const playerButton = document.getElementById('current-player-name');
  playerButton.style.pointerEvents = 'auto';
  playerButton.style.opacity = '1';
  playerButton.style.cursor = 'pointer';

  if (S.gameMode === 'offline' || S.isAuctioneer) {
    playerButton.addEventListener('dragstart', dragStart);
    playerButton.addEventListener('click', startSetAuction);
  } else {
    document.getElementById('next-player-button').style.display = 'none';
  }

  if (S.gameMode === 'online' && !S.isAuctioneer) {
    document.getElementById('reset-controls').style.display = 'none';
    document.getElementById('restart-auction-button').style.display = 'none';
    document.getElementById('reset-auction-button').style.display = 'none';
  } else {
    document.getElementById('reset-controls').style.display = 'block';
  }

  updateStatistics();
  updateAllVisibilityPanels();
  announceSet();
}

// =====================================================================
// AUCTION CORE
// =====================================================================

window.updatePurseColor = function(teamDiv) {
  const purseSpan = teamDiv.querySelector('.purse-amount');
  const percent = (parseFloat(purseSpan.textContent) / S.budget) * 100;
  purseSpan.style.color = percent <= 10 ? '#e74c3c' : percent <= 20 ? '#e67e22' : percent <= 40 ? '#f39c12' : '#27ae60';
  purseSpan.style.fontWeight = 'bold';
};

function announceSet() {
  const currentSet = S.sets[S.currentSetIndex];
  document.getElementById('current-set').textContent = currentSet;
  const btn = document.getElementById('current-player-name');
  btn.textContent = "Click to Start";
  btn.draggable = false;
  if (S.gameMode === 'offline' || S.isAuctioneer) document.getElementById('next-player-button').style.display = 'none';
  document.getElementById('remaining-in-set').style.display = 'none';
  S.isSetAnnounced = true;

  if (S.isSecondRound) {
    if (S.unsoldPlayers[currentSet]?.length > 0) {
      if ((S.gameMode === 'offline' || S.isAuctioneer) && S.currentPlayerIndex === 0) shuffleArray(S.unsoldPlayers[currentSet]);
    } else {
      S.currentSetIndex++;
      if (S.currentSetIndex >= S.sets.length) { alert("Auction is over! All unsold players have been processed."); return; }
      announceSet(); return;
    }
  }
  syncToFirebase();
  updateAllVisibilityPanels();
  window.updateCurrentPlayerDisplay();
}

window.startSetAuction = function() {
  if (S.gameMode === 'online' && !S.isAuctioneer) return;
  S.isAuctionStarted = true;
  document.querySelectorAll('.team-name-text').forEach(el => {
    el.contenteditable = 'false'; el.style.cursor = 'default'; el.style.pointerEvents = 'none'; el.onclick = null;
  });
  if (S.isSetAnnounced) { S.isSetAnnounced = false; loadNextPlayer(); }
  syncToFirebase();
  updateAllVisibilityPanels();
};

function loadNextPlayer() {
  const currentSet = S.sets[S.currentSetIndex];
  let playerList = S.isSecondRound ? S.unsoldPlayers[currentSet] : S.players[currentSet];
  if (!playerList?.length) { nextPlayer(); return; }

  const currentPlayer = playerList[S.currentPlayerIndex];
  const displayName = extractPlayerName(currentPlayer);
  const btn = document.getElementById('current-player-name');
  btn.textContent = displayName;
  if (S.gameMode === 'offline' || S.isAuctioneer) {
    btn.draggable = true;
    document.getElementById('next-player-button').style.display = 'inline-block';
  }
  document.getElementById('current-set').textContent = currentSet;

  const remaining = playerList.slice(S.currentPlayerIndex + 1).map(p => extractPlayerName(p));
  const remDiv = document.getElementById('remaining-in-set');
  remDiv.innerHTML = remaining.length > 0 ? `<strong>Remaining in this set:</strong> ${remaining.join(', ')}` : '';
  remDiv.style.display = remaining.length > 0 ? 'block' : 'none';

  syncToFirebase();
  updateAllVisibilityPanels();
  window.updateCurrentPlayerDisplay();
}

window.nextPlayer = function() {
  if (S.gameMode === 'online' && !S.isAuctioneer) return;
  const currentSet = S.sets[S.currentSetIndex];
  let playerList = S.isSecondRound ? S.unsoldPlayers[currentSet] : S.players[currentSet];

  if (playerList?.length > 0 && S.currentPlayerIndex < playerList.length) {
    const entry = playerList[S.currentPlayerIndex];
    const name = extractPlayerName(entry);
    let wasSold = false;
    document.querySelectorAll('.team ul li').forEach(li => {
      const priceIdx = li.textContent.lastIndexOf(' - ');
      if (priceIdx !== -1 && normalizePlayerName(li.textContent.substring(0, priceIdx).trim()) === normalizePlayerName(name)) wasSold = true;
    });
    if (!wasSold && !S.isSecondRound) {
      if (!S.unsoldPlayers[currentSet]) S.unsoldPlayers[currentSet] = [];
      const already = S.unsoldPlayers[currentSet].some(e => normalizePlayerName(parsePlayerEntry(e, getSetTypeFromName(currentSet)).name) === normalizePlayerName(name));
      if (!already) S.unsoldPlayers[currentSet].push(entry);
    }
  }

  S.currentPlayerIndex++;
  if (!playerList?.length) {
    S.currentPlayerIndex = 0; S.currentSetIndex++;
    if (S.currentSetIndex >= S.sets.length) { handleEndOfSets(); return; }
    announceSet(); return;
  }
  if (S.currentPlayerIndex >= playerList.length) {
    S.currentPlayerIndex = 0; S.currentSetIndex++;
    if (S.currentSetIndex >= S.sets.length) { handleEndOfSets(); return; }
    announceSet();
  } else loadNextPlayer();

  syncToFirebase();
  syncUnsoldToFirebase();
  updateAllVisibilityPanels();
};

// =====================================================================
// CURRENT PLAYER DISPLAY
// =====================================================================

window.updateCurrentPlayerDisplay = function() {
  const playerButton = document.getElementById('current-player-name');
  const undoButton = document.getElementById('global-undo-button');
  const nextButton = document.getElementById('next-player-button');
  const viewStatsButton = document.getElementById('view-stats-button');
  const currentSet = S.sets[S.currentSetIndex];
  const heroImg = document.getElementById('current-player-hero-img');
  const heroWrap = document.getElementById('current-player-hero');
  if (!currentSet || !S.players[currentSet]) {
    if (viewStatsButton) { viewStatsButton.style.display = 'none'; viewStatsButton.disabled = true; }
    S.activeStatsPlayer = null;
    if (heroImg) heroImg.src = 'https://scores.iplt20.com/ipl/images/default-player-statsImage.png';
    if (heroWrap) heroWrap.style.display = 'none';
    return;
  }

  const canControl = S.gameMode === 'offline' || (S.gameMode === 'online' && S.isAuctioneer);
  const hasHistory = S.currentSetIndex > 0 || S.currentPlayerIndex > 0;
  undoButton.style.display = canControl && hasHistory ? 'flex' : 'none';
  nextButton.style.display = canControl ? (S.isSetAnnounced ? 'none' : 'block') : 'none';

  if (S.isSetAnnounced) {
    document.getElementById('current-set').textContent = currentSet;
    playerButton.textContent = canControl ? "Click to Start" : "Auction will start soon...";
    playerButton.style.cursor = canControl ? 'pointer' : 'default';
    playerButton.draggable = false;
    document.getElementById('remaining-in-set').style.display = 'none';
    S.activeStatsPlayer = null;
    if (viewStatsButton) { viewStatsButton.style.display = 'none'; viewStatsButton.disabled = true; }
    if (heroImg) heroImg.src = 'https://scores.iplt20.com/ipl/images/default-player-statsImage.png';
    if (heroWrap) heroWrap.style.display = 'none';
  } else {
    let playerList = S.isSecondRound ? S.unsoldPlayers[currentSet] : S.players[currentSet];
    if (playerList?.length > 0 && S.currentPlayerIndex < playerList.length) {
      const currentPlayer = playerList[S.currentPlayerIndex];
      const displayName = extractPlayerName(currentPlayer);
      const parsed = parsePlayerEntry(currentPlayer, getSetTypeFromName(currentSet));
      const cleanedPlayerName = sanitizeDisplayPlayerName(parsed?.name || displayName);
      const resolved = resolvePlayerContext(cleanedPlayerName);
      const normalizedDisplay = normalizePlayerName(cleanedPlayerName);
      const displayOverride = normalizedDisplay === 'digvesh singh' ? 'Digvesh Rathi' : cleanedPlayerName;
      const displayResolvedName = resolved ? resolved.officialName : displayOverride;
      S.activeStatsPlayer = parsed?.name ? { name: cleanedPlayerName, tag: parsed.tag } : null;

      playerButton.textContent = displayOverride || cleanedPlayerName || displayName;
      playerButton.draggable = !!canControl;
      playerButton.style.cursor = canControl ? 'grab' : 'default';
      document.getElementById('current-set').textContent = currentSet;

      const remaining = playerList.slice(S.currentPlayerIndex + 1).map(p => extractPlayerName(p));
      const remDiv = document.getElementById('remaining-in-set');
      remDiv.innerHTML = remaining.length > 0 ? `<strong>Remaining in this set:</strong> ${remaining.join(', ')}` : '';
      remDiv.style.display = remaining.length > 0 ? 'block' : 'none';

      if (viewStatsButton) { viewStatsButton.style.display = 'inline-flex'; viewStatsButton.disabled = !S.activeStatsPlayer; }
      if (heroImg) setPlayerImageWithContext(heroImg, [displayResolvedName, displayOverride, cleanedPlayerName, displayName], resolved);
      if (heroWrap) heroWrap.style.display = 'flex';
    } else {
      S.activeStatsPlayer = null;
      if (viewStatsButton) { viewStatsButton.style.display = 'none'; viewStatsButton.disabled = true; }
      if (heroImg) heroImg.src = 'https://scores.iplt20.com/ipl/images/default-player-statsImage.png';
      if (heroWrap) heroWrap.style.display = 'none';
    }
  }
};

// =====================================================================
// END OF SETS & QUALIFICATION
// =====================================================================

function handleEndOfSets() {
  if (!S.isSecondRound) {
    collectAllUnsoldPlayers();
    S.isSecondRound = true;
    S.currentSetIndex = 0;
    let hasUnsoldPlayers = false;
    for (const set in S.unsoldPlayers) {
      if (S.unsoldPlayers[set] && S.unsoldPlayers[set].length > 0) {
        hasUnsoldPlayers = true;
        break;
      }
    }
    if (!hasUnsoldPlayers) { checkTeamQualification(); return; }
    showUnsoldRoundModal();
    syncToFirebase();
    syncUnsoldToFirebase();
    announceSet();
  } else {
    checkTeamQualification();
  }
  updateAllVisibilityPanels();
}

function checkTeamQualification() {
  const teams = document.querySelectorAll('.team');
  const disqualifiedTeams = [];
  teams.forEach(team => {
    const totalPlayers = team.querySelectorAll('ul li').length;
    const teamName = team.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
    let indianCount = 0;
    team.querySelectorAll('ul li').forEach(li => {
      if (!li.textContent.includes('\u2708\uFE0F')) indianCount++;
    });
    let reason = '';
    if (totalPlayers < S.minPlayers) reason = 'Minimum players not reached';
    else if (indianCount < 8) reason = 'Need 8 Indians';
    if (reason) { disqualifiedTeams.push(teamName + ': ' + reason); disqualifyTeam(team); }
    else { liftDisqualification(team); }
  });
  document.getElementById('current-set').parentElement.textContent = '';
  document.getElementById('current-player-name').textContent = 'Auction Completed';
  document.getElementById('current-player-name').style.backgroundColor = '#27ae60';
  document.getElementById('current-player-name').style.cursor = 'default';
  document.getElementById('current-player-name').draggable = false;
  const viewStatsButton = document.getElementById('view-stats-button');
  if (viewStatsButton) { viewStatsButton.style.display = 'none'; viewStatsButton.disabled = true; }
  S.activeStatsPlayer = null;
  closePlayerStatsModal();
  const heroWrap = document.getElementById('current-player-hero');
  if (heroWrap) heroWrap.style.display = 'none';
  const heroImg = document.getElementById('current-player-hero-img');
  if (heroImg) heroImg.src = PLAYER_PLACEHOLDER_IMAGE;
  if (S.gameMode === 'offline' || S.isAuctioneer) document.getElementById('next-player-button').style.display = 'none';
  document.getElementById('remaining-players').innerHTML = '';
  if (disqualifiedTeams.length > 0) {
    alert('Auction over!\n\nDisqualified teams:\n' + disqualifiedTeams.join('\n'));
  } else {
    alert('Auction is over! All teams qualified.');
  }
}

// =====================================================================
// DRAG & DROP / PRICE MODAL
// =====================================================================

function dragStart(event) {
  if (S.gameMode === 'online' && !S.isAuctioneer) { event.preventDefault(); return; }
  const currentSet = S.sets[S.currentSetIndex];
  const playerList = S.isSecondRound ? S.unsoldPlayers[currentSet] : S.players[currentSet];
  const playerData = {
    player: event.target.textContent,
    set: currentSet,
    fullEntry: playerList[S.currentPlayerIndex]
  };
  event.dataTransfer.setData('text/plain', JSON.stringify(playerData));
}

function confirmPrice() {
  const cost = parseFloat(document.getElementById('price-input').value);
  if (cost && !isNaN(cost)) {
    const purseSpan = S.currentTeamDiv.querySelector('.purse-amount');
    const currentBudget = parseFloat(purseSpan.textContent);
    const newBudget = currentBudget - cost;
    if (newBudget >= 0) {
      const playerId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      purseSpan.textContent = newBudget;
      window.updatePurseColor(S.currentTeamDiv);
      S.auctionStats.totalPlayersSold++;
      S.auctionStats.totalMoneySpent += cost;
      if (cost > S.auctionStats.mostExpensivePlayer.price) {
        const teamName = S.currentTeamDiv.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
        S.auctionStats.mostExpensivePlayer = { name: S.currentPlayerData.player, price: cost, team: teamName };
      }
      const fullEntry = S.currentPlayerData.fullEntry;
      const currentSet = S.sets[S.currentSetIndex];
      const setType = getSetTypeFromName(currentSet);
      const parsed = parsePlayerEntry(fullEntry, setType);
      const category = tagToCategory(parsed.tag);
      const section = getSectionByCategory(S.currentTeamDiv, category);
      const currentTotalPlayers = S.currentTeamDiv.querySelectorAll('ul li').length + 1;
      const shouldCelebrate = cost >= 18 || currentTotalPlayers === S.minPlayers;
      if (section) {
        const playerItem = document.createElement('li');
        playerItem.dataset.playerId = playerId;
        playerItem.textContent = S.currentPlayerData.player + ' - ' + cost + ' Crores';
        const frozenName = S.currentPlayerData.player;
        const frozenId = playerId;
        const frozenPrice = cost;
        playerItem.addEventListener('contextmenu', (e) => handlePlayerContextMenu(e, S.currentTeamDiv, frozenId, frozenName, frozenPrice));
        section.appendChild(playerItem);
        window.updateTeamCounts(S.currentTeamDiv);
        if (shouldCelebrate && typeof window.triggerBlockbusterCelebration === 'function') window.triggerBlockbusterCelebration();
      }
      if (S.gameMode === 'online' && S.isAuctioneer) {
        syncPlayerSaleToFirebase(S.currentTeamDiv, S.currentPlayerData, cost, playerId);
        if (shouldCelebrate) {
          const updates = {};
          updates['rooms/' + S.currentRoomCode + '/auctionState/celebrationTime'] = Date.now();
          update(ref(database), updates);
        }
      }
      updateStatistics();
      window.nextPlayer();
    } else {
      alert('Not enough budget!');
    }
  }
  document.getElementById('price-modal').style.display = 'none';
}

// =====================================================================
// CONTEXT MENU / PLAYER MOVE
// =====================================================================

function handlePlayerContextMenu(e, teamDiv, playerId, playerName, price) {
  if (S.gameMode === 'online' && !S.isAuctioneer) return;
  e.preventDefault();
  const currentTeamName = teamDiv.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
  S.playerToMove = {
    id: playerId,
    name: playerName,
    oldPrice: parseFloat(price),
    oldTeamId: teamDiv.dataset.teamId,
    oldTeamDiv: teamDiv
  };
  document.getElementById('move-player-name').textContent = playerName;
  document.getElementById('move-current-team').textContent = currentTeamName;
  document.getElementById('move-player-price').value = price;
  const select = document.getElementById('move-target-team');
  select.innerHTML = '<option value="">Select Target Team</option>';
  document.querySelectorAll('.team').forEach(t => {
    const tName = t.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
    const tId = t.dataset.teamId || tName;
    if (tName !== currentTeamName) {
      const option = document.createElement('option');
      option.value = tId;
      option.textContent = tName;
      select.appendChild(option);
    }
  });
  document.getElementById('move-player-modal').style.display = 'block';
}

function confirmPlayerMove() {
  if (!S.playerToMove) return;
  const newPrice = parseFloat(document.getElementById('move-player-price').value);
  const targetTeamValue = document.getElementById('move-target-team').value;
  if (!targetTeamValue) { alert('Please select a team to move to.'); return; }
  if (isNaN(newPrice) || newPrice < 0) { alert('Please enter a valid price.'); return; }
  let targetTeamDiv = null;
  if (S.gameMode === 'online') {
    targetTeamDiv = document.querySelector('.team[data-team-id="' + targetTeamValue + '"]');
  } else {
    document.querySelectorAll('.team').forEach(t => {
      if (t.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '') === targetTeamValue) targetTeamDiv = t;
    });
  }
  if (!targetTeamDiv) return;
  const oldPurseSpan = S.playerToMove.oldTeamDiv.querySelector('.purse-amount');
  const oldBudget = parseFloat(oldPurseSpan.textContent);
  oldPurseSpan.textContent = oldBudget + S.playerToMove.oldPrice;
  const oldLi = S.playerToMove.oldTeamDiv.querySelector('li[data-player-id="' + S.playerToMove.id + '"]');
  if (oldLi) oldLi.remove();
  S.playerToMove.oldTeamDiv.dataset.manualDisq = 'false';
  window.updateTeamCounts(S.playerToMove.oldTeamDiv);
  window.updatePurseColor(S.playerToMove.oldTeamDiv);
  const newPurseSpan = targetTeamDiv.querySelector('.purse-amount');
  const newBudget = parseFloat(newPurseSpan.textContent);
  const finalBudget = newBudget - newPrice;
  newPurseSpan.textContent = finalBudget;
  let fullEntry = '';
  for (const set in S.players) {
    const found = S.players[set].find(p => extractPlayerName(p) === S.playerToMove.name);
    if (found) { fullEntry = found; break; }
  }
  if (!fullEntry) {
    for (const set in S.unsoldPlayers) {
      const found = S.unsoldPlayers[set].find(p => extractPlayerName(p) === S.playerToMove.name);
      if (found) { fullEntry = found; break; }
    }
  }
  const setType = getSetTypeFromName(fullEntry || 'Batsman');
  const parsed = parsePlayerEntry(fullEntry || S.playerToMove.name, setType);
  const category = tagToCategory(parsed.tag);
  const section = getSectionByCategory(targetTeamDiv, category);
  if (section) {
    const newLi = document.createElement('li');
    newLi.dataset.playerId = S.playerToMove.id;
    newLi.textContent = S.playerToMove.name + ' - ' + newPrice + ' Crores';
    const frozenName = S.playerToMove.name;
    const frozenId = S.playerToMove.id;
    const frozenPrice = newPrice;
    newLi.addEventListener('contextmenu', (e) => handlePlayerContextMenu(e, targetTeamDiv, frozenId, frozenName, frozenPrice));
    section.appendChild(newLi);
  }
  targetTeamDiv.dataset.manualDisq = 'false';
  window.updateTeamCounts(targetTeamDiv);
  window.updatePurseColor(targetTeamDiv);
  if (S.gameMode === 'online' && S.isAuctioneer) {
    const updates = {};
    updates['rooms/' + S.currentRoomCode + '/teams/' + S.playerToMove.oldTeamId + '/purse'] = oldBudget + S.playerToMove.oldPrice;
    updates['rooms/' + S.currentRoomCode + '/teams/' + S.playerToMove.oldTeamId + '/players/' + S.playerToMove.id] = null;
    const targetId = targetTeamDiv.dataset.teamId;
    updates['rooms/' + S.currentRoomCode + '/teams/' + targetId + '/purse'] = finalBudget;
    updates['rooms/' + S.currentRoomCode + '/teams/' + targetId + '/players/' + S.playerToMove.id] = { name: S.playerToMove.name, price: newPrice, set: setType, fullEntry: fullEntry || S.playerToMove.name, addedAt: Date.now() };
    update(ref(database), updates);
  }
  updateStatistics();
  recalculateAuctionStats();
  document.getElementById('move-player-modal').style.display = 'none';
  S.playerToMove = null;
}

// =====================================================================
// UNSOLD / COLLECTION
// =====================================================================

function collectAllUnsoldPlayers() {
  S.sets.forEach(set => {
    const soldPlayers = new Set();
    document.querySelectorAll('.team ul li').forEach(li => {
      const playerName = li.textContent.split(' - ')[0].trim();
      const playerList = S.players[set] || [];
      const isSold = playerList.some(playerEntry => extractPlayerName(playerEntry) === playerName);
      if (isSold) soldPlayers.add(playerName);
    });
    if (!S.unsoldPlayers[set]) S.unsoldPlayers[set] = [];
    if (S.players[set]) {
      S.unsoldPlayers[set] = S.players[set].filter(playerEntry => {
        const playerName = extractPlayerName(playerEntry);
        return !soldPlayers.has(playerName);
      });
    }
  });
  updateAllVisibilityPanels();
  updateUnsoldPlayersList();
}

// =====================================================================
// DISQUALIFICATION
// =====================================================================

function disqualifyTeam(teamDiv) {
  teamDiv.dataset.manualDisq = 'true';
  window.updateTeamCounts(teamDiv);
}

function liftDisqualification(teamDiv) {
  teamDiv.dataset.manualDisq = 'false';
  window.updateTeamCounts(teamDiv);
}

// =====================================================================
// TEAM COUNTS
// =====================================================================

window.updateTeamCounts = function(teamDiv) {
  const playerCount = teamDiv.querySelector('.player-count');
  const composition = teamDiv.querySelector('.player-composition');
  const totalPlayers = teamDiv.querySelectorAll('ul li').length;
  const nameText = teamDiv.querySelector('.team-name-text');
  const headerDiv = teamDiv.querySelector('.team-header-editable');
  let overseasCount = 0;
  let indianCount = 0;
  teamDiv.querySelectorAll('ul li').forEach(li => {
    if (li.textContent.includes('\u2708\uFE0F')) overseasCount++;
    else indianCount++;
  });
  if (composition) {
    composition.textContent = '\uD83C\uDDEE\uD83C\uDDF3 ' + indianCount + ' | \u2708\uFE0F ' + overseasCount;
  }
  const purseRemaining = parseFloat(teamDiv.querySelector('.purse-amount').textContent);
  const isFinished = purseRemaining <= 0 || totalPlayers >= S.maxPlayers;
  const isManualDisq = teamDiv.dataset.manualDisq === 'true';
  const oldWarning = teamDiv.querySelector('.team-warning-text');
  if (oldWarning) oldWarning.remove();
  const addWarning = (text) => {
    const warning = document.createElement('div');
    warning.className = 'team-warning-text';
    warning.style.color = '#e74c3c';
    warning.style.fontSize = '11px';
    warning.style.fontWeight = 'bold';
    warning.style.marginTop = '4px';
    warning.style.marginBottom = '8px';
    warning.textContent = text;
    headerDiv.after(warning);
  };
  let errorReason = null;
  if (isManualDisq) errorReason = '\u26A0\uFE0F Disqualified';
  else if (isFinished) {
    if (totalPlayers < S.minPlayers) errorReason = '\u26A0\uFE0F Minimum players not reached';
    else if (indianCount < 8) errorReason = '\u26A0\uFE0F Need 8 Indians';
  }
  const cleanName = nameText.textContent.replace(' - DISQUALIFIED', '');
  if (errorReason) {
    teamDiv.dataset.disqualified = 'true';
    teamDiv.dataset.maxReached = 'false';
    teamDiv.style.border = '3px solid #e74c3c';
    teamDiv.style.cursor = 'not-allowed';
    nameText.textContent = cleanName + ' - DISQUALIFIED';
    addWarning(errorReason);
    if (totalPlayers < S.minPlayers) playerCount.textContent = 'Players: ' + totalPlayers + ' / ' + S.minPlayers;
    else playerCount.textContent = 'Players: ' + totalPlayers + ' / ' + S.maxPlayers;
    playerCount.style.color = '#a0a0c0';
    if (purseRemaining <= 0) teamDiv.querySelector('.purse-amount').style.color = '#e74c3c';
  } else {
    teamDiv.dataset.disqualified = 'false';
    teamDiv.style.cursor = 'pointer';
    nameText.textContent = cleanName;
    if (totalPlayers < S.minPlayers) playerCount.textContent = 'Players: ' + totalPlayers + ' / ' + S.minPlayers;
    else playerCount.textContent = 'Players: ' + totalPlayers + ' / ' + S.maxPlayers;
    playerCount.style.color = '#a0a0c0';
    if (isFinished) {
      teamDiv.dataset.maxReached = 'true';
      teamDiv.style.border = '3px solid #27ae60';
    } else {
      teamDiv.dataset.maxReached = 'false';
      teamDiv.style.border = 'none';
    }
    window.updatePurseColor(teamDiv);
  }
  const categories = ['wicket-keepers', 'batsmen', 'fast-bowlers', 'spinners', 'all-rounders'];
  const titles = ['Wicket Keepers', 'Batsmen', 'Fast Bowlers', 'Spinners', 'All-rounders'];
  categories.forEach((cls, idx) => {
    const count = teamDiv.querySelector('.' + cls).querySelectorAll('li').length;
    teamDiv.querySelectorAll('.section h4')[idx].textContent = titles[idx] + ' (' + count + ')';
  });
};

// =====================================================================
// STATISTICS
// =====================================================================

window.updateStatistics = function() {
  const teams = document.querySelectorAll('.team');
  const teamStats = [];
  teams.forEach(team => {
    const teamName = team.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
    const purseSpan = team.querySelector('.purse-amount');
    const purseRemaining = parseFloat(purseSpan.textContent);
    const totalPlayers = team.querySelectorAll('ul li').length;
    const spent = S.budget - purseRemaining;
    teamStats.push({ name: teamName, spent, remaining: purseRemaining, players: totalPlayers, avgCost: totalPlayers > 0 ? (spent / totalPlayers).toFixed(2) : 0 });
  });
  teamStats.sort((a, b) => b.spent - a.spent);
  let totalUnsoldCount = 0;
  if (S.unsoldPlayers) {
    Object.values(S.unsoldPlayers).forEach(list => { if (Array.isArray(list)) totalUnsoldCount += list.length; });
  }
  let statsHTML = '<div class="stats-grid">';
  statsHTML += '<div class="stat-item"><span class="stat-label">Most Expensive:</span><span class="stat-value">' + (S.auctionStats.mostExpensivePlayer.name || 'N/A') + ' - ' + S.auctionStats.mostExpensivePlayer.price + ' Cr</span><span class="stat-subvalue">' + (S.auctionStats.mostExpensivePlayer.team || '') + '</span></div>';
  statsHTML += '<div class="stat-item"><span class="stat-label">Total Sold:</span><span class="stat-value">' + S.auctionStats.totalPlayersSold + ' Players</span></div>';
  statsHTML += '<div class="stat-item"><span class="stat-label">Total Unsold:</span><span class="stat-value" style="color: #27ae60;">' + totalUnsoldCount + ' Players</span></div>';
  const avgCost = S.auctionStats.totalPlayersSold > 0 ? (S.auctionStats.totalMoneySpent / S.auctionStats.totalPlayersSold).toFixed(2) : 0;
  statsHTML += '<div class="stat-item"><span class="stat-label">Avg Cost:</span><span class="stat-value">' + avgCost + ' Cr</span></div>';
  if (teamStats.length > 0) {
    statsHTML += '<div class="stat-item"><span class="stat-label">Highest Spender:</span><span class="stat-value">' + teamStats[0].name + '</span><span class="stat-subvalue">' + teamStats[0].spent + ' Cr (' + teamStats[0].players + ' players)</span></div>';
    statsHTML += '<div class="stat-item"><span class="stat-label">Lowest Spender:</span><span class="stat-value">' + teamStats[teamStats.length - 1].name + '</span><span class="stat-subvalue">' + teamStats[teamStats.length - 1].spent + ' Cr (' + teamStats[teamStats.length - 1].players + ' players)</span></div>';
  }
  statsHTML += '</div>';
  document.getElementById('stats-content').innerHTML = statsHTML;
};

window.recalculateAuctionStats = function() {
  S.auctionStats = { mostExpensivePlayer: { name: '', price: 0, team: '' }, totalPlayersSold: 0, totalMoneySpent: 0 };
  document.querySelectorAll('.team ul li').forEach(li => {
    const text = li.textContent;
    const priceIndex = text.lastIndexOf(' - ');
    if (priceIndex !== -1) {
      const name = text.substring(0, priceIndex).trim();
      const priceStr = text.substring(priceIndex + 3).replace(' Crores', '').trim();
      const price = parseFloat(priceStr);
      S.auctionStats.totalPlayersSold++;
      S.auctionStats.totalMoneySpent += price;
      if (price > S.auctionStats.mostExpensivePlayer.price) {
        const teamDiv = li.closest('.team');
        const teamName = teamDiv ? teamDiv.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '') : '';
        S.auctionStats.mostExpensivePlayer = { name, price, team: teamName };
      }
    }
  });
};

// =====================================================================
// UPDATING PANELS
// =====================================================================

function updateUpcomingSetsList() {
  if (!S.isAuctionStarted) {
    const container = document.getElementById('upcoming-sets-container');
    if (container) container.style.display = 'none';
    return;
  }
  const upcomingList = document.getElementById('upcoming-sets-list');
  if (!upcomingList || S.isSecondRound) {
    if (upcomingList) upcomingList.innerHTML = '';
    const container = document.getElementById('upcoming-sets-container');
    if (container) container.style.display = 'none';
    return;
  }
  let html = '';
  let startIndex = S.isSetAnnounced ? S.currentSetIndex : S.currentSetIndex + 1;
  for (let i = startIndex; i < S.sets.length; i++) {
    const setName = S.sets[i];
    const playerList = S.players[setName] || [];
    if (playerList.length === 0) continue;
    const displayPlayers = playerList.map(playerEntry => extractPlayerName(playerEntry));
    html += '<div class="set-entry"><div class="set-entry-header"><span>' + setName + '</span><span class="player-count">' + playerList.length + ' players</span></div><div class="set-entry-players">' + displayPlayers.map(player => '<span class="player-name-item">' + player + '</span>').join(' ') + '</div></div>';
  }
  upcomingList.innerHTML = html || '<p style="text-align: center; color: #a0a0c0; padding: 10px;">No upcoming sets</p>';
  const container = document.getElementById('upcoming-sets-container');
  container.style.display = html ? 'block' : 'none';
}

window.updateUnsoldPlayersList = function() {
  const unsoldList = document.getElementById('unsold-players-list');
  const container = document.getElementById('unsold-players-container');
  if (!unsoldList) return;
  let html = '';
  let hasUnsoldPlayers = false;
  const setsWithUnsold = [];
  if (S.isSecondRound) {
    let startIndex = S.isSetAnnounced ? S.currentSetIndex : S.currentSetIndex + 1;
    for (let i = startIndex; i < S.sets.length; i++) {
      const setName = S.sets[i];
      if (S.unsoldPlayers[setName] && S.unsoldPlayers[setName].length > 0) setsWithUnsold.push(setName);
    }
  } else {
    Object.keys(S.unsoldPlayers).forEach(setName => {
      if (S.unsoldPlayers[setName] && S.unsoldPlayers[setName].length > 0) setsWithUnsold.push(setName);
    });
  }
  setsWithUnsold.forEach(setName => {
    const playerEntries = S.unsoldPlayers[setName] || [];
    const displayPlayers = playerEntries.map(playerEntry => extractPlayerName(playerEntry));
    if (displayPlayers.length > 0) {
      hasUnsoldPlayers = true;
      html += '<div class="set-entry"><div class="set-entry-header"><span>' + setName + '</span><span class="player-count">' + displayPlayers.length + ' players</span></div><div class="set-entry-players">' + displayPlayers.map(player => '<span class="player-name-item">' + player + '</span>').join(' ') + '</div></div>';
    }
  });
  unsoldList.innerHTML = html || '<p style="text-align: center; color: #a0a0c0; padding: 10px;">No unsold players</p>';
  const title = container.querySelector('h3');
  if (S.isSecondRound) {
    title.textContent = '\uD83D\uDD04 Unsold Round';
    title.style.color = '#f39c12';
    container.style.borderLeftColor = '#f39c12';
  } else {
    title.textContent = '\u23F3 Unsold Players';
    title.style.color = '#e74c3c';
    container.style.borderLeftColor = '#e74c3c';
  }
  container.style.display = hasUnsoldPlayers ? 'block' : 'none';
};

window.updateAllVisibilityPanels = function() {
  updateUpcomingSetsList();
  window.updateUnsoldPlayersList();
  window.updateStatistics();
};

// =====================================================================
// TEAM MANAGEMENT
// =====================================================================

function setupTeamManagement() {
  const teams = document.querySelectorAll('.team');
  teams.forEach(team => {
    const newTeam = team.cloneNode(true);
    team.parentNode.replaceChild(newTeam, team);
  });
  const refreshedTeams = document.querySelectorAll('.team');
  refreshedTeams.forEach(team => {
    team.addEventListener('click', function(e) {
      if (!e.target.closest('.team-name-text')) openTeamManagementModal(this);
    });
  });
  if (!S.dragDropListenersAttached) {
    document.getElementById('close-management-modal').addEventListener('click', closeTeamManagementModal);
    document.getElementById('copy-lineup-button').addEventListener('click', window.copyLineupToClipboard);
    setupPlayerDragAndDrop();
    S.dragDropListenersAttached = true;
  }
}

function openTeamManagementModal(teamDiv) {
  if (teamDiv.dataset.disqualified === 'true') return;
  if (S.gameMode === 'online') {
    const teamId = teamDiv.dataset.teamId;
    if (teamId !== S.myTeamId) {
      S.currentManagedTeam = teamDiv;
      displayTeamLineupReadOnly(teamDiv);
      return;
    }
  }
  S.currentManagedTeam = teamDiv;
  const teamName = teamDiv.querySelector('.team-name-text').textContent;
  document.getElementById('management-team-name').textContent = teamName;
  const slots = document.querySelectorAll('.player-slot');
  slots.forEach(slot => {
    slot.innerHTML = slot.dataset.slot ? 'Slot ' + slot.dataset.slot : 'Empty Slot';
    slot.className = 'player-slot';
    slot.dataset.filled = 'false';
    slot.style.pointerEvents = 'auto';
    slot.style.opacity = '1';
  });
  const benchList = document.getElementById('bench-list');
  benchList.innerHTML = '';
  benchList.style.pointerEvents = 'auto';
  benchList.style.opacity = '1';
  const copyBtn = document.getElementById('copy-lineup-button');
  copyBtn.style.display = 'block';
  const allPlayers = [];
  teamDiv.querySelectorAll('ul li').forEach(li => {
    const text = li.textContent;
    const undoButtonIndex = text.indexOf('Undo');
    const priceIndex = text.lastIndexOf(' - ');
    if (priceIndex !== -1) {
      const name = text.substring(0, priceIndex).trim();
      const endPos = undoButtonIndex !== -1 ? undoButtonIndex : text.length;
      const price = text.substring(priceIndex + 3, endPos).replace(' Crores', '').trim();
      allPlayers.push({ name, price });
    }
  });
  const savedLineup = JSON.parse(sessionStorage.getItem(getTeamLineupKey(teamName)));
  if (savedLineup) {
    const playingXINames = savedLineup.playingXI.map(p => p.name);
    const savedBenchNames = savedLineup.bench.map(p => p.name);
    savedLineup.playingXI.forEach(player => {
      const slot = document.querySelector('.player-slot[data-slot="' + player.slot + '"]');
      if (slot && allPlayers.some(p => p.name === player.name)) {
        const playerItem = createPlayerItem(player.name, player.price, player.roles);
        slot.innerHTML = '';
        slot.appendChild(playerItem);
        slot.classList.add('filled');
        slot.dataset.filled = 'true';
      }
    });
    savedLineup.bench.forEach(player => {
      if (allPlayers.some(p => p.name === player.name)) {
        benchList.appendChild(createPlayerItem(player.name, player.price));
      }
    });
    allPlayers.forEach(player => {
      if (!playingXINames.includes(player.name) && !savedBenchNames.includes(player.name)) {
        benchList.appendChild(createPlayerItem(player.name, player.price));
      }
    });
  } else {
    allPlayers.forEach(player => benchList.appendChild(createPlayerItem(player.name, player.price)));
  }
  updateXICount();
  document.getElementById('team-management-modal').style.display = 'block';
  document.querySelector('.team-management-content').classList.add('show');
}

function displayTeamLineupReadOnly(teamDiv) {
  const teamName = teamDiv.querySelector('.team-name-text').textContent;
  const teamId = teamDiv.dataset.teamId;
  document.getElementById('management-team-name').textContent = teamName;
  const slots = document.querySelectorAll('.player-slot');
  slots.forEach(slot => {
    slot.innerHTML = slot.dataset.slot ? 'Slot ' + slot.dataset.slot : 'Empty Slot';
    slot.className = 'player-slot';
    slot.dataset.filled = 'false';
    slot.style.pointerEvents = 'none';
  });
  const benchList = document.getElementById('bench-list');
  benchList.innerHTML = '';
  benchList.style.pointerEvents = 'none';
  const copyBtn = document.getElementById('copy-lineup-button');
  copyBtn.style.display = 'block';
  copyBtn.style.pointerEvents = 'auto';

  const createReadOnlyItem = (name, price, roles) => {
    const item = createPlayerItem(name, price, roles);
    item.draggable = false;
    item.style.cursor = 'default';
    item.classList.add('read-only-item');
    return item;
  };

  const remoteTeamData = S.allTeamsData[teamId];
  if (remoteTeamData) {
    const allOwnedPlayers = [];
    if (remoteTeamData.players) {
      Object.values(remoteTeamData.players).forEach(player => allOwnedPlayers.push({ name: player.name, price: player.price }));
    }
    const playersInXI = new Set();
    if (remoteTeamData.playingXI) {
      remoteTeamData.playingXI.forEach(player => {
        const slot = document.querySelector('.player-slot[data-slot="' + player.slot + '"]');
        if (slot) {
          slot.innerHTML = '';
          slot.appendChild(createReadOnlyItem(player.name, player.price, player.roles));
          slot.classList.add('filled');
          slot.dataset.filled = 'true';
          playersInXI.add(player.name);
        }
      });
    }
    const calculatedBench = allOwnedPlayers.filter(p => !playersInXI.has(p.name));
    calculatedBench.forEach(player => benchList.appendChild(createReadOnlyItem(player.name, player.price)));
  }
  updateXICount();
  document.getElementById('team-management-modal').style.display = 'block';
  document.querySelector('.team-management-content').classList.add('show');
}

function createPlayerItem(name, price, roles = {}) {
  const playerItem = document.createElement('div');
  playerItem.className = 'player-item';
  playerItem.draggable = true;
  playerItem.dataset.name = name;
  playerItem.dataset.price = price;
  if (roles.c) playerItem.dataset.c = 'true';
  if (roles.vc) playerItem.dataset.vc = 'true';
  if (roles.wk) playerItem.dataset.wk = 'true';
  playerItem.innerHTML = '<span>' + name + '</span><span class="player-price">' + price + ' Cr</span>';
  updatePlayerBadges(playerItem);
  playerItem.addEventListener('dragstart', (e) => {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', JSON.stringify({
      name: e.target.dataset.name,
      price: e.target.dataset.price,
      source: e.target.parentElement.id,
      slot: e.target.closest('.player-slot')?.dataset.slot,
      roles: { c: e.target.dataset.c === 'true', vc: e.target.dataset.vc === 'true', wk: e.target.dataset.wk === 'true' }
    }));
  });
  playerItem.addEventListener('dragend', (e) => e.target.classList.remove('dragging'));
  playerItem.addEventListener('contextmenu', (e) => {
    if (S.gameMode === 'online' && S.currentManagedTeam && S.currentManagedTeam.dataset.teamId !== S.myTeamId) return;
    showContextMenu(e, playerItem, { c: playerItem.dataset.c === 'true', vc: playerItem.dataset.vc === 'true', wk: playerItem.dataset.wk === 'true' });
  });
  return playerItem;
}
window.createPlayerItem = createPlayerItem;

function closeTeamManagementModal() {
  document.querySelector('.team-management-content').classList.remove('show');
  setTimeout(() => { document.getElementById('team-management-modal').style.display = 'none'; }, 300);
}

window.copyLineupToClipboard = function() {
  const teamName = document.getElementById('management-team-name').textContent.replace(' (Read-Only)', '');
  let lineupText = teamName + '\n\nPlaying XII:\n';
  const slots = document.querySelectorAll('.player-slot.filled');
  slots.forEach((slot, index) => {
    const playerItem = slot.querySelector('.player-item');
    if (playerItem) {
      const suffixes = [];
      if (playerItem.dataset.c === 'true') suffixes.push('(C)');
      if (playerItem.dataset.vc === 'true') suffixes.push('(VC)');
      if (playerItem.dataset.wk === 'true') suffixes.push('(WK)');
      const suffixStr = suffixes.length > 0 ? ' ' + suffixes.join(' ') : '';
      lineupText += (index + 1) + '. ' + playerItem.dataset.name + suffixStr + '\n';
    }
  });
  lineupText += '\nBench:\n';
  const benchPlayers = document.querySelectorAll('#bench-list .player-item');
  benchPlayers.forEach((player, index) => { lineupText += (index + 1) + '. ' + player.dataset.name + '\n'; });
  navigator.clipboard.writeText(lineupText).then(() => {
    const button = document.getElementById('copy-lineup-button');
    button.textContent = '\u2713 Copied!';
    button.style.backgroundColor = '#27ae60';
    setTimeout(() => { button.textContent = '\uD83D\uDCCB Copy Lineup'; button.style.backgroundColor = '#3498db'; }, 2000);
  }).catch(err => { alert('Failed to copy: ' + err); });
};

function setupPlayerDragAndDrop() {
  document.querySelectorAll('.player-slot').forEach(slot => {
    slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('highlight'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('highlight'));
    slot.addEventListener('drop', e => {
      e.preventDefault();
      slot.classList.remove('highlight');
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const draggingItem = document.querySelector('.dragging');
      if (!draggingItem) return;
      if (slot.dataset.filled === 'true' && data.source === 'bench-list') {
        const existingPlayer = slot.querySelector('.player-item');
        const benchList = document.getElementById('bench-list');
        benchList.appendChild(existingPlayer);
        draggingItem.remove();
        slot.innerHTML = '';
        const newPlayerItem = createPlayerItem(data.name, data.price, data.roles || {});
        slot.appendChild(newPlayerItem);
        slot.classList.add('filled');
        slot.dataset.filled = 'true';
        updateXICount();
        saveTeamLineup();
        return;
      }
      if (slot.dataset.filled === 'true' && data.slot) {
        const sourceSlot = document.querySelector('.player-slot[data-slot="' + data.slot + '"]');
        if (sourceSlot && sourceSlot !== slot) {
          const targetPlayerItem = slot.querySelector('.player-item');
          const playerBName = targetPlayerItem.dataset.name;
          const playerBPrice = targetPlayerItem.dataset.price;
          const playerBRoles = { c: targetPlayerItem.dataset.c === 'true', vc: targetPlayerItem.dataset.vc === 'true', wk: targetPlayerItem.dataset.wk === 'true' };
          slot.innerHTML = '';
          const newPlayerA = createPlayerItem(data.name, data.price, data.roles);
          slot.appendChild(newPlayerA);
          sourceSlot.innerHTML = '';
          const newPlayerB = createPlayerItem(playerBName, playerBPrice, playerBRoles);
          sourceSlot.appendChild(newPlayerB);
          draggingItem.remove();
          slot.classList.add('filled');
          slot.dataset.filled = 'true';
          sourceSlot.classList.add('filled');
          sourceSlot.dataset.filled = 'true';
          updateXICount();
          saveTeamLineup();
        }
        return;
      }
      if (slot.dataset.filled === 'true') return;
      if (data.slot) {
        const sourceSlot = document.querySelector('.player-slot[data-slot="' + data.slot + '"]');
        if (sourceSlot) {
          sourceSlot.innerHTML = 'Slot ' + sourceSlot.dataset.slot;
          sourceSlot.classList.remove('filled');
          sourceSlot.dataset.filled = 'false';
        }
      } else if (data.source === 'bench-list') {
        draggingItem.remove();
      }
      slot.innerHTML = '';
      const playerItem = createPlayerItem(data.name, data.price, data.roles);
      slot.appendChild(playerItem);
      slot.classList.add('filled');
      slot.dataset.filled = 'true';
      updateXICount();
      saveTeamLineup();
    });
  });
  const benchList = document.getElementById('bench-list');
  benchList.addEventListener('dragover', e => e.preventDefault());
  benchList.addEventListener('drop', e => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const draggingItem = document.querySelector('.dragging');
    if (!draggingItem) return;
    if (data.slot) {
      const sourceSlot = document.querySelector('.player-slot[data-slot="' + data.slot + '"]');
      if (sourceSlot) {
        sourceSlot.innerHTML = 'Slot ' + sourceSlot.dataset.slot;
        sourceSlot.classList.remove('filled');
        sourceSlot.dataset.filled = 'false';
      }
      benchList.appendChild(draggingItem);
    } else if (data.source === 'bench-list') {
      benchList.appendChild(draggingItem);
    }
    updateXICount();
    saveTeamLineup();
  });
}

function updateXICount() {
  const filledSlots = document.querySelectorAll('.player-slot[data-filled="true"]').length;
  document.getElementById('xi-count').textContent = '(' + filledSlots + '/12)';
}
window.updateXICount = updateXICount;

function saveTeamLineup() {
  if (!S.currentManagedTeam) return;
  const teamName = S.currentManagedTeam.querySelector('.team-name-text').textContent;
  const lineup = { playingXI: [], bench: [] };
  document.querySelectorAll('.player-slot.filled').forEach(slot => {
    const playerItem = slot.querySelector('.player-item');
    if (playerItem) {
      lineup.playingXI.push({ name: playerItem.dataset.name, price: playerItem.dataset.price, slot: slot.dataset.slot, roles: { c: playerItem.dataset.c === 'true', vc: playerItem.dataset.vc === 'true', wk: playerItem.dataset.wk === 'true' } });
    }
  });
  document.querySelectorAll('#bench-list .player-item').forEach(item => {
    lineup.bench.push({ name: item.dataset.name, price: item.dataset.price });
  });
  sessionStorage.setItem(getTeamLineupKey(teamName), JSON.stringify(lineup));
  if (S.gameMode === 'online') syncLineupUpdate(lineup);
}

function syncLineupUpdate(lineup) {
  if (!S.currentRoomCode || !S.myTeamId) return;
  const updates = {};
  updates['rooms/' + S.currentRoomCode + '/teams/' + S.myTeamId + '/playingXI'] = lineup.playingXI;
  updates['rooms/' + S.currentRoomCode + '/teams/' + S.myTeamId + '/bench'] = lineup.bench;
  update(ref(database), updates);
}

// =====================================================================
// GLOBAL UNDO
// =====================================================================

window.triggerGlobalUndo = function() {
  if (S.gameMode === 'online' && !S.isAuctioneer) return;
  let prevSetIndex = S.currentSetIndex;
  let prevPlayerIndex = S.currentPlayerIndex - 1;
  if (prevPlayerIndex < 0) {
    prevSetIndex--;
    if (prevSetIndex < 0) { alert('This is the start of the auction. Cannot undo further.'); return; }
    const prevSetName = S.sets[prevSetIndex];
    const prevList = S.isSecondRound ? S.unsoldPlayers[prevSetName] : S.players[prevSetName];
    prevPlayerIndex = (!prevList || prevList.length === 0) ? 0 : prevList.length - 1;
  }
  const targetSet = S.sets[prevSetIndex];
  const targetList = S.isSecondRound ? S.unsoldPlayers[targetSet] : S.players[targetSet];
  if (!targetList || !targetList[prevPlayerIndex]) {
    S.currentSetIndex = prevSetIndex;
    S.currentPlayerIndex = 0;
    loadNextPlayer();
    return;
  }
  const playerEntry = targetList[prevPlayerIndex];
  const playerName = extractPlayerName(playerEntry);
  let actionReversed = false;
  if (!S.isSecondRound && S.unsoldPlayers[targetSet]) {
    const foundIndex = S.unsoldPlayers[targetSet].findIndex(entry => extractPlayerName(entry) === playerName);
    if (foundIndex !== -1) { S.unsoldPlayers[targetSet].splice(foundIndex, 1); actionReversed = true; }
  }
  if (!actionReversed) {
    const teams = document.querySelectorAll('.team');
    for (const teamDiv of teams) {
      let foundPlayerId = null;
      let foundPrice = 0;
      teamDiv.querySelectorAll('ul li').forEach(li => {
        const text = li.textContent;
        if (text.includes(playerName)) {
          const namePart = text.split(' - ')[0].trim();
          if (normalizePlayerName(namePart) === normalizePlayerName(playerName)) {
            foundPlayerId = li.dataset.playerId;
            const pricePart = text.split(' - ')[1].replace(' Crores', '').trim();
            foundPrice = parseFloat(pricePart);
          }
        }
      });
      if (foundPlayerId) { undoPlayerSale(teamDiv, foundPlayerId, foundPrice, playerName); actionReversed = true; break; }
    }
  }
  S.currentSetIndex = prevSetIndex;
  S.currentPlayerIndex = prevPlayerIndex;
  S.isSetAnnounced = false;
  syncToFirebase();
  syncUnsoldToFirebase();
  loadNextPlayer();
  updateAllVisibilityPanels();
  updateStatistics();
};

function undoPlayerSale(teamDiv, playerId, cost, playerName) {
  const li = teamDiv.querySelector('li[data-player-id="' + playerId + '"]');
  if (li) li.remove();
  const slotItem = document.querySelector('.player-item[data-name="' + playerName.replace(/"/g, '\\"') + '"]');
  if (slotItem) {
    const slot = slotItem.parentElement;
    if (slot.classList.contains('player-slot')) {
      slot.innerHTML = slot.dataset.slot ? 'Slot ' + slot.dataset.slot : 'Empty Slot';
      slot.classList.remove('filled');
      slot.dataset.filled = 'false';
    } else {
      slotItem.remove();
    }
    updateXICount();
  }
  const purseSpan = teamDiv.querySelector('.purse-amount');
  const currentBudget = parseFloat(purseSpan.textContent);
  const newBudget = currentBudget + cost;
  purseSpan.textContent = newBudget;
  window.updatePurseColor(teamDiv);
  recalculateAuctionStats();
  teamDiv.dataset.manualDisq = 'false';
  window.updateTeamCounts(teamDiv);
  if (S.gameMode === 'online' && S.isAuctioneer && playerId) {
    const teamName = teamDiv.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
    let teamId = null;
    Object.entries(S.teamIdMapping).forEach(([id, name]) => { if (name === teamName) teamId = id; });
    if (teamId) {
      const updates = {};
      updates['rooms/' + S.currentRoomCode + '/teams/' + teamId + '/purse'] = newBudget;
      updates['rooms/' + S.currentRoomCode + '/teams/' + teamId + '/players/' + playerId] = null;
      update(ref(database), updates);
    }
  }
}

// =====================================================================
// ROLE & CONTEXT MENU UTILITIES
// =====================================================================

function isPlayerWicketKeeper(playerName) {
  for (const [setName, list] of Object.entries(S.players)) {
    if (setName.includes('Wicket Keeper')) {
      const match = list.some(entry => entry.toLowerCase().includes(playerName.toLowerCase()));
      if (match) return true;
    }
  }
  const allplayers = Object.assign({}, defaultPlayers, S.customPlayers);
  for (const [setName, list] of Object.entries(allplayers)) {
    if (setName.includes('Wicket Keeper')) {
      const match = list.some(entry => {
        if (typeof entry === 'string') return entry.toLowerCase().includes(playerName.toLowerCase());
        return false;
      });
      if (match) return true;
    }
    if (setName.includes('Marquee')) {
      const match = list.some(entry => {
        const parsed = parsePlayerEntry(entry, 'Marquee');
        return parsed.name.toLowerCase() === playerName.toLowerCase() && parsed.tag === 'wk';
      });
      if (match) return true;
    }
  }
  return false;
}

function showContextMenu(e, playerItem, roles) {
  e.preventDefault();
  if (!playerItem.closest('.player-slot')) return;
  const existingMenu = document.getElementById('custom-context-menu');
  if (existingMenu) existingMenu.remove();
  const playerName = playerItem.dataset.name;
  const canBeWK = isPlayerWicketKeeper(playerName);
  const menu = document.createElement('div');
  menu.id = 'custom-context-menu';
  menu.className = 'custom-context-menu';
  menu.style.left = e.pageX + 'px';
  menu.style.top = e.pageY + 'px';
  const capOption = document.createElement('div');
  capOption.className = 'menu-option' + (roles.c ? ' active-role' : '');
  capOption.innerHTML = '<span>\uD83D\uDC51</span> Captain';
  capOption.onclick = (ev) => { ev.stopPropagation(); setPlayerRole(playerItem, 'c'); menu.remove(); };
  const vcOption = document.createElement('div');
  vcOption.className = 'menu-option' + (roles.vc ? ' active-role' : '');
  vcOption.innerHTML = '<span>\uD83D\uDEE1\uFE0F</span> Vice-Captain';
  vcOption.onclick = (ev) => { ev.stopPropagation(); setPlayerRole(playerItem, 'vc'); menu.remove(); };
  menu.appendChild(capOption);
  menu.appendChild(vcOption);
  if (canBeWK) {
    const wkOption = document.createElement('div');
    wkOption.className = 'menu-option' + (roles.wk ? ' active-role' : '');
    wkOption.innerHTML = '<span>\uD83E\uDDE4</span> Wicket Keeper';
    wkOption.onclick = (ev) => { ev.stopPropagation(); setPlayerRole(playerItem, 'wk'); menu.remove(); };
    menu.appendChild(wkOption);
  }
  document.body.appendChild(menu);
}

function setPlayerRole(targetPlayerItem, role) {
  const isAdding = !targetPlayerItem.dataset[role];
  const allSlotItems = document.querySelectorAll('.player-slot .player-item');
  if (role === 'c' && isAdding) {
    allSlotItems.forEach(item => { delete item.dataset.c; updatePlayerBadges(item); });
    delete targetPlayerItem.dataset.vc;
  } else if (role === 'vc' && isAdding) {
    allSlotItems.forEach(item => { delete item.dataset.vc; updatePlayerBadges(item); });
    delete targetPlayerItem.dataset.c;
  }
  if (isAdding) targetPlayerItem.dataset[role] = 'true';
  else delete targetPlayerItem.dataset[role];
  updatePlayerBadges(targetPlayerItem);
  saveTeamLineup();
}

function updatePlayerBadges(playerItem) {
  playerItem.querySelectorAll('.role-badge').forEach(b => b.remove());
  const nameSpan = playerItem.querySelector('span:first-child');
  if (playerItem.dataset.c) {
    const badge = document.createElement('span');
    badge.className = 'role-badge role-c';
    badge.textContent = 'C';
    nameSpan.appendChild(badge);
  }
  if (playerItem.dataset.vc) {
    const badge = document.createElement('span');
    badge.className = 'role-badge role-vc';
    badge.textContent = 'VC';
    nameSpan.appendChild(badge);
  }
  if (playerItem.dataset.wk) {
    const badge = document.createElement('span');
    badge.className = 'role-badge role-wk';
    badge.textContent = 'WK';
    nameSpan.appendChild(badge);
  }
}
window.updatePlayerBadges = updatePlayerBadges;

// =====================================================================
// UNSOLD ROUND MODAL
// =====================================================================

function showUnsoldRoundModal() {
  const modal = document.getElementById('unsold-round-modal');
  if (modal) {
    modal.style.display = 'block';
    setTimeout(() => document.getElementById('close-unsold-modal-btn').focus(), 100);
  }
}

window.closeUnsoldRoundModal = function() {
  const modal = document.getElementById('unsold-round-modal');
  if (modal) modal.style.display = 'none';
};

// =====================================================================
// TEAM NAME EDITING
// =====================================================================

window.makeTeamNameEditable = function(element) {
  if (S.isAuctionStarted || S.gameMode === 'online') return;
  element.contenteditable = 'true';
  element.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
  element.style.backgroundColor = 'rgba(39, 174, 96, 0.2)';
  element.style.padding = '2px 6px';
  element.style.borderRadius = '4px';
  element.style.cursor = 'text';
};

window.saveTeamName = function(element) {
  const newName = element.textContent.trim();
  const teamDiv = element.closest('.team');
  const oldName = S.teamNames.find(name => teamDiv.querySelector('.team-name-text').textContent.includes(name));
  if (newName && newName !== oldName) {
    const index = S.teamNames.indexOf(oldName);
    if (index !== -1) S.teamNames[index] = newName;
  }
  if (S.isAuctionStarted || S.gameMode === 'online') {
    element.contenteditable = 'false';
    element.style.cursor = 'default';
    element.style.pointerEvents = 'none';
    element.onclick = null;
  } else {
    element.contenteditable = 'true';
    element.style.cursor = 'text';
    element.style.pointerEvents = 'auto';
  }
  element.style.backgroundColor = '';
  element.style.padding = '';
};

window.handleTeamNameKey = function(event, element) {
  if (event.key === 'Enter') { event.preventDefault(); element.blur(); }
};

// =====================================================================
// RESET FUNCTIONS
// =====================================================================

window.restartAuction = function() {
  if (S.gameMode === 'online' && !S.isAuctioneer) { alert('Only the auctioneer can restart the auction!'); return; }
  if (!confirm('Are you sure you want to restart the auction? All player assignments will be cleared but teams will remain.')) return;
  const teams = document.querySelectorAll('.team');
  const savedTeamNames = [];
  teams.forEach(team => {
    const teamNameElement = team.querySelector('.team-name-text');
    if (teamNameElement) savedTeamNames.push(teamNameElement.textContent.replace(' - DISQUALIFIED', ''));
  });
  S.currentSetIndex = 0;
  S.currentPlayerIndex = 0;
  S.isSetAnnounced = false;
  S.isSecondRound = false;
  S.unsoldPlayers = {};
  S.isAuctionStarted = false;
  S.auctionStats = { mostExpensivePlayer: { name: '', price: 0, team: '' }, totalPlayersSold: 0, totalMoneySpent: 0 };
  sessionStorage.clear();
  const teamsContainer = document.getElementById('teams-container');
  teamsContainer.innerHTML = '';
  savedTeamNames.forEach(name => {
    const teamDiv = document.createElement('div');
    teamDiv.className = 'team';
    teamDiv.dataset.maxReached = 'false';
    teamDiv.dataset.disqualified = 'false';
    teamDiv.innerHTML = '<div class="team-header-editable"><h3><span class="team-name-text" contenteditable="true" onclick="window.makeTeamNameEditable(this)" onblur="window.saveTeamName(this)" onkeydown="window.handleTeamNameKey(event, this)" style="cursor: text;">' + name + '</span></h3></div><p>Purse Remaining: <span class="purse-amount">' + S.budget + '</span> Crores</p><p class="player-count">Players: 0 / ' + S.minPlayers + '</p><div class="section"><h4>Wicket Keepers (0)</h4><ul class="wicket-keepers"></ul></div><div class="section"><h4>Batsmen (0)</h4><ul class="batsmen"></ul></div><div class="section"><h4>Fast Bowlers (0)</h4><ul class="fast-bowlers"></ul></div><div class="section"><h4>Spinners (0)</h4><ul class="spinners"></ul></div><div class="section"><h4>All-rounders (0)</h4><ul class="all-rounders"></ul></div>';
    teamsContainer.appendChild(teamDiv);
  });
  S.dragDropListenersAttached = false;
  setupTeamManagement();
  const playerButton = document.getElementById('current-player-name');
  playerButton.textContent = 'Click to Start';
  playerButton.style.backgroundColor = '#27ae60';
  playerButton.style.cursor = 'pointer';
  playerButton.draggable = false;
  document.getElementById('unsold-players-container').style.display = 'none';
  updateStatistics();
  window.updateAllVisibilityPanels();
  announceSet();
};

window.resetAuction = function() {
  if (S.gameMode === 'online' && !S.isAuctioneer) { alert('Only the auctioneer can reset the auction!'); return; }
  if (!confirm('Are you sure you want to reset the entire auction? All progress will be lost.')) return;
  if (S.gameMode === 'online') {
    if (!S.isAuctioneer) { alert('Only the auctioneer can reset the auction'); return; }
    if (S.currentRoomCode) remove(ref(database, 'rooms/' + S.currentRoomCode));
  }
  S.currentSetIndex = 0;
  S.currentPlayerIndex = 0;
  S.isSetAnnounced = false;
  S.isSecondRound = false;
  S.unsoldPlayers = {};
  S.dragDropListenersAttached = false;
  S.playerMode = 'default';
  S.customPlayers = {};
  S.teamNames = [];
  S.editableTeams = new Set();
  S.isAuctionStarted = false;
  S.allPlayersInAuction.clear();
  S.gameMode = 'offline';
  S.currentRoomCode = null;
  S.isAuctioneer = false;
  S.myTeamId = null;
  S.auctionStats = { mostExpensivePlayer: { name: '', price: 0, team: '' }, totalPlayersSold: 0, totalMoneySpent: 0 };
  S.setTypeCounts = { Marquee: 0, 'Wicket Keeper': 0, Batsman: 0, 'Fast Bowler': 0, Spinner: 0, 'All-rounder': 0 };
  S.players = {};
  S.sets = [];
  detachAllListeners();
  sessionStorage.clear();
  document.getElementById('auction-interface').style.display = 'none';
  document.getElementById('stats-panel').style.display = 'none';
  document.getElementById('upcoming-sets-container').style.display = 'none';
  document.getElementById('unsold-players-container').style.display = 'none';
  document.getElementById('teams-container').innerHTML = '';
  document.getElementById('teams-container').style.display = 'none';
  document.getElementById('reset-controls').style.display = 'none';
  document.getElementById('custom-players-setup').style.display = 'none';
  document.getElementById('initial-setup').style.display = 'none';
  document.getElementById('online-choice').style.display = 'none';
  document.getElementById('join-room-screen').style.display = 'none';
  document.getElementById('waiting-lobby').style.display = 'none';
  document.getElementById('mode-selection').style.display = 'flex';
  document.getElementById('team-count').value = '';
  document.getElementById('team-budget').value = '';
  document.getElementById('min-players').value = '';
  document.getElementById('max-players').value = '';
  document.getElementById('auctioneer-name').value = '';
  document.getElementById('join-room-code').value = '';
  document.getElementById('join-team-name').value = '';
  const defaultModeRadio = document.querySelector('input[name="player-mode"][value="default"]');
  if (defaultModeRadio) defaultModeRadio.checked = true;
  const onlineRadio = document.querySelector('input[name="game-mode"][value="online"]');
  if (onlineRadio) onlineRadio.checked = true;
  const setsContainer = document.getElementById('sets-container');
  if (setsContainer) setsContainer.innerHTML = '';
};

// =====================================================================
// TRANSITION TO AUCTION (called from multiplayer)
// =====================================================================

window.transitionToAuction = function() {
  document.getElementById('waiting-lobby').style.display = 'none';
  document.getElementById('auction-interface').style.display = 'block';
  document.getElementById('stats-panel').style.display = 'block';
  document.getElementById('upcoming-sets-container').style.display = 'block';
  document.getElementById('reset-controls').style.display = 'block';
  get(ref(database, 'rooms/' + S.currentRoomCode)).then(snapshot => {
    if (snapshot.exists()) {
      const roomData = snapshot.val();
      const teams = roomData.teams;
      S.players = roomData.config.players;
      S.sets = roomData.config.sets;
      S.teamNames = [];
      S.teamIdMapping = {};
      Object.entries(teams).forEach(([teamId, teamData]) => {
        S.teamNames.push(teamData.name);
        S.teamIdMapping[teamId] = teamData.name;
      });
      createTeamsDirectly();
      window.syncTeamsFromFirebase(roomData.teams);
    }
  });
};

// =====================================================================
// WINDOW EXPORTS (for multiplayer.js & HTML onclick references)
// =====================================================================
window.handlePlayerContextMenu = handlePlayerContextMenu;
window.showUnsoldRoundModal = showUnsoldRoundModal;
window.displayTeamLineupReadOnly = displayTeamLineupReadOnly;
window.getCategoryFromPlayerData = getCategoryFromPlayerData;
window.getSectionByCategory = getSectionByCategory;
window.confirmPrice = confirmPrice;
window.confirmPlayerMove = confirmPlayerMove;
window.validateInput = validateInput;
window.closeTeamManagementModal = closeTeamManagementModal;
