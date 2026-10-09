// Records Daxter's in-game greetings (ElevenLabs, Brian: the same voice and
// settings as Daxter in the episodes) for every language. Skips existing files.
//   ELEVENLABS_API_KEY=… node tools/make-daxter-voice.mjs [--force]
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { LOCALES } from "../js/i18n/index.js";
import { BACK_LINES, greetingAudioPath } from "../js/lib/greeting.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.elevenlabs.io/v1";
const VOICE_ID = "nPczCjzI2devNBz1zQrb"; // Brian = Daxter
const SETTINGS = { stability: 0.45, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true, speed: 0.97 };
const KEYS = ["welcome", ...Array.from({ length: BACK_LINES }, (_, i) => `back${i + 1}`)];

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set.");
const force = process.argv.includes("--force");
const exists = (path) => access(path).then(() => true, () => false);

let made = 0;
for (const [lang, locale] of Object.entries(LOCALES)) {
  for (const key of KEYS) {
    const target = join(ROOT, greetingAudioPath(lang, key));
    if (!force && (await exists(target))) continue;
    const text = locale.ui[`daxter.${key}`].replace(/<[^>]+>/g, "");
    const res = await fetch(`${API}/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: SETTINGS }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status} for ${lang}/${key}: ${(await res.text()).slice(0, 200)}`);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await res.arrayBuffer()));
    made += 1;
  }
}
console.log(`${made} greetings recorded.`);
