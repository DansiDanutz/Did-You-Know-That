// Generates Daxter's narration (Brian, ElevenLabs) for Episode 1 Kids from
// video/ep01-kids/vo-lines.json. Pass the line ids to (re)generate.
//   ELEVENLABS_API_KEY=… node tools/make_ep01_kids_vo.mjs finale
import { readFileSync, writeFileSync } from "node:fs";

const DIR = new URL("../video/ep01-kids/", import.meta.url);
const API = "https://api.elevenlabs.io/v1";
const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set.");
const ids = process.argv.slice(2);
if (ids.length === 0) throw new Error("Pass the line ids to generate, e.g. finale");

const { voice, settings, lines } = JSON.parse(readFileSync(new URL("vo-lines.json", DIR), "utf8"));
for (const id of ids) {
  const line = lines.find((l) => l.id === id);
  if (!line) throw new Error(`No line "${id}" in vo-lines.json`);
  const res = await fetch(`${API}/text-to-speech/${voice}?output_format=${OUTPUT_FORMAT}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: line.text, model_id: MODEL_ID, voice_settings: settings }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status} for "${id}": ${(await res.text()).slice(0, 200)}`);
  writeFileSync(new URL(`assets/vo/${id}.mp3`, DIR), Buffer.from(await res.arrayBuffer()));
  console.log(`assets/vo/${id}.mp3 written`);
}
