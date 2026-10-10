#!/usr/bin/env node
// Uploads the book narration (assets/narration/<lang>/<audience>/<story>/<voice>/<key>.mp3)
// to the public Vercel Blob store that serves it (narrationUrl in js/lib/narration.js)
// and writes assets/narration/store-manifest.json (bytes + sha256 per recording) so tests
// can check that every recording the site may play has been uploaded.
//   BLOB_READ_WRITE_TOKEN=… node tools/upload-narration.mjs [--from=<dir>] [--dry-run]
// <dir> holds assets/narration/… (default .narration-out, where make-narration.mjs
// writes). Recordings already in the store with the same size are skipped.
// Re-recorded clips need a new NARRATION_VERSION (clips are cached for a year),
// then a full upload of that version.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { NARRATION_PREFIX, NARRATION_VERSION, narrationUrl } from "../js/lib/narration.js";
import { VOICE_STORE_ORIGIN } from "../js/lib/voice-store.js";
import { remoteSize, putBlob, mapPool } from "./lib/blob-store.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STORE_MANIFEST = join(ROOT, "assets/narration/store-manifest.json");
const CONCURRENCY = 6;
const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const from = resolve(args.find((a) => a.startsWith("--from="))?.slice(7) ?? join(ROOT, ".narration-out"));
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token && !dry) throw new Error("BLOB_READ_WRITE_TOKEN is not set.");

// Every recording on disk, as its logical path (assets/narration/…); audition samples are not served.
async function listRecordings(dir) {
  const entries = await readdir(join(from, dir), { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(entries.map((e) => (e.isDirectory() ? (e.name === "_samples" ? [] : listRecordings(`${dir}/${e.name}`)) : e.name.endsWith(".mp3") ? [`${dir}/${e.name}`] : [])));
  return nested.flat();
}
const paths = (await listRecordings(NARRATION_PREFIX.replace(/\/$/, ""))).sort();
if (!paths.length) throw new Error(`No recordings found under ${join(from, NARRATION_PREFIX)}`);

async function upload(path) {
  const body = await readFile(join(from, path));
  const url = narrationUrl(path);
  const sha256 = createHash("sha256").update(body).digest("hex");
  if ((await remoteSize(url)) === body.length) return { path, bytes: body.length, sha256, skipped: true };
  if (!dry) await putBlob({ token, pathname: url.slice(VOICE_STORE_ORIGIN.length + 1), body });
  return { path, bytes: body.length, sha256, skipped: false };
}

const results = await mapPool(paths, CONCURRENCY, upload, (done, total) => process.stdout.write(`\r${done}/${total}`));
console.log("");

const previous = JSON.parse(await readFile(STORE_MANIFEST, "utf8").catch(() => "{}"));
const clips = { ...(previous.clips ?? {}) };
for (const r of results) clips[r.path] = { bytes: r.bytes, sha256: r.sha256 };
const sorted = Object.fromEntries(Object.keys(clips).sort().map((path) => [path, clips[path]]));
if (!dry) await writeFile(STORE_MANIFEST, JSON.stringify({ version: NARRATION_VERSION, origin: VOICE_STORE_ORIGIN, clips: sorted }, null, 1) + "\n");
const uploaded = results.filter((r) => !r.skipped).length;
console.log(`${results.length} recordings · ${uploaded} ${dry ? "would be uploaded" : "uploaded"} · ${results.length - uploaded} already in the store · ${(results.reduce((n, r) => n + r.bytes, 0) / 1e6).toFixed(1)} MB`);
