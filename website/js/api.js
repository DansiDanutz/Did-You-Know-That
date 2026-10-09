// Browser client for the leaderboard functions. Every call resolves to
// { ok, data, error } and never throws, so the game keeps working offline.

const TIMEOUT_MS = 8000;

async function call(path, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(path, { ...init, signal: controller.signal });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok && body.success === true, data: body.data ?? null, error: body.error ?? `http_${res.status}` };
  } catch (error) {
    console.warn("[leaderboard] request failed", error);
    return { ok: false, data: null, error: "network" };
  } finally {
    clearTimeout(timer);
  }
}

export function fetchLeaderboard(audience, playerId) {
  const params = new URLSearchParams({ audience, player: playerId });
  return call(`/api/leaderboard?${params}`, { headers: { Accept: "application/json" } });
}

export function submitScore({ playerId, nickname, audience, cards }) {
  const payload = Object.fromEntries(Object.entries(cards).map(([id, card]) => [id, { sparks: card.sparks ?? 0, rarity: card.rarity, slot: card.slot ?? 0 }]));
  return call("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, nickname, audience, cards: payload }),
  });
}
