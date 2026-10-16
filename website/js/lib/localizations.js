// Per-episode localizations: our own subtitles (WebVTT in git) and an optional voice-over (AAC in the
// public Vercel Blob store) for the languages in LOCALIZATION_LANGUAGES. Pure helpers shared by the
// catalog validator (tools/lib/catalog.mjs), the page template (tools/lib/components.mjs) and the
// browser (js/ui/player.js). The episode page carries them as data-localizations='{"ro":{…}}'.
import { LANGUAGES, LOCALIZATION_LANGUAGES, DEFAULT_LANGUAGE, normalizeLanguage, languageLabel } from "./player-prefs.js";

export const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";
const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";
const SUBTITLES_PATTERN = new RegExp(`^/assets/captions/(${SLUG})/([a-z]{2})\\.vtt$`);

export const subtitlesPath = (slug, code) => `/assets/captions/${slug}/${code}.vtt`;
const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** True for an https URL on a public Blob store whose path ends with /<slug>/<code>.m4a. */
export function isDubAudioUrl(value, slug, code) {
  if (typeof value !== "string") return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    url.hostname.endsWith(BLOB_HOST_SUFFIX) &&
    !url.username && !url.password && !url.port &&
    url.pathname.endsWith(`/${slug}/${code}.m4a`)
  );
}

/** Problems with one language's entry ({ subtitles, audio? }) of an episode, as messages without a location prefix. */
export function localizationProblems(entry, code, slug) {
  if (!isRecord(entry)) return [`must be an object of { "subtitles": "…" , "audio"?: "…" }`];
  const problems = [];
  const expected = subtitlesPath(slug, code);
  if (entry.subtitles !== expected) problems.push(`subtitles must be exactly "${expected}"`);
  if (entry.audio !== undefined && !isDubAudioUrl(entry.audio, slug, code)) {
    problems.push(`audio must be an https URL on *${BLOB_HOST_SUFFIX} ending with /${slug}/${code}.m4a`);
  }
  for (const key of Object.keys(entry)) if (key !== "subtitles" && key !== "audio") problems.push(`unknown field "${key}"`);
  return problems;
}

/**
 * data-localizations (JSON text or an object) → a clean { code: { subtitles, audio? } }. Anything that
 * would not pass the catalog rules is dropped, so a broken attribute can only switch features off.
 */
export function parseLocalizations(input) {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return {};
    }
  }
  if (!isRecord(value)) return {};
  const clean = {};
  for (const code of LOCALIZATION_LANGUAGES) {
    const entry = value[code];
    const slug = typeof entry?.subtitles === "string" ? entry.subtitles.match(SUBTITLES_PATTERN)?.[1] : undefined;
    if (!slug || localizationProblems(entry, code, slug).length) continue;
    clean[code] = entry.audio === undefined ? { subtitles: entry.subtitles } : { subtitles: entry.subtitles, audio: entry.audio };
  }
  return clean;
}

/**
 * The picker's non-English languages split for one episode: those with Dexty subtitles (and maybe a
 * voice-over) and those that only get YouTube's auto-translated captions. Each keeps the LANGUAGES order.
 */
export function languageGroups(localizations = {}) {
  const parsed = parseLocalizations(localizations);
  const others = LANGUAGES.filter((language) => language.code !== DEFAULT_LANGUAGE);
  return Object.freeze({
    localized: others.filter(({ code }) => parsed[code]).map(({ code, label }) => Object.freeze({ code, label, voiceOver: Boolean(parsed[code].audio) })),
    auto: others.filter(({ code }) => !parsed[code]).map(({ code, label }) => Object.freeze({ code, label })),
  });
}

/** The localization for the chosen language, or null (English, unknown, or none for this episode). */
export const localizationFor = (localizations, language) => {
  const code = normalizeLanguage(language);
  return code === DEFAULT_LANGUAGE ? null : localizations?.[code] ?? null;
};

/**
 * The line under the player. `loc` is the language's localization (or null → YouTube's auto-translated
 * captions). `subtitlesFailed` is set when the .vtt could not be loaded.
 */
export function hintText({ language, loc = null, muted = false, subtitlesFailed = false }) {
  const label = languageLabel(language);
  if (normalizeLanguage(language) === DEFAULT_LANGUAGE) return "";
  if (!loc) {
    return `Narration stays English; YouTube auto-translates the captions into ${label}. No captions? Press ⚙ → Subtitles → Auto-translate.`;
  }
  const english = LANGUAGES.find((entry) => entry.code === normalizeLanguage(language)).english;
  const subtitles = subtitlesFailed ? `Subtitles in ${label} could not be loaded.` : `Subtitles in ${label}.`;
  if (!loc.audio) return muted ? `${subtitles} Voice-over for this episode is not available yet.` : subtitles;
  return muted ? `Voice-over in ${label}. ${subtitlesFailed ? subtitles : ""}`.trim() : `${subtitles} Mute the English to hear the ${english} voice-over.`;
}
