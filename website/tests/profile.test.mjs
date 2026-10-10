// The old game's local sign-in, restored: kid explorer names, cleaned nicknames, a random id.
import { test } from "node:test";
import assert from "node:assert/strict";

import { kidNickname, isKidNickname, KID_ADJECTIVES, KID_NOUNS } from "../js/lib/kid-names.js";
import { cleanName } from "../js/lib/player-name.js";
import { normalizeProfile, signIn, signOut, createProfileStore, PROFILE_KEY, LEGACY_PROFILE_KEY, LEGACY_SETTINGS_KEY } from "../js/lib/profile.js";
import { parseState, attachTo } from "../js/lib/progress.js";

const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const makeId = () => ID;
const memoryStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), data };
};

test("kid nicknames are built only from the safe word lists plus a number", () => {
  assert.equal(kidNickname(() => 0), `${KID_ADJECTIVES[0]} ${KID_NOUNS[0]} 10`);
  assert.equal(kidNickname(() => 0.999), `${KID_ADJECTIVES.at(-1)} ${KID_NOUNS.at(-1)} 99`);
});

test("only generated explorer names count as kid names, and every one is a valid kids profile", () => {
  assert.equal(isKidNickname("Cosmic Dragon 32"), true);
  assert.equal(isKidNickname("Maria Popescu"), false);
  assert.equal(isKidNickname("Brave Fox"), false);
  assert.equal(isKidNickname(""), false);
  for (const adj of KID_ADJECTIVES) for (const noun of KID_NOUNS) assert.equal(signIn(normalizeProfile(null, makeId), { audience: "kids", name: `${adj} ${noun} 99` }).ok, true);
});

test("names are trimmed, short, and letters only (any alphabet); rude words are refused", () => {
  assert.equal(cleanName("  maria  "), "Maria");
  assert.equal(cleanName("Ana-Maria"), "Ana-Maria");
  assert.equal(cleanName("O'Neil"), "O'Neil");
  assert.equal(cleanName("小明"), "小明");
  assert.equal(cleanName("a".repeat(40)).length, 20);
  assert.equal(cleanName("<script>"), "Script");
  assert.equal(cleanName("   "), "");
  assert.equal(cleanName(null), "");
  assert.equal(cleanName("fuck"), "");
});

test("a profile always has a valid random id; kids can never store a typed real name", () => {
  assert.deepEqual(normalizeProfile(null, makeId), { playerId: ID, audience: "kids", name: "", signedIn: false });
  assert.equal(normalizeProfile({ playerId: "nope" }, makeId).playerId, ID);
  assert.equal(normalizeProfile({ playerId: ID, audience: "kids", name: "Maria Popescu" }, makeId).name, "");
  assert.equal(normalizeProfile({ playerId: ID, audience: "adults", name: " sam " }, makeId).name, "Sam");
  assert.equal(normalizeProfile({ audience: "aliens" }, makeId).audience, "kids");
});

test("signing in validates the choice and keeps the same id; signing out keeps it too", () => {
  const blank = normalizeProfile(null, makeId);
  assert.match(signIn(blank, { audience: "teachers", name: "Sam" }).error, /who is playing/i);
  assert.match(signIn(blank, { audience: "kids", name: "Sam" }).error, /explorer name/i);
  assert.match(signIn(blank, { audience: "adults", name: "123" }).error, /nickname/i);
  const { profile } = signIn(blank, { audience: "adults", name: "sam" });
  assert.deepEqual(profile, { playerId: ID, audience: "adults", name: "Sam", signedIn: true });
  assert.deepEqual(signOut(profile), { playerId: ID, audience: "adults", name: "", signedIn: false });
});

test("the profile store saves locally, survives blocked storage and picks up the old game's profile", () => {
  const storage = memoryStorage();
  const store = createProfileStore(() => storage);
  const { profile } = signIn(store.load(makeId), { audience: "kids", name: "Brave Fox 42" });
  assert.equal(store.save(profile), true);
  assert.deepEqual(JSON.parse(storage.data.get(PROFILE_KEY)), { playerId: ID, audience: "kids", name: "Brave Fox 42" });
  assert.equal(createProfileStore(() => storage).load(() => "x").name, "Brave Fox 42");

  const blocked = createProfileStore(() => { throw new Error("SecurityError"); });
  assert.equal(blocked.save(profile), false);
  assert.equal(blocked.load(makeId).name, "Brave Fox 42", "kept in memory for this visit");
  const broken = createProfileStore(() => memoryStorage({ [PROFILE_KEY]: "{not json" }));
  assert.equal(broken.load(makeId).signedIn, false);

  const legacy = createProfileStore(() => memoryStorage({
    [LEGACY_PROFILE_KEY]: JSON.stringify({ playerId: ID, nickname: "" }),
    [LEGACY_SETTINGS_KEY]: JSON.stringify({ audience: "adults", name: "Ioana" }),
  }));
  assert.deepEqual(legacy.load(() => "other"), { playerId: ID, audience: "adults", name: "Ioana", signedIn: true });
});

test("progress is attached to the signed-in profile and the owner survives a reload", () => {
  const state = { guesses: { "the-sun": 1 }, revealed: {} };
  const attached = attachTo(state, ID);
  assert.equal(attached.owner, ID);
  assert.notEqual(attached, state, "a new object; the original is not mutated");
  assert.equal(state.owner, undefined);
  assert.equal(attachTo(attached, ID), attached);
  assert.equal(parseState(JSON.stringify(attached)).owner, ID);
  assert.equal(parseState(JSON.stringify({ ...attached, owner: "<script>" })).owner, undefined);
});
