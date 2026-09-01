import { useEffect, useState } from 'react';
import { PLAYER_PLACEHOLDER_IMAGE } from '../lib/config.js';
import { resolvePlayerImageUrl } from '../lib/utils.js';

/**
 * Probes the IPL headshot/player-image candidates for a player and returns the
 * first URL that loads. Late responses for a stale player are discarded.
 */
export function usePlayerImage(preferredNames, playerContext) {
  const key = JSON.stringify([preferredNames, playerContext?.playerId ?? null]);
  const [src, setSrc] = useState(PLAYER_PLACEHOLDER_IMAGE);

  useEffect(() => {
    let cancelled = false;
    setSrc(PLAYER_PLACEHOLDER_IMAGE);
    const names = (preferredNames || []).filter(Boolean);
    if (names.length === 0) return () => {};

    resolvePlayerImageUrl(names, playerContext).then(url => {
      if (!cancelled) setSrc(url);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return src;
}
