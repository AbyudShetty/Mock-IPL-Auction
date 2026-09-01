import { useEffect, useRef, useState } from 'react';
import { useAuctionStore } from '../store/auctionStore.js';
import { getUserId } from '../lib/utils.js';
import { fetchRoom, joinRoomAsNewPlayer, markParticipantOnline } from '../firebase/rooms.js';
import FieldError from '../components/FieldError.jsx';

export default function JoinRoom() {
  const prefilledRoomCode = useAuctionStore(s => s.prefilledRoomCode);
  const setSession = useAuctionStore(s => s.setSession);
  const applyRemoteConfig = useAuctionStore(s => s.applyRemoteConfig);
  const applyRemoteTeams = useAuctionStore(s => s.applyRemoteTeams);
  const applyRemoteAuctionState = useAuctionStore(s => s.applyRemoteAuctionState);
  const applyRemoteUnsold = useAuctionStore(s => s.applyRemoteUnsold);
  const goToScreen = useAuctionStore(s => s.goToScreen);

  const [roomCode, setRoomCode] = useState(prefilledRoomCode || '');
  const [teamName, setTeamName] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const teamNameRef = useRef(null);

  useEffect(() => {
    if (prefilledRoomCode) teamNameRef.current?.focus();
  }, [prefilledRoomCode]);

  const handleJoin = async () => {
    const code = roomCode.trim().toUpperCase();
    const name = teamName.trim();
    const nextErrors = {};
    if (!code || code.length !== 6) nextErrors.code = 'Enter a valid 6-character code';
    if (!name) nextErrors.name = 'Team name is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const roomData = await fetchRoom(code);
      if (!roomData) {
        setErrors({ code: 'Room not found!' });
        return;
      }

      const participants = roomData.participants || {};
      let userId = null;
      let isAuctioneer = false;
      let isRejoining = false;

      for (const [uid, participant] of Object.entries(participants)) {
        if (participant.name.toLowerCase() === name.toLowerCase()) {
          if (participant.isOnline === true) {
            setErrors({ name: 'Player is currently active in the room!' });
            return;
          }
          userId = uid;
          isAuctioneer = participant.role === 'auctioneer';
          isRejoining = true;
          break;
        }
      }

      if (isRejoining) {
        localStorage.setItem('auctionUserId', userId);
        await markParticipantOnline(code, userId);
      } else {
        if (Object.keys(participants).length >= roomData.config.teamCount) {
          setErrors({ code: 'Room is full!' });
          return;
        }
        if (roomData.auctionState.isAuctionStarted) {
          setErrors({ code: 'Auction has already started!' });
          return;
        }
        userId = getUserId();
        await joinRoomAsNewPlayer(code, userId, name, roomData.config.budget);
      }

      setSession({
        gameMode: 'online',
        currentRoomCode: code,
        currentUserId: userId,
        myTeamId: userId,
        isAuctioneer
      });
      applyRemoteConfig(roomData.config);

      if (roomData.auctionState.isAuctionStarted) {
        applyRemoteTeams(roomData.teams);
        applyRemoteUnsold(roomData.unsoldPlayers);
        applyRemoteAuctionState(roomData.auctionState);
        goToScreen('auction');
      } else {
        goToScreen('lobby');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      setErrors({ code: 'Connection failed. Try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="join-room-screen" style={{ display: 'flex' }}>
      <div className="setup-card">
        <h2 className="setup-heading">🔗 Join Auction</h2>

        <div className="input-group">
          <label htmlFor="join-room-code">🎯 Room Code</label>
          <input
            type="text"
            id="join-room-code"
            className={errors.code ? 'input-error' : ''}
            placeholder="Enter 6-digit code"
            maxLength={6}
            style={{ textTransform: 'uppercase' }}
            value={roomCode}
            autoFocus={!prefilledRoomCode}
            onChange={event => setRoomCode(event.target.value)}
            onKeyDown={event => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              if (roomCode.trim().length !== 6) setErrors({ code: 'Code must be 6 characters' });
              else {
                setErrors({});
                teamNameRef.current?.focus();
              }
            }}
          />
          <FieldError message={errors.code} />
        </div>

        <div className="input-group">
          <label htmlFor="join-team-name">👤 Your Team Name</label>
          <input
            type="text"
            id="join-team-name"
            ref={teamNameRef}
            className={errors.name ? 'input-error' : ''}
            placeholder="Enter your team name"
            value={teamName}
            onChange={event => setTeamName(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleJoin();
              }
            }}
          />
          <FieldError message={errors.name} />
        </div>

        <button id="join-room-button" className="primary-button" onClick={handleJoin} disabled={busy}>
          <span>{busy ? 'Joining…' : 'Join Room'}</span>
          <span className="button-icon">🚀</span>
        </button>

        <button
          className="secondary-button"
          onClick={() => goToScreen('onlineChoice')}
          style={{ marginTop: '10px', width: '100%' }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
