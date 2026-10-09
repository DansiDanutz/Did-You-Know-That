import { test } from "node:test";
import assert from "node:assert/strict";

import { kidNickname, KID_ADJECTIVES, KID_NOUNS } from "../js/lib/kid-names.js";
import { validateNickname } from "../js/lib/points.js";

test("kid nicknames are built only from the safe word lists plus a number", () => {
  assert.equal(kidNickname(() => 0), `${KID_ADJECTIVES[0]} ${KID_NOUNS[0]} 10`);
  assert.equal(kidNickname(() => 0.999), `${KID_ADJECTIVES.at(-1)} ${KID_NOUNS.at(-1)} 99`);
});

test("every possible kid nickname passes the leaderboard rules", () => {
  KID_ADJECTIVES.forEach((adj) =>
    KID_NOUNS.forEach((noun) => assert.equal(validateNickname(`${adj} ${noun} 99`).ok, true, `${adj} ${noun}`)),
  );
});
