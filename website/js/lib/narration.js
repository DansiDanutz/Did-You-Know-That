// What the book narrator says for each page, plus where its pre-recorded
// audio lives. Pure functions shared by the browser and the generator script.

const LETTERS = "ABCD";
const stripHtml = (text) => String(text).replace(/<[^>]+>/g, "");
const stripSparks = (text) => String(text).replace(/\[\[(.+?)\]\]/g, "$1");
// Each narration is a list of spoken parts; recordings put a calm pause
// between them so the storyteller never sounds rushed.
const clean = (p) => stripHtml(stripSparks(p)).trim();
const join = (...parts) => parts.filter(Boolean).map(clean).filter(Boolean);

function quizText(page, t) {
  return join(t("quiz.asks"), page.question, ...page.choices.map((c, i) => `${LETTERS[i]}: ${c}.`));
}

const READERS = {
  cover: (_, story, s, t) => join(`${t("cover.episode", { n: story.episode })}.`, `${story.title}.`),
  inside: (_, story, s, t) => join(t("inside.title"), ...[1, 2, 3, 4].map((n) => t(`inside.step${n}`)), story.teaser),
  title: (page) => join(`${page.chapter}.`, page.heading),
  story: (page) => join(`${page.heading}.`, ...page.text),
  mission: (_, story, s, t) => join(t("mission.kicker"), t("mission.title"), ...story.mission.map((m, i) => `${i + 1}. ${m}.`), t("mission.note")),
  quiz: (page, story, s, t) => quizText(page, t),
  reward: (_, story, s, t) => join(t("reward.kicker")),
  end: (_, story, s, t) => join(t("end.title"), t("end.forNow"), t("end.text")),
};

function keyFor(face, session) {
  return face.id ?? face.type;
}

export function narrationFor(face, story, session, t) {
  const read = READERS[face.type];
  const parts = read ? read(face, story, session, t) : [];
  return { key: keyFor(face, session), parts, text: parts.join(" ") };
}

// Text sent to the voice engine: SSML pauses between parts for an unhurried read.
export const PAUSE_BETWEEN_PARTS = '<break time="1.0s" />';
export function speechText(item) {
  return item.parts.join(` ${PAUSE_BETWEEN_PARTS} `);
}

export function narrationPath({ lang, audience, storyId, voice, key }) {
  return `assets/narration/${lang}/${audience}/${storyId}/${voice}/${key}.mp3`;
}

// Every distinct page state of a story, for pre-generating audio.
export function allNarrationItems(story, t) {
  const faces = [{ type: "cover" }, { type: "inside" }, ...story.pages];
  const byKey = new Map();
  faces.forEach((face) =>
    [{}].forEach((session) => {
      const item = narrationFor(face, story, session, t);
      if (item.text && !byKey.has(item.key)) byKey.set(item.key, item);
    }),
  );
  return [...byKey.values()];
}

// The voice engine settings every book recording is made with. Part of each
// recording's fingerprint, so changing them marks old audio as stale.
export const NARRATION_MODEL = "eleven_multilingual_v2";
export const NARRATION_SETTINGS = Object.freeze({ stability: 0.6, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: 0.9 });

// FNV-1a (32 bit): a cheap, deterministic fingerprint of exactly what was
// sent to the voice engine. Not security — only change detection.
export function narrationFingerprint(text, voice) {
  const input = `${NARRATION_MODEL}|${JSON.stringify(NARRATION_SETTINGS)}|${voice}|${text}`;
  let hash = 0x811c9dc5;
  for (const char of input) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

// A recording may play only if it exists and, when its fingerprint is
// known, it was made from the current words with the current voice.
export function isFresh(manifest, path, text, voice) {
  if (!manifest.files?.includes(path)) return false;
  const recorded = manifest.fingerprints?.[path];
  return !recorded || recorded === narrationFingerprint(text, voice);
}
