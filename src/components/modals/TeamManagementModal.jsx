import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuctionStore } from '../../store/auctionStore.js';
import { getTeamLineupKey, normalizePlayerName, parsePlayerEntry } from '../../lib/utils.js';
import { defaultPlayers } from '../../lib/config.js';
import { getTeamPlayers } from '../../store/selectors.js';

const SLOT_COUNT = 12;
const SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => String(i + 1));

const emptyRoles = () => ({ c: false, vc: false, wk: false });

/**
 * A player may keep if they appear in any Wicket Keeper set, or are tagged `wk`
 * in a Marquee set. Names are compared normalised, because the squad list holds
 * the emoji-stripped display name while the pool entry still carries the ✈️.
 */
function isPlayerWicketKeeper(playerName, players, customPlayers) {
  const needle = playerName.toLowerCase();
  const normalisedNeedle = normalizePlayerName(playerName);

  const inKeeperSet = list => list.some(entry => String(entry).toLowerCase().includes(needle));
  const taggedKeeperInMarquee = list =>
    list.some(entry => {
      const parsed = parsePlayerEntry(entry, 'Marquee');
      return normalizePlayerName(parsed.name) === normalisedNeedle && parsed.tag === 'wk';
    });

  for (const [setName, list] of Object.entries(players || {})) {
    if (setName.includes('Wicket Keeper') && inKeeperSet(list)) return true;
    if (setName.includes('Marquee') && taggedKeeperInMarquee(list)) return true;
  }

  const allPools = { ...defaultPlayers, ...(customPlayers || {}) };
  for (const [setName, list] of Object.entries(allPools)) {
    if (setName.includes('Wicket Keeper') && inKeeperSet(list)) return true;
    if (setName.includes('Marquee') && taggedKeeperInMarquee(list)) return true;
  }
  return false;
}

function RoleBadges({ roles }) {
  return (
    <>
      {roles.c && <span className="role-badge role-c">C</span>}
      {roles.vc && <span className="role-badge role-vc">VC</span>}
      {roles.wk && <span className="role-badge role-wk">WK</span>}
    </>
  );
}

function PlayerItem({ player, readOnly, source, slot, onDragStart, onContextMenu }) {
  return (
    <div
      className={`player-item${readOnly ? ' read-only-item' : ''}`}
      draggable={!readOnly}
      data-name={player.name}
      data-price={player.price}
      style={readOnly ? { cursor: 'default' } : undefined}
      onDragStart={event => {
        event.dataTransfer.setData('text/plain', JSON.stringify({ ...player, source, slot }));
        event.currentTarget.classList.add('dragging');
        onDragStart?.();
      }}
      onDragEnd={event => event.currentTarget.classList.remove('dragging')}
      onContextMenu={event => {
        if (readOnly || !slot) return;
        event.preventDefault();
        onContextMenu?.(event, player, slot);
      }}
    >
      <span>
        {player.name}
        <RoleBadges roles={player.roles || emptyRoles()} />
      </span>
      <span className="player-price">{player.price} Cr</span>
    </div>
  );
}

export default function TeamManagementModal() {
  const managedTeamId = useAuctionStore(s => s.managedTeamId);
  const teams = useAuctionStore(s => s.teams);
  const gameMode = useAuctionStore(s => s.gameMode);
  const myTeamId = useAuctionStore(s => s.myTeamId);
  const players = useAuctionStore(s => s.players);
  const customPlayers = useAuctionStore(s => s.customPlayers);
  const saveLineup = useAuctionStore(s => s.saveLineup);
  const closeTeamManagement = useAuctionStore(s => s.closeTeamManagement);

  const team = teams.find(t => t.id === managedTeamId) || null;
  const readOnly = gameMode === 'online' && Boolean(team) && team.id !== myTeamId;

  const [lineup, setLineup] = useState(() => ({ slots: {}, bench: [] }));
  const [contextMenu, setContextMenu] = useState(null);
  const [copied, setCopied] = useState(false);
  const initialisedFor = useRef(null);

  const owned = useMemo(() => (team ? getTeamPlayers(team) : []), [team]);

  // (Re)build the board whenever a different team's modal is opened.
  useEffect(() => {
    if (!team) {
      initialisedFor.current = null;
      return;
    }
    if (initialisedFor.current === team.id) return;
    initialisedFor.current = team.id;

    const slots = {};
    const ownedByName = new Map(owned.map(p => [p.name, { name: p.name, price: p.price }]));

    if (readOnly) {
      const inXI = new Set();
      (team.playingXI || []).forEach(entry => {
        if (!SLOTS.includes(String(entry.slot))) return;
        slots[String(entry.slot)] = {
          name: entry.name,
          price: entry.price,
          roles: { ...emptyRoles(), ...(entry.roles || {}) }
        };
        inXI.add(entry.name);
      });
      setLineup({ slots, bench: owned.filter(p => !inXI.has(p.name)).map(p => ({ name: p.name, price: p.price })) });
      return;
    }

    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(getTeamLineupKey(team.name)) || 'null');
    } catch {
      saved = null;
    }

    if (!saved) {
      setLineup({ slots: {}, bench: owned.map(p => ({ name: p.name, price: p.price, roles: emptyRoles() })) });
      return;
    }

    const placed = new Set();
    (saved.playingXI || []).forEach(entry => {
      if (!SLOTS.includes(String(entry.slot))) return;
      if (!ownedByName.has(entry.name)) return;
      slots[String(entry.slot)] = {
        name: entry.name,
        price: entry.price,
        roles: { ...emptyRoles(), ...(entry.roles || {}) }
      };
      placed.add(entry.name);
    });

    const bench = [];
    (saved.bench || []).forEach(entry => {
      if (!ownedByName.has(entry.name) || placed.has(entry.name)) return;
      bench.push({ name: entry.name, price: entry.price, roles: emptyRoles() });
      placed.add(entry.name);
    });
    owned.forEach(p => {
      if (!placed.has(p.name)) bench.push({ name: p.name, price: p.price, roles: emptyRoles() });
    });

    setLineup({ slots, bench });
  }, [team, owned, readOnly]);

  // Keep the board in step with the squad while the modal stays open: newly
  // bought players land on the bench, undone buys disappear from wherever they sat.
  useEffect(() => {
    if (!team || initialisedFor.current !== team.id) return;
    setLineup(current => {
      const ownedNames = new Set(owned.map(p => p.name));
      const slots = {};
      const seen = new Set();
      SLOTS.forEach(slot => {
        const player = current.slots[slot];
        if (player && ownedNames.has(player.name)) {
          slots[slot] = player;
          seen.add(player.name);
        }
      });
      const bench = current.bench.filter(p => {
        if (!ownedNames.has(p.name) || seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
      });
      owned.forEach(p => {
        if (!seen.has(p.name)) bench.push({ name: p.name, price: p.price, roles: emptyRoles() });
      });

      const unchanged =
        bench.length === current.bench.length &&
        bench.every((p, i) => p.name === current.bench[i].name) &&
        SLOTS.every(slot => (slots[slot]?.name ?? null) === (current.slots[slot]?.name ?? null));
      return unchanged ? current : { slots, bench };
    });
  }, [team, owned]);

  // Dismiss the role menu on any outside click, as the original did.
  useEffect(() => {
    if (!contextMenu) return undefined;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  useEffect(() => {
    if (!managedTeamId) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') closeTeamManagement();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [managedTeamId, closeTeamManagement]);

  if (!team) return null;

  const commit = next => {
    setLineup(next);
    if (readOnly) return;
    saveLineup(team.id, {
      playingXI: SLOTS.filter(slot => next.slots[slot]).map(slot => ({
        name: next.slots[slot].name,
        price: next.slots[slot].price,
        slot,
        roles: next.slots[slot].roles || emptyRoles()
      })),
      bench: next.bench.map(p => ({ name: p.name, price: p.price }))
    });
  };

  const readDragData = event => {
    try {
      return JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch {
      return null;
    }
  };

  const handleSlotDrop = (event, targetSlot) => {
    event.preventDefault();
    event.currentTarget.classList.remove('highlight');
    if (readOnly) return;
    const data = readDragData(event);
    if (!data) return;

    const slots = { ...lineup.slots };
    let bench = [...lineup.bench];
    const dragged = { name: data.name, price: data.price, roles: { ...emptyRoles(), ...(data.roles || {}) } };
    const occupant = slots[targetSlot] || null;

    if (data.source === 'slot' && String(data.slot) === String(targetSlot)) return;

    if (data.source === 'bench') {
      bench = bench.filter(p => p.name !== data.name);
      if (occupant) bench.push(occupant); // displaced player drops to the bench
      slots[targetSlot] = dragged;
    } else if (data.source === 'slot') {
      const sourceSlot = String(data.slot);
      if (occupant) slots[sourceSlot] = occupant; // straight swap
      else delete slots[sourceSlot];
      slots[targetSlot] = dragged;
    } else {
      return;
    }

    commit({ slots, bench });
  };

  const handleBenchDrop = event => {
    event.preventDefault();
    if (readOnly) return;
    const data = readDragData(event);
    if (!data) return;

    const slots = { ...lineup.slots };
    let bench = [...lineup.bench];
    const dragged = { name: data.name, price: data.price, roles: { ...emptyRoles(), ...(data.roles || {}) } };

    if (data.source === 'slot') {
      delete slots[String(data.slot)];
      bench.push({ ...dragged, roles: emptyRoles() });
    } else {
      bench = bench.filter(p => p.name !== data.name);
      bench.push(dragged);
    }

    commit({ slots, bench });
  };

  /** Captain and vice-captain are exclusive; a player cannot hold both. */
  const setPlayerRole = (slot, role) => {
    const current = lineup.slots[slot];
    if (!current) return;
    const isAdding = !current.roles?.[role];
    const slots = { ...lineup.slots };

    if (isAdding && (role === 'c' || role === 'vc')) {
      SLOTS.forEach(key => {
        if (slots[key]) slots[key] = { ...slots[key], roles: { ...slots[key].roles, [role]: false } };
      });
      const other = role === 'c' ? 'vc' : 'c';
      slots[slot] = { ...slots[slot], roles: { ...slots[slot].roles, [other]: false } };
    }

    slots[slot] = { ...slots[slot], roles: { ...slots[slot].roles, [role]: isAdding } };
    commit({ ...lineup, slots });
    setContextMenu(null);
  };

  const copyLineup = () => {
    const filled = SLOTS.filter(slot => lineup.slots[slot]);
    let text = `${team.name}\n\nPlaying XII:\n`;
    filled.forEach((slot, index) => {
      const player = lineup.slots[slot];
      const suffixes = [];
      if (player.roles?.c) suffixes.push('(C)');
      if (player.roles?.vc) suffixes.push('(VC)');
      if (player.roles?.wk) suffixes.push('(WK)');
      text += `${index + 1}. ${player.name}${suffixes.length ? ' ' + suffixes.join(' ') : ''}\n`;
    });
    text += '\nBench:\n';
    lineup.bench.forEach((player, index) => {
      text += `${index + 1}. ${player.name}\n`;
    });

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => window.alert('Failed to copy: ' + err));
  };

  const filledCount = SLOTS.filter(slot => lineup.slots[slot]).length;

  return (
    <div
      id="team-management-modal"
      className="modal"
      style={{ display: 'block' }}
      onClick={event => {
        if (event.target === event.currentTarget) closeTeamManagement();
      }}
    >
      <div className="team-management-content show">
        <div className="modal-header">
          <h2 id="management-team-name">{team.name}</h2>
          <div className="modal-actions">
            <button
              id="copy-lineup-button"
              className="copy-lineup-btn"
              style={{ display: 'block', backgroundColor: copied ? '#27ae60' : '#3498db' }}
              onClick={copyLineup}
            >
              {copied ? '✓ Copied!' : '📋 Copy Lineup'}
            </button>
            <button id="close-management-modal" className="close-btn" onClick={closeTeamManagement}>
              &times;
            </button>
          </div>
        </div>

        <div className="team-management-container">
          <div className="playing-xi">
            <h3>
              Playing XII <span id="xi-count">({filledCount}/12)</span>
            </h3>
            <div id="playing-xi-list" className="player-list">
              {SLOTS.map(slot => {
                const player = lineup.slots[slot];
                return (
                  <div
                    key={slot}
                    className={`player-slot${player ? ' filled' : ''}`}
                    data-slot={slot}
                    data-filled={player ? 'true' : 'false'}
                    style={readOnly ? { pointerEvents: 'none' } : undefined}
                    onDragOver={event => {
                      event.preventDefault();
                      event.currentTarget.classList.add('highlight');
                    }}
                    onDragLeave={event => event.currentTarget.classList.remove('highlight')}
                    onDrop={event => handleSlotDrop(event, slot)}
                  >
                    {player ? (
                      <PlayerItem
                        player={player}
                        readOnly={readOnly}
                        source="slot"
                        slot={slot}
                        onContextMenu={(event, item, itemSlot) =>
                          setContextMenu({
                            x: event.pageX,
                            y: event.pageY,
                            slot: itemSlot,
                            roles: item.roles || emptyRoles(),
                            canBeWK: isPlayerWicketKeeper(item.name, players, customPlayers)
                          })
                        }
                      />
                    ) : (
                      `Slot ${slot}`
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bench">
            <h3>Bench</h3>
            <div
              id="bench-list"
              className="player-list"
              style={readOnly ? { pointerEvents: 'none' } : undefined}
              onDragOver={event => event.preventDefault()}
              onDrop={handleBenchDrop}
            >
              {lineup.bench.map(player => (
                <PlayerItem key={player.name} player={player} readOnly={readOnly} source="bench" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          id="custom-context-menu"
          className="custom-context-menu"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={event => event.stopPropagation()}
        >
          <div
            className={`menu-option${contextMenu.roles.c ? ' active-role' : ''}`}
            onClick={() => setPlayerRole(contextMenu.slot, 'c')}
          >
            <span>👑</span> Captain
          </div>
          <div
            className={`menu-option${contextMenu.roles.vc ? ' active-role' : ''}`}
            onClick={() => setPlayerRole(contextMenu.slot, 'vc')}
          >
            <span>🛡️</span> Vice-Captain
          </div>
          {contextMenu.canBeWK && (
            <div
              className={`menu-option${contextMenu.roles.wk ? ' active-role' : ''}`}
              onClick={() => setPlayerRole(contextMenu.slot, 'wk')}
            >
              <span>🧤</span> Wicket Keeper
            </div>
          )}
        </div>
      )}
    </div>
  );
}
