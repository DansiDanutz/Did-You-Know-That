// The family of the House of Family (Emma 7, Leo 4, Mom, Dad, Grandma), drawn
// to the same standard as Dexter in character.js: radial-gradient skin, hair
// and clothes, gradient irises with twin highlights and lids, blush, ground
// shadows, separate back/front limbs, and per-character hair, outfit and prop.
// Coordinates: head centre at (0, 0), feet at about y = 150, before `scale`.

const OUTLINE = "#2a1406";

export const CAST = Object.freeze({
  emma: { skin: ["#ffe6cf", "#ffd0ab", "#e9a677"], hair: ["#a8623a", "#7a3f1e"], iris: ["#9be09a", "#2f9a4a", "#145c2a"], top: ["#ffb6dd", "#ff6fc0", "#c92d85"], legs: "#fff", shoe: "#c92d85", style: "girl" },
  leo: { skin: ["#ffe6cf", "#ffd0ab", "#e9a677"], hair: ["#f3c45a", "#c48b14"], iris: ["#8fd3ff", "#2a7bd8", "#123c86"], top: ["#ffe98a", "#ffd23c", "#d9a300"], legs: "#4b6fe0", shoe: "#2a1406", style: "boy" },
  mom: { skin: ["#ffe0c4", "#f7c69e", "#d9956a"], hair: ["#5a2e14", "#3a1b08"], iris: ["#c9a2ff", "#7a4fd8", "#3b1f86"], top: ["#9fe3d8", "#3fb8a8", "#1f7f72"], legs: "#4a3b8a", shoe: "#2a1406", style: "woman" },
  dad: { skin: ["#ffd9b8", "#f0bb90", "#cf8d5c"], hair: ["#3a2412", "#1e1108"], iris: ["#a9d6ff", "#2f7fd6", "#143c80"], top: ["#8fb6ff", "#3d7bff", "#1f49b8"], legs: "#4a3b2a", shoe: "#2a1406", style: "man" },
  grandma: { skin: ["#ffe0c4", "#f7c69e", "#d9956a"], hair: ["#f4f1f8", "#c9c3d6"], iris: ["#c9a2ff", "#7a4fd8", "#3b1f86"], top: ["#d6c2ff", "#a07cf0", "#6a48b8"], legs: "#6a5a4a", shoe: "#2a1406", style: "woman" },
});

// Gradient definitions, once per <svg>.
export const CAST_DEFS = `<defs>${Object.entries(CAST).map(([id, c]) => `
  <radialGradient id="fc-${id}-skin" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${c.skin[0]}"/><stop offset=".55" stop-color="${c.skin[1]}"/><stop offset="1" stop-color="${c.skin[2]}"/></radialGradient>
  <radialGradient id="fc-${id}-hair" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="${c.hair[0]}"/><stop offset="1" stop-color="${c.hair[1]}"/></radialGradient>
  <radialGradient id="fc-${id}-iris" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="${c.iris[0]}"/><stop offset=".6" stop-color="${c.iris[1]}"/><stop offset="1" stop-color="${c.iris[2]}"/></radialGradient>
  <radialGradient id="fc-${id}-top" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="${c.top[0]}"/><stop offset=".55" stop-color="${c.top[1]}"/><stop offset="1" stop-color="${c.top[2]}"/></radialGradient>`).join("")}
  <radialGradient id="fc-teddy" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#e8b27a"/><stop offset="1" stop-color="#a86c33"/></radialGradient>
  <linearGradient id="fc-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8e6"/><stop offset="1" stop-color="#ffe9bf"/></linearGradient>
  <linearGradient id="fc-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9a35a"/><stop offset="1" stop-color="#b37a35"/></linearGradient>
  <linearGradient id="fc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#dff4ff"/></linearGradient>
  <linearGradient id="fc-rug" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff8fc7"/><stop offset="1" stop-color="#a07cf0"/></linearGradient>
</defs>`;

const eye = (id, cx, lidDrop) => `
  <ellipse cx="${cx}" cy="-4" rx="10" ry="12" fill="#fff" stroke="#d8b08a" stroke-width="1.3"/>
  <circle cx="${cx + 1.5}" cy="-2" r="7" fill="url(#fc-${id}-iris)"/>
  <circle cx="${cx + 1.5}" cy="-2" r="3.4" fill="#120a04"/>
  <circle cx="${cx + 4}" cy="-5.5" r="2.4" fill="#fff"/>
  <circle cx="${cx - 0.8}" cy="1.2" r="1.1" fill="#fff" opacity=".85"/>
  ${lidDrop ? `<path d="M${cx - 10} ${-4 - 12 + lidDrop} a10 12 0 0 1 20 0 v-${lidDrop} a10 12 0 0 0 -20 0Z" fill="url(#fc-${id}-skin)"/>` : ""}
  <path d="M${cx - 10} -14 q10 -7 20 0" fill="none" stroke="${OUTLINE}" stroke-width="2" stroke-linecap="round"/>`;

const MOUTHS = {
  happy: `<path d="M-13 16 q13 15 26 0 q-13 5 -26 0Z" fill="#7a1f12" stroke="${OUTLINE}" stroke-width="2.4" stroke-linejoin="round"/><path d="M-6 22 q6 5 12 0 q-6 3 -12 0Z" fill="#ff7a8a"/>`,
  calm: `<path d="M-9 18 q9 7 18 0" fill="none" stroke="${OUTLINE}" stroke-width="2.6" stroke-linecap="round"/>`,
  sad: `<path d="M-10 22 q10 -10 20 0" fill="none" stroke="${OUTLINE}" stroke-width="2.6" stroke-linecap="round"/>`,
  angry: `<path d="M-10 20 q10 -4 20 0" fill="none" stroke="${OUTLINE}" stroke-width="2.6" stroke-linecap="round"/>`,
  talk: `<path d="M-9 15 q9 -3 18 0 q-9 16 -18 0Z" fill="#7a1f12" stroke="${OUTLINE}" stroke-width="2.4" stroke-linejoin="round"/>`,
};
const BROWS = {
  happy: `<path d="M-24 -22 q10 -8 20 -2 M24 -22 q-10 -8 -20 -2" fill="none" stroke="HAIR" stroke-width="3.6" stroke-linecap="round"/>`,
  calm: `<path d="M-24 -20 q10 -6 20 -2 M24 -20 q-10 -6 -20 -2" fill="none" stroke="HAIR" stroke-width="3.6" stroke-linecap="round"/>`,
  sad: `<path d="M-24 -16 q10 -9 20 -5 M24 -16 q-10 -9 -20 -5" fill="none" stroke="HAIR" stroke-width="3.6" stroke-linecap="round"/>`,
  angry: `<path d="M-25 -27 l21 8 M25 -27 l-21 8" fill="none" stroke="HAIR" stroke-width="4" stroke-linecap="round"/>`,
  talk: `<path d="M-24 -21 q10 -7 20 -2 M24 -21 q-10 -7 -20 -2" fill="none" stroke="HAIR" stroke-width="3.6" stroke-linecap="round"/>`,
};

const HAIR = {
  girl: (id) => ({
    back: `<circle cx="-44" cy="6" r="15" fill="url(#fc-${id}-hair)"/><circle cx="44" cy="6" r="15" fill="url(#fc-${id}-hair)"/><circle cx="-44" cy="-6" r="5" fill="#ff3fa4"/><circle cx="44" cy="-6" r="5" fill="#ff3fa4"/>`,
    front: `<path d="M-40 -6 q-2 -48 40 -48 q42 0 40 48 q-10 -26 -34 -22 q-8 -10 -14 0 q-22 -6 -32 22Z" fill="url(#fc-${id}-hair)"/><path d="M-30 -36 q14 -12 30 -10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".45"/>`,
  }),
  boy: (id) => ({
    back: "",
    front: `<path d="M-39 -8 q0 -44 39 -44 q39 0 39 44 q-12 -22 -39 -18 q-27 -4 -39 18Z" fill="url(#fc-${id}-hair)"/><path d="M-30 -36 q-6 -22 10 -24 q0 -18 20 -12 q10 -14 22 0 q14 -4 14 14 q6 6 2 16" fill="url(#fc-${id}-hair)"/><path d="M-26 -34 q12 -12 28 -10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".45"/>`,
  }),
  woman: (id) => ({
    back: `<circle cx="0" cy="-46" r="16" fill="url(#fc-${id}-hair)"/><path d="M-46 -2 q-2 -24 14 -40 q-16 46 -2 70 q-20 -4 -12 -30Z" fill="url(#fc-${id}-hair)"/><path d="M46 -2 q2 -24 -14 -40 q16 46 2 70 q20 -4 12 -30Z" fill="url(#fc-${id}-hair)"/>`,
    front: `<path d="M-40 -4 q-2 -46 40 -46 q42 0 40 46 q-14 -26 -40 -22 q-26 -4 -40 22Z" fill="url(#fc-${id}-hair)"/><path d="M-28 -36 q14 -12 32 -8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".4"/>`,
  }),
  man: (id) => ({
    back: "",
    front: `<path d="M-39 -10 q0 -40 39 -40 q39 0 39 40 q-14 -16 -39 -14 q-25 -2 -39 14Z" fill="url(#fc-${id}-hair)"/><path d="M-24 -34 q12 -10 26 -8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/><path d="M-30 12 q0 22 30 22 q30 0 30 -22" fill="none" stroke="url(#fc-${id}-hair)" stroke-width="7" stroke-linecap="round" opacity=".55"/>`,
  }),
};

// Clothes by style: dress, striped shirt, blouse with apron, sweater.
const OUTFIT = {
  girl: (id) => `<path d="M-28 34 h56 l16 70 h-88Z" fill="url(#fc-${id}-top)" stroke="${OUTLINE}" stroke-width="2.6" stroke-linejoin="round"/><path d="M-16 34 q16 12 32 0" fill="#fff" stroke="${OUTLINE}" stroke-width="2"/><circle cx="0" cy="56" r="3" fill="#fff"/><circle cx="0" cy="70" r="3" fill="#fff"/><path d="M-40 104 h80" stroke="#fff" stroke-width="3" opacity=".5"/>`,
  boy: (id) => `<rect x="-30" y="34" width="60" height="66" rx="16" fill="url(#fc-${id}-top)" stroke="${OUTLINE}" stroke-width="2.6"/><path d="M-29 56 h58 M-29 74 h58" stroke="#fff" stroke-width="6" opacity=".55"/><path d="M-12 34 q12 10 24 0" fill="none" stroke="${OUTLINE}" stroke-width="2.4" stroke-linecap="round"/>`,
  woman: (id) => `<path d="M-30 34 h60 l14 76 h-88Z" fill="url(#fc-${id}-top)" stroke="${OUTLINE}" stroke-width="2.6" stroke-linejoin="round"/><path d="M-22 62 h44 l6 46 h-56Z" fill="#fff" opacity=".85"/><path d="M-22 62 h44" stroke="#ff8fc7" stroke-width="4"/><path d="M-14 34 q14 12 28 0" fill="#fff" stroke="${OUTLINE}" stroke-width="2"/>`,
  man: (id) => `<rect x="-32" y="34" width="64" height="70" rx="16" fill="url(#fc-${id}-top)" stroke="${OUTLINE}" stroke-width="2.6"/><path d="M-14 34 l14 16 l14 -16" fill="#fff" stroke="${OUTLINE}" stroke-width="2.2" stroke-linejoin="round"/><path d="M-31 92 h62" stroke="#000" stroke-width="4" opacity=".12"/>`,
};

// Arms: a back arm and a front arm, each either hanging, raised, or held out in front.
const arm = (id, side, pose, front) => {
  const x = side * 30;
  const d = pose === "up" ? `M${x} 44 l${side * 26} -34` : pose === "out" ? `M${x} 44 l${side * 10} 30 l${-side * 30} 14` : `M${x} 44 l${side * 8} 44`;
  const end = pose === "up" ? [x + side * 26, 10] : pose === "out" ? [x - side * 20, 88] : [x + side * 8, 88];
  return `<path d="${d}" fill="none" stroke="url(#fc-${id}-top)" stroke-width="15" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${OUTLINE}" stroke-width="18" stroke-linecap="round" opacity="${front ? 0.18 : 0.28}"/><path d="${d}" fill="none" stroke="url(#fc-${id}-top)" stroke-width="14" stroke-linecap="round"/><circle cx="${end[0]}" cy="${end[1]}" r="9" fill="url(#fc-${id}-skin)" stroke="${OUTLINE}" stroke-width="2"/>`;
};

export const PROPS = {
  teddy: `<g><circle cx="-11" cy="-14" r="6" fill="url(#fc-teddy)"/><circle cx="11" cy="-14" r="6" fill="url(#fc-teddy)"/><circle r="15" cy="-6" fill="url(#fc-teddy)" stroke="${OUTLINE}" stroke-width="2"/><ellipse cy="16" rx="13" ry="15" fill="url(#fc-teddy)" stroke="${OUTLINE}" stroke-width="2"/><ellipse cy="0" rx="6" ry="4" fill="#f6d9b4"/><circle cx="-5" cy="-9" r="1.8" fill="#120a04"/><circle cx="5" cy="-9" r="1.8" fill="#120a04"/><circle cy="-2" r="1.8" fill="#120a04"/></g>`,
  paper: `<g><rect x="-26" y="-18" width="52" height="38" rx="4" fill="#fff" stroke="${OUTLINE}" stroke-width="2"/><circle cx="-10" cy="-2" r="7" fill="#ffd84a"/><path d="M-20 14 l10 -12 l8 8 l8 -10 l10 14Z" fill="#7ccf6a"/></g>`,
  bag: (fill = "#e0a24a") => `<g><path d="M-22 -10 h44 l6 46 h-56Z" fill="${fill}" stroke="${OUTLINE}" stroke-width="2.4" stroke-linejoin="round"/><path d="M-10 -10 q10 -18 20 0" fill="none" stroke="${OUTLINE}" stroke-width="3"/><circle cx="-6" cy="-14" r="5" fill="#ff7a3d"/><path d="M4 -24 q6 -8 10 2" fill="none" stroke="#7ccf6a" stroke-width="4" stroke-linecap="round"/></g>`,
};

/**
 * Draws one family member. pose: { arms: "down"|"up"|"out"|["left","right"], prop, propAt }
 * mood: happy | calm | sad | angry | talk
 */
export function member(id, mood = "calm", x = 0, y = 0, { scale = 1, flip = false, arms = "down", prop = "", propAt = [0, 86], lids = 0 } = {}) {
  const c = CAST[id];
  const hair = HAIR[c.style](id);
  const [backArm, frontArm] = Array.isArray(arms) ? arms : [arms, arms];
  const brows = BROWS[mood].replaceAll("HAIR", c.hair[1]);
  const tear = mood === "sad" ? `<path d="M22 8 q7 11 0 16 q-7 -5 0 -16Z" fill="#7fd0ff" stroke="#1c7fbf" stroke-width="1.4"/>` : "";
  const propSvg = prop ? `<g transform="translate(${propAt[0]} ${propAt[1]})">${PROPS[prop] ?? prop}</g>` : "";
  return `<g transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})">
    <ellipse cx="0" cy="152" rx="40" ry="7" fill="#000" opacity=".28"/>
    ${hair.back}
    ${arm(id, -1, backArm, false)}
    <path d="M-16 100 v40 M16 100 v40" stroke="${c.legs}" stroke-width="18" stroke-linecap="round"/><path d="M-16 100 v40 M16 100 v40" stroke="${OUTLINE}" stroke-width="20" stroke-linecap="round" opacity=".15"/>
    <ellipse cx="-17" cy="144" rx="15" ry="8" fill="${c.shoe}"/><ellipse cx="17" cy="144" rx="15" ry="8" fill="${c.shoe}"/><ellipse cx="-20" cy="141" rx="6" ry="2.5" fill="#fff" opacity=".35"/><ellipse cx="14" cy="141" rx="6" ry="2.5" fill="#fff" opacity=".35"/>
    <rect x="-9" y="22" width="18" height="18" fill="url(#fc-${id}-skin)"/>
    ${OUTFIT[c.style](id)}
    <circle cx="-38" cy="2" r="7" fill="url(#fc-${id}-skin)" stroke="${OUTLINE}" stroke-width="2"/><circle cx="38" cy="2" r="7" fill="url(#fc-${id}-skin)" stroke="${OUTLINE}" stroke-width="2"/>
    <circle r="40" fill="url(#fc-${id}-skin)" stroke="${OUTLINE}" stroke-width="2.6"/>
    <ellipse cx="-24" cy="10" rx="8" ry="4.5" fill="#ff7a6b" opacity=".45"/><ellipse cx="24" cy="10" rx="8" ry="4.5" fill="#ff7a6b" opacity=".45"/>
    ${id === "leo" ? `<circle cx="-20" cy="6" r="1.2" fill="#c98a3a"/><circle cx="-26" cy="9" r="1.2" fill="#c98a3a"/><circle cx="22" cy="7" r="1.2" fill="#c98a3a"/><circle cx="27" cy="10" r="1.2" fill="#c98a3a"/>` : ""}
    ${eye(id, -15, lids)}${eye(id, 15, lids)}
    <path d="M-2 6 q3 4 4 0" fill="none" stroke="${OUTLINE}" stroke-width="1.8" stroke-linecap="round" opacity=".6"/>
    ${brows}${tear}${MOUTHS[mood]}
    ${hair.front}
    ${id === "dad" ? `<circle cx="-15" cy="-4" r="15" fill="#bfe6ff" fill-opacity=".15" stroke="${OUTLINE}" stroke-width="2.6"/><circle cx="15" cy="-4" r="15" fill="#bfe6ff" fill-opacity=".15" stroke="${OUTLINE}" stroke-width="2.6"/><path d="M0 -6 h0.5" stroke="${OUTLINE}" stroke-width="2.6"/><path d="M-30 -8 l-8 -3 M30 -8 l8 -3" stroke="${OUTLINE}" stroke-width="2.6" stroke-linecap="round"/>` : ""}
    ${id === "grandma" ? `<circle cx="-15" cy="-4" r="14" fill="none" stroke="#7a4fd8" stroke-width="2.4"/><circle cx="15" cy="-4" r="14" fill="none" stroke="#7a4fd8" stroke-width="2.4"/><path d="M-1 -6 h2" stroke="#7a4fd8" stroke-width="2.4"/>` : ""}
    ${arm(id, 1, frontArm, true)}
    ${propSvg}
  </g>`;
}

// A cosy room: gradient wall, window with sky and curtains, picture, plant, floor and rug.
export const room = (inner, { rug = true } = {}) => `<svg class="fh-scene" viewBox="0 0 600 340" role="img" aria-hidden="true">${CAST_DEFS}
  <rect width="600" height="340" fill="url(#fc-wall)"/>
  <rect y="236" width="600" height="104" fill="url(#fc-floor)"/><rect y="230" width="600" height="8" fill="#8a5a2b"/>
  ${rug ? `<ellipse cx="300" cy="300" rx="200" ry="26" fill="url(#fc-rug)" opacity=".8"/><ellipse cx="300" cy="300" rx="160" ry="18" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/>` : ""}
  <rect x="42" y="40" width="130" height="100" rx="10" fill="url(#fc-sky)" stroke="#8a5a2b" stroke-width="7"/><path d="M107 40 v100 M42 90 h130" stroke="#8a5a2b" stroke-width="5"/><circle cx="80" cy="66" r="10" fill="#ffe36b"/><path d="M60 128 l20 -24 l16 16 l24 -32 l30 40Z" fill="#7ccf6a"/>
  <path d="M34 34 q14 60 0 112 h-10 v-112Z M180 34 q-14 60 0 112 h10 v-112Z" fill="#ff8fc7" stroke="${OUTLINE}" stroke-width="2"/>
  <rect x="470" y="60" width="86" height="64" rx="8" fill="#fff" stroke="#8a5a2b" stroke-width="6"/><path d="M482 112 l18 -24 l14 14 l20 -26 l18 36Z" fill="#7ccf6a"/><circle cx="500" cy="80" r="7" fill="#ffd84a"/>
  <path d="M540 236 q-4 -40 10 -70 q-18 10 -22 38 q-6 -32 -28 -40 q18 20 20 54 q-14 -6 -24 4 q16 2 22 18Z" fill="#3ee07a" stroke="${OUTLINE}" stroke-width="2"/><path d="M522 236 h40 l-6 30 h-28Z" fill="#e0a24a" stroke="${OUTLINE}" stroke-width="2.4"/>
  ${inner}
</svg>`;

// Rough text width: Latin letters are about 0.56 em wide, Chinese characters a full em.
const textWidth = (text, size) => [...text].reduce((w, ch) => w + (ch.codePointAt(0) > 0x2e80 ? size : size * 0.56), 0);

// A rounded speech bubble with a tail toward (tx, ty).
export const bubble = (text, x, y, tx, ty, size = 24) => `<g><path d="M${tx} ${ty} L${x + 8} ${y + 10} L${x + 34} ${y + 10}Z" fill="#fff" stroke="${OUTLINE}" stroke-width="2.4" stroke-linejoin="round"/><rect x="${x - 10}" y="${y - 30}" width="${textWidth(text, size) + 24}" height="44" rx="14" fill="#fff" stroke="${OUTLINE}" stroke-width="2.4"/><path d="M${x + 12} ${y + 10} L${x + 30} ${y + 10}" stroke="#fff" stroke-width="4"/><text x="${x + 2}" y="${y}" font-size="${size}" font-family="Fredoka, sans-serif" fill="${OUTLINE}" font-weight="600">${text}</text></g>`;
