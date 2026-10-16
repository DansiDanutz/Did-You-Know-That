import { test } from "node:test";
import assert from "node:assert/strict";

import {
  decideSync, estimateTime, SEEK_DRIFT_S, NUDGE_DRIFT_S, MAX_RATE_NUDGE, JUMP_S, MAX_EXTRAPOLATION_S, YT_PLAYING,
} from "../js/lib/dub-sync.js";

const playing = { ytState: YT_PLAYING, ytTime: 10, audioTime: 10, audioPaused: false, wantAudio: true, hasAudio: true };
const decide = (overrides) => decideSync({ ...playing, ...overrides });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

test("named thresholds match the spec", () => {
  assert.equal(SEEK_DRIFT_S, 0.35);
  assert.equal(NUDGE_DRIFT_S, 0.08);
  assert.equal(MAX_RATE_NUDGE, 0.03);
  assert.equal(JUMP_S, 1.5);
});

test("in sync and playing: nothing to do", () => {
  assert.deepEqual(decide({}), []);
  assert.deepEqual(decide({ audioTime: 10.05 }), [], "inside 0.08 s");
});

test("audio only plays while the YouTube player is PLAYING and wantAudio is set", () => {
  assert.deepEqual(decide({ audioPaused: true }), [{ type: "play" }], "all conditions met → start");
  assert.deepEqual(decide({ audioPaused: true, wantAudio: false }), [], "paused and not wanted → stay paused");
  assert.deepEqual(decide({ audioPaused: true, hasAudio: false }), [], "no audio for this language → nothing");
});

test("unwanted audio is paused, whatever the video does", () => {
  assert.deepEqual(decide({ wantAudio: false }), [{ type: "pause" }], "English unmuted");
  assert.deepEqual(decide({ hasAudio: false }), [{ type: "pause" }]);
});

test("the audio pauses when the YouTube state is paused, ended, buffering, unstarted or cued", () => {
  for (const ytState of [2, 0, 3, -1, 5]) {
    assert.deepEqual(decide({ ytState }), [{ type: "pause" }], `state ${ytState}`);
    assert.deepEqual(decide({ ytState, audioPaused: true }), [], `state ${ytState}, already paused`);
  }
});

test("pausing also resets a nudged speed", () => {
  assert.deepEqual(decide({ ytState: 2, playbackRate: 1.02 }), [{ type: "pause" }, { type: "rate", to: 1 }]);
});

test("drift beyond 0.35 s seeks the audio to the video time", () => {
  assert.deepEqual(decide({ audioTime: 10.4 }), [{ type: "seek", to: 10 }], "audio ahead");
  assert.deepEqual(decide({ audioTime: 9.5 }), [{ type: "seek", to: 10 }], "audio behind");
  assert.deepEqual(decide({ audioTime: 10.35 + 1e-6 }), [{ type: "seek", to: 10 }], "just past the limit");
  assert.deepEqual(decide({ audioTime: 10.4, playbackRate: 1.03 }), [{ type: "seek", to: 10 }, { type: "rate", to: 1 }], "and the speed returns to 1");
});

test("a paused audio that is far off is seeked and then played", () => {
  assert.deepEqual(decide({ audioTime: 0, audioPaused: true }), [{ type: "seek", to: 10 }, { type: "play" }]);
});

test("drift 0.08 to 0.35 s nudges the speed by at most 3 %", () => {
  const behind = decide({ audioTime: 9.8 });
  assert.equal(behind.length, 1);
  assert.equal(behind[0].type, "rate");
  near(behind[0].to, 1.02, "behind by 0.2 s: speed up");
  const ahead = decide({ audioTime: 10.2 });
  near(ahead[0].to, 0.98);
  const capped = decide({ audioTime: 9.66 });
  near(capped[0].to, 1.03);
  const cappedAhead = decide({ audioTime: 10.35 });
  near(cappedAhead[0].to, 0.97);
  for (const audioTime of [9.65, 9.7, 9.9, 10.1, 10.3, 10.35]) {
    const [action] = decide({ audioTime });
    assert.ok(Math.abs(action.to - 1) <= MAX_RATE_NUDGE + 1e-9, `${audioTime}: ${action.to}`);
  }
  const edge = decide({ audioTime: 10.08 });
  assert.equal(edge[0].type, "rate", "0.08 s is inside the nudge band");
});

test("a nudge already applied is not repeated; inside 0.08 s the speed resets to 1", () => {
  assert.deepEqual(decide({ audioTime: 9.8, playbackRate: 1.02 }), []);
  assert.deepEqual(decide({ audioTime: 10.03, playbackRate: 1.02 }), [{ type: "rate", to: 1 }]);
  assert.deepEqual(decide({ audioTime: 10, playbackRate: 1 }), []);
});

test("a video time jump bigger than 1.5 s counts as a seek and re-syncs at once", () => {
  // The viewer dragged the YouTube scrubber from 10 s to 30 s; the audio is still near 10 s.
  assert.deepEqual(decide({ ytTime: 30, audioTime: 10.1, prevYtTime: 10, elapsed: 0.1 }), [{ type: "seek", to: 30 }]);
  // Normal playback: 0.1 s passed and the video advanced by about 0.1 s → no jump.
  assert.deepEqual(decide({ ytTime: 10.1, audioTime: 10.1, prevYtTime: 10, elapsed: 0.1 }), []);
  // Jumping backwards is a seek too.
  assert.deepEqual(decide({ ytTime: 2, audioTime: 2.2, prevYtTime: 10, elapsed: 0.1 }), [{ type: "seek", to: 2 }]);
  // A jump is re-synced even when the audio happens to be close to the new position's drift limit.
  assert.deepEqual(decide({ ytTime: 12, audioTime: 12.05, prevYtTime: 10, elapsed: 0.1 }), [{ type: "seek", to: 12 }]);
  // First snapshot: nothing to compare with.
  assert.deepEqual(decide({ prevYtTime: null }), []);
});

test("while the audio has no data yet it waits instead of seeking again", () => {
  assert.deepEqual(decide({ audioTime: 0, audioReady: false }), [], "playing but still loading: leave it");
  assert.deepEqual(decide({ audioTime: 0, audioPaused: true, audioReady: false }), [{ type: "seek", to: 10 }, { type: "play" }], "first start");
  assert.deepEqual(decide({ ytTime: 30, audioTime: 0, audioReady: false, prevYtTime: 10, elapsed: 0.1 }), [{ type: "seek", to: 30 }], "a real seek still goes through");
});

test("estimateTime advances the last reported time while playing, capped, and holds it otherwise", () => {
  const last = { time: 20, at: 1000, playing: true };
  near(estimateTime(last, 1100), 20.1);
  near(estimateTime(last, 1250), 20.25);
  near(estimateTime(last, 1000 + 60_000), 20 + MAX_EXTRAPOLATION_S, "never runs away if messages stop");
  near(estimateTime(last, 900), 20, "a clock that went backwards does not rewind the time");
  near(estimateTime({ ...last, playing: false }, 1500), 20);
});
