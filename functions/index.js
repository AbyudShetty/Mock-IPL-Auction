import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Server-side API for Goated Auction.
 *
 * NOT wired into firebase.json on purpose — `firebase deploy` stays a
 * hosting-only deploy that works on the Spark (free) plan. To turn this on:
 *
 *   1. Upgrade the project to the Blaze plan (Cloud Functions requires it).
 *   2. cd functions && npm install
 *   3. firebase functions:secrets:set ANTHROPIC_API_KEY
 *   4. Add to firebase.json:
 *        "functions": { "source": "functions" }
 *      and, inside "hosting", put this rewrite BEFORE the catch-all:
 *        { "source": "/api/**", "function": "api" }
 *   5. firebase deploy
 *
 * With the rewrite in place the browser calls /api/... same-origin, so no CORS
 * preflight and no API key ever reaches the client.
 */

initializeApp();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const MODEL = 'claude-opus-5';

function applyCors(req, res) {
  res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}

/** Strips the hosting rewrite prefix so routing works with or without it. */
function routeOf(req) {
  return (req.path || '/').replace(/^\/api/, '') || '/';
}

// =====================================================================
// AI: scouting take on the player currently on the block
// =====================================================================

const SCOUT_SYSTEM = `You are a shrewd IPL auction analyst advising a team owner mid-auction.
Given a player and the buying team's situation, give a short, decisive take.

Answer in at most 60 words, as:
- Verdict: BID or PASS, with a suggested ceiling in crores.
- One sentence of reasoning grounded in the numbers you were given.

Never invent statistics. If a number was not supplied, do not cite it.`;

async function handleScout(req, res, client) {
  const { player, stats, team, budgetLeft, squadNeeds } = req.body || {};
  if (!player) {
    res.status(400).json({ error: 'player is required' });
    return;
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SCOUT_SYSTEM,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    messages: [
      {
        role: 'user',
        content: JSON.stringify({ player, stats, team, budgetLeft, squadNeeds }, null, 2)
      }
    ]
  });

  if (response.stop_reason === 'refusal') {
    res.status(422).json({ error: 'refused', details: response.stop_details });
    return;
  }

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim();

  res.json({ verdict: text, model: response.model });
}

// =====================================================================
// Room summary (no AI — plain Realtime Database read)
// =====================================================================

async function handleRoomSummary(req, res) {
  const code = String(req.query.code || '').toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    res.status(400).json({ error: 'code must be a 6-character room code' });
    return;
  }

  const snapshot = await getDatabase().ref(`rooms/${code}`).get();
  if (!snapshot.exists()) {
    res.status(404).json({ error: 'room not found' });
    return;
  }

  const room = snapshot.val();
  const teams = Object.entries(room.teams || {}).map(([id, team]) => ({
    id,
    name: team.name,
    purse: team.purse,
    playerCount: Object.keys(team.players || {}).length
  }));

  res.json({
    code,
    started: Boolean(room.auctionState?.isAuctionStarted),
    secondRound: Boolean(room.auctionState?.isSecondRound),
    teamCount: room.config?.teamCount ?? teams.length,
    budget: room.config?.budget ?? null,
    teams
  });
}

// =====================================================================
// Router
// =====================================================================

export const api = onRequest({ secrets: [ANTHROPIC_API_KEY], region: 'asia-south1' }, async (req, res) => {
  if (applyCors(req, res)) return;

  const route = routeOf(req);

  try {
    if (route === '/health') {
      res.json({ ok: true, model: MODEL });
      return;
    }
    if (route === '/rooms/summary' && req.method === 'GET') {
      await handleRoomSummary(req, res);
      return;
    }
    if (route === '/ai/scout' && req.method === 'POST') {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      await handleScout(req, res, client);
      return;
    }
    res.status(404).json({ error: `no route for ${route}` });
  } catch (error) {
    console.error('api error', error);
    res.status(500).json({ error: error.message });
  }
});
