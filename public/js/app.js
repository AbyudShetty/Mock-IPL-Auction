import './state.js';
import './config.js';
import './firebase-init.js';
import './utils.js';
import './stats-engine.js';
import './multiplayer.js';
import './auction.js';
import './celebration.js';
import { openPlayerStatsModal, closePlayerStatsModal } from './stats-engine.js';
import { getTeamLineupKey, extractPlayerName } from './utils.js';
import { S } from './state.js';

// =====================================================================
// EVENT LISTENERS - SETUP
// =====================================================================

document.getElementById('mode-continue-button').addEventListener('click', window.handleModeSelection);
document.getElementById('online-choice-button').addEventListener('click', window.handleOnlineChoice);
document.getElementById('setup-button').addEventListener('click', window.handleSetupContinue);
document.getElementById('join-room-button').addEventListener('click', window.handleJoinRoom);
document.getElementById('start-auction-button').addEventListener('click', window.startAuctionFromLobby);

// =====================================================================
// MODAL - Price
// =====================================================================

document.getElementById('cancel-price').onclick = function() {
  document.getElementById('price-modal').style.display = 'none';
};
document.getElementById('confirm-price').onclick = function() {
  window.confirmPrice();
};
document.getElementById('price-input').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') window.confirmPrice();
});

// =====================================================================
// MODAL - Move Player
// =====================================================================

document.getElementById('cancel-move-player').addEventListener('click', () => {
  document.getElementById('move-player-modal').style.display = 'none';
});
document.getElementById('confirm-move-player').addEventListener('click', window.confirmPlayerMove);

// =====================================================================
// MODAL - Stats
// =====================================================================

document.getElementById('view-stats-button').addEventListener('click', openPlayerStatsModal);
document.getElementById('close-player-stats').addEventListener('click', closePlayerStatsModal);
document.getElementById('player-stats-modal').addEventListener('click', function(event) {
  if (event.target === this) closePlayerStatsModal();
});

// =====================================================================
// MODAL - Price (click outside)
// =====================================================================

document.getElementById('price-modal').addEventListener('click', function(event) {
  if (event.target === this) this.style.display = 'none';
});

// =====================================================================
// MODAL - Team Management (click outside)
// =====================================================================

document.getElementById('team-management-modal').addEventListener('click', function(event) {
  if (event.target === this) window.closeTeamManagementModal();
});

// =====================================================================
// SETUP INPUT NAVIGATION (Enter key)
// =====================================================================

document.getElementById('auctioneer-name').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); window.validateInput('auctioneer-name', 'team-count'); }
});
document.getElementById('team-count').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); window.validateInput('team-count', 'team-budget'); }
});
document.getElementById('team-budget').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); window.validateInput('team-budget', 'min-players'); }
});
document.getElementById('min-players').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); window.validateInput('min-players', 'max-players'); }
});
document.getElementById('max-players').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (window.validateInput('max-players', null)) {
      const checkedRadio = document.querySelector('input[name="player-mode"]:checked');
      if (checkedRadio) checkedRadio.focus();
    }
  }
});
document.querySelectorAll('input[name="player-mode"]').forEach(radio => {
  radio.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); window.handleSetupContinue(); }
  });
});

// =====================================================================
// JOIN ROOM NAVIGATION
// =====================================================================

document.getElementById('join-room-code').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const code = this.value.trim();
    if (code.length !== 6) window.showError('join-room-code', 'Code must be 6 characters');
    else { window.clearError('join-room-code'); document.getElementById('join-team-name').focus(); }
  }
});
document.getElementById('join-team-name').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); window.handleJoinRoom(); }
});

// =====================================================================
// CLICK TO START (Enter key on player button)
// =====================================================================

document.getElementById('current-player-name').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') window.startSetAuction();
});
document.getElementById('next-player-button').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') window.nextPlayer();
});

// =====================================================================
// GLOBAL DRAG AND DROP
// =====================================================================

document.addEventListener('dragover', event => { event.preventDefault(); });
document.addEventListener('drop', async event => {
  event.preventDefault();
  if (S.gameMode === 'online' && !S.isAuctioneer) return;
  const data = JSON.parse(event.dataTransfer.getData('text/plain'));
  S.currentPlayerData = data;
  S.currentTeamDiv = event.target.closest('.team');
  if (S.currentTeamDiv) {
    if (S.currentTeamDiv.dataset.disqualified === 'true') return;
    if (S.currentTeamDiv.dataset.maxReached === 'true') return;
    document.getElementById('modal-player-name').textContent = 'Enter price for ' + data.player;
    const teamName = S.currentTeamDiv.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
    document.getElementById('modal-team-name').textContent = 'Selling to: ' + teamName;
    document.getElementById('price-input').value = '';
    document.getElementById('price-modal').style.display = 'block';
    document.getElementById('price-input').focus();
  }
});

// =====================================================================
// ESCAPE KEY - Close modals
// =====================================================================

document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const moveModal = document.getElementById('move-player-modal');
    if (moveModal && moveModal.style.display === 'block') { moveModal.style.display = 'none'; return; }
    const unsoldModal = document.getElementById('unsold-round-modal');
    if (unsoldModal && unsoldModal.style.display === 'block') { window.closeUnsoldRoundModal(); return; }
    const priceModal = document.getElementById('price-modal');
    if (priceModal.style.display === 'block') { priceModal.style.display = 'none'; return; }
    const teamModal = document.getElementById('team-management-modal');
    if (teamModal && teamModal.style.display === 'block') { window.closeTeamManagementModal(); return; }
    const statsModal = document.getElementById('player-stats-modal');
    if (statsModal && statsModal.style.display === 'block') { closePlayerStatsModal(); }
  }
});

// =====================================================================
// ENTER KEY - Screen navigation
// =====================================================================

document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    const modeSelection = document.getElementById('mode-selection');
    if (modeSelection && modeSelection.style.display !== 'none') { event.preventDefault(); window.handleModeSelection(); return; }
    const onlineChoice = document.getElementById('online-choice');
    if (onlineChoice && onlineChoice.style.display !== 'none') { event.preventDefault(); window.handleOnlineChoice(); return; }
  }
});

// =====================================================================
// CLICK ON CONTEXT MENU (close it)
// =====================================================================

document.addEventListener('click', () => {
  const menu = document.getElementById('custom-context-menu');
  if (menu) menu.remove();
});

// =====================================================================
// BEFORE UNLOAD
// =====================================================================

window.addEventListener('beforeunload', function() {
  const teams = document.querySelectorAll('.team h3 .team-name-text');
  teams.forEach(team => {
    const teamName = team.textContent.replace(' - DISQUALIFIED', '');
    sessionStorage.removeItem(getTeamLineupKey(teamName));
  });
});

// =====================================================================
// DOM CONTENT LOADED
// =====================================================================

document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('room');
  if (roomCode) {
    S.gameMode = 'online';
    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('join-room-screen').style.display = 'flex';
    document.getElementById('join-room-code').value = roomCode.toUpperCase();
    document.getElementById('join-team-name').focus();
  } else {
    document.getElementById('join-room-code').value = '';
    document.getElementById('join-team-name').value = '';
  }
  document.getElementById('auction-interface').style.display = 'none';
  document.getElementById('stats-panel').style.display = 'none';
  document.getElementById('upcoming-sets-container').style.display = 'none';
  document.getElementById('unsold-players-container').style.display = 'none';
  document.getElementById('reset-controls').style.display = 'none';
  document.getElementById('teams-container').style.display = 'none';
});

// =====================================================================
// GLOBAL PLAYER SEARCH ENGINE
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('global-player-search');
  const dropdown = document.getElementById('search-results-dropdown');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (query.length < 2) { dropdown.style.display = 'none'; return; }
      let results = [];
      const matchesSearch = (name, q) => {
        const lowerName = name.toLowerCase();
        return lowerName.startsWith(q) || lowerName.includes(' ' + q);
      };
      document.querySelectorAll('.team').forEach(team => {
        const teamName = team.querySelector('.team-name-text').textContent.replace(' - DISQUALIFIED', '');
        team.querySelectorAll('ul li').forEach(li => {
          const text = li.textContent;
          const priceIndex = text.lastIndexOf(' - ');
          if (priceIndex !== -1) {
            const playerName = text.substring(0, priceIndex).trim();
            if (matchesSearch(playerName, query)) {
              const price = text.substring(priceIndex + 3).replace(' Crores', '').trim();
              results.push({ name: playerName, status: teamName, price: price + ' Cr', type: 'sold' });
            }
          }
        });
      });
      for (const [setName, playerList] of Object.entries(S.unsoldPlayers)) {
        if (playerList) {
          playerList.forEach(entry => {
            const playerName = extractPlayerName(entry);
            if (matchesSearch(playerName, query) && !results.some(r => r.name === playerName)) {
              const currentBtn = document.getElementById('current-player-name');
              if (currentBtn && currentBtn.textContent === playerName) {
                results.push({ name: playerName, status: 'On The Block', price: 'BID NOW', type: 'current' });
              } else if (S.isSecondRound) {
                results.push({ name: playerName, status: 'Upcoming (' + setName + ')', price: '-', type: 'unsold-upcoming' });
              } else {
                results.push({ name: playerName, status: 'Unsold', price: '-', type: 'unsold' });
              }
            }
          });
        }
      }
      for (const [setName, playerList] of Object.entries(S.players)) {
        if (playerList) {
          playerList.forEach(entry => {
            const playerName = extractPlayerName(entry);
            if (matchesSearch(playerName, query) && !results.some(r => r.name === playerName)) {
              const currentBtn = document.getElementById('current-player-name');
              if (currentBtn && currentBtn.textContent === playerName) {
                results.push({ name: playerName, status: 'On The Block', price: 'BID NOW', type: 'current' });
              } else if (!S.isSecondRound) {
                results.push({ name: playerName, status: 'Upcoming (' + setName + ')', price: '-', type: 'upcoming' });
              }
            }
          });
        }
      }
      if (results.length > 0) {
        dropdown.innerHTML = results.map(r => '<div class="search-result-item"><div class="result-name">' + r.name + '</div><div class="result-status"><span class="status-badge ' + r.type + '">' + r.status + '</span>' + (r.price !== '-' ? '<span class="result-price">' + r.price + '</span>' : '') + '</div></div>').join('');
        dropdown.style.display = 'block';
      } else {
        dropdown.innerHTML = '<div class="search-result-item" style="justify-content: center; color: #a0a0c0;">No players found</div>';
        dropdown.style.display = 'block';
      }
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.global-search-container')) dropdown.style.display = 'none';
    });
  }
});
