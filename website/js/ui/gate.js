// The listening gate: a modal YouTube player that only counts seconds that
// were actually played. When enough of the story was heard, the seal breaks.

import { recordTime, watchRatio, hasWatchedEnough } from "../lib/watch-tracker.js";

const API_SRC = "https://www.youtube.com/iframe_api";
const POLL_MS = 250;
let apiReady = null;

function loadYouTubeApi() {
  if (apiReady) return apiReady;
  apiReady = new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = API_SRC;
    script.onerror = () => {
      apiReady = null;
      reject(new Error("YouTube player could not load"));
    };
    document.head.appendChild(script);
  });
  return apiReady;
}

// Watched seconds survive closing the modal for the rest of the session.
const watchedByStory = new Map();

export function storyWatchRatio(story, durationHint = 0) {
  const entry = watchedByStory.get(story.id);
  return entry ? watchRatio(entry.watched, entry.duration || durationHint) : 0;
}

// `left` is { n, max } videos left today (shown under the player).
export function openListening(overlay, story, { channelUrl, t, left, onProgress, onUnlocked }) {
  if (!story.youtubeId) {
    window.open(channelUrl, "_blank", "noopener");
    return;
  }
  const entry = watchedByStory.get(story.id) ?? { watched: new Set(), duration: 0 };
  watchedByStory.set(story.id, entry);

  const escape = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  overlay.innerHTML = `
    <div class="listen-modal" role="dialog" aria-modal="true" aria-label="${escape(story.title)}">
      <button class="listen-close" data-close aria-label="${t("listen.close")}">✕</button>
      <div class="listen-body">
        <div class="listen-player"><div id="yt-player"></div></div>
        <aside class="listen-mission">
          <b>🔍 ${t("mission.title")}</b>
          <ol>${story.mission.map((item) => `<li>${escape(item)}</li>`).join("")}</ol>
        </aside>
      </div>
      <div class="listen-meter">
        <div class="listen-bar"><span style="width:0%"></span></div>
        <p class="listen-text">${t("listen.help")}</p>
        ${left ? `<p class="listen-left">🎬 ${t("listen.left", left)}</p>` : ""}
      </div>
    </div>`;
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("is-open"));

  const bar = overlay.querySelector(".listen-bar span");
  const text = overlay.querySelector(".listen-text");
  let player = null;
  let timer = 0;

  const close = () => {
    clearInterval(timer);
    player?.destroy?.();
    overlay.classList.remove("is-open");
    overlay.hidden = true;
    overlay.innerHTML = "";
  };
  overlay.querySelector("[data-close]").addEventListener("click", close, { once: true });

  const tick = () => {
    if (!player?.getCurrentTime) return;
    entry.duration = player.getDuration() || entry.duration;
    if (player.getPlayerState() === window.YT.PlayerState.PLAYING) {
      entry.watched = recordTime(entry.watched, player.getCurrentTime());
    }
    const ratio = watchRatio(entry.watched, entry.duration);
    bar.style.width = `${Math.round((ratio / story.requiredWatchRatio) * 100)}%`;
    onProgress?.(ratio);
    if (hasWatchedEnough(ratio, story.requiredWatchRatio)) {
      clearInterval(timer);
      text.textContent = t("listen.done");
      bar.parentElement.classList.add("is-full");
      setTimeout(() => {
        close();
        onUnlocked();
      }, 1400);
    }
  };

  loadYouTubeApi()
    .then((YT) => {
      player = new YT.Player("yt-player", {
        videoId: story.youtubeId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: { onReady: () => (timer = setInterval(tick, POLL_MS)) },
      });
    })
    .catch((error) => {
      console.error(error);
      text.textContent = t("listen.error");
    });
}
