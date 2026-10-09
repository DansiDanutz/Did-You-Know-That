// The adults' Curiosity Archive: discoveries a reader saved, investigated and
// came back to, plus a private takeaway. Stays on the device; nothing here is
// shared or scored. Saving never depends on reading, watching or answering.

export const ARCHIVE_KEY = "dexty-archive-v1";
export const TAKEAWAY_MAX = 280;

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isIsoDate = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}T/.test(value);

export const emptyArchive = () => ({ version: 1, entries: {} });

function cleanEntry(entry) {
  const dates = ["savedAt", "investigatedAt", "revisitedAt"].filter((key) => isIsoDate(entry[key]));
  const takeaway = typeof entry.takeaway === "string" && entry.takeaway.trim() ? entry.takeaway.trim().slice(0, TAKEAWAY_MAX) : undefined;
  return {
    ...Object.fromEntries(dates.map((key) => [key, entry[key]])),
    ...(takeaway ? { takeaway } : {}),
  };
}

export function normalizeArchive(value) {
  if (!isRecord(value) || !isRecord(value.entries)) return emptyArchive();
  const entries = Object.entries(value.entries)
    .filter(([id, entry]) => ID.test(id) && isRecord(entry))
    .map(([id, entry]) => [id, cleanEntry(entry)])
    .filter(([, entry]) => Object.keys(entry).length);
  return { version: 1, entries: Object.fromEntries(entries) };
}

const withEntry = (state, id, patch) => ({
  ...state,
  entries: { ...state.entries, [id]: { ...state.entries[id], ...patch } },
});

export function saveDiscovery(state, id, at) {
  if (state.entries[id]?.savedAt) return state;
  return withEntry(state, id, { savedAt: at });
}

// The first investigation is kept; a later one on another day is a revisit.
export function markInvestigated(state, id, at) {
  const entry = state.entries[id];
  if (!entry?.investigatedAt) return withEntry(state, id, { investigatedAt: at });
  if (at.slice(0, 10) === entry.investigatedAt.slice(0, 10)) return state;
  return withEntry(state, id, { revisitedAt: at });
}

export function setTakeaway(state, id, text) {
  const value = String(text ?? "").trim().slice(0, TAKEAWAY_MAX);
  const { takeaway: _previous, ...rest } = state.entries[id] ?? {};
  return { ...state, entries: { ...state.entries, [id]: value ? { ...rest, takeaway: value } : rest } };
}

// "new" → "saved" → "investigated" → "revisited": honest activity, not a grade.
export function discoveryStatus(state, id) {
  const entry = state.entries[id];
  if (entry?.revisitedAt) return "revisited";
  if (entry?.investigatedAt) return "investigated";
  return entry?.savedAt ? "saved" : "new";
}
