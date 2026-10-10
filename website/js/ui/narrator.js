// Reads book pages aloud using ONLY the pre-recorded ElevenLabs narration
// (listed in assets/narration/manifest.json, served from the voice Blob store). There is deliberately no
// robotic browser-voice fallback: without recordings the feature stays hidden.

import { narrationPath, narrationUrl, speechText, isFresh } from "../lib/narration.js";

const MANIFEST_URL = "assets/narration/manifest.json";

export function createNarrator({ onReady } = {}) {
  let manifest = { files: [], fingerprints: {} };
  let files = new Set();
  let audio = null;
  let queue = [];
  let token = 0;

  fetch(MANIFEST_URL)
    .then((res) => (res.ok ? res.json() : { files: [] }))
    .then((data) => {
      manifest = { files: data.files ?? [], fingerprints: data.fingerprints ?? {} };
      files = new Set(manifest.files);
    })
    .catch(() => (files = new Set()))
    .finally(() => onReady?.());

  function playNext(current, ctx) {
    if (current !== token || !queue.length) return;
    const item = queue.shift();
    const path = narrationPath({ ...ctx, key: item.key });
    // Skip pages whose words changed since they were recorded (stale audio).
    if (!item.text || !isFresh(manifest, path, speechText(item), ctx.voice)) return playNext(current, ctx);
    audio = new Audio(narrationUrl(path));
    audio.onended = () => playNext(current, ctx);
    audio.onerror = () => playNext(current, ctx);
    audio.play().catch(() => playNext(current, ctx));
  }

  function stop() {
    token += 1;
    queue = [];
    audio?.pause();
    audio = null;
  }

  return {
    // True when this story has real recordings for the language/audience/voice.
    available({ lang, audience, storyId, voice }) {
      const prefix = narrationPath({ lang, audience, storyId, voice, key: "" }).replace(/\.mp3$/, "");
      return [...files].some((file) => file.startsWith(prefix));
    },
    read(items, ctx) {
      stop();
      queue = [...items];
      playNext(token, ctx);
    },
    stop,
  };
}
