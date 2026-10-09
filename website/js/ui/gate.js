// The in-app video player: YouTube's own embedded player inside a modal, so
// people watch without leaving the game (plays started here count as YouTube
// views). Nothing about the viewing is measured or rewarded: YouTube's API
// policy forbids incentives for views. Cards are won by learning instead.

const API_SRC = "https://www.youtube.com/iframe_api";
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

const escape = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// The video always plays inside the game, in YouTube's own embedded player
// (plays started there count as YouTube views). Before an episode is
// published the same modal shows a "coming soon" card with a channel link.
function modalMarkup(story, { t, left, replay, channelUrl }) {
  const screen = story.youtubeId
    ? `<div class="listen-player"><div id="yt-player"></div></div>`
    : `<div class="listen-player listen-soon"><p>${t("listen.soon")}</p>
         <a class="btn-gold" href="${escape(channelUrl)}" target="_blank" rel="noopener">${t("gate.channel")}</a></div>`;
  const note = `<p class="listen-text">${t(replay ? "listen.replay" : "listen.help")}</p>`;
  return `
    <div class="listen-modal" role="dialog" aria-modal="true" aria-label="${escape(story.title)}">
      <button class="listen-close" data-close aria-label="${t("listen.close")}">✕</button>
      <div class="listen-body">
        ${screen}
        <aside class="listen-mission">
          <b>🔍 ${t("mission.title")}</b>
          <ol>${story.mission.map((item) => `<li>${escape(item)}</li>`).join("")}</ol>
        </aside>
      </div>
      <div class="listen-meter">
        ${story.youtubeId ? note : ""}
        ${left && story.youtubeId ? `<p class="listen-left">🎬 ${t("listen.left", left)}</p>` : ""}
      </div>
    </div>`;
}

// `left` is { n, max } videos left today (shown under the player).
// `replay` marks a story played again from the library.
export function openListening(overlay, story, { channelUrl, t, left, replay = false }) {
  overlay.innerHTML = modalMarkup(story, { t, left, replay, channelUrl });
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("is-open"));

  let player = null;
  const close = () => {
    player?.destroy?.();
    overlay.classList.remove("is-open");
    overlay.hidden = true;
    overlay.innerHTML = "";
  };
  overlay.querySelector("[data-close]").addEventListener("click", close, { once: true });
  if (!story.youtubeId) return;

  loadYouTubeApi()
    .then((YT) => {
      player = new YT.Player("yt-player", {
        videoId: story.youtubeId,
        playerVars: { rel: 0, playsinline: 1, fs: 1 },
      });
    })
    .catch((error) => {
      console.error(error);
      overlay.querySelector(".listen-text").textContent = t("listen.error");
    });
}
