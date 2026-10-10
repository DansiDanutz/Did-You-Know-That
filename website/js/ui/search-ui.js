// Subject search on the home page: live results, keyboard navigation, deep links (/?q=sun).
import { buildIndex, search } from "../lib/search.js";
import { loadCatalog } from "../lib/catalog-client.js";

const ACCENTS = ["accent-orange", "accent-magenta", "accent-cyan", "accent-green", "accent-purple", "accent-blue"];
const TYPING_DELAY_MS = 120;

function resultItem(result, i) {
  const item = document.createElement("li");
  item.className = `result ${ACCENTS[i % ACCENTS.length]}`;
  const link = document.createElement("a");
  link.href = result.url;
  const word = Object.assign(document.createElement("span"), { className: "result-word", textContent: result.label });
  const title = Object.assign(document.createElement("span"), { className: "result-title", textContent: result.title });
  const go = Object.assign(document.createElement("span"), {
    className: "result-go",
    textContent: result.kind === "requested" ? "Vote →" : result.status === "published" ? "Play →" : "Coming soon →",
  });
  link.append(word, title, go);
  item.append(link);
  if (result.watchUrl) {
    const watch = Object.assign(document.createElement("a"), { className: "result-watch", href: result.watchUrl, textContent: "Watch on YouTube", rel: "noopener" });
    const line = document.createElement("p");
    line.append(watch);
    item.append(line);
  }
  return item;
}

function statusText(query, results) {
  if (!query.trim()) return "";
  if (!results.length) return `No episode for “${query}” yet. Suggest it in the YouTube comments — the most-requested subject becomes an episode.`;
  const first = results[0];
  const lead = first.kind === "episode" ? `Top match: ${first.label}, ${first.title}.` : `${first.label} is not made yet — vote for it.`;
  return `${results.length} result${results.length === 1 ? "" : "s"} for “${query}”. ${lead} Press Enter to open it.`;
}

export async function init() {
  const form = document.querySelector("[data-search]");
  const input = form.querySelector("input[name=q]");
  const list = document.getElementById("search-results");
  const status = document.getElementById("search-status");
  let index = [];
  let current = [];
  let timer = 0;

  const render = () => {
    current = search(index, input.value);
    list.replaceChildren(...current.map(resultItem));
    list.hidden = current.length === 0;
    status.textContent = statusText(input.value, current);
  };

  try {
    index = buildIndex(await loadCatalog());
  } catch (error) {
    console.error("Search index unavailable", error);
    status.textContent = "Search is unavailable right now — browse the map below instead.";
    return;
  }

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(render, TYPING_DELAY_MS);
  });

  form.addEventListener("submit", (event) => {
    clearTimeout(timer);
    render();
    if (current.length) {
      event.preventDefault();
      window.location.assign(current[0].url);
    } else if (input.value.trim()) {
      event.preventDefault();
      input.focus();
    }
  });

  // Arrow keys move between the input and the results.
  form.parentElement.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const links = [...list.querySelectorAll(".result > a")];
    if (!links.length) return;
    const at = links.indexOf(document.activeElement);
    if (document.activeElement !== input && at < 0) return;
    event.preventDefault();
    const next = event.key === "ArrowDown" ? at + 1 : at - 1;
    (next < 0 ? input : links[Math.min(next, links.length - 1)]).focus();
  });

  for (const example of form.querySelectorAll("[data-example]")) {
    example.addEventListener("click", (event) => {
      event.preventDefault();
      input.value = example.dataset.example;
      render();
      input.focus();
      history.replaceState(null, "", `/?q=${encodeURIComponent(input.value)}#map`);
    });
  }

  const query = new URLSearchParams(window.location.search).get("q");
  if (query) {
    input.value = query;
    render();
    document.getElementById("map")?.scrollIntoView({ block: "start", behavior: "instant" });
  }
}
