import { test } from "node:test";
import assert from "node:assert/strict";
import { challengeLink, parseChallenge, challengeResult, shareText } from "../js/ui/challenge.js";

test("a challenge link carries the sender's locked guess and opens the friend on the guess step", () => {
  assert.equal(challengeLink("https://dexty.live", "/episodes/weight/", 2), "https://dexty.live/episodes/weight/?vs=2#guess");
});

test("a challenge is read from ?vs= only when it is a valid option index", () => {
  assert.equal(parseChallenge("?vs=1", 3), 1);
  assert.equal(parseChallenge("?utm=x&vs=0", 3), 0);
  assert.equal(parseChallenge("?vs=3", 3), null, "past the options");
  assert.equal(parseChallenge("?vs=-1", 3), null);
  assert.equal(parseChallenge("?vs=1.5", 3), null);
  assert.equal(parseChallenge("?vs=abc", 3), null);
  assert.equal(parseChallenge("", 3), null);
});

test("after the friend locks a guess, they see whether they matched the sender", () => {
  const options = ["Same amount", "A few more", "About 500 more"];
  assert.equal(challengeResult(2, 2, options), "You picked the same answer as your friend. Watch to see if you’re both right.");
  assert.equal(challengeResult(0, 2, options), "Your friend picked “About 500 more”. Only one of you can be right — watch to find out.");
});

test("the share text names the episode and never gives away the answer", () => {
  const text = shareText("Weight");
  assert.equal(text, "I locked my guess for “Weight” on Did You Know That? Lock yours and see if we match.");
});
