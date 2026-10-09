// Language flags as small inline SVGs: emoji flags show as plain letters on
// Windows, these look the same on every device.

const tricolor = (a, b, c, vertical = true) =>
  [a, b, c]
    .map((fill, i) => (vertical ? `<rect x="${i * 10}" width="10" height="20" fill="${fill}"/>` : `<rect y="${(i * 20) / 3}" width="30" height="${20 / 3}" fill="${fill}"/>`))
    .join("");

const star = (cx, cy, r, turn = 0) => {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = ((i * 36 - 90 + turn) * Math.PI) / 180;
    const radius = i % 2 ? r * 0.38 : r;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  });
  return `<polygon points="${points.join(" ")}" fill="#FFDE00"/>`;
};

const SHAPES = {
  en: `<rect width="30" height="20" fill="#012169"/><path d="M0,0L30,20M30,0L0,20" stroke="#fff" stroke-width="4"/><path d="M0,0L30,20M30,0L0,20" stroke="#C8102E" stroke-width="1.6"/><path d="M15,0V20M0,10H30" stroke="#fff" stroke-width="6"/><path d="M15,0V20M0,10H30" stroke="#C8102E" stroke-width="3.6"/>`,
  ro: tricolor("#002B7F", "#FCD116", "#CE1126"),
  es: `<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>`,
  fr: tricolor("#0055A4", "#FFFFFF", "#EF4135"),
  de: tricolor("#000000", "#DD0000", "#FFCE00", false),
  it: tricolor("#009246", "#FFFFFF", "#CE2B37"),
  zh: `<rect width="30" height="20" fill="#DE2910"/>${star(5, 5, 3)}${star(10, 2, 1, 23)}${star(12, 4, 1, 46)}${star(12, 7, 1, 70)}${star(10, 9, 1, 21)}`,
};

export function flagSvg(code) {
  const shape = SHAPES[code];
  return shape ? `<svg class="flag" viewBox="0 0 30 20" aria-hidden="true" focusable="false">${shape}</svg>` : "";
}
