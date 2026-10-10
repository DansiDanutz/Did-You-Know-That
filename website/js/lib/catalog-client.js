// Fetches data/episodes.json once per page.
let pending = null;

export function loadCatalog() {
  pending ??= fetch("/data/episodes.json", { headers: { Accept: "application/json" } }).then((response) => {
    if (!response.ok) throw new Error(`episodes.json: HTTP ${response.status}`);
    return response.json();
  });
  return pending;
}

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
