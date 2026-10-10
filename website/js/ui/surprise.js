// "Surprise me": shows a random subject word from a published episode and links to its video.
// Before anything is published it says so honestly instead of pointing at drafts.
import { loadCatalog } from "../lib/catalog-client.js";
import { surpriseWords, pickWord } from "../lib/random-word.js";

export function init() {
  const box = document.querySelector("[data-surprise]");
  const button = box?.querySelector("[data-surprise-button]");
  const out = box?.querySelector("[data-surprise-out]");
  if (!button || !out) return;
  let previous = null;

  button.hidden = false;
  button.addEventListener("click", async () => {
    try {
      const words = surpriseWords(await loadCatalog());
      const pick = pickWord(words, { previous });
      out.replaceChildren();
      if (!pick) {
        out.append("The first episode premieres soon — guess its subject before it does. ");
        const link = Object.assign(document.createElement("a"), { href: box.dataset.next || "/#featured", textContent: "Lock your guess" });
        out.append(link);
        return;
      }
      previous = pick.word;
      const word = Object.assign(document.createElement("strong"), { className: "surprise-word", textContent: pick.word });
      const link = Object.assign(document.createElement("a"), { className: "surprise-go", href: pick.url, textContent: `Watch “${pick.title}” →` });
      out.append(word, " ", link);
    } catch (error) {
      console.error("Surprise me failed", error);
      out.textContent = "Couldn’t load the episodes. Try the search above.";
    }
  });
}
