// Daxter: the channel's smart explorer mascot (round glasses, big ideas). A glowing question-mark lightbulb
// head on a little adventurer body. Limbs are separate groups so CSS can
// animate idle / walk / cheer / knock states (see css/world.css).

export const DAXTER_SVG = `
<svg class="daxter-svg" viewBox="0 0 160 220" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="daxterGlass" cx=".42" cy=".38" r=".65">
      <stop offset="0" stop-color="#fffbe0"/>
      <stop offset=".45" stop-color="#ffe27a"/>
      <stop offset="1" stop-color="#ffb627"/>
    </radialGradient>
    <radialGradient id="daxterHalo" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#ffe27a" stop-opacity=".75"/>
      <stop offset="1" stop-color="#ffe27a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="daxterCoat" cx=".38" cy=".3" r=".85">
      <stop offset="0" stop-color="#9a74ff"/>
      <stop offset=".55" stop-color="#6236e8"/>
      <stop offset="1" stop-color="#341597"/>
    </radialGradient>
    <radialGradient id="daxterIris" cx=".4" cy=".35" r=".7">
      <stop offset="0" stop-color="#7fd0ff"/>
      <stop offset=".6" stop-color="#2a7bd8"/>
      <stop offset="1" stop-color="#123c86"/>
    </radialGradient>
    <linearGradient id="daxterScarf" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ff3fa4"/>
      <stop offset="1" stop-color="#ff8a1f"/>
    </linearGradient>
  </defs>

  <ellipse class="daxter-shadow" cx="80" cy="212" rx="38" ry="7" fill="#000" opacity=".35"/>

  <g class="daxter-body">
    <g class="daxter-leg daxter-leg-back">
      <rect x="62" y="160" width="14" height="36" rx="7" fill="#3a1d99"/>
      <ellipse cx="66" cy="198" rx="14" ry="8" fill="#2a1406"/>
    </g>
    <g class="daxter-arm daxter-arm-back">
      <rect x="40" y="118" width="13" height="40" rx="6.5" fill="#5a33d6"/>
      <circle cx="46" cy="160" r="8" fill="#ffd9b8"/>
    </g>

    <path class="daxter-pack" d="M100 112 h18 a8 8 0 0 1 8 8 v34 a8 8 0 0 1 -8 8 h-18Z" fill="#b8662a"/>
    <path d="M104 122 h20" stroke="#7a3e12" stroke-width="3"/>
    <path class="daxter-coat" d="M52 112 h56 a10 10 0 0 1 10 10 v36 a14 14 0 0 1 -14 14 h-48 a14 14 0 0 1 -14 -14 v-36 a10 10 0 0 1 10 -10Z" fill="url(#daxterCoat)"/>
    <circle cx="80" cy="136" r="3" fill="#ffd44d"/>
    <circle cx="80" cy="150" r="3" fill="#ffd44d"/>

    <g class="daxter-leg daxter-leg-front">
      <rect x="84" y="160" width="14" height="36" rx="7" fill="#4b23c8"/>
      <ellipse cx="94" cy="198" rx="14" ry="8" fill="#3a1d0a"/>
    </g>

    <path class="daxter-scarf" d="M50 108 q30 12 60 0 v10 q-30 12 -60 0Z" fill="url(#daxterScarf)"/>
    <path class="daxter-scarf-tail" d="M58 114 q-18 6 -26 22 l10 4 q6 -14 20 -18Z" fill="#ff5a7a"/>

    <g class="daxter-head">
      <circle class="daxter-halo" cx="80" cy="58" r="62" fill="url(#daxterHalo)"/>
      <rect x="66" y="92" width="28" height="18" rx="4" fill="#9aa3b8"/>
      <path d="M66 98 h28 M66 104 h28" stroke="#6b7388" stroke-width="2.5"/>
      <path d="M80 6 C112 6 128 30 124 56 C120 78 104 84 98 94 H62 C56 84 40 78 36 56 C32 30 48 6 80 6Z" fill="url(#daxterGlass)" stroke="#ffcf4a" stroke-width="2"/>
      <path d="M70 30 c0 -10 22 -12 22 2 c0 10 -12 10 -12 20" stroke="#ff9a1f" stroke-width="5" fill="none" stroke-linecap="round" opacity=".75"/>
      <circle cx="80" cy="60" r="3.2" fill="#ff9a1f" opacity=".75"/>
      <ellipse cx="56" cy="34" rx="8" ry="14" fill="#fff" opacity=".7" transform="rotate(-25 56 34)"/>
      <g class="daxter-brows">
        <path d="M56 48 q9 -7 18 -1" stroke="#7a3e12" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M86 47 q9 -6 18 1" stroke="#7a3e12" stroke-width="4" fill="none" stroke-linecap="round"/>
      </g>
      <g class="daxter-eyes">
        <ellipse cx="65" cy="65" rx="11" ry="13" fill="#fff" stroke="#e8b54a" stroke-width="1.5"/>
        <ellipse cx="95" cy="65" rx="11" ry="13" fill="#fff" stroke="#e8b54a" stroke-width="1.5"/>
        <g class="daxter-pupils">
          <circle cx="67" cy="67" r="8" fill="url(#daxterIris)"/>
          <circle cx="97" cy="67" r="8" fill="url(#daxterIris)"/>
          <circle cx="67" cy="67" r="4" fill="#120a04"/>
          <circle cx="97" cy="67" r="4" fill="#120a04"/>
          <circle cx="70" cy="63" r="2.8" fill="#fff"/>
          <circle cx="100" cy="63" r="2.8" fill="#fff"/>
          <circle cx="64.5" cy="70.5" r="1.3" fill="#fff" opacity=".85"/>
          <circle cx="94.5" cy="70.5" r="1.3" fill="#fff" opacity=".85"/>
        </g>
        <g class="daxter-lids" fill="#ffd968">
          <ellipse cx="65" cy="53" rx="12" ry="1"/>
          <ellipse cx="95" cy="53" rx="12" ry="1"/>
        </g>
      </g>
      <g class="daxter-glasses">
        <circle cx="65" cy="65" r="16" fill="#bfe6ff" fill-opacity=".18" stroke="#2a1406" stroke-width="4"/>
        <circle cx="95" cy="65" r="16" fill="#bfe6ff" fill-opacity=".18" stroke="#2a1406" stroke-width="4"/>
        <path d="M80 62 q0 -5 0 0" stroke="#2a1406" stroke-width="4" fill="none"/>
        <path d="M79 61 h2" stroke="#2a1406" stroke-width="4" stroke-linecap="round"/>
        <path d="M49 62 l-10 -4 M111 62 l10 -4" stroke="#2a1406" stroke-width="4" stroke-linecap="round"/>
        <path d="M56 56 q4 -4 9 -4 M86 56 q4 -4 9 -4" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>
      </g>
      <ellipse cx="50" cy="80" rx="7" ry="4" fill="#ff7a6b" opacity=".5"/>
      <ellipse cx="110" cy="80" rx="7" ry="4" fill="#ff7a6b" opacity=".5"/>
      <path class="daxter-mouth" d="M70 82 q10 11 20 0 q-10 4 -20 0Z" fill="#7a1f12" stroke="#2a1406" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M38 52 C40 30 56 14 76 10" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/>
      <path d="M122 60 C120 74 110 82 102 90" stroke="#ff9a1f" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>
    </g>

    <g class="daxter-arm daxter-arm-front">
      <rect x="106" y="118" width="13" height="40" rx="6.5" fill="#6a40e6"/>
      <circle cx="112" cy="160" r="8" fill="#ffe2c6"/>
    </g>
  </g>
</svg>`;

const STATES = ["idle", "walking", "cheer", "knock"];

export function createDaxter(container) {
  const root = document.createElement("div");
  root.className = "daxter is-idle";
  root.innerHTML = `${DAXTER_SVG}<div class="daxter-bubble" role="status" aria-live="polite"></div>`;
  container.appendChild(root);
  const bubble = root.querySelector(".daxter-bubble");
  let bubbleTimer = 0;

  return {
    el: root,
    setState(state) {
      STATES.forEach((s) => root.classList.toggle(`is-${s}`, s === state));
    },
    face(direction) {
      root.classList.toggle("is-facing-left", direction < 0);
    },
    say(html, ms = 5200) {
      clearTimeout(bubbleTimer);
      bubble.innerHTML = html;
      bubble.classList.add("is-visible");
      if (ms > 0) bubbleTimer = setTimeout(() => bubble.classList.remove("is-visible"), ms);
    },
    hush() {
      clearTimeout(bubbleTimer);
      bubble.classList.remove("is-visible");
    },
  };
}
