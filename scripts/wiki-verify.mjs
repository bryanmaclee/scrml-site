// scripts/wiki-verify.mjs — the SITE-WIDE gate for scrml.dev.
//
//   bash scripts/serve.sh 8787 &     # wait for it to listen
//   node scripts/wiki-verify.mjs     # exit 0 = green
//
// gold-verify.mjs gates ONE page (the /showcase dissector and its provenance).
// This gates the wiki as a whole: every emitted route resolves, the shell
// renders on each, soft navigation actually works, and no page throws.
//
// Route list is DERIVED from dist/ rather than hardcoded, so a new page is
// covered the moment it compiles — a hardcoded list would silently stop
// covering the thing it is supposed to gate.
//
// playwright resolves through the linked compiler dependency (see PW below).
// Playwright resolves THROUGH the linked compiler dependency
// (node_modules/scrml -> the sibling scrml repo), not an absolute path: this repo
// carries no devDependencies, and a hardcoded /home/<user>/... breaks on any other
// machine or checkout layout. PLAYWRIGHT override is the escape hatch.
const PW = process.env.PLAYWRIGHT
  || new URL("../node_modules/scrml/node_modules/playwright/index.js", import.meta.url).pathname;
const pw = (await import(PW)).default;
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
const { chromium } = pw;

const ORIGIN = process.env.GATE_BASE || "http://localhost:8787";
const DIST = "dist";

// derive routes from emitted html
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== "data") walk(p, out); }
    else if (e.endsWith(".html")) out.push(p);
  }
  return out;
}
const routes = walk(DIST)
  .map((p) => "/" + relative(DIST, p).replace(/\.html$/, "").replace(/\/index$/, ""))
  .map((r) => (r === "/index" ? "/" : r))
  .filter((r) => r !== "/app")            // the shell is not a route
  .sort();

console.log(`derived ${routes.length} routes from ${DIST}/`);

const results = [];
const ok = (n, c, d = "") => results.push({ n, pass: !!c, d });

// 1. every route resolves
const bad = [];
for (const r of routes) {
  const res = await fetch(ORIGIN + r).catch(() => null);
  if (!res || res.status !== 200) bad.push(`${r} -> ${res ? res.status : "ERR"}`);
}
ok("every emitted route resolves 200", bad.length === 0,
   bad.length ? bad.slice(0, 6).join(", ") : `${routes.length}/${routes.length}`);

const b = await chromium.launch();
const page = await b.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));

// 2. shell renders on a spread of pages (landing, deep reference, article, showcase)
const sample = ["/", "/reference", "/reference/elements/engine", "/articles", "/getting-started", "/showcase"]
  .filter((r) => routes.includes(r));
const noShell = [];
for (const r of sample) {
  await page.goto(ORIGIN + r, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(300);
  const hdr = await page.locator("header.site-chrome").count();
  const ftr = await page.locator("footer.site-chrome").count();
  const outlet = await page.locator("[data-scrml-outlet]").count();
  if (!hdr || !ftr || !outlet) noShell.push(`${r}(h${hdr}/f${ftr}/o${outlet})`);
}
ok("shell + outlet render on every sampled page", noShell.length === 0,
   noShell.length ? noShell.join(" ") : `${sample.length} pages`);

// 3. SOFT NAV — clicking an in-site nav link must not reload the document.
// Stamp the window; a full document load wipes the stamp.
await page.goto(ORIGIN + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(600);
await page.evaluate(() => { window.__softNavProbe = "alive"; });
await page.locator('header a[href="/reference"]').first().click();
await page.waitForTimeout(1200);
const url = page.url();
const survived = await page.evaluate(() => window.__softNavProbe === "alive");
ok("soft nav: in-site link does NOT reload the document", survived && /\/reference$/.test(url),
   `url=${url.replace(ORIGIN, "")} stamp=${survived ? "survived" : "WIPED (full load)"}`);

// 3b. CODE-BLOCK CONTRAST — the reference pages ARE code samples. The
// typography layer ships `.prose-slate :where(code){color:#0f172a}`, a
// light-theme value that rendered every fenced example slate-900-on-slate-900,
// i.e. invisible. Assert <code> is not painted its own background.
const lum = (c) => { const m = c.match(/\d+/g); return m ? (0.2126*+m[0] + 0.7152*+m[1] + 0.0722*+m[2]) : null; };
const lowContrast = [];
for (const r of ["/reference/elements/engine", "/getting-started", "/learn/validators"].filter((x) => routes.includes(x))) {
  await page.goto(ORIGIN + r, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(400);
  const blocks = await page.evaluate(() => [...document.querySelectorAll("pre")].map((pre) => {
    const code = pre.querySelector("code");
    return { bg: getComputedStyle(pre).backgroundColor,
             fg: getComputedStyle(code || pre).color };
  }));
  for (const [i, bl] of blocks.entries()) {
    const d = Math.abs(lum(bl.fg) - lum(bl.bg));
    if (!(d > 60)) lowContrast.push(`${r}#pre${i} fg=${bl.fg} bg=${bl.bg} d=${Math.round(d)}`);
  }
}
ok("code blocks are readable (fg/bg luminance separated)", lowContrast.length === 0,
   lowContrast.length ? lowContrast.slice(0, 3).join(" | ") : "all sampled <pre> readable");

// 3c. REFERENCE SIDEBAR — visible on reference pages, hidden elsewhere, and the
// current page's link marked active. The nav is authored once in the shell and
// opted into per page via scoped CSS; a botched load-order or a missing opt-in
// block fails silently (the nav is simply invisible), so assert both directions.
await page.goto(ORIGIN + "/reference/elements/engine", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(500);
const navOn = await page.locator(".refnav").isVisible().catch(() => false);
const navLinks = await page.locator(".refnav-link").count();
const activeBorder = await page.locator('.refnav-link[data-ref="elements/engine"]')
  .evaluate((el) => getComputedStyle(el).borderLeftColor).catch(() => "");
await page.goto(ORIGIN + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(400);
const navOffHome = await page.locator(".refnav").isVisible().catch(() => false);
ok("reference sidebar: shown in-section, hidden out, current link active",
   navOn && navLinks > 60 && !navOffHome && /56, 189, 248/.test(activeBorder),
   `ref=${navOn} links=${navLinks} home=${navOffHome} active=${activeBorder}`);

// 4. no page errors across the sample
ok("no uncaught page errors", errs.length === 0, errs.length ? errs.slice(0, 3).join(" | ") : "clean");

await b.close();
console.log("\n=== WIKI GATE ===");
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.n}${r.d ? "  — " + r.d : ""}`);
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
