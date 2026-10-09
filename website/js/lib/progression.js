// Explorer progression (DEXTY-CHARACTER-AND-ADULT-PROGRESSION.md, 9 Oct 2026).
// Kids earn outfits, equipment looks and workshop decorations by completing
// independent app missions — never by watching, liking or sharing YouTube.
// Pure and immutable. Rules: required equipment is always loaned; a mission
// rewards once (repeat completion is a no-op); hints never lower a reward;
// nothing decays with time — there is no clock-based state at all.

export const ITEMS = Object.freeze({
  // Outfits: the child picks one of two equally valued looks (shown in advance).
  "outfit-forest": Object.freeze({ kind: "outfit", name: "Forest explorer coat", coat: "#2f8f5b", scarf: "#ffd44d" }),
  "outfit-sky": Object.freeze({ kind: "outfit", name: "Sky explorer coat", coat: "#3d7bff", scarf: "#ff8fc7" }),
  // Equipment: loaned for missions; owning a look is for fun, never a prerequisite.
  "lamp-prism": Object.freeze({ kind: "equipment", name: "Prism lamp" }),
  "lamp-prism-gold": Object.freeze({ kind: "equipment", name: "Golden prism lamp" }),
  // Workshop decorations persist and never deteriorate.
  "deco-sundial": Object.freeze({ kind: "decoration", name: "Sundial (decoration)" }),
  // Adventure Hearts: badges earned by understanding a house's story.
  "heart-kindness": Object.freeze({ kind: "badge", name: "Heart of Kindness" }),
});

export const MISSIONS = Object.freeze({
  // Episode 1: the House of Family. Passing the five scene challenges earns the
  // Heart of Kindness (no choice to make); the next house then unlocks.
  "house-of-family": Object.freeze({
    id: "house-of-family",
    loans: Object.freeze([]),
    rewards: Object.freeze({ choose: Object.freeze([]), always: Object.freeze(["heart-kindness"]), workshop: null }),
  }),
  "missing-shadow": Object.freeze({
    id: "missing-shadow",
    loans: Object.freeze(["lamp-prism"]),
    rewards: Object.freeze({
      choose: Object.freeze(["outfit-forest", "outfit-sky"]),
      always: Object.freeze(["lamp-prism-gold", "deco-sundial"]),
      workshop: "deco-sundial",
    }),
  }),
});

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const emptyExplorer = () => ({ version: 1, owned: {}, appearance: { outfit: null }, workshop: [], missions: {}, journal: [] });

const isJournalEntry = (entry) => isRecord(entry) && typeof entry.kind === "string" && typeof entry.id === "string" && typeof entry.title === "string" && typeof entry.at === "string";

export function normalizeExplorer(value) {
  if (!isRecord(value)) return emptyExplorer();
  const owned = Object.fromEntries(
    Object.entries(isRecord(value.owned) ? value.owned : {}).filter(([id, entry]) => ITEMS[id] && isRecord(entry)),
  );
  const outfit = value.appearance?.outfit;
  const missions = Object.fromEntries(
    Object.entries(isRecord(value.missions) ? value.missions : {}).filter(([id, entry]) => MISSIONS[id] && isRecord(entry)),
  );
  return {
    version: 1,
    owned,
    appearance: { outfit: owned[outfit] && ITEMS[outfit].kind === "outfit" ? outfit : null },
    workshop: (Array.isArray(value.workshop) ? value.workshop : []).filter((id) => ITEMS[id]?.kind === "decoration" && owned[id]),
    missions,
    journal: (Array.isArray(value.journal) ? value.journal : []).filter(isJournalEntry),
  };
}

const missionEntry = (state, missionId) => state.missions[missionId] ?? { attempts: 0, hintsUsed: 0, completedAt: null, choice: null };

const withMission = (state, missionId, patch) => ({
  ...state,
  missions: { ...state.missions, [missionId]: { ...missionEntry(state, missionId), ...patch } },
});

export function recordAttempt(state, missionId, at) {
  if (!MISSIONS[missionId]) return state;
  const entry = missionEntry(state, missionId);
  return withMission(state, missionId, { attempts: entry.attempts + 1, lastAttemptAt: at });
}

export function recordHint(state, missionId) {
  if (!MISSIONS[missionId]) return state;
  return withMission(state, missionId, { hintsUsed: missionEntry(state, missionId).hintsUsed + 1 });
}

// Grants the chosen item + the fixed rewards in one new state. Idempotent:
// a mission that is already complete returns the same state object.
export function completeMission(state, missionId, { choice }, at) {
  const mission = MISSIONS[missionId];
  if (!mission) return state;
  const { choose, always, workshop: decoration } = mission.rewards;
  if (choose.length && !choose.includes(choice)) return state;
  if (missionEntry(state, missionId).completedAt) return state;
  const granted = [...(choose.length ? [choice] : []), ...always].filter((id) => !state.owned[id]);
  const owned = { ...state.owned, ...Object.fromEntries(granted.map((id) => [id, { at, source: missionId }])) };
  const workshop = !decoration || state.workshop.includes(decoration) ? state.workshop : [...state.workshop, decoration];
  return withMission({ ...state, owned, workshop }, missionId, { completedAt: at, choice: choose.length ? choice : null });
}

export function equip(state, itemId) {
  if (!state.owned[itemId] || ITEMS[itemId]?.kind !== "outfit") return state;
  return { ...state, appearance: { ...state.appearance, outfit: itemId } };
}

// Everything usable in a mission: what it loans plus what the player owns.
export function equipmentFor(state, missionId) {
  const owned = Object.keys(state.owned).filter((id) => ITEMS[id].kind === "equipment");
  return [...new Set([...(MISSIONS[missionId]?.loans ?? []), ...owned])];
}

// "new" → "tried" (an attempt was made) → "solved" (the new example was
// applied). Never a score: solving one mission is not called mastery.
export function missionStatus(state, missionId) {
  const entry = state?.missions?.[missionId];
  if (!MISSIONS[missionId] || !entry) return "new";
  if (entry.completedAt) return "solved";
  return entry.attempts > 0 ? "tried" : "new";
}

// The Adventure Journal: what the child did, in order. Never a score.
export function addJournal(state, { kind, id, title }, at) {
  return { ...state, journal: [...(state.journal ?? []), { kind, id, title, at }] };
}

// The optional real-life kindness mission ("tell someone in your family something
// you love about them"): recorded once, on trust, no proof asked.
export function recordKindness(state, at) {
  if (state.missions["house-of-family"]?.kindnessAt) return state;
  const next = withMission(state, "house-of-family", { kindnessAt: at });
  return addJournal(next, { kind: "kindness", id: "kindness-family", title: "Kindness mission: I told someone what I love about them" }, at);
}
