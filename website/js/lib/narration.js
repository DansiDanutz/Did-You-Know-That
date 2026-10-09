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
  gate: (_, story, s, t) => (s.gateOpen ? join(t("gate.broken"), t("gate.brokenText")) : join(t("gate.title"), t("gate.sealed"))),
  quiz: (page, story, s, t) => (s.gateOpen ? quizText(page, t) : join(t("quiz.sleeps"), t("quiz.sleepTitle"), t("quiz.sleepText"))),
  reward: (_, story, s, t) => join(t("reward.kicker")),
  end: (_, story, s, t) => join(t("end.title"), t("end.forNow"), t("end.text")),
};

function keyFor(face, session) {
  if (face.type === "gate") return session.gateOpen ? `${face.id}~open` : face.id;
  if (face.type === "quiz") return session.gateOpen ? face.id : "quiz~sleep";
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
  const states = [{ gateOpen: false }, { gateOpen: true }];
  const byKey = new Map();
  faces.forEach((face) =>
    states.forEach((session) => {
      const item = narrationFor(face, story, session, t);
      if (item.text && !byKey.has(item.key)) byKey.set(item.key, item);
    }),
  );
  return [...byKey.values()];
}
