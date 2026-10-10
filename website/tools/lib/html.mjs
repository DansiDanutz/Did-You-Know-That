// Tiny HTML templating: every interpolated value is escaped unless it is already trusted markup.

class Markup {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

/** Marks a string as trusted markup (only for markup produced by this module). */
export const raw = (value) => new Markup(String(value));

function renderValue(value) {
  if (value instanceof Markup) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join("");
  if (value === null || value === undefined || value === false) return "";
  return escapeHtml(value);
}

/** Tagged template: html`<p>${text}</p>` escapes text; nested html`` and arrays pass through. */
export const html = (strings, ...values) =>
  raw(strings.reduce((out, chunk, i) => out + chunk + (i < values.length ? renderValue(values[i]) : ""), ""));

/** A JSON-LD block that cannot break out of its <script> element. */
export const jsonLd = (data) =>
  raw(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`);
