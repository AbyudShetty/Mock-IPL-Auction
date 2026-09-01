/**
 * Client for the Cloud Functions API in `functions/`.
 *
 * Nothing in the UI calls this yet — it is the seam for the planned AI
 * features. Defaults to the same-origin `/api` path that the hosting rewrite
 * serves; set VITE_API_BASE_URL to hit the emulator or a deployed function
 * directly during development.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

export const api = {
  health: () => request('/health'),
  roomSummary: code => request(`/rooms/summary?code=${encodeURIComponent(code)}`),
  /** Ask Claude for a bid/pass verdict on the player currently on the block. */
  scoutPlayer: payload => request('/ai/scout', { method: 'POST', body: payload })
};
