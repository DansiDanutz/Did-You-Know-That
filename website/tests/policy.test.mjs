// Policy: never reward watching (YouTube fake-engagement rules). No code path may award points,
// cards or progress for "I watched it", for playing the video, or for any other player interaction.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderSite } from "../tools/build-site.mjs";

const SITE_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFileSync(join(SITE_ROOT, path), "utf8");
const jsFiles = (dir) => readdirSync(join(SITE_ROOT, dir)).filter((f) => f.endsWith(".js")).map((f) => `${dir}/${f}`);
const ALL_JS = [...jsFiles("js"), ...jsFiles("js/lib"), ...jsFiles("js/ui")];
const AWARDING = /\b(award|answerQuestion|lockGuess|saveProgress)\b/;

test("only the quiz, collection, profile and vault widgets touch progress; only the quiz awards", () => {
  const touching = ALL_JS.filter((path) => !path.startsWith("js/lib/") && AWARDING.test(read(path))).sort();
  assert.deepEqual(touching, ["js/ui/collection.js", "js/ui/profile.js", "js/ui/quiz.js", "js/ui/vault.js"]);
  const vault = read("js/ui/vault.js");
  assert.doesNotMatch(vault, /\baward\(|answerQuestion|lockGuess/, "the vault only spends, never awards");
  assert.doesNotMatch(read("js/lib/vault.js"), /\baward\(/, "vault logic only spends");
  const awarding = ALL_JS.filter((path) => !path.startsWith("js/lib/") && /\banswerQuestion\(/.test(read(path)));
  assert.deepEqual(awarding, ["js/ui/quiz.js"]);
});

test("the video player never imports progress or the ledger", () => {
  const player = read("js/ui/player.js");
  assert.doesNotMatch(player, /progress|ledger|saveProgress|award/);
});

test("quiz awards are triggered by a submitted answer, never by the player, play buttons or watch links", () => {
  const quiz = read("js/ui/quiz.js");
  assert.doesNotMatch(quiz, /data-facade|data-play|#player|youtube|ended|timeupdate|visibilitychange/i);
  const calls = [...quiz.matchAll(/answerQuestion\(/g)];
  assert.equal(calls.length, 1, "exactly one award path");
  const submitHandler = quiz.slice(quiz.indexOf('form.addEventListener("submit"', quiz.indexOf("createRunner")));
  assert.ok(submitHandler.indexOf("answerQuestion(") > 0 && submitHandler.indexOf("answerQuestion(") < submitHandler.indexOf("});"), "called inside the answer form's submit handler");
});

test("the ledger has no watch, view or engagement award types", () => {
  const ledger = read("js/lib/ledger.js");
  const points = ledger.slice(ledger.indexOf("POINTS = Object.freeze("), ledger.indexOf("});", ledger.indexOf("POINTS = Object.freeze(")));
  assert.doesNotMatch(points, /watch|view|play|click|like|subscribe|comment|share/i);
});

test("no page offers an 'I watched it' reveal any more", () => {
  const files = renderSite(JSON.parse(read("data/episodes.json")));
  for (const [path, contents] of Object.entries(files)) {
    assert.doesNotMatch(contents, /I watched it|data-reveal\b/i, path);
  }
  for (const path of ALL_JS) assert.doesNotMatch(read(path), /revealAnswer|data-reveal\b/, path);
});
