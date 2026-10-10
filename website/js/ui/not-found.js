// /subject/<anything> that has no page yet → search for that word instead of a dead end.
export function init() {
  const match = window.location.pathname.match(/^\/subject\/([^/]+)\/?$/);
  if (!match) return;
  let word = "";
  try {
    word = decodeURIComponent(match[1]).replace(/[-_]+/g, " ").trim();
  } catch {
    return;
  }
  if (word) window.location.replace(`/?q=${encodeURIComponent(word)}#map`);
}
