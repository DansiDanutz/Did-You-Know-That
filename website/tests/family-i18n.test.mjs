import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { FAMILY_VOICE_LANGS, FAMILY_VOICE_BASE, FAMILY_VOICE_VERSION, PACK_EN, UI_EN, LINES, CHALLENGES, STORYBOOK, loadFamilyPack, familyVoicePath } from "../js/data/family-episode.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// The clips live in the public Blob store; tools/upload-family-voice.mjs records what it uploaded here.
const MANIFEST = JSON.parse(readFileSync(join(ROOT, "assets/voice/family-voice-manifest.json"), "utf8"));
const clipIds = (pack) => [
  ...Object.keys(pack.lines),
  ...pack.challenges.flatMap((c) => [`${c.id}-prompt`, `${c.id}-right`, `${c.id}-wrong`]),
  ...pack.story.scenes.map((sc) => `story-${sc.id}`),
];
const placeholders = (text) => (String(text).match(/\{\w+\}/g) ?? []).sort().join();

test("the six translated languages are exactly de, es, fr, it, ro, zh", () => {
  assert.deepEqual([...FAMILY_VOICE_LANGS], ["de", "es", "fr", "it", "ro", "zh"]);
});

for (const lang of FAMILY_VOICE_LANGS) {
  test(`${lang}: translates every line, challenge, story scene and UI string`, async () => {
    const pack = await loadFamilyPack(lang);
    assert.equal(pack.lang, lang);
    for (const id of Object.keys(LINES)) assert.notEqual(pack.lines[id], LINES[id], `${lang} line ${id} is still English`);
    pack.challenges.forEach((c, i) => {
      const en = CHALLENGES[i];
      for (const key of ["title", "prompt", "right", "wrong"]) assert.notEqual(c[key], en[key], `${lang} ${c.id}.${key} is still English`);
      c.options.forEach((o, j) => {
        assert.notEqual(o.label, en.options[j].label, `${lang} ${c.id}/${o.id} label is still English`);
        assert.equal(o.correct, en.options[j].correct, "the right answer must not change");
      });
    });
    pack.story.scenes.forEach((sc, i) => {
      assert.notEqual(sc.text, STORYBOOK.scenes[i].text, `${lang} scene ${sc.id} is still English`);
      assert.notEqual(sc.heading, STORYBOOK.scenes[i].heading);
    });
    assert.deepEqual(Object.keys(pack.ui).sort(), Object.keys(UI_EN).sort());
    for (const key of Object.keys(UI_EN)) {
      assert.ok(String(pack.ui[key]).trim().length > 0, `${lang} ui.${key} is empty`);
      assert.equal(placeholders(pack.ui[key]), placeholders(UI_EN[key]), `${lang} ui.${key} placeholders differ`);
    }
  });

  test(`${lang}: every clip of the pack is in the voice manifest, and nothing else`, async () => {
    const ids = clipIds(await loadFamilyPack(lang)).sort();
    const uploaded = Object.keys(MANIFEST.clips[lang] ?? {}).sort();
    assert.deepEqual(uploaded, ids, `${lang}: manifest and pack differ; record and upload the missing clips`);
    for (const id of ids) assert.ok(MANIFEST.clips[lang][id].bytes > 10000, `${lang}/${id} looks truncated`);
  });
}
test("English clip ids are the same set as every other language", async () => {
  const en = clipIds(PACK_EN).sort();
  for (const lang of FAMILY_VOICE_LANGS) assert.deepEqual(clipIds(await loadFamilyPack(lang)).sort(), en);
});

test("an unknown language falls back to English", async () => {
  assert.equal((await loadFamilyPack("xx")).lang, "en");
  assert.equal((await loadFamilyPack("en")).lang, "en");
});

test("the English pack keeps showing the child's name, other languages do not", async () => {
  assert.match(PACK_EN.named("Maya")["world-1"], /Maya/);
  assert.equal((await loadFamilyPack("de")).named, null);
});

test("clips are served from the versioned Blob store, not from the repo", () => {
  assert.equal(MANIFEST.version, FAMILY_VOICE_VERSION);
  assert.equal(MANIFEST.base, FAMILY_VOICE_BASE);
  assert.match(familyVoicePath("de", "intro-1"), /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/family\/v\d+\/de\/intro-1\.mp3$/);
  assert.equal(familyVoicePath("zh", "story-morning"), `${FAMILY_VOICE_BASE}/zh/story-morning.mp3`);
});
