#!/usr/bin/env node
// Generates the book narration with ElevenLabs (PAID API, run only with an
// approved budget). Every page state × language × audience × voice becomes
// assets/narration/<lang>/<audience>/<story>/<voice>/<key>.mp3 (written under
// .narration-out/, which is not tracked), plus a manifest.json the site uses to
// know which recordings exist. The audio itself is served from the voice Blob
// store: after recording, publish with  node tools/upload-narration.mjs
// (a recording already listed in manifest.json counts as done, so nothing is re-recorded).
//
//   node tools/make-narration.mjs --dry-run            # count characters, no API calls
//   ELEVENLABS_API_KEY=… node tools/make-narration.mjs  # generate (skips existing files)
//   node tools/make-narration.mjs --check              # list missing + stale recordings and their size, no API calls
//   node tools/make-narration.mjs --baseline           # record fingerprints of existing files from today's text (no API)
//   options: --lang=ro --story=why-wonder --voice=male --sample (one page per voice, to approve the sound first)
//
// Every recording's fingerprint (text + voice + model + settings) is stored in
// the manifest; a recording whose page text changed is "stale": the site stops
// playing it and a run re-records it.
//
// Voices are resolved by name from your ElevenLabs library, so no ids are hardcoded.

import { mkdir, writeFile, readFile, access, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { STORIES } from "../js/data/stories.js";
import { LANGUAGES, LOCALES, createTranslator } from "../js/i18n/index.js";
import { localizeStory, AUDIENCES } from "../js/lib/localize.js";
import { allNarrationItems, narrationPath, speechText, narrationFingerprint, NARRATION_MODEL, NARRATION_SETTINGS } from "../js/lib/narration.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, ".narration-out"); // new recordings land here until uploaded
const API = "https://api.elevenlabs.io/v1";
const MODEL_ID = NARRATION_MODEL;
// Brian = ElevenLabs' original premade voice; Jane = mature British audiobook
// reader (public library, added to David's library as "DYKT Jane").
const VOICES = {
  male: { name: "Brian", id: "nPczCjzI2devNBz1zQrb" },
  female: { name: "Jane", id: "RILOU7YmBhvwJGDGjNmP" },
};
const VOICE_NAMES = Object.fromEntries(Object.entries(VOICES).map(([slot, v]) => [slot, v.name]));
const OUTPUT_FORMAT = "mp3_44100_128";
// Calm, human storytelling: steady delivery, a little slower than default.
const VOICE_SETTINGS = NARRATION_SETTINGS;

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

// Lists every recording (those already published, from the previous manifest, plus
// the new ones in .narration-out), not just this run's --lang/--story filter,
// so a partial run never drops other languages from the manifest.
async function listRecordings(dir) {
  const entries = await readdir(join(OUT, dir), { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map((e) => (e.isDirectory() ? (e.name === "_samples" ? [] : listRecordings(`${dir}/${e.name}`)) : e.name.endsWith(".mp3") ? [`${dir}/${e.name}`] : [])),
  );
  return nested.flat();
}

const MANIFEST = join(ROOT, "assets/narration/manifest.json");

async function readManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch {
    return { files: [], fingerprints: {} };
  }
}

// Fingerprints are kept from the previous manifest and set for recordings
// made (or baselined) in this run, so a stale file stays marked stale.
async function writeManifest(previous, fresh) {
  const present = [...new Set([...(previous.files ?? []), ...(await listRecordings("assets/narration"))])].sort();
  const fingerprints = Object.fromEntries(
    present.flatMap((path) => {
      const fingerprint = fresh[path] ?? previous.fingerprints?.[path];
      return fingerprint ? [[path, fingerprint]] : [];
    }),
  );
  await mkdir(dirname(MANIFEST), { recursive: true });
  await writeFile(MANIFEST, JSON.stringify({ files: present, fingerprints }, null, 0));
  return present.length;
}

async function main() {
  const previous = await readManifest();
  const items = plannedItems().map((item) => ({ ...item, fingerprint: narrationFingerprint(speechText(item), item.voice) }));
  const status = await Promise.all(
    items.map(async (item) => {
      if (!previous.files?.includes(item.path) && !(await exists(join(OUT, item.path)))) return "missing";
      const recorded = previous.fingerprints?.[item.path];
      return recorded && recorded !== item.fingerprint ? "stale" : "ok";
    }),
  );
  const todo = items.filter((_, i) => status[i] !== "ok");
  const chars = todo.reduce((n, item) => n + item.text.length, 0);
  console.log(`${items.length} planned · ${status.filter((s) => s === "missing").length} missing · ${status.filter((s) => s === "stale").length} stale → ${todo.length} to record, ${chars.toLocaleString("en")} characters.`);
  if (args.check) return todo.forEach((item, i) => console.log(`  ${status[items.indexOf(item)]}  ${item.path}`));
  if (args["dry-run"]) return;
  if (args.baseline) {
    const fresh = Object.fromEntries(items.filter((_, i) => status[i] === "ok" && !previous.fingerprints?.[items[i].path]).map((item) => [item.path, item.fingerprint]));
    console.log(`Baseline: ${Object.keys(fresh).length} fingerprints recorded. Manifest lists ${await writeManifest(previous, fresh)} recordings.`);
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set.");
  const voiceIds = await resolveVoices(apiKey);
  const fresh = {};
  for (const item of todo) {
    const target = join(OUT, item.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await synthesize(apiKey, voiceIds[item.voice], speechText(item)));
    fresh[item.path] = item.fingerprint;
    process.stdout.write(`\r${Object.keys(fresh).length} recorded`);
  }
  if (args.sample) return console.log("\nSamples saved in .narration-out/assets/narration/_samples/ for listening.");
  console.log(`\nManifest lists ${await writeManifest(previous, fresh)} recordings. Next: BLOB_READ_WRITE_TOKEN=… node tools/upload-narration.mjs`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
