// Page shell shared by every generated page: <head>, header, footer.
import { html, raw, jsonLd } from "./html.mjs";
import { SITE, SUBSCRIBE_URL, HANDLE_URL, absolute } from "./site.mjs";
import { icon } from "./components.mjs";
import { newsletterBlock, newsletterPrivacy, resolveNewsletter } from "./newsletter.mjs";

const FONT_PRELOADS = ["montserrat-latin-900-normal", "inter-latin-400-normal"];
const NAV = [
  ["/#featured", "Watch"],
  ["/#series", "Episodes"],
  ["/#map", "Subjects"],
  ["/collection/", "Collection"],
  ["/vault/", "Vault"],
  ["/#about", "About"],
];

function head({ title, description, path, ogType = "website", image = SITE.ogImage, noindex = false, structuredData = [], preloads = [] }) {
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
`)}${preloads.map((p) => html`<link rel="preload" as="image" type="${p.type}" imagesrcset="${p.srcset}" imagesizes="${p.sizes}" media="${p.media}" fetchpriority="high">
`)}<link rel="stylesheet" href="/css/site.css">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/assets/icons/icon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Dexty">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
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
      <span class="rank-count" data-rank-count hidden></span>
    </a>
    <button class="profile-btn" type="button" data-profile-open aria-haspopup="dialog" aria-controls="profile-sheet" hidden><span class="profile-dot" aria-hidden="true"></span><span class="profile-label" data-profile-label>Sign in</span><span class="wallet-chip" data-wallet hidden><span data-wallet-points>0</span> pts</span></button>
    <a class="btn btn-sub btn-small" href="${SUBSCRIBE_URL}" rel="noopener">${icon("youtube")}<span>Subscribe</span></a>
  </div>
</header>`;
}

/** The local sign-in sheet (js/ui/profile.js). Nothing here leaves the browser. */
const profileSheet = (newsletter) => html`<dialog class="sheet" id="profile-sheet" aria-labelledby="profile-title" data-profile-sheet>
  <div class="sheet-head">
    <h2 class="sheet-title" id="profile-title" data-profile-title>Sign in on this device</h2>
    <button class="sheet-close" type="button" data-profile-close aria-label="Close">×</button>
  </div>
  <form class="profile-form" data-profile-form novalidate>
    <p class="sheet-lede">No account, no email, no password. Your profile, guesses, cards and points stay in this browser.</p>
    <fieldset class="aud-grid">
      <legend class="sheet-label">Who is playing?</legend>
      <label class="aud-option"><input type="radio" name="audience" value="kids"><span><strong>Kids</strong><small>Ages 6–12 · pick an explorer name</small></span></label>
      <label class="aud-option"><input type="radio" name="audience" value="adults"><span><strong>Teens &amp; Adults</strong><small>A first name or nickname</small></span></label>
    </fieldset>
    <div class="kid-name" data-kid-panel hidden>
      <p class="sheet-label" id="kid-name-label">Your explorer name</p>
      <p class="kid-name-value" data-kid-name aria-labelledby="kid-name-label" aria-live="polite"></p>
      <button class="btn btn-ghost btn-small" type="button" data-kid-shuffle>Shuffle</button>
    </div>
    <div data-adult-panel hidden>
      <label class="sheet-label" for="profile-name">What should we call you?</label>
      <input class="nl-input profile-input" id="profile-name" name="name" type="text" maxlength="20" autocomplete="nickname" autocapitalize="words" spellcheck="false" placeholder="First name or nickname" aria-describedby="profile-name-note">
      <p class="sheet-note" id="profile-name-note">It stays on this device. We never send it anywhere.</p>
    </div>
    <p class="sheet-error" role="alert" data-profile-error></p>
    <p class="cta-row"><button class="btn btn-primary" type="submit">Sign in</button><button class="btn btn-ghost" type="button" data-profile-close>Not now</button></p>
  </form>
  <div class="profile-card" data-profile-card hidden>
    <p class="sheet-lede"><span data-profile-audience></span> · profile on this device</p>
    <dl class="profile-stats">
      <div><dt>Points</dt><dd data-profile-points>0</dd></div>
      <div><dt>Rank</dt><dd data-profile-rank>Curious</dd></div>
      <div><dt>Cards</dt><dd data-profile-cards>0</dd></div>
      <div><dt>Guesses</dt><dd data-profile-guesses>0</dd></div>
    </dl>
    <p class="profile-notify">${icon("bulb")}<span><a href="#nl-title-footer" data-profile-close>Notify me about new episodes</a> — ${newsletter.provider ? "by email, with the newsletter." : "by email, once the newsletter launches (soon)."}</span></p>
    <p class="cta-row"><a class="btn btn-primary btn-small" href="/collection/">Your collection</a><a class="btn btn-ghost btn-small" href="/vault/">Card Vault</a><button class="btn btn-ghost btn-small" type="button" data-profile-edit>Change name</button><button class="btn btn-ghost btn-small" type="button" data-profile-signout>Sign out</button></p>
    <p class="sheet-note">Signing out keeps your cards and points on this device. “Forget my progress” on the collection page clears them.</p>
  </div>
</dialog>`;

/** "Install the app" suggestion (js/ui/install.js); shown only where the browser can install. */
const installBar = () => html`<aside class="install-bar" data-install hidden aria-labelledby="install-title">
  <img src="/assets/icons/icon-192.png" width="44" height="44" alt="" loading="lazy">
  <div class="install-copy"><p class="install-title" id="install-title">Install the app</p><p class="install-text" data-install-text>Dexty on your home screen — full screen, works offline.</p></div>
  <button class="btn btn-primary btn-small" type="button" data-install-go hidden>Install</button>
  <button class="install-close" type="button" data-install-dismiss aria-label="Dismiss the install suggestion">×</button>
</aside>`;

function footer(newsletter) {
  return html`<footer class="site-footer">
  <div class="wrap">${newsletterBlock(newsletter, { id: "footer", className: "newsletter-footer" })}</div>
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
    <section class="privacy" id="privacy" aria-labelledby="privacy-title">
      <h2 class="privacy-title" id="privacy-title">Privacy</h2>
      <p><strong>On this site.</strong> No accounts, no cookies, no analytics. Your guesses, quiz answers, cards and points stay in this browser’s local storage — “Forget my progress” on the collection page clears them. Signing in creates a local profile — a random id, who is playing and a nickname — stored only in this browser; there are no server accounts. The installable app keeps a copy of the site’s own files in your browser’s cache so it opens offline. Episode artwork is hosted here; the YouTube player (youtube-nocookie.com) loads only after you press play, and YouTube’s privacy policy applies from then on.</p>
      ${newsletterPrivacy(newsletter)}
    </section>
  </div>
  <p class="wrap footer-legal">© Did You Know That? · ${SITE.handle}</p>
</footer>`;
}

/** A complete HTML document. */
export function page({ main, currentPath = "", newsletter = resolveNewsletter(null), ...meta }) {
  return `<!doctype html>
<html lang="en">
${head(meta)}
<body>
${header(currentPath)}
<main id="main" tabindex="-1">
${main}
</main>
${footer(newsletter)}
${profileSheet(newsletter)}
${installBar()}
</body>
</html>
`;
}
