// The voice-over: ONE <audio preload="none"> created on first use, played in sync with the YouTube
// video only while the viewer has muted the English (see js/lib/dub-sync.js for the rules and the
// "audio time = video time" timing note). `onBlocked(true|false)` reports a refused autoplay so the page
// can offer a "Tap to hear the voice-over" button; `resume()` is that button's user-gesture play().
import { decideSync } from "../lib/dub-sync.js";

const HAVE_CURRENT_DATA = 2;

export function createDub({ createAudio = () => new Audio(), onBlocked = () => {} } = {}) {
  let audio = null;
  let source = "";
  let previous = null; // { time, at } of the previous sync, for jump detection
  let blocked = false; // the browser refused play(): wait for the viewer's tap instead of retrying every tick

  const setBlocked = (value) => {
    if (value === blocked) return;
    blocked = value;
    onBlocked(value);
  };

  const element = () => {
    if (!audio) {
      audio = createAudio();
      audio.preload = "none";
    }
    return audio;
  };

  const tryPlay = () => {
    const attempt = audio.play();
    if (attempt && typeof attempt.then === "function") {
      attempt.then(() => setBlocked(false), () => setBlocked(true));
    }
  };

  const apply = (action) => {
    if (action.type === "seek") audio.currentTime = action.to;
    else if (action.type === "rate") audio.playbackRate = action.to;
    else if (action.type === "pause") audio.pause();
    else if (action.type === "play" && !blocked) tryPlay();
  };

  return {
    /** Use this audio file (null → none). The element is created only when there is a file. */
    setSource(url) {
      if (!url) return this.stop();
      const el = element();
      if (url === source) return;
      source = url;
      previous = null;
      el.src = url;
    },
    /** One tick: `ytState` and `ytTime` from the player; wantAudio = muted and this language has audio. */
    sync({ ytState, ytTime, wantAudio, now }) {
      if (!audio || !source) return;
      const elapsed = previous ? (now - previous.at) / 1000 : 0;
      const actions = decideSync({
        ytState, ytTime, wantAudio, hasAudio: true,
        audioTime: audio.currentTime, audioPaused: audio.paused, playbackRate: audio.playbackRate,
        audioReady: audio.readyState >= HAVE_CURRENT_DATA,
        prevYtTime: previous ? previous.time : null, elapsed,
      });
      previous = { time: ytTime, at: now };
      actions.forEach(apply);
    },
    /** The tap button: play from a user gesture, already at the right time. */
    resume(ytTime) {
      if (!audio || !source) return;
      audio.currentTime = ytTime;
      setBlocked(false);
      tryPlay();
    },
    /** Stop and release the file (language change, unmute, English). */
    stop() {
      previous = null;
      setBlocked(false);
      if (!audio) return;
      audio.pause();
      audio.playbackRate = 1;
      if (source) {
        audio.removeAttribute("src");
        audio.load();
      }
      source = "";
    },
  };
}
