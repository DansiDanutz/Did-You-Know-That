// The secret word is announced at the end of each YouTube episode.
// Only its SHA-256 digest ships with the site. This is a fun gate, not
// security: a determined visitor can always bypass client-side checks.

export function normalizeSecret(input) {
  return String(input ?? "").replace(/\s+/g, "").toUpperCase();
}

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifySecret(input, expectedHash) {
  const word = normalizeSecret(input);
  if (!word || !expectedHash) return false;
  return (await sha256Hex(word)) === expectedHash;
}
