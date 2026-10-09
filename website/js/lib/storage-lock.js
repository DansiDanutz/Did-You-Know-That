// Runs a storage read-modify-write under a cross-tab lock where the browser
// supports the Web Locks API, so two tabs never interleave their updates.
export function withStorageLock(work, locks = globalThis.navigator?.locks) {
  if (!locks?.request) return Promise.resolve().then(work);
  return locks.request("dexty-collection", () => work());
}
