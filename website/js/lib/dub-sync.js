// Keeps the voice-over <audio> in step with the YouTube player. Pure: decideSync() looks at one
// snapshot and returns what to do; js/ui/player-dub.js applies it every tick.
//
// Timing: the dub file is produced against the English master timeline, so audio.currentTime equals
// the YouTube video time (offset 0). No offset is ever added.

export const YT_PLAYING = 1;
/** Drift (seconds) beyond which the audio is re-seeked to the video. */
export const SEEK_DRIFT_S = 0.35;
/** Drift (seconds) from which the audio speed is nudged to catch up instead of seeking. */
export const NUDGE_DRIFT_S = 0.08;
/** Largest speed change used for a nudge (3 %). */
export const MAX_RATE_NUDGE = 0.03;
/** How strongly the speed reacts to drift (speed change per second of drift) before the cap. */
export const RATE_GAIN = 0.1;
/** A video-time step bigger than this beyond normal playback counts as the viewer seeking. */
export const JUMP_S = 1.5;
/** The message cadence of the player is ~250 ms; never extrapolate further than this past the last one. */
export const MAX_EXTRAPOLATION_S = 1;
const RATE_EPSILON = 0.0005;

/** The video time right now: the last reported time advanced by the clock while playing (capped). */
export function estimateTime({ time, at, playing }, now) {
  if (!playing) return time;
  return time + Math.min(Math.max((now - at) / 1000, 0), MAX_EXTRAPOLATION_S);
}

/**
 * What to do with the audio for this snapshot.
 *   ytState        YouTube player state (1 playing; -1 unstarted, 0 ended, 2 paused, 3 buffering, 5 cued)
 *   ytTime         video time in seconds (extrapolated, see estimateTime)
 *   audioTime / audioPaused   the <audio> element's state
 *   wantAudio      the viewer muted the English and this language has a voice-over
 *   hasAudio       an audio source is loaded for the language
 *   prevYtTime / elapsed      the previous snapshot's video time and the seconds since it (jump detection)
 *   playbackRate   the audio's current speed (default 1)
 *   audioReady     false while the audio has no data yet: wait for it rather than seeking again
 * Returns actions in order: { type: "pause" | "play" } | { type: "seek" | "rate", to }.
 */
export function decideSync({
  ytState, ytTime, audioTime, audioPaused, wantAudio, hasAudio,
  prevYtTime = null, elapsed = 0, playbackRate = 1, audioReady = true,
}) {
  const actions = [];
  const speed = (to) => {
    if (Math.abs(playbackRate - to) > RATE_EPSILON) actions.push({ type: "rate", to });
  };
  if (!wantAudio || !hasAudio || ytState !== YT_PLAYING) {
    if (!audioPaused) actions.push({ type: "pause" });
    speed(1);
    return actions;
  }
  const signed = audioTime - ytTime;
  const drift = Math.abs(signed);
  const jumped = prevYtTime !== null && Math.abs(ytTime - (prevYtTime + elapsed)) > JUMP_S;
  if (jumped || drift > SEEK_DRIFT_S) {
    if (audioReady || audioPaused || jumped) actions.push({ type: "seek", to: ytTime });
    speed(1);
  } else if (drift >= NUDGE_DRIFT_S) {
    const nudge = Math.min(drift * RATE_GAIN, MAX_RATE_NUDGE);
    speed(1 + (signed > 0 ? -nudge : nudge)); // audio ahead → slow down; behind → speed up
  } else {
    speed(1);
  }
  if (audioPaused) actions.push({ type: "play" });
  return actions;
}
