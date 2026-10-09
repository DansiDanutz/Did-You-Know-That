// Collectible cards: markup, holographic tilt and the reveal ceremony.

import { art } from "./art.js";

const TILT_DEG = 14;
const BURST_COUNT = 36;

const RARITY_GEMS = { silver: "◆", gold: "✦", legendary: "✸" };
const SEASON = "S1";

export function cardMarkup(card, rarity, { tilt = false, t, points, firstSeason = false } = {}) {
  // Old cards keep their earned rarity as a first-season badge; new ones are discoveries.
  const label = !t ? rarity : firstSeason ? `${t(`rarity.${rarity}`)} · ${SEASON}` : t("card.discovery");
  const picture = card.image ? `<img src="${card.image}" alt="" loading="lazy" />` : art(card.art);
  const pointsBadge = points
    ? `<span class="dyk-card-points"><b>★</b>${t ? t("inv.points", { n: points }) : points}</span>`
    : "";
  return `
    <div class="dyk-card rarity-${rarity}${tilt ? " can-tilt" : ""}">
      <div class="dyk-card-inner">
        <span class="dyk-card-corners" aria-hidden="true"></span>
        <header class="dyk-card-head">
          <span class="dyk-card-gem" aria-hidden="true"><i>${RARITY_GEMS[rarity] ?? "◆"}</i></span>
          <h4 class="dyk-card-name">${card.name}</h4>
          <span class="dyk-card-num">#${card.number}</span>
        </header>
        <div class="dyk-card-art${card.image ? " has-image" : ""}">
          <span class="dyk-card-rays" aria-hidden="true"></span>
          ${picture}
          <span class="dyk-card-dust" aria-hidden="true"></span>
          ${pointsBadge}
        </div>
        <div class="dyk-card-ribbon"><span>${label}</span></div>
        <p class="dyk-card-fact">${card.fact ?? ""}</p>
        <footer class="dyk-card-foot">
          <img src="assets/logo.png" alt="" />
          <span>Did You Know That?</span>
        </footer>
        <span class="dyk-card-holo" aria-hidden="true"></span>
        <span class="dyk-card-sheen" aria-hidden="true"></span>
        <span class="dyk-card-glare" aria-hidden="true"></span>
      </div>
    </div>`;
}

export function enableTilt(cardEl) {
  const move = (event) => {
    const rect = cardEl.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    cardEl.style.setProperty("--rx", `${(0.5 - y) * TILT_DEG}deg`);
    cardEl.style.setProperty("--ry", `${(x - 0.5) * TILT_DEG}deg`);
    cardEl.style.setProperty("--mx", `${x * 100}%`);
    cardEl.style.setProperty("--my", `${y * 100}%`);
  };
  const reset = () => {
    ["--rx", "--ry"].forEach((p) => cardEl.style.setProperty(p, "0deg"));
    ["--mx", "--my"].forEach((p) => cardEl.style.setProperty(p, "50%"));
  };
  cardEl.addEventListener("pointermove", move);
  cardEl.addEventListener("pointerleave", reset);
  reset();
}

export function burst(container) {
  const colors = ["#3d7bff", "#a040ff", "#ff3fa4", "#ff8a1f", "#ffd84a", "#3ee07a"];
  Array.from({ length: BURST_COUNT }, (_, i) => {
    const spark = document.createElement("span");
    const angle = (i / BURST_COUNT) * Math.PI * 2;
    const dist = 180 + (i % 5) * 40;
    spark.className = "burst-spark";
    spark.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    spark.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
    spark.style.background = colors[i % colors.length];
    container.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove(), { once: true });
    return spark;
  });
}

// Shows the full-screen reveal; resolves when the player keeps the card.
export function revealCard(overlay, card, rarity, sfx, { t, points }) {
  overlay.innerHTML = `
    <div class="reveal-stage">
      <p class="reveal-kicker">${t("reveal.kicker")}</p>
      <div class="reveal-flip">
        <div class="reveal-back"><img src="assets/logo.png" alt="" /></div>
        <div class="reveal-front">${cardMarkup(card, rarity, { tilt: true, t, points })}</div>
      </div>
      ${points ? `<p class="reveal-points">${t("reveal.points", { n: points })}</p>` : ""}
      <button class="btn-gold reveal-keep" data-keep>${t("reveal.keep")}</button>
    </div>`;
  overlay.hidden = false;
  const flip = overlay.querySelector(".reveal-flip");
  enableTilt(overlay.querySelector(".dyk-card"));
  requestAnimationFrame(() => overlay.classList.add("is-open"));
  setTimeout(() => {
    flip.classList.add("is-flipped");
    burst(overlay.querySelector(".reveal-stage"));
    sfx.unlock();
  }, 900);

  return new Promise((resolve) => {
    overlay.querySelector("[data-keep]").addEventListener(
      "click",
      () => {
        overlay.classList.remove("is-open");
        setTimeout(() => {
          overlay.hidden = true;
          overlay.innerHTML = "";
          resolve();
        }, 350);
      },
      { once: true },
    );
  });
}
