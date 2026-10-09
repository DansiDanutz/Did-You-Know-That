import { test } from "node:test";
import assert from "node:assert/strict";

import { handleScore, handleLeaderboard, createRedis } from "../api/_leaderboard.js";
import { STORIES } from "../js/data/stories.js";

const HONEY = STORIES.find((s) => s.id === "eternal-honey").card.id;
const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

// Minimal in-memory stand-in for the Redis commands the API uses.
function fakeRedis() {
  const zsets = new Map();
  const kv = new Map();
  const zset = (key) => zsets.get(key) ?? zsets.set(key, new Map()).get(key);
  const sorted = (key) => [...zset(key).entries()].sort((a, b) => b[1] - a[1]);
  const run = ([cmd, ...args]) => {
    switch (cmd) {
      case "INCR": kv.set(args[0], (kv.get(args[0]) ?? 0) + 1); return kv.get(args[0]);
      case "EXPIRE": return 1;
      case "ZADD": zset(args[0]).set(args[2], Number(args[1])); return 1;
      case "SET": kv.set(args[0], args[1]); return "OK";
      case "MGET": return args.map((k) => kv.get(k) ?? null);
      case "ZREVRANK": { const i = sorted(args[0]).findIndex(([m]) => m === args[1]); return i < 0 ? null : i; }
      case "ZSCORE": return zset(args[0]).get(args[1]) ?? null;
      case "ZCARD": return zset(args[0]).size;
      case "ZREVRANGE": return sorted(args[0]).slice(Number(args[1]), Number(args[2]) + 1).flatMap(([m, s]) => [m, String(s)]);
      default: throw new Error(`unsupported ${cmd}`);
    }
  };
  return { pipeline: async (commands) => commands.map(run) };
}

const score = (redis, body, ip = "1.1.1.1") => handleScore({ redis, body, ip });

test("rejects bad input with 400 and a reason", async () => {
  const redis = fakeRedis();
  assert.equal((await score(redis, { playerId: "nope" })).status, 400);
  assert.equal((await score(redis, { playerId: ID_A, nickname: "fuckface", audience: "kids", cards: {} })).status, 400);
  assert.equal((await score(redis, { playerId: ID_A, nickname: "Max", audience: "pirates", cards: {} })).status, 400);
});

test("scores are recomputed on the server from spark counts", async () => {
  const redis = fakeRedis();
  const res = await score(redis, { playerId: ID_A, nickname: "Max", audience: "kids", cards: { [HONEY]: { sparks: 999, rarity: "legendary" }, fake: { sparks: 5 } } });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.points, 400 + 8 * 10, "legendary + sparks clamped to 8, fake card ignored");
  assert.equal(res.body.data.rank, 1);
});

test("leaderboard lists players best first and marks the caller", async () => {
  const redis = fakeRedis();
  await score(redis, { playerId: ID_A, nickname: "Max", audience: "adults", cards: { [HONEY]: { sparks: 2 } } });
  await score(redis, { playerId: ID_B, nickname: "Ana", audience: "adults", cards: { [HONEY]: { sparks: 8 } } }, "2.2.2.2");
  const res = await handleLeaderboard({ redis, query: { audience: "adults", player: ID_A } });
  assert.equal(res.status, 200);
  const { top, me, total } = res.body.data;
  assert.deepEqual(top.map((r) => r.nickname), ["Ana", "Max"]);
  assert.equal(top[1].isYou, true);
  assert.equal(me.rank, 2);
  assert.equal(total, 2);
  assert.equal(top[0].cards, 1);
});

test("kids and adults boards are separate", async () => {
  const redis = fakeRedis();
  await score(redis, { playerId: ID_A, nickname: "Max", audience: "adults", cards: { [HONEY]: { sparks: 2 } } });
  const kids = await handleLeaderboard({ redis, query: { audience: "kids" } });
  assert.deepEqual(kids.body.data.top, []);
});

test("rate limits a flood of submissions from one address", async () => {
  const redis = fakeRedis();
  let last;
  for (let i = 0; i < 25; i += 1) last = await score(redis, { playerId: ID_A, nickname: "Max", audience: "kids", cards: {} });
  assert.equal(last.status, 429);
});

test("missing database configuration reports offline (503)", async () => {
  assert.equal((await handleLeaderboard({ redis: null, query: { audience: "kids" } })).status, 503);
  assert.equal((await score(null, { playerId: ID_A })).status, 503);
  assert.equal(createRedis({}), null);
});

test("database errors are reported as 502 without leaking details", async () => {
  const broken = { pipeline: async () => { throw new Error("secret connection string"); } };
  const res = await handleLeaderboard({ redis: broken, query: { audience: "kids" } });
  assert.equal(res.status, 502);
  assert.doesNotMatch(JSON.stringify(res.body), /secret/);
});

test("createRedis sends pipelined commands to the REST endpoint", async () => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, json: async () => [{ result: 5 }, { result: "OK" }] };
  };
  const redis = createRedis({ KV_REST_API_URL: "https://db.example", KV_REST_API_TOKEN: "t0ken" }, fakeFetch);
  assert.deepEqual(await redis.pipeline([["INCR", "a"], ["SET", "b", "1"]]), [5, "OK"]);
  assert.equal(calls[0].url, "https://db.example/pipeline");
  assert.equal(calls[0].init.headers.Authorization, "Bearer t0ken");

  const failing = createRedis({ UPSTASH_REDIS_REST_URL: "https://db.example", UPSTASH_REDIS_REST_TOKEN: "x" }, async () => ({ ok: false, status: 500 }));
  await assert.rejects(failing.pipeline([["INCR", "a"]]));
  const cmdError = createRedis({ KV_REST_API_URL: "https://db.example", KV_REST_API_TOKEN: "x" }, async () => ({ ok: true, json: async () => [{ error: "WRONGTYPE" }] }));
  await assert.rejects(cmdError.pipeline([["INCR", "a"]]));
});

test("the score write route is retired: nothing new is stored, old records are untouched", async () => {
  const { POST } = await import("../api/score.js");
  const res = await POST(new Request("https://dexty.live/api/score", { method: "POST", body: JSON.stringify({ playerId: ID_A }) }));
  assert.equal(res.status, 410);
  assert.equal((await res.json()).error, "retired");
});
