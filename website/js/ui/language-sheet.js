// One language control everywhere: the current flag opens this bottom sheet
// (a list of full-width rows: flag, native name, ✓ on the current one).
// Closes on a pick, the Close button, a tap on the backdrop or Escape.

import { LANGUAGES } from "../i18n/index.js";
import { flagSvg } from "./flags.js";

export const languageName = (code) => LANGUAGES.find((lang) => lang.code === code)?.name ?? code;

export function openLanguageSheet(layer, { current, t, onPick }) {
  layer.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <span class="sheet-handle" aria-hidden="true"></span>
      <h2 id="sheet-title">${t("lang.title")}</h2>
      <ul class="lang-list">
        ${LANGUAGES.map(({ code, name }) => {
          const isCurrent = code === current;
          return `<li><button class="lang-row${isCurrent ? " is-current" : ""}" type="button" data-pick="${code}" aria-pressed="${isCurrent}" lang="${code}">
            ${flagSvg(code)}<span>${name}</span>${isCurrent ? '<b class="lang-check" aria-hidden="true">✓</b>' : ""}
          </button></li>`;
        }).join("")}
      </ul>
      <button class="sheet-close" type="button" data-sheet-close>${t("listen.close")}</button>
    </div>`;
  layer.hidden = false;
  requestAnimationFrame(() => layer.classList.add("is-open"));

  const close = () => {
    layer.classList.remove("is-open");
    document.removeEventListener("keydown", onKey);
    setTimeout(() => {
      layer.hidden = true;
      layer.innerHTML = "";
    }, 220);
  };
  const onKey = (event) => {
    if (event.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);
  layer.addEventListener(
    "click",
    function onClick(event) {
      const pick = event.target.closest("[data-pick]");
      if (pick) {
        layer.removeEventListener("click", onClick);
        close();
        if (pick.dataset.pick !== current) onPick(pick.dataset.pick);
        return;
      }
      if (event.target === layer || event.target.closest("[data-sheet-close]")) {
        layer.removeEventListener("click", onClick);
        close();
      }
    },
  );
}

// The single "current language" button used on the start screen and in Settings.
export const currentLanguageButton = (code, t) => `
  <button class="lang-current" type="button" data-open-lang aria-label="${t("lang.title")}: ${languageName(code)}. ${t("lang.change")}">
    ${flagSvg(code)}<span class="lang-current-name">${languageName(code)}</span><span class="lang-change">${t("lang.change")} ▾</span>
  </button>`;
