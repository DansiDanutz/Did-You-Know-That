import { test } from "node:test";
import assert from "node:assert/strict";

import { emptyArchive, normalizeArchive, saveDiscovery, markInvestigated, setTakeaway, discoveryStatus, TAKEAWAY_MAX } from "../js/lib/archive.js";

const AT = "2026-10-09T10:00:00.000Z";
const LATER = "2026-10-12T10:00:00.000Z";

test("saving a discovery is free, idempotent and keeps the first date", () => {
  const once = saveDiscovery(emptyArchive(), "re-reading-trap", AT);
  assert.equal(once.entries["re-reading-trap"].savedAt, AT);
  assert.equal(saveDiscovery(once, "re-reading-trap", LATER), once);
});

test("saved, investigated and revisited stay distinct", () => {
  assert.equal(discoveryStatus(emptyArchive(), "re-reading-trap"), "new");
  const saved = saveDiscovery(emptyArchive(), "re-reading-trap", AT);
  assert.equal(discoveryStatus(saved, "re-reading-trap"), "saved");
  const investigated = markInvestigated(saved, "re-reading-trap", AT);
  assert.equal(discoveryStatus(investigated, "re-reading-trap"), "investigated");
  const revisited = markInvestigated(investigated, "re-reading-trap", LATER);
  assert.equal(discoveryStatus(revisited, "re-reading-trap"), "revisited");
  assert.equal(revisited.entries["re-reading-trap"].investigatedAt, AT, "first investigation date is kept");
});

test("investigating without saving does not save the card", () => {
  const state = markInvestigated(emptyArchive(), "re-reading-trap", AT);
  assert.equal(state.entries["re-reading-trap"].savedAt, undefined);
  assert.equal(discoveryStatus(state, "re-reading-trap"), "investigated");
});

test("a private takeaway is trimmed, bounded and cleared when empty", () => {
  const long = "x".repeat(TAKEAWAY_MAX + 50);
  const state = setTakeaway(emptyArchive(), "re-reading-trap", `  ${long}  `);
  assert.equal(state.entries["re-reading-trap"].takeaway.length, TAKEAWAY_MAX);
  const cleared = setTakeaway(state, "re-reading-trap", "   ");
  assert.equal(cleared.entries["re-reading-trap"].takeaway, undefined);
});

test("normalizeArchive drops malformed data instead of trusting it", () => {
  assert.deepEqual(normalizeArchive(null), emptyArchive());
  assert.deepEqual(normalizeArchive({ entries: [] }), emptyArchive());
  const clean = normalizeArchive({
    entries: {
      "re-reading-trap": { savedAt: AT, takeaway: 42, investigatedAt: "yesterday" },
      "Bad Id!": { savedAt: AT },
    },
  });
  assert.deepEqual(clean.entries, { "re-reading-trap": { savedAt: AT } });
});
