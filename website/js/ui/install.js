// "Install the app" on the start screen. Android/Chrome: one tap opens the
// system install dialog. iPhone: Apple allows no install button, so the same
// button shows the two Safari steps. Hidden whenever the app is installed.

import { installMode } from "../lib/install.js";

const FLAG_KEY = "dyk-installed";

const readFlag = () => {
  try {
    return localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
};
const writeFlag = (on) => {
  try {
    if (on) localStorage.setItem(FLAG_KEY, "1");
    else localStorage.removeItem(FLAG_KEY);
  } catch {
    /* storage blocked: the button may show again next time */
  }
};

const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

export function setupInstall(button, sheet, { t, toast }) {
  let deferred = null;
  const render = () => {
    const mode = installMode({ standalone: isStandalone(), installedFlag: readFlag(), hasPrompt: Boolean(deferred), userAgent: navigator.userAgent });
    button.hidden = mode === "hidden";
    button.textContent = t("install.button");
    button.dataset.mode = mode;
    if (mode === "hidden") sheet.hidden = true;
  };
  const installed = () => {
    deferred = null;
    writeFlag(true);
    render();
    toast(t("install.installed"));
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    writeFlag(false);
    render();
  });
  window.addEventListener("appinstalled", installed);
  button.addEventListener("click", async () => {
    if (button.dataset.mode === "ios") {
      sheet.innerHTML = `<b>${t("install.iosTitle")}</b><ol><li>${t("install.iosStep1")}</li><li>${t("install.iosStep2")}</li></ol>
        <button class="btn-gold" type="button" data-ios-done>${t("install.iosDone")}</button>`;
      sheet.hidden = !sheet.hidden;
      sheet.querySelector("[data-ios-done]")?.addEventListener("click", installed, { once: true });
      return;
    }
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") installed();
  });
  navigator.getInstalledRelatedApps?.()
    .then((apps) => apps.length > 0 && !deferred && (writeFlag(true), render()))
    .catch(() => {});
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch((error) => console.error("Service worker", error));
  render();
  return { refresh: render };
}
