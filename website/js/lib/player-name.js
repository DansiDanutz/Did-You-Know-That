// The child's optional name, so Dexter can greet them personally. Stored only
// in this device's settings; never sent to a server or put in a shared link.

import { BLOCKED_WORDS } from "./points.js";

export const NAME_MAX = 20;
// Whole-word match only, so real names that contain these letters still work;
// words that are also common names are left out of the name check.
const NAME_BLOCKLIST = BLOCKED_WORDS.filter((word) => !["dick", "sex"].includes(word));

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

// Puts the name where Dexter *addresses* the child ("Hi, explorer!" →
// "Hi, Maria!"): only after a comma, so gendered nouns elsewhere in a sentence
// stay grammatical. `words` lists this language's forms, comma-separated.
// Otherwise a short "Hi, {name}!" goes in front.
export function personalize(text, name, { words, hello }) {
  if (!name) return text;
  for (const word of String(words ?? "").split(",").map((w) => w.trim()).filter(Boolean)) {
    const match = new RegExp(`([,，]\\s*)${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "u").exec(text);
    if (match) return text.slice(0, match.index) + match[1] + name + text.slice(match.index + match[0].length);
  }
  const greeting = hello.replace("{name}", name);
  // Chinese full-width punctuation is never followed by a space.
  return /[！，。？]$/u.test(greeting) ? greeting + text : `${greeting} ${text}`;
}
