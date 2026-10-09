// Inline SVG illustrations. Every call gets unique gradient ids so the same
// drawing can appear several times on one page without id collisions.

let uid = 0;

const DRAWINGS = {
  pyramid: (id) => `
    <defs>
      <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1b1446"/><stop offset="1" stop-color="#f08a3c"/>
      </linearGradient>
      <linearGradient id="${id}sand" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f6c66b"/><stop offset="1" stop-color="#b8662a"/>
      </linearGradient>
      <radialGradient id="${id}sun" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#fff4c2"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="200" height="200" rx="18" fill="url(#${id}sky)"/>
    <circle cx="150" cy="78" r="40" fill="url(#${id}sun)"/>
    <circle cx="150" cy="78" r="15" fill="#fff1b8"/>
    <g fill="#fff" opacity=".8"><circle cx="30" cy="30" r="1.4"/><circle cx="70" cy="18" r="1"/><circle cx="110" cy="40" r="1.2"/></g>
    <path d="M38 160 L92 72 L146 160Z" fill="url(#${id}sand)"/>
    <path d="M92 72 L146 160 L110 160Z" fill="#8a4a1f" opacity=".55"/>
    <path d="M120 160 L150 112 L180 160Z" fill="url(#${id}sand)"/>
    <path d="M150 112 L180 160 L162 160Z" fill="#8a4a1f" opacity=".55"/>
    <path d="M84 160 h16 v-14 a8 8 0 0 0 -16 0Z" fill="#2a160a"/>
    <path d="M0 158 C50 150 120 168 200 156 V200 H0Z" fill="#d9954a"/>
    <path d="M0 176 C60 168 140 186 200 172 V200 H0Z" fill="#b8702f"/>`,

  jar: (id) => `
    <defs>
      <linearGradient id="${id}honey" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffd76a"/><stop offset=".6" stop-color="#f29a1f"/><stop offset="1" stop-color="#b85a0a"/>
      </linearGradient>
      <linearGradient id="${id}glass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="${id}glow" cx=".5" cy=".55" r=".5">
        <stop offset="0" stop-color="#ffcf5a" stop-opacity=".9"/><stop offset="1" stop-color="#ffcf5a" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="112" r="92" fill="url(#${id}glow)"/>
    <path d="M58 70 h84 c10 0 16 8 16 18 v68 c0 18 -14 30 -32 30 h-52 c-18 0 -32 -12 -32 -30 v-68 c0 -10 6 -18 16 -18Z" fill="url(#${id}honey)"/>
    <path d="M58 70 h84 c10 0 16 8 16 18 v68 c0 18 -14 30 -32 30 h-52 c-18 0 -32 -12 -32 -30 v-68 c0 -10 6 -18 16 -18Z" fill="url(#${id}glass)"/>
    <path d="M50 92 c20 8 30 -6 50 2 s30 10 50 -2" stroke="#fff3c4" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>
    <rect x="62" y="44" width="76" height="28" rx="8" fill="#7a3e12"/>
    <path d="M56 44 c14 -14 74 -14 88 0" fill="#c97a2a"/>
    <path d="M62 52 h76" stroke="#5a2a0a" stroke-width="3"/>
    <rect x="76" y="112" width="48" height="34" rx="6" fill="#fff4d8" opacity=".9"/>
    <path d="M86 128 h28 M90 136 h20" stroke="#b8662a" stroke-width="3" stroke-linecap="round"/>
    <path d="M100 118 l4 6 h-8Z" fill="#b8662a"/>`,

  drop: (id) => `
    <defs>
      <radialGradient id="${id}d" cx=".35" cy=".35" r=".8">
        <stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#f7a823"/><stop offset="1" stop-color="#a24f06"/>
      </radialGradient>
    </defs>
    <g fill="#f3b23a" opacity=".35">
      <path d="M40 40 l12 -7 l12 7 v14 l-12 7 l-12 -7Z"/><path d="M64 54 l12 -7 l12 7 v14 l-12 7 l-12 -7Z"/>
      <path d="M136 132 l12 -7 l12 7 v14 l-12 7 l-12 -7Z"/><path d="M148 152 l12 -7 l12 7 v14 l-12 7 l-12 -7Z"/>
    </g>
    <path d="M100 30 C130 78 152 104 152 134 a52 52 0 0 1 -104 0 C48 104 70 78 100 30Z" fill="url(#${id}d)"/>
    <ellipse cx="82" cy="118" rx="10" ry="18" fill="#fff" opacity=".55" transform="rotate(20 82 118)"/>
    <text x="100" y="152" text-anchor="middle" font-family="Cinzel, serif" font-size="26" font-weight="700" fill="#5a2a05">17%</text>`,

  bee: (id) => `
    <defs>
      <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ffd44d"/><stop offset="1" stop-color="#f29a1f"/>
      </linearGradient>
    </defs>
    <path d="M30 150 q40 -60 80 -20 t70 -40" stroke="#f6d27a" stroke-width="2" stroke-dasharray="4 6" fill="none" opacity=".7"/>
    <ellipse cx="88" cy="70" rx="30" ry="22" fill="#e9f4ff" opacity=".8" transform="rotate(-25 88 70)"/>
    <ellipse cx="118" cy="66" rx="26" ry="18" fill="#e9f4ff" opacity=".65" transform="rotate(20 118 66)"/>
    <ellipse cx="100" cy="112" rx="46" ry="32" fill="url(#${id}b)"/>
    <path d="M86 82 q-6 30 0 60 M108 81 q-6 31 0 62 M128 88 q-4 24 0 48" stroke="#2a1606" stroke-width="10" fill="none"/>
    <circle cx="58" cy="108" r="20" fill="#2a1606"/>
    <circle cx="51" cy="102" r="5" fill="#fff"/><circle cx="50" cy="103" r="2.5" fill="#000"/>
    <path d="M52 90 q-10 -22 -22 -24 M60 89 q-2 -24 6 -30" stroke="#2a1606" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="30" cy="66" r="4" fill="#2a1606"/><circle cx="66" cy="59" r="4" fill="#2a1606"/>
    <path d="M146 112 l14 0" stroke="#2a1606" stroke-width="5" stroke-linecap="round"/>`,

  flower: (id) => `
    <defs>
      <radialGradient id="${id}p" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#ffd1ec"/><stop offset="1" stop-color="#e2459a"/>
      </radialGradient>
      <radialGradient id="${id}c" cx=".4" cy=".4" r=".6">
        <stop offset="0" stop-color="#fff0a0"/><stop offset="1" stop-color="#e88a12"/>
      </radialGradient>
    </defs>
    <path d="M100 196 C96 160 104 140 100 110" stroke="#3f8f3a" stroke-width="6" fill="none"/>
    <path d="M100 162 c-26 -6 -40 -24 -40 -24 c22 -4 36 6 40 24Z" fill="#58b24a"/>
    <g transform="translate(100 88)">
      ${[0, 60, 120, 180, 240, 300]
        .map((a) => `<ellipse cx="0" cy="-36" rx="20" ry="32" fill="url(#${id}p)" transform="rotate(${a})"/>`)
        .join("")}
      <circle r="22" fill="url(#${id}c)"/>
      <g fill="#a85a06"><circle cx="-7" cy="-6" r="2.4"/><circle cx="6" cy="-8" r="2.4"/><circle cx="0" cy="4" r="2.4"/><circle cx="9" cy="6" r="2.4"/><circle cx="-9" cy="7" r="2.4"/></g>
    </g>
    <g fill="#ffd44d"><circle cx="160" cy="40" r="5"/><circle cx="36" cy="54" r="4"/><circle cx="170" cy="120" r="3"/></g>`,

  seal: (id) => `
    <defs>
      <radialGradient id="${id}w" cx=".4" cy=".35" r=".7">
        <stop offset="0" stop-color="#ff6b6b"/><stop offset=".6" stop-color="#b3122e"/><stop offset="1" stop-color="#6d0618"/>
      </radialGradient>
    </defs>
    <path d="M100 14 C126 10 140 30 160 34 C184 40 184 66 190 86 C198 112 180 126 178 148 C176 174 150 180 132 190 C112 200 92 194 72 190 C48 186 32 170 22 150 C12 128 6 108 14 86 C22 62 30 40 54 30 C70 22 84 16 100 14Z" fill="url(#${id}w)"/>
    <circle cx="100" cy="102" r="62" fill="none" stroke="#7a0a1e" stroke-width="5" opacity=".6"/>
    <circle cx="100" cy="102" r="54" fill="none" stroke="#ff9a9a" stroke-width="2" opacity=".35"/>
    <text x="100" y="128" text-anchor="middle" font-family="Cinzel, serif" font-size="78" font-weight="700" fill="#5e0414" opacity=".85">?</text>
    <text x="98" y="125" text-anchor="middle" font-family="Cinzel, serif" font-size="78" font-weight="700" fill="#ff8f8f" opacity=".5">?</text>`,

  octopus: (id) => `
    <defs>
      <radialGradient id="${id}o" cx=".4" cy=".35" r=".7">
        <stop offset="0" stop-color="#ff9ad1"/><stop offset="1" stop-color="#8a2ad8"/>
      </radialGradient>
    </defs>
    <path d="M60 110 c-8 30 -30 40 -40 62 M76 118 c-4 30 -10 50 -2 70 M100 120 c0 30 6 48 0 70 M124 118 c4 30 12 46 4 68 M140 110 c8 30 30 40 40 60" stroke="url(#${id}o)" stroke-width="13" fill="none" stroke-linecap="round"/>
    <ellipse cx="100" cy="76" rx="52" ry="56" fill="url(#${id}o)"/>
    <circle cx="80" cy="88" r="10" fill="#fff"/><circle cx="120" cy="88" r="10" fill="#fff"/>
    <circle cx="82" cy="90" r="5" fill="#1a0630"/><circle cx="122" cy="90" r="5" fill="#1a0630"/>
    <g fill="#ff3b6b"><path d="M82 46 c-6 -8 -18 0 -8 10 l8 8 l8 -8 c10 -10 -2 -18 -8 -10Z"/>
      <path d="M100 38 c-6 -8 -18 0 -8 10 l8 8 l8 -8 c10 -10 -2 -18 -8 -10Z"/>
      <path d="M118 46 c-6 -8 -18 0 -8 10 l8 8 l8 -8 c10 -10 -2 -18 -8 -10Z"/></g>`,

  bolt: (id) => `
    <defs>
      <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#7fd4ff"/>
      </linearGradient>
    </defs>
    <g fill="#3a4a8a" opacity=".9"><ellipse cx="70" cy="44" rx="48" ry="24"/><ellipse cx="128" cy="40" rx="50" ry="28"/><ellipse cx="100" cy="56" rx="60" ry="22"/></g>
    <path d="M108 60 L74 122 h28 L84 184 L140 104 h-30 L130 60Z" fill="url(#${id}l)" stroke="#bfefff" stroke-width="3" stroke-linejoin="round"/>`,

  phone: (id) => `
    <defs>
      <linearGradient id="${id}scr" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3d7bff"/><stop offset=".5" stop-color="#a040ff"/><stop offset="1" stop-color="#ff3fa4"/>
      </linearGradient>
      <radialGradient id="${id}glow" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#a040ff" stop-opacity=".55"/><stop offset="1" stop-color="#a040ff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="100" r="96" fill="url(#${id}glow)"/>
    <rect x="58" y="22" width="84" height="156" rx="16" fill="#1a1150"/>
    <rect x="65" y="36" width="70" height="124" rx="8" fill="url(#${id}scr)"/>
    <rect x="88" y="27" width="24" height="4" rx="2" fill="#4b3d8f"/>
    <g fill="#fff" opacity=".9">
      <rect x="72" y="46" width="56" height="26" rx="5" opacity=".35"/>
      <rect x="72" y="78" width="56" height="26" rx="5" opacity=".55"/>
      <rect x="72" y="110" width="56" height="26" rx="5" opacity=".35"/>
      <path d="M95 84 l12 7 l-12 7Z" fill="#a040ff"/>
    </g>
    <path d="M100 168 v22 M92 182 l8 8 l8 -8" stroke="#ffd44d" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="40" cy="60" r="5" fill="#ffd44d"/><circle cx="162" cy="140" r="4" fill="#3ee07a"/><circle cx="160" cy="44" r="3" fill="#ff8a1f"/>`,

  hourglass: (id) => `
    <defs>
      <linearGradient id="${id}sand" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffe58a"/><stop offset="1" stop-color="#e6a91f"/>
      </linearGradient>
      <radialGradient id="${id}glow" cx=".5" cy=".55" r=".5">
        <stop offset="0" stop-color="#ffd44d" stop-opacity=".6"/><stop offset="1" stop-color="#ffd44d" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="104" r="94" fill="url(#${id}glow)"/>
    <rect x="52" y="24" width="96" height="12" rx="6" fill="#7a3e12"/>
    <rect x="52" y="164" width="96" height="12" rx="6" fill="#7a3e12"/>
    <path d="M64 36 h72 c0 34 -26 50 -30 64 c4 14 30 30 30 64 h-72 c0 -34 26 -50 30 -64 c-4 -14 -30 -30 -30 -64Z" fill="#e9f4ff" fill-opacity=".25" stroke="#fff" stroke-width="3"/>
    <path d="M74 50 h52 c-4 16 -20 28 -26 40 c-6 -12 -22 -24 -26 -40Z" fill="url(#${id}sand)"/>
    <path d="M100 100 v52" stroke="#ffd44d" stroke-width="3" stroke-dasharray="3 4"/>
    <path d="M70 164 c6 -18 20 -24 30 -24 c10 0 24 6 30 24Z" fill="url(#${id}sand)"/>
    <g fill="#ffd44d"><circle cx="34" cy="70" r="6"/><circle cx="168" cy="60" r="5"/><circle cx="160" cy="150" r="7"/></g>
    <g fill="#7a3e12" font-family="Fredoka, sans-serif" font-weight="700" font-size="10" text-anchor="middle"><text x="34" y="73">$</text><text x="160" y="153">$</text></g>`,

  bulb: (id) => `
    <defs>
      <radialGradient id="${id}g" cx=".42" cy=".38" r=".65">
        <stop offset="0" stop-color="#fffbe0"/><stop offset=".5" stop-color="#ffe27a"/><stop offset="1" stop-color="#ffb627"/>
      </radialGradient>
      <radialGradient id="${id}halo" cx=".5" cy=".45" r=".5">
        <stop offset="0" stop-color="#ffe27a" stop-opacity=".7"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="86" r="90" fill="url(#${id}halo)"/>
    <g stroke="#ffd44d" stroke-width="5" stroke-linecap="round">
      <path d="M100 6 v14"/><path d="M38 30 l10 10"/><path d="M162 30 l-10 10"/><path d="M18 88 h14"/><path d="M168 88 h14"/>
    </g>
    <path d="M100 30 c32 0 50 22 46 50 c-3 22 -20 30 -24 44 h-44 c-4 -14 -21 -22 -24 -44 c-4 -28 14 -50 46 -50Z" fill="url(#${id}g)" stroke="#ffcf4a" stroke-width="2"/>
    <path d="M86 60 c0 -12 28 -12 28 2 c0 10 -14 10 -14 22" stroke="#ff9a1f" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="100" cy="98" r="4" fill="#ff9a1f"/>
    <rect x="78" y="126" width="44" height="30" rx="6" fill="#9aa3b8"/>
    <path d="M78 136 h44 M78 146 h44" stroke="#6b7388" stroke-width="3"/>
    <path d="M88 156 h24 l-6 12 h-12Z" fill="#6b7388"/>`,

  coins: (id) => `
    <defs>
      <linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff1b0"/><stop offset=".5" stop-color="#ffd44d"/><stop offset="1" stop-color="#c98a0a"/>
      </linearGradient>
    </defs>
    <path d="M30 170 L70 130 L100 145 L165 70" stroke="#3ee07a" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M150 66 l18 2 l-2 18" stroke="#3ee07a" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    ${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="62" cy="${168 - i * 14}" rx="30" ry="10" fill="url(#${id}c)" stroke="#a86a06" stroke-width="2"/>`).join("")}
    ${[0, 1, 2].map((i) => `<ellipse cx="126" cy="${172 - i * 14}" rx="26" ry="9" fill="url(#${id}c)" stroke="#a86a06" stroke-width="2"/>`).join("")}
    <text x="62" y="116" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="16" fill="#7a4a06">$</text>
    <g fill="#7fd0ff" font-family="Fredoka, sans-serif" font-weight="700" font-size="20"><text x="128" y="40">Aa</text><text x="34" y="60">?!</text></g>`,

  clocktower: (id) => `
    <defs>
      <linearGradient id="${id}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6cff"/><stop offset="1" stop-color="#4b23c8"/></linearGradient>
    </defs>
    ${[0, 1, 2, 3].map((i) => `<rect x="${62 - i * 4}" y="${150 - i * 34}" width="${76 + i * 8}" height="34" rx="6" fill="url(#${id}t)" stroke="#2a1470" stroke-width="2"/>
      <circle cx="100" cy="${167 - i * 34}" r="12" fill="#fff6d6" stroke="#ffd44d" stroke-width="3"/>
      <path d="M100 ${167 - i * 34} v-7 M100 ${167 - i * 34} l${5 + i} 3" stroke="#3a1d02" stroke-width="2.5" stroke-linecap="round"/>`).join("")}
    <path d="M46 48 L100 14 L154 48Z" fill="#ff3fa4"/>
    <text x="150" y="${40}" font-family="Fredoka, sans-serif" font-size="20" font-weight="700" fill="#ffd44d">8h39</text>
    <g fill="#3ee07a"><circle cx="34" cy="150" r="5"/><circle cx="172" cy="120" r="4"/></g>`,

  monster: (id) => `
    <defs>
      <radialGradient id="${id}m" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#c58cff"/><stop offset="1" stop-color="#5a1fb8"/></radialGradient>
    </defs>
    <path d="M40 150 C20 90 50 40 100 40 C150 40 180 90 160 150 C150 176 130 168 120 180 C110 168 90 168 80 180 C70 168 50 176 40 150Z" fill="url(#${id}m)"/>
    <g fill="#fff"><circle cx="78" cy="82" r="16"/><circle cx="124" cy="78" r="20"/></g>
    <g fill="#1a0630"><circle cx="82" cy="86" r="7"/><circle cx="128" cy="82" r="9"/></g>
    <rect x="70" y="104" width="62" height="44" rx="8" fill="#1a1150" stroke="#ff3fa4" stroke-width="3"/>
    <path d="M96 116 l14 8 l-14 8Z" fill="#ff3fa4"/>
    <path d="M132 140 q30 10 34 40 q-14 -8 -22 -4" fill="#ff7ab8"/>
    <g fill="#3a1470"><path d="M58 46 l-10 -22 l20 14Z"/><path d="M142 46 l10 -22 l-20 14Z"/></g>`,

  treasure: (id) => `
    <defs>
      <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c27b38"/><stop offset="1" stop-color="#7a3e12"/></linearGradient>
    </defs>
    ${[[18, "🍽️"], [76, "🌙"], [134, "🤝"]].map(([x, icon]) => `
      <rect x="${x}" y="96" width="50" height="40" rx="5" fill="url(#${id}w)" stroke="#4a2408" stroke-width="2"/>
      <path d="M${x} 96 q25 -24 50 0" fill="#d9954a" stroke="#4a2408" stroke-width="2"/>
      <rect x="${x + 20}" y="104" width="10" height="12" rx="2" fill="#ffd44d"/>
      <text x="${x + 25}" y="80" text-anchor="middle" font-size="24">${icon}</text>`).join("")}
    <g fill="#ffd44d"><circle cx="40" cy="160" r="5"/><circle cx="100" cy="166" r="6"/><circle cx="160" cy="160" r="5"/></g>`,

  owl: (id) => `
    <defs>
      <radialGradient id="${id}o" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#d9a066"/><stop offset="1" stop-color="#8a4f1f"/></radialGradient>
    </defs>
    <ellipse cx="100" cy="112" rx="56" ry="66" fill="url(#${id}o)"/>
    <path d="M52 62 l14 -26 l16 22Z M148 62 l-14 -26 l-16 22Z" fill="#8a4f1f"/>
    <ellipse cx="100" cy="132" rx="34" ry="40" fill="#f3d9b0"/>
    <g fill="#fff" stroke="#3a1d02" stroke-width="3"><circle cx="78" cy="88" r="18"/><circle cx="122" cy="88" r="18"/></g>
    <g fill="#2a1406"><circle cx="80" cy="90" r="8"/><circle cx="124" cy="90" r="8"/></g>
    <path d="M100 98 l-8 12 h16Z" fill="#ffb627"/>
    <path d="M58 70 h84" stroke="#3a1d02" stroke-width="3"/>
    <rect x="58" y="176" width="84" height="10" rx="5" fill="#7a3e12"/>
    <path d="M150 40 l10 -6 l2 12Z" fill="#ffd44d"/>`,

  slot: (id) => `
    <defs>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3fa4"/><stop offset="1" stop-color="#8a1a5a"/></linearGradient>
    </defs>
    <rect x="34" y="40" width="112" height="136" rx="14" fill="url(#${id}s)" stroke="#ffd44d" stroke-width="4"/>
    <rect x="46" y="64" width="88" height="46" rx="6" fill="#fff6e0"/>
    <g font-family="Fredoka, sans-serif" font-weight="700" font-size="26" text-anchor="middle"><text x="62" y="96">7</text><text x="90" y="96" fill="#ff3fa4">♥</text><text x="118" y="96" fill="#3d7bff">♦</text></g>
    <path d="M60 64 v46 M118 64 v46" stroke="#e6cf9f" stroke-width="2"/>
    <rect x="54" y="128" width="72" height="30" rx="6" fill="#4a0f30"/>
    <path d="M146 92 h14 v-52" stroke="#d9d9e6" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="160" cy="36" r="11" fill="#ff3b3b"/>
    <text x="90" y="34" text-anchor="middle" font-size="22">👍</text>`,

  brain: (id) => `
    <defs>
      <radialGradient id="${id}b" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffc7e6"/><stop offset="1" stop-color="#e2459a"/></radialGradient>
    </defs>
    <path d="M100 40 C70 30 40 50 44 80 C26 92 30 124 52 130 C54 158 84 168 100 152 C116 168 146 158 148 130 C170 124 174 92 156 80 C160 50 130 30 100 40Z" fill="url(#${id}b)" stroke="#a02068" stroke-width="3"/>
    <path d="M100 42 V150 M64 70 q16 8 10 26 M136 70 q-16 8 -10 26 M62 120 q18 -6 26 8 M138 120 q-18 -6 -26 8" stroke="#a02068" stroke-width="3" fill="none" stroke-linecap="round"/>
    <g fill="#ffd44d"><path d="M34 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4Z"/><path d="M166 150 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3Z"/></g>
    <text x="100" y="190" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="18" font-weight="700" fill="#3ee07a">61% vs 40%</text>`,
};

export function art(name, className = "art") {
  const draw = DRAWINGS[name] ?? DRAWINGS.jar;
  uid += 1;
  return `<svg class="${className}" viewBox="0 0 200 200" aria-hidden="true" focusable="false">${draw(`a${uid}`)}</svg>`;
}
