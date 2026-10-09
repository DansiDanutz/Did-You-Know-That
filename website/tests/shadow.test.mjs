import { test } from "node:test";
import assert from "node:assert/strict";

import { castShadow, covers } from "../js/lib/shadow.js";

const TREE = { x: 500, height: 200 };

test("the shadow falls on the side away from the light", () => {
  assert.ok(castShadow(TREE, { x: 200, y: 400 }).tip > TREE.x, "light on the left → shadow to the right");
  assert.ok(castShadow(TREE, { x: 800, y: 400 }).tip < TREE.x, "light on the right → shadow to the left");
});

test("a lower light makes a longer shadow; overhead light makes almost none", () => {
  const high = castShadow(TREE, { x: 300, y: 700 }).length;
  const low = castShadow(TREE, { x: 300, y: 260 }).length;
  assert.ok(low > high);
  assert.ok(castShadow(TREE, { x: TREE.x, y: 700 }).length < 1);
});

test("a light at or below the treetop gives a very long shadow, capped to the scene", () => {
  const capped = castShadow(TREE, { x: 300, y: 150 }, { maxLength: 900 });
  assert.equal(capped.length, 900);
});

test("covers() tells whether the shade lies over a blanket", () => {
  const shade = castShadow(TREE, { x: 800, y: 350 }); // shadow to the left
  assert.equal(covers(shade, { from: shade.tip + 10, to: TREE.x - 10 }), true);
  assert.equal(covers(shade, { from: TREE.x + 20, to: TREE.x + 120 }), false);
});
