import { test } from "node:test";
import assert from "node:assert/strict";
import { morphAt } from "../js/ui/particles.js";
import { pointerGlow } from "../js/ui/hover.js";

test("the hero particles swirl, form the question mark, hold it, then burst back", () => {
  assert.deepEqual(morphAt(4000), { morph: 0, burst: 0 });
  assert.ok(morphAt(9000).morph > 0 && morphAt(9000).morph < 1);
  assert.deepEqual(morphAt(11000), { morph: 1, burst: 0 });
  const burst = morphAt(12900);
  assert.ok(burst.burst > 0.9 && burst.morph < 1);
  assert.deepEqual(morphAt(13500), { morph: 0, burst: 0 });
  assert.deepEqual(morphAt(14000 + 11000), morphAt(11000), "the cycle repeats every 14 s");
});

test("a card glows where the pointer is and leans toward it, by at most the given angle", () => {
  const box = { left: 100, top: 50, width: 200, height: 100 };
  assert.deepEqual(pointerGlow(box, 200, 100, 6), { x: 50, y: 50, tiltX: 0, tiltY: 0 });
  assert.deepEqual(pointerGlow(box, 300, 50, 6), { x: 100, y: 0, tiltX: 6, tiltY: 6 });
  assert.deepEqual(pointerGlow(box, 100, 150, 6), { x: 0, y: 100, tiltX: -6, tiltY: -6 });
  assert.deepEqual(pointerGlow(box, 900, -400, 6), { x: 100, y: 0, tiltX: 6, tiltY: 6 }, "a pointer outside the card is clamped to its edge");
});
