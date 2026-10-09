// The secret word is announced at the end of each YouTube episode.
// Only its SHA-256 digest ships with the site. This is a fun gate, not
// security: a determined visitor can always bypass client-side checks.

// Keeps only letters and digits (any alphabet), so phone keyboards that add a
// full stop, an emoji or capitals can't make the right word fail.
export function normalizeSecret(input) {
  return String(input ?? "").replace(/[^\p{L}\p{N}]+/gu, "").toUpperCase();
}

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// `expected` is one digest or a list of accepted digests.
export async function verifySecret(input, expected) {
  const word = normalizeSecret(input);
  const accepted = [expected].flat().filter(Boolean);
  if (!word || accepted.length === 0) return false;
  return accepted.includes(await sha256Hex(word));
}
