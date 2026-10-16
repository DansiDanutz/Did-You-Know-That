// Subtitle overlay for localized languages: loads one .vtt per language (same origin, fetched the
// first time the language is used) and shows the cue for the current video time. Cue text goes in with
// textContent only. `overlay` is the .player-subs element; it is injected so this stays testable.
import { parseVtt, cueAt } from "../lib/vtt.js";

const defaultFetchText = async (url) => {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
};

export function createSubtitles(overlay, { fetchText = defaultFetchText } = {}) {
  const loaded = new Map(); // url → cues (a failed load is not remembered, so choosing again retries)
  let cues = [];
  let current = "";
  let token = 0;

  const show = (text) => {
    if (text === current) return;
    current = text;
    overlay.textContent = text;
    overlay.hidden = text === "";
  };

  return {
    /** Switch to a language's subtitles. Resolves true when they are ready, false when they could not be loaded. */
    async select(language, url) {
      const mine = ++token;
      overlay.lang = language;
      cues = [];
      show("");
      try {
        if (!loaded.has(url)) loaded.set(url, parseVtt(await fetchText(url)));
        if (mine !== token) return true; // superseded by another choice; nothing to report
        cues = loaded.get(url);
        return true;
      } catch {
        if (mine === token) cues = [];
        return false;
      }
    },
    /** Subtitles off (English, or a language without any). */
    clear() {
      token += 1;
      cues = [];
      show("");
    },
    /** Show the cue for video time `t` (seconds). */
    update(t) {
      show(cueAt(cues, t));
    },
  };
}
