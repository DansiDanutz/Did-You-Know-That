import { test } from "node:test";
import assert from "node:assert/strict";

import { installMode } from "../js/lib/install.js";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36";

test("the install button never shows once the app is installed", () => {
  assert.equal(installMode({ standalone: true, hasPrompt: true, userAgent: ANDROID }), "hidden");
  assert.equal(installMode({ installedFlag: true, userAgent: IPHONE }), "hidden");
  assert.equal(installMode({ standalone: true, userAgent: IPHONE }), "hidden");
});

test("Android gets the one-tap system install, again after an uninstall", () => {
  assert.equal(installMode({ hasPrompt: true, userAgent: ANDROID }), "prompt");
  assert.equal(installMode({ installedFlag: true, hasPrompt: true, userAgent: ANDROID }), "prompt");
});

test("iPhone gets the Add to Home Screen steps", () => {
  assert.equal(installMode({ userAgent: IPHONE }), "ios");
});

test("browsers that cannot install show nothing", () => {
  assert.equal(installMode({ userAgent: ANDROID }), "hidden");
});
