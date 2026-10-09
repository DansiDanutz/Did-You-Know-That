// Generates a video project's narration (ElevenLabs) from its vo-lines.json.
// PAID API: run only with an approved budget.
//   ELEVENLABS_API_KEY=… node tools/make_vo.mjs video/ep01-kids [ids…]   (no ids = every line)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const API = "https://api.elevenlabs.io/v1";
const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";

const [dir, ...ids] = process.argv.slice(2);
if (!dir) throw new Error("Pass the project directory, e.g. video/ep01-kids");
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set.");

const { voice, settings, lines } = JSON.parse(readFileSync(join(dir, "vo-lines.json"), "utf8"));
const wanted = ids.length ? ids : lines.map((l) => l.id);
mkdirSync(join(dir, "assets/vo"), { recursive: true });
for (const id of wanted) {
  const line = lines.find((l) => l.id === id);
  if (!line) throw new Error(`No line "${id}" in vo-lines.json`);
  const target = join(dir, `assets/vo/${id}.mp3`);
  if (!ids.length && existsSync(target)) { console.log(`${target} exists, kept`); continue; }
  const res = await fetch(`${API}/text-to-speech/${voice}?output_format=${OUTPUT_FORMAT}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: line.text, model_id: MODEL_ID, voice_settings: settings }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status} for "${id}": ${(await res.text()).slice(0, 200)}`);
  writeFileSync(target, Buffer.from(await res.arrayBuffer()));
  console.log(`${target} written`);
}
