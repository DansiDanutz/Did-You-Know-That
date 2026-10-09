// Illustrated houses for the journey map, one style per story theme.
// Each drawing is 300×300; the door sits at (150, 270) so Daxter can knock.

let uid = 0;

const HOUSES = {
  desert: (id) => `
    <defs>
      <linearGradient id="${id}wall" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f7cf86"/><stop offset="1" stop-color="#c9823c"/>
      </linearGradient>
      <linearGradient id="${id}pyr" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#f0b860"/><stop offset="1" stop-color="#a65f24"/>
      </linearGradient>
    </defs>
    <path d="M150 40 L250 210 H50Z" fill="url(#${id}pyr)" opacity=".85"/>
    <path d="M150 40 L250 210 H190Z" fill="#7a4216" opacity=".35"/>
    <g class="h-palm">
      <path d="M248 280 C244 230 250 200 262 176" stroke="#7a4a1e" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M262 176 c-30 -10 -48 6 -56 18 c20 -14 40 -12 56 -18Z M262 176 c26 -16 46 -6 54 6 c-20 -10 -38 -6 -54 -6Z M262 176 c-8 -28 6 -44 20 -50 c-10 18 -12 34 -20 50Z M262 176 c-26 4 -34 26 -34 40 c8 -20 20 -32 34 -40Z" fill="#3e9b4a"/>
    </g>
    <path d="M70 150 h160 v130 H70Z" fill="url(#${id}wall)"/>
    <path d="M60 150 h180 l-12 -26 H72Z" fill="#a85a22"/>
    <path d="M70 160 h160" stroke="#8a4a1a" stroke-width="4" opacity=".4"/>
    <g fill="#8a4a1a" opacity=".5"><rect x="84" y="176" width="10" height="10"/><rect x="206" y="176" width="10" height="10"/></g>
    <rect class="h-window" x="92" y="196" width="34" height="34" rx="17" fill="#ffd36b"/>
    <rect class="h-window" x="174" y="196" width="34" height="34" rx="17" fill="#ffd36b"/>
    <path class="h-door" d="M128 280 v-44 a22 22 0 0 1 44 0 v44Z" fill="#5a2a0a"/>
    <circle cx="164" cy="258" r="3" fill="#ffd44d"/>
    <text x="150" y="146" text-anchor="middle" font-family="Cinzel, serif" font-size="14" font-weight="700" fill="#5a2a0a">𓆤  𓂀  𓆤</text>`,

  ocean: (id) => `
    <defs>
      <linearGradient id="${id}sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3fb8ff"/><stop offset="1" stop-color="#1a4fb8"/>
      </linearGradient>
      <linearGradient id="${id}tower" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9d8f2"/>
      </linearGradient>
    </defs>
    <path class="h-beam" d="M200 70 L320 30 L320 110Z" fill="#fff6c0" opacity=".35"/>
    <path d="M182 280 L190 90 h20 l8 190Z" fill="url(#${id}tower)"/>
    <path d="M186 140 h28 l1 22 h-30Z M188 200 h26 l2 22 h-30Z" fill="#ff4f6b"/>
    <rect x="184" y="70" width="32" height="22" rx="4" fill="#ffe27a" class="h-window"/>
    <path d="M178 70 L200 50 L222 70Z" fill="#ff4f6b"/>
    <path d="M60 180 h110 v100 H60Z" fill="#e8f1ff"/>
    <path d="M50 182 L115 132 L180 182Z" fill="#2d6fd6"/>
    <rect class="h-window" x="74" y="200" width="28" height="28" rx="14" fill="#ffd36b"/>
    <path class="h-door" d="M122 280 v-40 a16 16 0 0 1 32 0 v40Z" fill="#1d3d8a"/>
    <circle cx="148" cy="262" r="3" fill="#ffd44d"/>
    <circle cx="88" cy="214" r="10" fill="none" stroke="#2d6fd6" stroke-width="3"/>
    <path d="M0 268 q25 -12 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 V300 H0Z" fill="url(#${id}sea)" class="h-waves"/>`,

  storm: (id) => `
    <defs>
      <linearGradient id="${id}stone" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#8f86c8"/><stop offset="1" stop-color="#4a3f8a"/>
      </linearGradient>
    </defs>
    <g class="h-cloud" fill="#3b3672">
      <ellipse cx="120" cy="56" rx="60" ry="26"/><ellipse cx="180" cy="50" rx="56" ry="30"/><ellipse cx="150" cy="70" rx="80" ry="22"/>
    </g>
    <path class="h-bolt" d="M160 78 L140 120 h18 l-12 34 l34 -48 h-18 l12 -28Z" fill="#cfefff"/>
    <path d="M110 280 V150 h80 v130Z" fill="url(#${id}stone)"/>
    <path d="M100 150 h100 v-18 h-14 v10 h-16 v-10 h-14 v10 h-16 v-10 h-14 v10 h-12 v-10 h-14Z" fill="#5a4fa0"/>
    <path d="M150 132 V96" stroke="#d8d4ff" stroke-width="4"/>
    <circle cx="150" cy="94" r="5" fill="#ffe27a"/>
    <rect class="h-window" x="136" y="168" width="28" height="36" rx="14" fill="#9fe6ff"/>
    <path class="h-door" d="M132 280 v-38 a18 18 0 0 1 36 0 v38Z" fill="#241c55"/>
    <circle cx="162" cy="262" r="3" fill="#ffd44d"/>`,

  home: (id) => `
    <defs>
      <linearGradient id="${id}wall" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffd1ec"/><stop offset="1" stop-color="#c26bd8"/>
      </linearGradient>
      <linearGradient id="${id}roof" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7b4dff"/><stop offset="1" stop-color="#4b23c8"/>
      </linearGradient>
    </defs>
    <circle class="h-window" cx="150" cy="70" r="26" fill="#fff2a8" opacity=".35"/>
    <path d="M150 50 c14 0 22 10 20 22 c-1 9 -8 13 -10 19 h-20 c-2 -6 -9 -10 -10 -19 c-2 -12 6 -22 20 -22Z" fill="#ffe27a" stroke="#ffcf4a" stroke-width="2"/>
    <path d="M144 64 c0 -6 12 -6 12 1 c0 5 -6 5 -6 10" stroke="#ff9a1f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="143" y="91" width="14" height="10" rx="2" fill="#9aa3b8"/>
    <path d="M150 101 v20" stroke="#5a3418" stroke-width="4"/>
    <path d="M70 160 h160 v120 H70Z" fill="url(#${id}wall)"/>
    <path d="M50 166 L150 112 L250 166Z" fill="url(#${id}roof)"/>
    <rect x="198" y="120" width="20" height="34" fill="#4b23c8"/>
    <rect class="h-window" x="88" y="186" width="36" height="36" rx="6" fill="#ffd36b"/>
    <rect class="h-window" x="176" y="186" width="36" height="36" rx="6" fill="#ffd36b"/>
    <path d="M106 186 v36 M88 204 h36 M194 186 v36 M176 204 h36" stroke="#c26bd8" stroke-width="3"/>
    <path class="h-door" d="M130 280 v-48 a20 20 0 0 1 40 0 v48Z" fill="#4b23c8"/>
    <circle cx="162" cy="258" r="3" fill="#ffd44d"/>
    <path d="M60 280 c0 -14 14 -18 20 -10 c4 -10 20 -8 18 6 M222 280 c0 -14 14 -18 20 -10 c4 -10 20 -8 18 6" fill="#3aa362"/>`,
};

export function houseSvg(style) {
  const draw = HOUSES[style] ?? HOUSES.desert;
  uid += 1;
  return `<svg class="house-svg" viewBox="0 0 300 300" aria-hidden="true" focusable="false">${draw(`h${uid}`)}</svg>`;
}
