import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateSiteConfig, resolveNewsletter, withFormAction, newsletterBlock, newsletterPrivacy } from "../tools/lib/newsletter.mjs";
import { renderSite, buildSite } from "../tools/build-site.mjs";

const SITE_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const loadCatalog = () => JSON.parse(readFileSync(join(SITE_ROOT, "data", "episodes.json"), "utf8"));
const BUTTONDOWN = { newsletter: { provider: "buttondown", action: "https://buttondown.com/api/emails/embed-subscribe/dexty" } };
const KIT = { newsletter: { provider: "kit", action: "https://app.kit.com/forms/1234567/subscriptions" } };
const BEEHIIV = { newsletter: { provider: "beehiiv", action: "https://embeds.beehiiv.com/subscribe/abc" } };

test("an unconfigured newsletter is valid and switched off", () => {
  assert.deepEqual(validateSiteConfig({}), []);
  assert.deepEqual(validateSiteConfig({ newsletter: null }), []);
  assert.deepEqual(validateSiteConfig({ newsletter: { provider: null, action: null } }), []);
  assert.deepEqual(validateSiteConfig(JSON.parse(readFileSync(join(SITE_ROOT, "data", "site.json"), "utf8"))), []);
  assert.equal(resolveNewsletter({ newsletter: { provider: null } }).provider, null);
});

test("each provider accepts its own hosted form URL", () => {
  for (const site of [BUTTONDOWN, KIT, BEEHIIV]) assert.deepEqual(validateSiteConfig(site), [], site.newsletter.provider);
  assert.deepEqual(validateSiteConfig({ newsletter: { provider: "kit", action: "https://app.convertkit.com/forms/1/subscriptions" } }), []);
});

test("bad newsletter settings are refused with a clear reason", () => {
  const errorsFor = (newsletter) => validateSiteConfig({ newsletter }).join(" | ");
  assert.match(validateSiteConfig(null).join(), /JSON object/);
  assert.match(errorsFor("buttondown"), /must be an object/);
  assert.match(errorsFor({ provider: "mailchimp", action: "https://x.com" }), /one of: buttondown, beehiiv, kit/);
  assert.match(errorsFor({ provider: "kit", action: null }), /https form URL/);
  assert.match(errorsFor({ provider: "kit", action: "http://app.kit.com/forms/1/subscriptions" }), /https form URL/);
  assert.match(errorsFor({ provider: "kit", action: "https://evil.example/forms/1" }), /not a Kit host/);
  assert.match(errorsFor({ provider: "beehiiv", action: "https://beehiiv.com.evil.example/x" }), /not a beehiiv host/);
  assert.match(errorsFor({ provider: "beehiiv", action: "https://.beehiiv.com/x" }), /https form URL|not a beehiiv host/);
  assert.match(errorsFor({ ...BUTTONDOWN.newsletter, action: `${BUTTONDOWN.newsletter.action}?email=a` }), /query string/);
  assert.match(errorsFor({ ...BUTTONDOWN.newsletter, emailField: "e mail" }), /emailField/);
  assert.match(errorsFor({ ...BUTTONDOWN.newsletter, hiddenFields: ["x"] }), /hiddenFields must be an object/);
  assert.match(errorsFor({ ...BUTTONDOWN.newsletter, hiddenFields: { tag: 1 } }), /hiddenFields\.tag/);
  assert.match(errorsFor({ ...BUTTONDOWN.newsletter, privacyUrl: "ftp://x" }), /privacyUrl/);
});

test("resolveNewsletter fills in provider defaults and lets config override them", () => {
  const kit = resolveNewsletter(KIT);
  assert.equal(kit.emailField, "email_address");
  assert.equal(kit.origin, "https://app.kit.com");
  const buttondown = resolveNewsletter({ newsletter: { ...BUTTONDOWN.newsletter, emailField: "mail", hiddenFields: { tag: "site" }, privacyUrl: "https://dexty.live/p" } });
  assert.deepEqual(buttondown.hiddenFields, { embed: "1", tag: "site" });
  assert.equal(buttondown.emailField, "mail");
  assert.equal(buttondown.privacyUrl, "https://dexty.live/p");
});

test("the CSP form-action allows only 'self' plus the configured provider origin", () => {
  const vercel = readFileSync(join(SITE_ROOT, "vercel.json"), "utf8");
  assert.match(withFormAction(vercel, resolveNewsletter({})), /form-action 'self';/);
  const configured = withFormAction(vercel, resolveNewsletter(BUTTONDOWN));
  assert.match(configured, /form-action 'self' https:\/\/buttondown\.com;/);
  assert.equal(withFormAction(configured, resolveNewsletter({})), vercel, "switching off restores the original policy");
  assert.doesNotThrow(() => JSON.parse(configured));
  assert.throws(() => withFormAction("{}", resolveNewsletter({})), /no form-action/);
});

test("switched off, the form is disabled, has no action and cannot send an address", () => {
  const block = String(newsletterBlock(resolveNewsletter({}), { id: "t" }));
  assert.match(block, /Get the next mystery first/);
  assert.match(block, /<fieldset class="nl-fieldset" disabled>/);
  assert.match(block, /Newsletter launching soon/);
  assert.match(block, /We’ll email you when a new episode is out\. Unsubscribe anytime\./);
  assert.match(block, /<label class="nl-label" for="nl-email-t">/);
  assert.match(block, /href="#privacy"/);
  assert.doesNotMatch(block, /action=|method=|name="/);
  assert.match(String(newsletterPrivacy(resolveNewsletter({}))), /no email addresses are collected/);
});

test("configured, the form posts the email straight to the provider in a new tab", () => {
  const nl = resolveNewsletter(KIT);
  const block = String(newsletterBlock(nl, { id: "t" }));
  assert.match(block, /<form class="nl-form" action="https:\/\/app\.kit\.com\/forms\/1234567\/subscriptions" method="post" target="_blank" rel="noopener"/);
  assert.match(block, /type="email" name="email_address" required autocomplete="email"/);
  assert.match(block, /aria-describedby="nl-consent-t nl-state-t"/);
  assert.doesNotMatch(block, /disabled/);
  const bd = String(newsletterBlock(resolveNewsletter(BUTTONDOWN), { id: "t" }));
  assert.match(bd, /<input type="hidden" name="embed" value="1">/);
  const privacy = String(newsletterPrivacy(nl));
  assert.match(privacy, /goes straight from your browser to <a href="https:\/\/kit\.com\/privacy"/);
  assert.match(privacy, /double opt-in/);
  assert.match(privacy, /unsubscribe/);
});

test("every page shows the footer signup and privacy notice; the home page also shows it under the featured episode", () => {
  const files = renderSite(loadCatalog());
  for (const [path, page] of Object.entries(files).filter(([p]) => p.endsWith(".html"))) {
    assert.match(page, /id="nl-title-footer"/, path);
    assert.match(page, /<section class="privacy" id="privacy"/, path);
  }
  const home = files["index.html"];
  assert.match(home, /id="nl-title-home"/);
  assert.ok(home.indexOf('id="featured"') < home.indexOf('id="nl-title-home"'));
  assert.ok(home.indexOf('id="nl-title-home"') < home.indexOf('id="series"'));
  const configured = renderSite(loadCatalog(), KIT)["index.html"];
  assert.equal((configured.match(/action="https:\/\/app\.kit\.com/g) ?? []).length, 2);
});

test("the build syncs vercel.json with data/site.json and refuses an invalid config", () => {
  const dir = mkdtempSync(join(tmpdir(), "dyk-nl-"));
  try {
    mkdirSync(join(dir, "data"));
    cpSync(join(SITE_ROOT, "data", "episodes.json"), join(dir, "data", "episodes.json"));
    cpSync(join(SITE_ROOT, "assets", "episodes"), join(dir, "assets", "episodes"), { recursive: true });
    cpSync(join(SITE_ROOT, "vercel.json"), join(dir, "vercel.json"));
    writeFileSync(join(dir, "data", "site.json"), JSON.stringify(BUTTONDOWN));
    assert.equal(buildSite(dir, { check: true }).ok, false, "check notices the stale CSP");
    buildSite(dir);
    assert.match(readFileSync(join(dir, "vercel.json"), "utf8"), /form-action 'self' https:\/\/buttondown\.com;/);
    assert.match(readFileSync(join(dir, "index.html"), "utf8"), /action="https:\/\/buttondown\.com\/api\/emails\/embed-subscribe\/dexty"/);
    assert.ok(buildSite(dir, { check: true }).ok);
    writeFileSync(join(dir, "data", "site.json"), JSON.stringify({ newsletter: { provider: "kit", action: "https://evil.example/x" } }));
    assert.throws(() => buildSite(dir), /data\/site\.json is invalid/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
