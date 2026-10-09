// Leaderboard core: pure request handlers with an injected Redis client so
// they can be unit-tested. Storage is Upstash Redis (Vercel Marketplace),
// reached through its REST API, so no npm dependency is needed.
//
// Keys:  lb:<audience>            sorted set  playerId -> points
//        p:<audience>:<playerId>  JSON        { nickname, points, cards, updatedAt }
//        rl:<ip>                  counter     submissions per minute

import { STORIES } from "../js/data/stories.js";
import { cardCatalog, sanitizeCards, totalPoints, validateNickname } from "../js/lib/points.js";

const AUDIENCES = ["kids", "adults"];
const PLAYER_ID = /^[0-9a-f-]{36}$/;
const TOP_LIMIT = 20;
const RATE_LIMIT = 20; // submissions per window per IP
const RATE_WINDOW_S = 60;
const CATALOG = cardCatalog(STORIES);

const reply = (status, data, error = null) => ({ status, body: { success: status < 400, data, error } });

export function createRedis(env, fetchImpl = globalThis.fetch) {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return {
    async pipeline(commands) {
      const res = await fetchImpl(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(commands),
      });
      if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
      const results = await res.json();
      const failed = results.find((r) => r.error);
      if (failed) throw new Error(`Redis command failed: ${failed.error}`);
      return results.map((r) => r.result);
    },
  };
}

async function guarded(redis, work) {
  if (!redis) return reply(503, null, "offline");
  try {
    return await work();
  } catch (error) {
    console.error("[leaderboard] database error", error);
    return reply(502, null, "database_error");
  }
}

export function handleScore({ redis, body, ip }) {
  return guarded(redis, async () => {
    const audience = body?.audience;
    const nick = validateNickname(body?.nickname);
    if (!PLAYER_ID.test(body?.playerId ?? "")) return reply(400, null, "invalid_player");
    if (!AUDIENCES.includes(audience)) return reply(400, null, "invalid_audience");
    if (!nick.ok) return reply(400, null, "invalid_nickname");

    const rateKey = `rl:${ip || "unknown"}`;
    const [count] = await redis.pipeline([["INCR", rateKey], ["EXPIRE", rateKey, String(RATE_WINDOW_S), "NX"]]);
    if (count > RATE_LIMIT) return reply(429, null, "rate_limited");

    const cards = sanitizeCards(body.cards, CATALOG);
    const points = totalPoints(cards, audience);
    const entry = { nickname: nick.value, points, cards: Object.keys(cards).length, updatedAt: Date.now() };
    const board = `lb:${audience}`;
    const [, , rank] = await redis.pipeline([
      ["ZADD", board, String(points), body.playerId],
      ["SET", `p:${audience}:${body.playerId}`, JSON.stringify(entry)],
      ["ZREVRANK", board, body.playerId],
    ]);
    return reply(200, { points, rank: rank + 1 });
  });
}

export function handleLeaderboard({ redis, query }) {
  return guarded(redis, async () => {
    const audience = AUDIENCES.includes(query?.audience) ? query.audience : "kids";
    const player = PLAYER_ID.test(query?.player ?? "") ? query.player : null;
    const board = `lb:${audience}`;
    const [flat, total, myRank, myScore] = await redis.pipeline([
      ["ZREVRANGE", board, "0", String(TOP_LIMIT - 1), "WITHSCORES"],
      ["ZCARD", board],
      ["ZREVRANK", board, player ?? "-"],
      ["ZSCORE", board, player ?? "-"],
    ]);
    const ids = flat.filter((_, i) => i % 2 === 0);
    const profiles = ids.length ? (await redis.pipeline([["MGET", ...ids.map((id) => `p:${audience}:${id}`)]]))[0] : [];
    const top = ids.map((id, i) => {
      const profile = JSON.parse(profiles[i] ?? "{}");
      return {
        rank: i + 1,
        nickname: profile.nickname ?? "???",
        points: Number(flat[i * 2 + 1]),
        cards: profile.cards ?? 0,
        isYou: id === player,
      };
    });
    const me = player && myRank !== null ? { rank: myRank + 1, points: Number(myScore) } : null;
    return reply(200, { top, me, total });
  });
}
