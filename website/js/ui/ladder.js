// "How we saw it" ladder: one rung per era, 1500 at the bottom. Without JavaScript all panels show;
// here it becomes a tab list (arrow keys, Home/End) that reveals one rung at a time. The ladder is
// drawn bottom-up, so ArrowUp climbs to the next era and ArrowDown goes back. Purely for
// exploring — it never touches progress or points. Motion is CSS-only and off for reduced motion.
const KEYS = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };

function setup(root) {
  const list = root.querySelector("[data-ladder-rungs]");
  const buttons = [...root.querySelectorAll("[data-rung]")];
  const panels = [...root.querySelectorAll("[data-rung-panel]")];
  if (!buttons.length || buttons.length !== panels.length) return;

  list.setAttribute("role", "tablist");
  list.setAttribute("aria-orientation", "vertical");
  buttons.forEach((button, i) => {
    button.setAttribute("role", "tab");
    button.id ||= `${panels[i].id}-tab`;
    button.setAttribute("aria-controls", panels[i].id);
    button.closest("li").setAttribute("role", "presentation");
    panels[i].setAttribute("role", "tabpanel");
    panels[i].setAttribute("aria-labelledby", button.id);
    panels[i].removeAttribute("aria-label");
  });

  const select = (index, { focus = false } = {}) => {
    buttons.forEach((button, i) => {
      const active = i === index;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      button.closest("li").classList.toggle("is-active", active);
      button.closest("li").classList.toggle("is-climbed", i <= index);
      panels[i].hidden = !active;
    });
    if (focus) buttons[index].focus();
  };

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-rung]");
    if (!button) return;
    event.preventDefault();
    select(buttons.indexOf(button));
  });
  list.addEventListener("keydown", (event) => {
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    let next = null;
    if (event.key in KEYS) next = (current + KEYS[event.key] + buttons.length) % buttons.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = buttons.length - 1;
    if (event.key === " " || event.key === "Enter") next = current;
    if (next === null) return;
    event.preventDefault();
    select(next, { focus: true });
  });
  root.classList.add("is-interactive");
  select(0);
}

export function init() {
  document.querySelectorAll("[data-ladder]").forEach(setup);
}
