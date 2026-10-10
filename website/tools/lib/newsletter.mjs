// Newsletter signup: one provider-agnostic form driven by data/site.json → "newsletter".
// The site never stores an address: unconfigured, the form is switched off; configured, the browser
// posts the form straight to the provider's hosted endpoint (no API keys, no proxy, no script).
import { html } from "./html.mjs";
import { SUBSCRIBE_URL } from "./site.mjs";

/** Hosted-form endpoints we know how to post to. `hosts` guards against typos and foreign origins. */
export const PROVIDERS = {
  buttondown: {
    name: "Buttondown",
    hosts: ["buttondown.com", "buttondown.email"],
    emailField: "email",
    hiddenFields: { embed: "1" },
    privacyUrl: "https://buttondown.com/legal/privacy",
    example: "https://buttondown.com/api/emails/embed-subscribe/<username>",
  },
  beehiiv: {
    name: "beehiiv",
    hosts: ["*.beehiiv.com"],
    emailField: "email",
    hiddenFields: {},
    privacyUrl: "https://www.beehiiv.com/privacy",
    example: "https://<form host>.beehiiv.com/<form path from beehiiv>",
  },
  kit: {
    name: "Kit",
    hosts: ["app.kit.com", "app.convertkit.com"],
    emailField: "email_address",
    hiddenFields: {},
    privacyUrl: "https://kit.com/privacy",
    example: "https://app.kit.com/forms/<form id>/subscriptions",
  },
};

const FIELD_NAME = /^[A-Za-z0-9_[\]-]{1,64}$/;
const OFF = Object.freeze({ provider: null });

const hostAllowed = (host, patterns) =>
  patterns.some((pattern) => (pattern.startsWith("*.") ? host.endsWith(pattern.slice(1)) && host.length > pattern.length - 1 : host === pattern));

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** Problems with data/site.json (empty array = valid). */
export function validateSiteConfig(site) {
  if (!site || typeof site !== "object") return ["site.json must be a JSON object"];
  const newsletter = site.newsletter;
  if (newsletter === undefined || newsletter === null) return [];
  if (typeof newsletter !== "object") return ["newsletter must be an object"];
  if (newsletter.provider === null || newsletter.provider === undefined) return [];
  const provider = PROVIDERS[newsletter.provider];
  if (!provider) return [`newsletter.provider must be null or one of: ${Object.keys(PROVIDERS).join(", ")}`];

  const errors = [];
  const url = parseUrl(newsletter.action);
  if (!url || url.protocol !== "https:") {
    errors.push(`newsletter.action must be the provider's https form URL, e.g. ${provider.example}`);
  } else if (!hostAllowed(url.hostname, provider.hosts)) {
    errors.push(`newsletter.action host ${url.hostname} is not a ${provider.name} host (${provider.hosts.join(", ")})`);
  } else if (url.search || url.hash || url.username || url.password) {
    errors.push("newsletter.action must not contain a query string, fragment or credentials");
  }
  if (newsletter.emailField != null && !FIELD_NAME.test(newsletter.emailField)) errors.push("newsletter.emailField must be a plain field name");
  const hidden = newsletter.hiddenFields ?? {};
  if (typeof hidden !== "object" || Array.isArray(hidden)) {
    errors.push("newsletter.hiddenFields must be an object of name → value");
  } else {
    for (const [name, value] of Object.entries(hidden)) {
      if (!FIELD_NAME.test(name) || typeof value !== "string") errors.push(`newsletter.hiddenFields.${name} must be a plain name with a string value`);
    }
  }
  if (newsletter.privacyUrl != null && parseUrl(newsletter.privacyUrl)?.protocol !== "https:") errors.push("newsletter.privacyUrl must be an https URL");
  return errors;
}

/** The newsletter settings with provider defaults filled in; { provider: null } when switched off. */
export function resolveNewsletter(site) {
  const newsletter = site?.newsletter;
  if (!newsletter?.provider) return OFF;
  const defaults = PROVIDERS[newsletter.provider];
  return Object.freeze({
    provider: newsletter.provider,
    providerName: defaults.name,
    action: newsletter.action,
    origin: new URL(newsletter.action).origin,
    emailField: newsletter.emailField ?? defaults.emailField,
    hiddenFields: { ...defaults.hiddenFields, ...(newsletter.hiddenFields ?? {}) },
    privacyUrl: newsletter.privacyUrl ?? defaults.privacyUrl,
  });
}

const FORM_ACTION = /form-action [^;"]*/;

/** vercel.json text with the CSP form-action set to 'self' plus the configured provider origin. */
export function withFormAction(vercelJson, newsletter) {
  if (!FORM_ACTION.test(vercelJson)) throw new Error("vercel.json: Content-Security-Policy has no form-action directive");
  const sources = ["'self'", ...(newsletter.provider ? [newsletter.origin] : [])];
  return vercelJson.replace(FORM_ACTION, `form-action ${sources.join(" ")}`);
}

const CONSENT = "We’ll email you when a new episode is out. Unsubscribe anytime.";

/** The signup block. `id` keeps label/description ids unique when a page shows it twice. */
export function newsletterBlock(newsletter, { id, className = "" }) {
  const on = Boolean(newsletter.provider);
  const ids = { title: `nl-title-${id}`, email: `nl-email-${id}`, consent: `nl-consent-${id}`, state: `nl-state-${id}` };
  const fields = html`<label class="nl-label" for="${ids.email}">Email address</label>
    <span class="nl-row">
      <input class="nl-input" id="${ids.email}" type="email"${on ? html` name="${newsletter.emailField}" required` : ""} autocomplete="email" inputmode="email" spellcheck="false" placeholder="you@example.com" aria-describedby="${ids.consent} ${ids.state}">
      <button class="btn btn-primary nl-submit" type="submit">${on ? "Notify me" : "Newsletter launching soon"}</button>
    </span>`;
  const form = on
    ? html`<form class="nl-form" action="${newsletter.action}" method="post" target="_blank" rel="noopener" data-newsletter="${newsletter.provider}">
    ${fields}
    ${Object.entries(newsletter.hiddenFields).map(([name, value]) => html`<input type="hidden" name="${name}" value="${value}">`)}
  </form>`
    : html`<form class="nl-form is-off" data-newsletter="off"><fieldset class="nl-fieldset" disabled>
    <legend class="visually-hidden">Newsletter signup (not open yet)</legend>
    ${fields}
  </fieldset></form>`;
  const state = on
    ? html`Opens ${newsletter.providerName} in a new tab — confirm from the email they send you.`
    : html`Not open yet: this form is switched off and collects nothing. Meanwhile, <a href="${SUBSCRIBE_URL}" rel="noopener">subscribe on YouTube</a>.`;
  return html`<section class="newsletter ${className}" aria-labelledby="${ids.title}">
  <div class="nl-copy">
    <h2 class="nl-title" id="${ids.title}">Get the next mystery first</h2>
    <p class="nl-lede">One email when a new episode lands — with its question, so you can guess before you watch.</p>
  </div>
  <div class="nl-body">
  ${form}
  <p class="nl-consent" id="${ids.consent}">${CONSENT} <a href="#privacy">Privacy</a></p>
  <p class="nl-state" id="${ids.state}">${state}</p>
  </div>
</section>`;
}

/** The newsletter paragraph of the privacy notice. */
export function newsletterPrivacy(newsletter) {
  if (!newsletter.provider) {
    return html`<p><strong>Newsletter.</strong> Not open yet. The signup form is switched off and no email addresses are collected or stored anywhere.</p>`;
  }
  return html`<p><strong>Newsletter.</strong> If you sign up, your email address goes straight from your browser to <a href="${newsletter.privacyUrl}" rel="noopener">${newsletter.providerName}</a>, the service that sends our emails — this site never sees or stores it. ${newsletter.providerName} sends a confirmation email first (double opt-in), keeps your address only to send episode announcements, and every email has an unsubscribe link that removes you at once. We never sell or share the list.</p>`;
}
