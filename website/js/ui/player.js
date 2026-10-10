// Lite YouTube facade: no iframe, cookie or request to YouTube until the visitor presses play.
export function init() {
  for (const facade of document.querySelectorAll("[data-facade]")) {
    const button = facade.querySelector("[data-play]");
    button?.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = `${facade.dataset.embed}?autoplay=1&rel=0&modestbranding=1`;
      iframe.title = `Did You Know That? — ${facade.dataset.title}`;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      facade.replaceChildren(iframe);
      iframe.focus();
    }, { once: true });
  }
}
