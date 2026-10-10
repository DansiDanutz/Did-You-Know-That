#!/usr/bin/env node
// Uploads Dexter's House of Family clips to the public Vercel Blob store that
// serves them (see FAMILY_VOICE_BASE in js/data/family-episode.js) and writes
// assets/voice/family-voice-manifest.json (bytes + sha256 per clip) so tests can
// check that every clip of every language pack has been uploaded.
//   BLOB_READ_WRITE_TOKEN=… node tools/upload-family-voice.mjs <clips-dir> [--lang=de,es] [--dry-run]
// <clips-dir> holds <lang>/family/<id>.mp3 (the recorder's output). Clips already
// in the store are skipped. Re-recorded clips need a new FAMILY_VOICE_VERSION
// (clips are cached for a year), then a full upload of that version.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { FAMILY_VOICE_ORIGIN, FAMILY_VOICE_BASE, FAMILY_VOICE_VERSION, FAMILY_VOICE_LANGS, familyVoicePath } from "../js/data/family-episode.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "assets/voice/family-voice-manifest.json");
const API = "https://vercel.com/api/blob/";
const CONCURRENCY = 6;
const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
const dry = args.includes("--dry-run");
const langArg = args.find((a) => a.startsWith("--lang="))?.slice(7);
const langs = langArg ? langArg.split(",") : ["en", ...FAMILY_VOICE_LANGS];
if (!dir) throw new Error("Usage: upload-family-voice.mjs <clips-dir> [--lang=…] [--dry-run]");
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token && !dry) throw new Error("BLOB_READ_WRITE_TOKEN is not set.");

const manifest = JSON.parse(await readFile(MANIFEST, "utf8").catch(() => "{}"));
const entries = [];
for (const lang of langs) {
  const folder = join(resolve(dir), lang, "family");
  for (const file of (await readdir(folder)).filter((f) => f.endsWith(".mp3")).sort()) entries.push({ lang, id: file.slice(0, -4), path: join(folder, file) });
}

const remoteSize = async (url) => {
  const res = await fetch(url, { method: "HEAD" });
  return res.ok ? Number(res.headers.get("content-length")) : null;
};

async function upload({ lang, id, path }) {
  const body = await readFile(path);
  const url = familyVoicePath(lang, id);
  const sha256 = createHash("sha256").update(body).digest("hex");
  if ((await remoteSize(url)) === body.length) return { lang, id, bytes: body.length, sha256, skipped: true };
  if (dry) return { lang, id, bytes: body.length, sha256, skipped: false };
  const pathname = url.slice(FAMILY_VOICE_ORIGIN.length + 1);
  const res = await fetch(`${API}?pathname=${encodeURIComponent(pathname)}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${token}`, "x-api-version": "11", "x-vercel-blob-access": "public", "x-add-random-suffix": "0", "x-allow-overwrite": "1", "x-cache-control-max-age": "31536000", "x-content-type": "audio/mpeg", "x-content-length": String(body.length) },
    body,
  });
  if (!res.ok) throw new Error(`upload ${lang}/${id}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return { lang, id, bytes: body.length, sha256, skipped: false };
}

const results = [];
let next = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (next < entries.length) {
    const entry = entries[next++];
    results.push(await upload(entry));
    process.stdout.write(`\r${results.length}/${entries.length}`);
  }
}));
console.log("");

const clips = { ...(manifest.clips ?? {}) };
for (const r of results) clips[r.lang] = { ...(clips[r.lang] ?? {}), [r.id]: { bytes: r.bytes, sha256: r.sha256 } };
const sorted = Object.fromEntries(Object.keys(clips).sort().map((l) => [l, Object.fromEntries(Object.keys(clips[l]).sort().map((id) => [id, clips[l][id]]))]));
if (!dry) await writeFile(MANIFEST, JSON.stringify({ version: FAMILY_VOICE_VERSION, base: FAMILY_VOICE_BASE, clips: sorted }, null, 2) + "\n");
const uploaded = results.filter((r) => !r.skipped).length;
console.log(`${results.length} clips · ${uploaded} ${dry ? "would be uploaded" : "uploaded"} · ${results.length - uploaded} already in the store · ${(results.reduce((n, r) => n + r.bytes, 0) / 1e6).toFixed(1)} MB`);
