// Header "Sign in" button + profile sheet: the old game's local sign-in, restyled for the site.
// Signing in attaches this browser's game progress (guesses, cards, rank) to the local profile.
import { createProfileStore, signIn, signOut } from "../lib/profile.js";
import { kidNickname } from "../lib/kid-names.js";
import { attachTo, unlockedCardIds, rankFor, totalCards } from "../lib/progress.js";
import { store as progressStore, saveProgress, PROGRESS_EVENT } from "../lib/progress-client.js";
import { loadCatalog } from "../lib/catalog-client.js";

const AUDIENCE_LABEL = { kids: "Kids 6–12", adults: "Teens & Adults" };

/** crypto.randomUUID needs a secure context; getRandomValues builds the same v4 shape elsewhere. */
function makeId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function init() {
  const button = document.querySelector("[data-profile-open]");
  const sheet = document.querySelector("[data-profile-sheet]");
  if (!button || !sheet || typeof sheet.showModal !== "function") return;

  const profiles = createProfileStore();
  let profile = profiles.load(makeId);
  let kidName = profile.audience === "kids" && profile.name ? profile.name : kidNickname();
  const $ = (selector) => sheet.querySelector(selector);
  const form = $("[data-profile-form]");
  const card = $("[data-profile-card]");
  const error = $("[data-profile-error]");

  const attachProgress = () => {
    if (!profile.signedIn) return;
    const state = progressStore.load();
    const attached = attachTo(state, profile.playerId);
    if (attached !== state) saveProgress(attached);
  };

  const renderStats = async () => {
    const state = progressStore.load();
    $("[data-profile-guesses]").textContent = String(Object.keys(state.guesses).length);
    try {
      const catalog = await loadCatalog();
      const count = unlockedCardIds(state, catalog).length;
      $("[data-profile-cards]").textContent = `${count}/${totalCards(catalog)}`;
      $("[data-profile-rank]").textContent = rankFor(count).name;
    } catch (failure) {
      console.error("Profile stats unavailable", failure);
    }
  };

  const renderAudience = (audience) => {
    $("[data-kid-panel]").hidden = audience !== "kids";
    $("[data-adult-panel]").hidden = audience !== "adults";
    $("[data-kid-name]").textContent = kidName;
  };

  const showForm = () => {
    form.hidden = false;
    card.hidden = true;
    $("[data-profile-title]").textContent = profile.signedIn ? "Change your name" : "Sign in on this device";
    form.elements.audience.value = profile.audience;
    form.elements.name.value = profile.audience === "adults" ? profile.name : "";
    error.textContent = "";
    renderAudience(profile.audience);
  };

  const showCard = () => {
    form.hidden = true;
    card.hidden = false;
    $("[data-profile-title]").textContent = `Hi, ${profile.name}!`;
    $("[data-profile-audience]").textContent = AUDIENCE_LABEL[profile.audience];
    renderStats();
  };

  const renderButton = () => {
    button.hidden = false;
    button.classList.toggle("is-signed-in", profile.signedIn);
    button.querySelector("[data-profile-label]").textContent = profile.signedIn ? `Hi, ${profile.name}` : "Sign in";
    button.setAttribute("aria-label", profile.signedIn ? `Your profile: ${profile.name}` : "Sign in on this device");
    for (const greeting of document.querySelectorAll("[data-profile-greeting]")) {
      greeting.hidden = !profile.signedIn;
      greeting.textContent = profile.signedIn ? `${profile.name}’s cards — saved to your profile on this device.` : "";
    }
  };

  const open = () => {
    if (profile.signedIn) showCard();
    else showForm();
    sheet.showModal();
  };

  button.addEventListener("click", open);
  sheet.addEventListener("click", (event) => {
    if (event.target === sheet || event.target.closest("[data-profile-close]")) sheet.close();
  });
  form.addEventListener("change", (event) => {
    if (event.target.name === "audience") renderAudience(event.target.value);
  });
  $("[data-kid-shuffle]").addEventListener("click", () => {
    kidName = kidNickname();
    $("[data-kid-name]").textContent = kidName;
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const audience = form.elements.audience.value;
    const result = signIn(profile, { audience, name: audience === "kids" ? kidName : form.elements.name.value });
    if (!result.ok) {
      error.textContent = result.error;
      (audience === "adults" ? form.elements.name : form.querySelector("input[name=audience]"))?.focus();
      return;
    }
    profile = result.profile;
    if (!profiles.save(profile)) console.warn("Profile kept for this visit only: storage is blocked.");
    attachProgress();
    renderButton();
    showCard();
  });
  $("[data-profile-edit]").addEventListener("click", showForm);
  $("[data-profile-signout]").addEventListener("click", () => {
    profile = signOut(profile);
    profiles.save(profile);
    renderButton();
    sheet.close();
    button.focus();
  });
  document.addEventListener(PROGRESS_EVENT, () => {
    attachProgress();
    if (sheet.open && !card.hidden) renderStats();
  });

  attachProgress();
  renderButton();
}
