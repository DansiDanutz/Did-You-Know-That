// Records the real site (dexty.live) at phone size for the Episode 1 adults demo:
// one continuous take with step marks in assets/cap/marks.json.
// Run from this folder: node capture.mjs [origin]
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
const scrollTo = async (sel, ms = 1200) => { await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ behavior: "smooth", block: "start" }), sel); await sleep(ms); };

await page.goto(`${ORIGIN}/?v=demo-a`, { waitUntil: "networkidle" });
await sleep(1200);

// ---- open: Teens & Adults, Start, the home with the editor's pick
mark("open");
await sleep(800);
await tap('[data-audience="adults"]', 1000);
await tap("#start-go", 2600);
await page.evaluate(() => document.querySelector(".archive-link")?.scrollIntoView({ behavior: "smooth", block: "center" }));
await sleep(2200);

// ---- question: the case file opens on its question and story
mark("question");
await page.click(".archive-link");
await page.waitForURL("**/archive/re-reading-trap/**");
await sleep(2200);
await scrollTo("#story-title", 1800);
await page.evaluate(() => window.scrollBy({ top: 420, behavior: "smooth" }));
await sleep(2200);

// ---- predict: choose, see the numbers
mark("predict");
await scrollTo("#predict-title", 1800);
await sleep(1400);
await tap('[data-choice="reread"]', 2600);
await page.evaluate(() => window.scrollBy({ top: 520, behavior: "smooth" }));
await sleep(3200);

// ---- dossier: tagged evidence
mark("dossier");
await scrollTo("#dossier-title", 1800);
await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
await sleep(2600);
await page.evaluate(() => window.scrollBy({ top: 700, behavior: "smooth" }));
await sleep(2600);

// ---- keep: save + takeaway
mark("keep");
await scrollTo("#keep-title", 1600);
await tap("[data-save]", 1800);
await page.click("#takeaway");
await page.type("#takeaway", "Close the book, recall, then check.", { delay: 70 });
await sleep(2200);

// ---- bye: back to the top of the file
mark("bye");
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await sleep(3500);
mark("end");

await ctx.close();
await browser.close();
const webm = readdirSync(OUT).find((f) => f.endsWith(".webm"));
renameSync(`${OUT}${webm}`, `${OUT}take.webm`);
writeFileSync(`${OUT}marks.json`, JSON.stringify(marks, null, 2));
console.log("recorded assets/cap/take.webm", marks);
