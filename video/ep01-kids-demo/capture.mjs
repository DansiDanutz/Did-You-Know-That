// Records the real app (dexty.live) at phone size for the Episode 1 demo:
// one continuous take, with the start time of every step written to
// assets/cap/marks.json so build.mjs can trim each step to its narration.
// Uses the HyperFrames-installed Playwright and the "Maya" test name (never a
// real child's name). Run from this folder: node capture.mjs [origin]
import { writeFileSync, readdirSync, renameSync } from "node:fs";
import { chromium } from "/Users/davidai/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core/index.mjs";

const ORIGIN = process.argv[2] ?? "https://dexty.live";
const OUT = new URL("assets/cap/", import.meta.url).pathname;
const EXE = "/Users/davidai/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  recordVideo: { dir: OUT, size: { width: 780, height: 1688 } },
});
const page = await ctx.newPage();
await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
const t0 = Date.now();
const marks = {};
const mark = (id) => { marks[id] = +((Date.now() - t0) / 1000).toFixed(2); };
const tap = async (sel, ms = 700) => { await page.click(sel); await sleep(ms); };
const isVisible = (sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].some((e) => e.offsetParent && !e.closest("[inert]")), sel);
const waitVisible = async (sel, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { if (await isVisible(sel)) return true; await sleep(200); } throw new Error("never visible: " + sel); };
const turnUntil = async (sel, max = 14) => { for (let i = 0; i < max; i++) { if (await isVisible(sel)) return; await page.click('[aria-label="Next page"]'); await sleep(900); } throw new Error("never reached: " + sel); };
const clickVisible = async (sel) => { await waitVisible(sel); await page.evaluate((sel) => [...document.querySelectorAll(sel)].find((e) => e.offsetParent && !e.closest("[inert]")).click(), sel); };
const setLight = async (x, y) => page.evaluate(([x, y]) => {
  for (const [k, v] of [["x", x], ["y", y]]) {
    const el = document.querySelector(`#mission-layer [data-light="${k}"]`);
    el.value = String(v); el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}, [x, y]);

await page.goto(`${ORIGIN}/?v=demo`, { waitUntil: "networkidle" });
await sleep(1200);

// ---- open: Kids, name, Start
mark("open");
await sleep(800);
await tap('[data-audience="kids"]', 900);
await page.click(".name-input");
await page.type(".name-input", "Maya", { delay: 160 });
await sleep(700);
await tap("#start-go", 4500); // greeting bubble "Hi, Maya!"

// ---- road: walk and go in
mark("road");
await tap('[aria-label="Walk right"]', 900);
await tap('[aria-label="Walk left"]', 1200);
await tap('[aria-label="Go in"]', 3000);

// ---- book: turn pages, tap a spark
mark("book");
await turnUntil(".spark-word");
await sleep(1200);
await clickVisible(".spark-word");
await sleep(2600);
await tap('[aria-label="Next page"]', 1300);
await tap('[aria-label="Next page"]', 1300);

// ---- quiz: reach q1 and answer the three questions
mark("quiz");
await turnUntil('[data-quiz="q1"]');
for (const [q, c] of [["q1", 1], ["q2", 0], ["q3", 2]]) {
  await sleep(600);
  await clickVisible(`[data-quiz="${q}"][data-choice="${c}"]`); await sleep(1500);
  await tap('[aria-label="Next page"]', 700);
}

// ---- card: reveal, then the backpack
mark("card");
await turnUntil('[data-action="reveal"]');
await sleep(600);
await clickVisible('[data-action="reveal"]');
await sleep(4200);
await page.keyboard.press("Escape").catch(() => {});
await page.evaluate(() => document.querySelector("#reveal-layer button, #reveal-layer [data-close]")?.click());
await sleep(900);
await tap('[data-action="continue"]', 2200).catch(() => {});
await tap("#hud-inventory", 2500);
await page.evaluate(() => document.querySelector("#panel-layer [data-close]")?.click());
await sleep(800);

// ---- mission: The Missing Shadow, start to reward
mark("mission");
await tap('[data-home="mission"]', 1800);
await tap('#mission-layer [data-go="predict"]', 1200);
await tap('#mission-layer [data-predict="0"]', 1600);
await tap('#mission-layer [data-go="experiment"]', 1200);
await setLight(80, 440); await sleep(1400);
await setLight(500, 232); await sleep(1600);
await tap('#mission-layer [data-go="apply"]', 1200);
await setLight(930, 440); await sleep(1800);
await tap('#mission-layer [data-go="sky"]', 1500);
await tap('#mission-layer [data-go="reward"]', 1200);
await page.evaluate(() => document.querySelector("#mission-layer .outfit-row button, #mission-layer .outfit-row [data-choose], #mission-layer .outfit-row .outfit-card")?.click());
await sleep(2200);
await page.evaluate(() => document.querySelector("#mission-layer [data-go='finish'], #mission-layer [data-finish]")?.click());
await sleep(1200);
await page.evaluate(() => document.querySelector("#mission-layer [data-close]")?.click());
await sleep(600);

// ---- bye: Dexter on the road in the new coat
mark("bye");
await tap('[aria-label="Walk right"]', 1200);
await sleep(3000);
mark("end");

await ctx.close();
await browser.close();
const webm = readdirSync(OUT).find((f) => f.endsWith(".webm"));
renameSync(`${OUT}${webm}`, `${OUT}take.webm`);
writeFileSync(`${OUT}marks.json`, JSON.stringify(marks, null, 2));
console.log("recorded assets/cap/take.webm", marks);
