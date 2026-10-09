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
});

export const MISSIONS = Object.freeze({
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

export const emptyExplorer = () => ({ version: 1, owned: {}, appearance: { outfit: null }, workshop: [], missions: {} });

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
  if (!mission || !mission.rewards.choose.includes(choice)) return state;
  if (missionEntry(state, missionId).completedAt) return state;
  const granted = [choice, ...mission.rewards.always].filter((id) => !state.owned[id]);
  const owned = { ...state.owned, ...Object.fromEntries(granted.map((id) => [id, { at, source: missionId }])) };
  const workshop = state.workshop.includes(mission.rewards.workshop) ? state.workshop : [...state.workshop, mission.rewards.workshop];
  return withMission({ ...state, owned, workshop }, missionId, { completedAt: at, choice });
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
