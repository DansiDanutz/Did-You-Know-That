// Page shell shared by every generated page: <head>, header, footer.
import { html, raw, jsonLd } from "./html.mjs";
import { SITE, SUBSCRIBE_URL, HANDLE_URL, absolute } from "./site.mjs";
import { icon } from "./components.mjs";

const FONT_PRELOADS = ["montserrat-latin-900-normal", "inter-latin-400-normal"];
const NAV = [
  ["/#map", "Subjects"],
  ["/#series", "Series"],
  ["/#rule", "The rule"],
  ["/collection/", "Collection"],
  ["/#about", "About"],
];

function head({ title, description, path, ogType = "website", image = SITE.ogImage, noindex = false, structuredData = [] }) {
  const canonical = absolute(path);
  const imageUrl = image.startsWith("http") ? image : absolute(image);
  return html`<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${description}">
${noindex ? raw('<meta name="robots" content="noindex">') : html`<link rel="canonical" href="${canonical}">`}
<meta name="theme-color" content="#060818">
<meta name="color-scheme" content="dark">
${FONT_PRELOADS.map((font) => html`<link rel="preload" href="/fonts/${font}.woff2" as="font" type="font/woff2" crossorigin>
`)}<link rel="stylesheet" href="/css/site.css">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/assets/icons/icon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:image:alt" content="Did You Know That? — neon question-mark light bulb and the channel name on deep navy">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${imageUrl}">
${structuredData.map(jsonLd)}
<script type="module" src="/js/site.js"></script>
</head>`;
}

function header(currentPath) {
  return html`<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">
      <img src="/assets/brand/avatar-192.webp" width="40" height="40" alt="">
      <span class="brand-name">Did You Know That?</span>
    </a>
    <nav class="main-nav" aria-label="Main">
      <ul>
        ${NAV.map(([href, label]) => html`<li><a href="${href}"${href === currentPath ? raw(' aria-current="page"') : ""}>${label}</a></li>`)}
      </ul>
    </nav>
    <a class="rank-badge" href="/collection/" data-rank-badge hidden>
      <span class="rank-dot" aria-hidden="true"></span><span data-rank-name>Curious</span>
      <span class="rank-count" data-rank-count></span>
    </a>
    <a class="btn btn-sub btn-small" href="${SUBSCRIBE_URL}" rel="noopener">${icon("youtube")}<span>Subscribe</span></a>
  </div>
</header>`;
}

function footer() {
  return html`<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      <img src="/assets/brand/avatar-192.webp" width="56" height="56" alt="" loading="lazy">
      <p><strong>Did You Know That?</strong><br>${SITE.signOff}</p>
    </div>
    <nav aria-label="Footer">
      <ul class="footer-links">
        <li><a href="${HANDLE_URL}" rel="noopener">YouTube channel</a></li>
        <li><a href="${SUBSCRIBE_URL}" rel="noopener">Subscribe</a></li>
        <li><a href="/#map">Subjects</a></li>
        <li><a href="/#series">The series</a></li>
        <li><a href="/collection/">Your collection</a></li>
      </ul>
    </nav>
    <p class="privacy" id="privacy"><strong>Privacy.</strong> No accounts, no cookies, no analytics. Your guesses and cards stay in this browser’s local storage — “Forget my progress” on the collection page clears them. Episode artwork is hosted here; the YouTube player (youtube-nocookie.com) loads only after you press play, and YouTube’s privacy policy applies from then on.</p>
  </div>
  <p class="wrap footer-legal">© Did You Know That? · ${SITE.handle}</p>
</footer>`;
}

/** A complete HTML document. */
export function page({ main, currentPath = "", ...meta }) {
  return `<!doctype html>
<html lang="en">
${head(meta)}
<body>
${header(currentPath)}
<main id="main" tabindex="-1">
${main}
</main>
${footer()}
</body>
</html>
`;
}
