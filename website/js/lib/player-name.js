// The visitor's optional name or nickname, so the site can greet them. Ported from the old game's
// sign-in (js/lib/player-name.js): stored only in this browser, never sent anywhere or put in a link.

export const NAME_MAX = 20;
// Whole-word match only, so real names that contain these letters still work; words that are
// also common names ("dick", "sex") were left out of the name check in the original.
const NAME_BLOCKLIST = ["fuck", "shit", "bitch", "cunt", "nigger", "faggot", "whore", "slut", "pussy", "nazi", "hitler", "porn", "pula", "pizda", "muie"];

// Letters (any alphabet), spaces, hyphens and apostrophes; capitalised; ≤ 20 chars.
export function cleanName(input) {
  const letters = String(input ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}' -]+/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX)
    .trim();
  if (!letters) return "";
  const tokens = letters.toLowerCase().split(/[\s'-]+/);
  if (tokens.some((token) => NAME_BLOCKLIST.includes(token))) return "";
  return letters.charAt(0).toLocaleUpperCase() + letters.slice(1);
}
