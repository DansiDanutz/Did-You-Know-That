// Language registry + translator. UI strings live in ./locales/<code>.js
// next to the story texts for that language. English is the fallback.

import en from "./locales/en.js";
import ro from "./locales/ro.js";
import es from "./locales/es.js";
import fr from "./locales/fr.js";
import de from "./locales/de.js";
import it from "./locales/it.js";

export const LANGUAGES = Object.freeze([
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
]);

export const LOCALES = Object.freeze({ en, ro, es, fr, de, it });
export const DEFAULT_LANG = "en";

export const isSupported = (code) => Object.hasOwn(LOCALES, code);

export function detectLanguage(browserLanguages) {
  const match = (browserLanguages ?? [])
    .map((tag) => String(tag).toLowerCase().split("-")[0])
    .find(isSupported);
  return match ?? DEFAULT_LANG;
}

export function createTranslator(code) {
  const strings = LOCALES[code]?.ui ?? {};
  return (key, vars = {}) => {
    const template = strings[key] ?? en.ui[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`));
  };
}
