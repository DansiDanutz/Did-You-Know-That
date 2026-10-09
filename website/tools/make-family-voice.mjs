#!/usr/bin/env node
// Records Dexter's lines for Episode 1, the House of Family, per language:
// every line in the language pack (js/data/family-episode.js + family-i18n/<lang>.js),
// the challenge prompts and feedback, and the storybook scenes.
// PAID API (ElevenLabs characters): run only with approval; --dry-run costs nothing.
//   node tools/make-family-voice.mjs --dry-run                 all six translated languages
//   node tools/make-family-voice.mjs --dry-run --lang=de,en    chosen languages
//   ELEVENLABS_API_KEY=… node tools/make-family-voice.mjs      record what is missing
// Existing clips are never re-recorded; delete a file to redo it.
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { FAMILY_VOICE_LANGS, loadFamilyPack, familyVoicePath } from "../js/data/family-episode.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.elevenlabs.io/v1";
const VOICE_ID = "nPczCjzI2devNBz1zQrb"; // Brian = Dexter
const MODEL_ID = "eleven_multilingual_v2";
const SETTINGS = { stability: 0.45, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true, speed: 0.95 };
const dry = process.argv.includes("--dry-run");
const langArg = process.argv.find((a) => a.startsWith("--lang="))?.slice(7);
const langs = langArg ? langArg.split(",").map((l) => l.trim()).filter(Boolean) : [...FAMILY_VOICE_LANGS];
const exists = (path) => access(path).then(() => true, () => false);

const clipsFor = (pack) => [
  ...Object.entries(pack.lines).map(([id, text]) => ({ id, text })),
  ...pack.challenges.flatMap((c) => [{ id: `${c.id}-prompt`, text: c.prompt }, { id: `${c.id}-right`, text: c.right }, { id: `${c.id}-wrong`, text: c.wrong }]),
  ...pack.story.scenes.map((sc) => ({ id: `story-${sc.id}`, text: `${sc.heading}. ${sc.text}` })),
];

const plan = [];
for (const lang of langs) {
  const pack = await loadFamilyPack(lang);
  if (pack.lang !== lang) throw new Error(`No language pack for "${lang}" (known: en, ${FAMILY_VOICE_LANGS.join(", ")}).`);
  const clips = clipsFor(pack);
  const todo = [];
  for (const clip of clips) if (!(await exists(join(ROOT, familyVoicePath(lang, clip.id))))) todo.push(clip);
  plan.push({ lang, clips, todo });
}

const sum = (clips) => clips.reduce((n, c) => n + c.text.length, 0);
console.log("language  clips  to record  characters to record");
for (const { lang, clips, todo } of plan) console.log(`${lang.padEnd(8)}  ${String(clips.length).padStart(5)}  ${String(todo.length).padStart(9)}  ${sum(todo).toLocaleString("en").padStart(20)}`);
const total = plan.reduce((n, p) => n + sum(p.todo), 0);
console.log(`total characters to record: ${total.toLocaleString("en")} (1 character = 1 ElevenLabs credit on ${MODEL_ID})`);

const apiKey = process.env.ELEVENLABS_API_KEY;
if (apiKey) {
  const res = await fetch(`${API}/user/subscription`, { headers: { "xi-api-key": apiKey } });
  if (res.ok) {
    const sub = await res.json();
    const left = sub.character_limit - sub.character_count;
    console.log(`plan: ${sub.tier} · used ${sub.character_count.toLocaleString("en")} of ${sub.character_limit.toLocaleString("en")} · left ${left.toLocaleString("en")} · ${left >= total ? "enough for this run" : "NOT ENOUGH for this run"}`);
    if (!dry && left < total) throw new Error("Not enough ElevenLabs credits left for this run.");
  } else {
    console.log(`plan: could not read the subscription (HTTP ${res.status})`);
  }
} else {
  console.log("plan: ELEVENLABS_API_KEY is not set, so the balance was not checked");
}
if (dry) process.exit(0);
if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set.");

let made = 0;
for (const { lang, todo } of plan) {
  await mkdir(join(ROOT, dirname(familyVoicePath(lang, "x"))), { recursive: true });
  for (const clip of todo) {
    const res = await fetch(`${API}/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text: clip.text, model_id: MODEL_ID, voice_settings: SETTINGS }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status} for ${lang}/${clip.id}: ${(await res.text()).slice(0, 200)}`);
    await writeFile(join(ROOT, familyVoicePath(lang, clip.id)), Buffer.from(await res.arrayBuffer()));
    made += 1;
    process.stdout.write(`\r${made} recorded (${lang}/${clip.id})        `);
  }
}
console.log(`\n${made} clips recorded.`);
