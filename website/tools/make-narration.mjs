#!/usr/bin/env node
// Generates the book narration with ElevenLabs (PAID API, run only with an
// approved budget). Every page state × language × audience × voice becomes
// assets/narration/<lang>/<audience>/<story>/<voice>/<key>.mp3, plus a
// manifest.json the site uses to know which recordings exist.
//
//   node tools/make-narration.mjs --dry-run            # count characters, no API calls
//   ELEVENLABS_API_KEY=… node tools/make-narration.mjs  # generate (skips existing files)
//   options: --lang=ro --story=why-wonder --voice=male --sample (one page per voice, to approve the sound first)
//
// Voices are resolved by name from your ElevenLabs library, so no ids are hardcoded.

import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { STORIES } from "../js/data/stories.js";
import { LANGUAGES, LOCALES, createTranslator } from "../js/i18n/index.js";
import { localizeStory, AUDIENCES } from "../js/lib/localize.js";
import { allNarrationItems, narrationPath, speechText } from "../js/lib/narration.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.elevenlabs.io/v1";
const MODEL_ID = "eleven_multilingual_v2";
// Brian = ElevenLabs' original premade voice; Jane = mature British audiobook
// reader (public library, added to David's library as "DYKT Jane").
const VOICES = {
  male: { name: "Brian", id: "nPczCjzI2devNBz1zQrb" },
  female: { name: "Jane", id: "RILOU7YmBhvwJGDGjNmP" },
};
const VOICE_NAMES = Object.fromEntries(Object.entries(VOICES).map(([slot, v]) => [slot, v.name]));
const OUTPUT_FORMAT = "mp3_44100_128";
// Calm, human storytelling: steady delivery, a little slower than default.
const VOICE_SETTINGS = { stability: 0.6, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: 0.9 };

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

function plannedItems() {
  if (args.sample) return sampleItems();
  const items = [];
  for (const { code } of LANGUAGES) {
    if (args.lang && args.lang !== code) continue;
    const t = createTranslator(code);
    for (const base of STORIES.filter((s) => !s.comingSoon)) {
      if (args.story && args.story !== base.id) continue;
      for (const audience of AUDIENCES) {
        const story = localizeStory(base, LOCALES[code], LOCALES.en, audience);
        for (const voice of Object.keys(VOICE_NAMES)) {
          if (args.voice && args.voice !== voice) continue;
          for (const item of allNarrationItems(story, t)) {
            items.push({ ...item, path: narrationPath({ lang: code, audience, storyId: base.id, voice, key: item.key }), voice });
          }
        }
      }
    }
  }
  return items;
}

// A short audition: the Episode 1 story page in English, Kids, both voices.
function sampleItems() {
  const t = createTranslator("en");
  const story = localizeStory(STORIES[0], LOCALES.en, LOCALES.en, "kids");
  const page = allNarrationItems(story, t).find((i) => i.key === "start");
  return Object.keys(VOICE_NAMES).map((voice) => ({ ...page, voice, path: `assets/narration/_samples/${voice}-start.mp3` }));
}

const exists = (path) => access(path).then(() => true, () => false);

async function resolveVoices(apiKey) {
  const res = await fetch(`${API}/voices`, { headers: { "xi-api-key": apiKey } });
  if (!res.ok) throw new Error(`Could not list voices (HTTP ${res.status})`);
  const { voices } = await res.json();
  return Object.fromEntries(
    Object.entries(VOICES).map(([slot, { name, id }]) => {
      if (!voices.some((v) => v.voice_id === id)) throw new Error(`Voice ${name} (${id}) is not in this ElevenLabs library.`);
      return [slot, id];
    }),
  );
}

async function synthesize(apiKey, voiceId, text) {
  const res = await fetch(`${API}/text-to-speech/${voiceId}?output_format=${OUTPUT_FORMAT}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: VOICE_SETTINGS }),
  });
  if (!res.ok) throw new Error(`TTS failed (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function writeManifest() {
  const all = plannedItems();
  const present = [];
  for (const item of all) if (await exists(join(ROOT, item.path))) present.push(item.path);
  const file = join(ROOT, "assets/narration/manifest.json");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ files: present.sort() }, null, 0));
  return present.length;
}

async function main() {
  const items = plannedItems();
  const chars = items.reduce((n, i) => n + i.text.length, 0);
  console.log(`${items.length} recordings, ${chars.toLocaleString("en")} characters in total.`);
  if (args["dry-run"]) return;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set.");
  const voiceIds = await resolveVoices(apiKey);
  let made = 0;
  for (const item of items) {
    const target = join(ROOT, item.path);
    if (await exists(target)) continue;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await synthesize(apiKey, voiceIds[item.voice], speechText(item)));
    made += 1;
    process.stdout.write(`\r${made} generated`);
  }
  if (args.sample) return console.log("\nSamples saved in assets/narration/_samples/ for listening.");
  console.log(`\nManifest lists ${await writeManifest()} recordings.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
