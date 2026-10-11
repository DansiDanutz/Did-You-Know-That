// "Did you know?" of the day on the home page. The question is the same for everyone on a date
// (js/lib/daily.js). 5 points for a right FIRST answer, once per day, only from a submitted answer;
// "Just show me the fact" costs nothing. No streaks, no timers, nothing to lose.
import { dailyFor, dailyStatus, dailyEntry, answerDaily, skipDaily, localIsoDate } from "../lib/daily.js";
import { store, saveProgress } from "../lib/progress-client.js";
import { loadCatalog } from "../lib/catalog-client.js";
import { shuffledOrder } from "../lib/shuffle.js";
import { unlockedCard } from "./fact-card.js";

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

function factView(pick, verdict) {
  const card = pick.card
    ? unlockedCard({ card: pick.card, episode: { number: pick.number, subject: pick.subject } }, { shareable: true })
    : el("li", { className: "fact-card" }, [el("span", { className: "fact-text", textContent: pick.question.reveal })]);
  const more = el("a", { className: "btn btn-ghost btn-small", href: `/episodes/${pick.slug}/`, textContent: `Play “${pick.title}”` });
  return [
    el("p", { className: "daily-verdict", textContent: verdict, tabIndex: -1 }),
    el("p", { className: "daily-reveal", textContent: pick.question.reveal }),
    el("ul", { className: "fact-grid fact-grid-single" }, [card]),
    el("p", { className: "daily-next" }, ["A new question tomorrow — come back whenever you like. ", more]),
  ];
}

function questionView(pick, { retry }) {
  const form = el("form", { className: "quiz-form daily-form" });
  const options = shuffledOrder(pick.question.options.length).map((original) =>
    el("label", { className: "quiz-option" }, [
      el("input", { type: "radio", name: "daily", value: String(original), required: true }),
      el("span", { textContent: pick.question.options[original] }),
    ]),
  );
  const legend = el("legend", { className: "quiz-question", textContent: pick.question.question });
  form.append(
    el("p", { className: "quiz-step" }, [el("span", { textContent: `From No. ${String(pick.number).padStart(2, "0")} · ${pick.title}` }), el("span", { className: "quiz-era", textContent: pick.question.era })]),
    el("fieldset", {}, [legend, el("div", { className: "quiz-options" }, options)]),
    el("p", { className: "cta-row" }, [
      el("button", { className: "btn btn-primary", type: "submit", textContent: retry ? "Try again" : "Check my answer" }),
      el("button", { className: "btn btn-ghost", type: "button", textContent: "Just show me the fact" }),
    ]),
  );
  if (retry) form.prepend(el("p", { className: "daily-note", textContent: "Not quite — have another go (no points this time), or read the fact." }));
  return form;
}

export async function init() {
  const box = document.querySelector("[data-daily]");
  const status = Object.assign(document.createElement("p"), { className: "quiz-status" });
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (error) {
    console.error("Daily question unavailable", error);
    box.replaceChildren(el("p", { className: "quiz-wait", textContent: "Today’s question could not be loaded. Please try again later." }));
    return;
  }
  let today = localIsoDate();
  let pick = dailyFor(catalog, today);
  if (!pick) {
    box.replaceChildren(el("p", { className: "quiz-wait", textContent: "The first daily question arrives with the first episode." }));
    return;
  }

  /** Past midnight with the tab still open: show the new day's question instead of recording yesterday's. */
  const rolledOver = () => {
    const now = localIsoDate();
    if (now === today) return false;
    today = now;
    pick = dailyFor(catalog, today);
    render({ focus: true });
    status.textContent = "It’s a new day — here’s today’s question.";
    return true;
  };

  const render = ({ focus = false, verdict = "" } = {}) => {
    const state = store.load();
    const mode = dailyStatus(state, today);
    if (mode === "done") {
      const entry = dailyEntry(state, today);
      const text = verdict || (entry.skipped ? "Here’s today’s fact." : entry.first === pick.question.answerIndex ? "You got today’s question right first time." : "You solved today’s question.");
      box.replaceChildren(...factView(pick, text), status);
      if (focus) box.querySelector(".daily-verdict").focus();
      return;
    }
    const form = questionView(pick, { retry: mode === "retry" });
    box.replaceChildren(form, status);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (rolledOver()) return;
      const picked = form.querySelector("input[name=daily]:checked");
      if (!picked) {
        status.textContent = "Pick one answer first.";
        form.querySelector("input")?.focus();
        return;
      }
      const result = answerDaily(store.load(), catalog, today, Number(picked.value), new Date().toISOString());
      saveProgress(result.state, result.awards);
      const earned = result.awards.reduce((sum, a) => sum + a.pts, 0);
      const message = result.correct ? (earned ? `Right first time! +${earned} points.` : "Right!") : "Not quite.";
      render({ focus: true, verdict: message });
      status.textContent = message;
      if (!result.correct) box.querySelector("input")?.focus();
    });
    form.querySelector("button[type=button]").addEventListener("click", () => {
      if (rolledOver()) return;
      saveProgress(skipDaily(store.load(), today));
      render({ focus: true });
    });
    if (focus) form.querySelector("input")?.focus();
  };
  render();
}
