// Dexter says the child's name from generic pre-recorded clips, one per
// popular name ("Hi, Maria!"), then the rest of the greeting. Only the
// recording is chosen on the device; the child's name is never transmitted.

export const NAME_CLIP_DIR = "assets/voice/daxter/names";

// Lower case, no accents, trimmed: "Zoë" and "zoe" share one recording.
export const nameKey = (name) =>
  String(name ?? "").trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Each language folder has index.json: { names: { "<nameKey>": "n-1a2b3c4d.mp3" },
// bodies: [...] }. File names are a fingerprint of the name: plain ASCII (fine
// for accented and Chinese names) and stable when the list grows.
export function nameFile(key) {
  let hash = 0x811c9dc5;
  for (const char of key) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `n-${hash.toString(16).padStart(8, "0")}.mp3`;
}
export const nameIndexPath = (lang) => `${NAME_CLIP_DIR}/${lang}/index.json`;

// The greeting without the opening salutation that addresses the child
// ("Hi, explorer! I'm Dexter…" → "I'm Dexter…"); null when it has none.
export function greetingBody(text, words) {
  for (const word of String(words ?? "").split(",").map((w) => w.trim()).filter(Boolean)) {
    const match = new RegExp(`^[^!！]*[,，]\\s*${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[!！]\\s*`, "u").exec(text);
    if (match) return text.slice(match[0].length).trim() || null;
  }
  return null;
}

// Audio files to play, in order. `voiced[lang]` maps recorded name keys to
// their file; `hasBody(lang, key)` says whether a body recording exists.
export function greetingClips({ lang, key, name, voiced, hasBody }) {
  const full = `assets/voice/daxter/${lang}/${key}.mp3`;
  const nk = nameKey(name);
  const file = nk ? voiced[lang]?.get(nk) : undefined;
  if (!file) return [full];
  const rest = hasBody(lang, key) ? `assets/voice/daxter/${lang}/${key}-body.mp3` : full;
  return [`${NAME_CLIP_DIR}/${lang}/${file}`, rest];
}
