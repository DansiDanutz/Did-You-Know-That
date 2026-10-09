#!/usr/bin/env node
// Records Dexter saying popular first names ("Hi, Maria!") plus greeting
// "bodies" (each greeting without its opening "Hi, explorer!"), so the game
// can greet a child by name with generic recordings — the child's own name is
// never sent anywhere. Names: assets/voice/daxter/names/names.json (official
// statistics, see SOURCES.md) + EXTRA_NAMES. PAID API: run only when approved.
//
//   node tools/make-name-voice.mjs --dry-run        # count clips and characters
//   ELEVENLABS_API_KEY=… node tools/make-name-voice.mjs [--lang=ro]
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { LOCALES } from "../js/i18n/index.js";
import { BACK_LINES } from "../js/lib/greeting.js";
import { nameKey, nameFile, greetingBody, NAME_CLIP_DIR, nameIndexPath } from "../js/lib/name-voice.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.elevenlabs.io/v1";
const VOICE_ID = "nPczCjzI2devNBz1zQrb"; // Brian = Dexter (same as make-daxter-voice.mjs)
const SETTINGS = { stability: 0.45, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true, speed: 0.97 };
const EXTRA_NAMES = ["Sienna"]; // added on request, in every language
const GREETINGS = ["welcome", ...Array.from({ length: BACK_LINES }, (_, i) => `back${i + 1}`)];

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? true]));
const exists = (path) => access(path).then(() => true, () => false);

async function synthesize(apiKey, text) {
  const res = await fetch(`${API}/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: SETTINGS }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

function plan(lists) {
  const jobs = [];
  for (const [lang, locale] of Object.entries(LOCALES)) {
    if (args.lang && args.lang !== lang) continue;
    const hello = locale.ui["name.hello"];
    const seen = new Map();
    for (const name of [...(lists[lang]?.names ?? []), ...EXTRA_NAMES]) {
      const key = nameKey(name);
      if (key && !seen.has(key)) seen.set(key, name);
    }
    // File names come from the name itself (stable as lists grow).
    const names = [...seen].map(([key, name]) => ({ key, name, file: nameFile(key) }));
    const bodies = GREETINGS.map((key) => ({ key, text: greetingBody(locale.ui[`daxter.${key}`], locale.ui["name.explorerWords"]) })).filter((b) => b.text);
    jobs.push({
      lang,
      names,
      bodies,
      clips: [
        ...names.map((n) => ({ path: `${NAME_CLIP_DIR}/${lang}/${n.file}`, text: hello.replace("{name}", n.name) })),
        ...bodies.map((b) => ({ path: `assets/voice/daxter/${lang}/${b.key}-body.mp3`, text: b.text })),
      ],
    });
  }
  return jobs;
}

// The researched lists are optional: without them only EXTRA_NAMES are recorded.
const lists = await readFile(join(ROOT, NAME_CLIP_DIR, "names.json"), "utf8")
  .then((text) => JSON.parse(text).languages)
  .catch(() => ({}));
const jobs = plan(lists);
const clips = jobs.flatMap((job) => job.clips);
const chars = clips.reduce((n, clip) => n + clip.text.length, 0);
console.log(`${jobs.length} languages · ${clips.length} clips · ${chars.toLocaleString("en")} characters`);
jobs.forEach((job) => console.log(`  ${job.lang}: ${job.names.length} names, ${job.bodies.length} greeting bodies (${job.bodies.map((b) => b.key).join(", ")})`));
if (args["dry-run"]) process.exit(0);

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set.");
let made = 0;
for (const job of jobs) {
  for (const clip of job.clips) {
    const target = join(ROOT, clip.path);
    if (await exists(target)) continue;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await synthesize(apiKey, clip.text));
    made += 1;
    process.stdout.write(`\r${made} recorded`);
  }
  const index = { names: Object.fromEntries(job.names.map((n) => [n.key, n.file])), bodies: job.bodies.map((b) => b.key) };
  await mkdir(dirname(join(ROOT, nameIndexPath(job.lang))), { recursive: true });
  await writeFile(join(ROOT, nameIndexPath(job.lang)), JSON.stringify(index));
}
console.log(`\n${made} clips recorded; indexes written.`);
