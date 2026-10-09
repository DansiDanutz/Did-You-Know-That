#!/usr/bin/env node
// Records Dexter's lines for Episode 1, the House of Family (English pilot):
// every line in js/data/family-episode.js LINES, the challenge prompts and
// feedback, and the storybook scenes. PAID API: run only with approval.
//   node tools/make-family-voice.mjs --dry-run
//   ELEVENLABS_API_KEY=… node tools/make-family-voice.mjs
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { LINES, CHALLENGES, STORYBOOK } from "../js/data/family-episode.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = "assets/voice/daxter/en/family";
const API = "https://api.elevenlabs.io/v1";
const VOICE_ID = "nPczCjzI2devNBz1zQrb"; // Brian = Dexter
const SETTINGS = { stability: 0.45, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true, speed: 0.95 };
const dry = process.argv.includes("--dry-run");
const exists = (path) => access(path).then(() => true, () => false);

const clips = [
  ...Object.entries(LINES).map(([id, text]) => ({ id, text })),
  ...CHALLENGES.flatMap((c) => [{ id: `${c.id}-prompt`, text: c.prompt }, { id: `${c.id}-right`, text: c.right }, { id: `${c.id}-wrong`, text: c.wrong }]),
  ...STORYBOOK.scenes.map((sc) => ({ id: `story-${sc.id}`, text: `${sc.heading}. ${sc.text}` })),
];
const chars = clips.reduce((n, c) => n + c.text.length, 0);
console.log(`${clips.length} clips · ${chars.toLocaleString("en")} characters`);
if (dry) process.exit(0);

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set.");
await mkdir(join(ROOT, DIR), { recursive: true });
let made = 0;
for (const clip of clips) {
  const target = join(ROOT, DIR, `${clip.id}.mp3`);
  if (await exists(target)) continue;
  const res = await fetch(`${API}/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: clip.text, model_id: "eleven_multilingual_v2", voice_settings: SETTINGS }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status} for ${clip.id}: ${(await res.text()).slice(0, 200)}`);
  await writeFile(target, Buffer.from(await res.arrayBuffer()));
  made += 1;
  process.stdout.write(`\r${made} recorded`);
}
console.log(`\n${made} clips recorded in ${DIR}.`);
