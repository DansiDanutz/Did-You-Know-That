// Explorer progression (DEXTY-CHARACTER-AND-ADULT-PROGRESSION.md acceptance).
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  emptyExplorer, normalizeExplorer, completeMission, recordAttempt, recordHint, equip, equipmentFor,
  MISSIONS, ITEMS,
} from "../js/lib/progression.js";

const AT = "2026-10-09T12:00:00.000Z";
const LATER = "2026-10-16T12:00:00.000Z";
const SHADOW = "missing-shadow";
const [OUTFIT_A, OUTFIT_B] = MISSIONS[SHADOW].rewards.choose;

test("required equipment is always loaned, whatever the inventory", () => {
  const fresh = emptyExplorer();
  assert.ok(MISSIONS[SHADOW].loans.every((id) => equipmentFor(fresh, SHADOW).includes(id)));
});

test("completing a mission grants the chosen item plus fixed rewards, once", () => {
  const done = completeMission(emptyExplorer(), SHADOW, { choice: OUTFIT_A }, AT);
  assert.ok(done.owned[OUTFIT_A]);
  assert.equal(done.owned[OUTFIT_B], undefined, "only the chosen one");
  MISSIONS[SHADOW].rewards.always.forEach((id) => assert.ok(done.owned[id], id));
  assert.ok(done.workshop.includes(MISSIONS[SHADOW].rewards.workshop));
  assert.equal(done.missions[SHADOW].completedAt, AT);
  const again = completeMission(done, SHADOW, { choice: OUTFIT_B }, LATER);
  assert.equal(again, done, "repeat completion (reload, double tap) changes nothing");
});

test("an invalid reward choice is refused and nothing is granted", () => {
  const state = emptyExplorer();
  assert.equal(completeMission(state, SHADOW, { choice: "not-an-item" }, AT), state);
  assert.equal(completeMission(state, "no-such-mission", { choice: OUTFIT_A }, AT), state);
});

test("hints and attempts never reduce reward quality", () => {
  let state = recordAttempt(emptyExplorer(), SHADOW, AT);
  state = recordHint(recordHint(state, SHADOW), SHADOW);
  const done = completeMission(state, SHADOW, { choice: OUTFIT_B }, AT);
  assert.equal(done.missions[SHADOW].hintsUsed, 2);
  assert.ok(done.owned[OUTFIT_B]);
  assert.deepEqual(Object.keys(done.owned).sort(), Object.keys(completeMission(emptyExplorer(), SHADOW, { choice: OUTFIT_B }, AT).owned).sort());
});

test("only owned outfits can be worn; equipping is immutable", () => {
  const state = emptyExplorer();
  assert.equal(equip(state, OUTFIT_A), state, "not owned yet");
  const done = completeMission(state, SHADOW, { choice: OUTFIT_A }, AT);
  const worn = equip(done, OUTFIT_A);
  assert.equal(worn.appearance.outfit, OUTFIT_A);
  assert.equal(done.appearance.outfit, null);
});

test("a week away harms nothing: no clock-based decay, items and progress stay", () => {
  const done = equip(completeMission(emptyExplorer(), SHADOW, { choice: OUTFIT_A }, AT), OUTFIT_A);
  const reloaded = normalizeExplorer(JSON.parse(JSON.stringify(done)));
  assert.deepEqual(reloaded, done);
});

test("stored data is normalized defensively; unknown items are dropped", () => {
  assert.deepEqual(normalizeExplorer(null), emptyExplorer());
  const deco = MISSIONS[SHADOW].rewards.workshop;
  const odd = normalizeExplorer({ owned: { "fake-item": { at: AT }, [OUTFIT_A]: { at: AT }, [deco]: { at: AT } }, appearance: { outfit: "fake-item" }, workshop: ["fake", deco], missions: { x: 1 } });
  assert.deepEqual(Object.keys(odd.owned).sort(), [deco, OUTFIT_A].sort());
  assert.equal(odd.appearance.outfit, null);
  assert.deepEqual(odd.workshop, [deco]);
  assert.deepEqual(normalizeExplorer({ owned: {}, workshop: [deco] }).workshop, [], "a decoration must be owned to be placed");
});

test("every mission reward and loan refers to a defined item", () => {
  Object.values(MISSIONS).forEach((mission) => {
    [...mission.loans, ...mission.rewards.choose, ...mission.rewards.always, mission.rewards.workshop].forEach((id) => assert.ok(ITEMS[id], id));
  });
});

test("explorer progress is stored safely and survives a backup round trip", async () => {
  const { createStore } = await import("../js/lib/storage.js");
  const { makeBackup, parseBackup, emptyCollection } = await import("../js/lib/collection.js");
  const data = new Map();
  const store = createStore({ getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) });
  const result = store.updateExplorer((state) => completeMission(state, SHADOW, { choice: OUTFIT_A }, AT));
  assert.equal(result.persisted, true);
  assert.ok(store.loadExplorer().owned[OUTFIT_A]);

  const text = JSON.stringify(makeBackup({ collection: emptyCollection(), learning: {}, settings: null, explorer: store.loadExplorer() }, AT));
  const restored = parseBackup(text, []);
  assert.equal(restored.ok, true);
  assert.ok(restored.data.explorer.owned[OUTFIT_A], "items survive restore");
  assert.equal(restored.data.explorer.missions[SHADOW].completedAt, AT, "mission state survives restore");

  const oldBackup = JSON.stringify({ app: "dexty", version: 1, exportedAt: AT, collection: emptyCollection(), learning: {}, settings: null });
  assert.deepEqual(parseBackup(oldBackup, []).data.explorer, emptyExplorer(), "older backups without explorer still restore");
});

test("missionStatus keeps tried and solved distinct", async () => {
  const { missionStatus } = await import("../js/lib/progression.js");
  const fresh = emptyExplorer();
  assert.equal(missionStatus(fresh, "missing-shadow"), "new");
  const tried = recordAttempt(fresh, "missing-shadow", "2026-10-09T10:00:00Z");
  assert.equal(missionStatus(tried, "missing-shadow"), "tried");
  const solved = completeMission(tried, "missing-shadow", { choice: "outfit-sky" }, "2026-10-09T10:05:00Z");
  assert.equal(missionStatus(solved, "missing-shadow"), "solved");
  assert.equal(missionStatus(solved, "no-such-mission"), "new");
});
