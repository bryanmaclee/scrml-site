// scripts/gold-verify.mjs — the scrml-site PRIMARY GATE (runtime-verify).
//
//   bash scripts/serve.sh 8787 &      # then, once it is listening:
//   node scripts/gold-verify.mjs      # exit 0 = gate green
//
// This repo has NO test suite — the running artifact IS the truth (S146
// serve-before-push). This script is that gate, made executable and
// version-controlled so it survives the session that wrote it.
//
// playwright is imported by ABSOLUTE path out of the linked compiler's
// node_modules: a bare specifier does not resolve from here, and scrml-site
// deliberately carries no devDependencies of its own.
//
// WHY THE NESTED-LIST ASSERTION EXISTS (assertion 11): on 2026-07-22 this gate
// passed 10/10 while the engine pane was silently rendering the WRONG
// flagship's engine — a v0.7.1 nested `for ... lift` reconcile bug that leaves
// nested subtrees stale when a backing cell is replaced in place. Flat lists
// updated fine, so nothing else caught it. Reported to ../scrml; the
// clear-then-refill workaround in selectFlagship() is load-bearing until it
// lands. Do not delete assertion 11 without re-verifying that bug is fixed.
import pw from "/home/bryan/scrmlMaster/scrml/node_modules/playwright/index.js";
const { chromium } = pw;

const BASE = "http://localhost:8787";
const results = [];
const ok = (n, c, d = "") => results.push({ n, pass: !!c, d });

const b = await chromium.launch();
const page = await b.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4000);

// 1. shell + selector
const srcPane = page.locator(".pane").filter({ hasText: "Source —" }).first();
const srcLine = srcPane.locator(".code-line");
const srcLines = await srcLine.count();
ok("source pane rendered", srcLines > 20, `${srcLines} source line nodes`);

const flagBtns = await page.locator(".flag-btn").count();
ok("flagship selector rendered", flagBtns >= 2, `${flagBtns} buttons`);

// 2. live flagship iframe mounts
const frames = page.frames().length;
ok("flagship iframe mounted", frames >= 2, `${frames} frames`);

// 3. JS tab cells exist
await page.locator(".tab", { hasText: "client.js" }).first().click().catch(() => {});
await page.waitForTimeout(400);
// JS cells are the sub-line spans; the source pane has none (its lines hold bare text).
const jsCell = page.locator(".code-line > span:not(.ln)");
const cells = await jsCell.count();
ok("JS output cells rendered", cells > 20, `${cells} cell nodes`);

// 4. FORWARD provenance — hover source lines until one lights JS cells
let fwdLine = null, fwdHot = 0;
const lineNodes = srcLine;
const nLines = await lineNodes.count();
for (let i = 0; i < Math.min(nLines, 220); i++) {
  await lineNodes.nth(i).hover({ force: true }).catch(() => {});
  const hot = await page.locator(".out-hot").count();
  if (hot > 0) { fwdLine = i; fwdHot = hot; break; }
}
ok("FORWARD hover lights JS cells", fwdHot > 0,
   fwdHot ? `source idx ${fwdLine} -> ${fwdHot} hot cell(s)` : "no source line lit any cell");

// 5. baseline clears
await page.mouse.move(5, 5);
await page.waitForTimeout(250);
const baseline = await page.locator(".out-hot").count();
ok("unhover clears highlight", baseline === 0, `${baseline} hot cells at rest`);

// 6. REVERSE provenance — hover a JS cell, expect a source line to activate
let revHot = 0;
const cellNodes = jsCell;
const nCells = await cellNodes.count();
for (let i = 0; i < Math.min(nCells, 300); i++) {
  await cellNodes.nth(i).hover({ force: true }).catch(() => {});
  const act = await page.locator(".src-active").count();
  if (act > 0) { revHot = act; break; }
}
ok("REVERSE hover activates source line", revHot > 0,
   revHot ? `${revHot} source line(s) active` : "no JS cell activated a source line");

// 7. SELECTOR switch — second flagship re-renders source
await page.mouse.move(5, 5);
const firstText = await srcLine.first().textContent().catch(() => "");
await page.locator(".flag-btn").nth(1).click();
await page.waitForTimeout(1200);
const secondText = await srcLine.first().textContent().catch(() => "");
ok("selector switches flagship source", firstText !== secondText,
   `"${(firstText || "").trim().slice(0, 40)}" -> "${(secondText || "").trim().slice(0, 40)}"`);

const activeBtn = await page.locator(".flag-btn.flag-active").count();
ok("active button state flips", activeBtn === 1, `${activeBtn} active`);

// 8. forward provenance on the SECOND flagship
let fwd2 = 0;
const l2 = srcLine;
const n2 = await l2.count();
for (let i = 0; i < Math.min(n2, 220); i++) {
  await l2.nth(i).hover({ force: true }).catch(() => {});
  const hot = await page.locator(".out-hot").count();
  if (hot > 0) { fwd2 = hot; break; }
}
ok("FORWARD hover works on flagship 2", fwd2 > 0, fwd2 ? `${fwd2} hot cell(s)` : "none");

// 9. NESTED-LIST reconcile — the engine pane is for(engines) > for(states) > for(next).
// The v0.7.1 nested-reconcile bug leaves this subtree stale on a flagship switch while
// every flat list updates correctly, so it must be asserted explicitly (10/10 passed
// WITHOUT this check while the pane was silently rendering the wrong flagship's engine).
const engTags2 = (await page.locator(".eg-state-tag").allTextContents()).sort().join(",");
await page.locator(".flag-btn").nth(0).click();
await page.waitForTimeout(1500);
const engTags1 = (await page.locator(".eg-state-tag").allTextContents()).sort().join(",");
ok("NESTED engine pane re-renders per flagship", engTags1 !== engTags2 && engTags1.length > 0,
   `${engTags2} -> ${engTags1}`);

await page.screenshot({ path: process.env.GATE_SHOT || "/tmp/scrml-site-gate.png", fullPage: false });
await b.close();

const hard = errs.filter((e) => !/ERR_INCOMPLETE_CHUNKED_ENCODING/.test(e));
console.log("\n=== GATE RESULTS ===");
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.n}${r.d ? "  — " + r.d : ""}`);
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
console.log(`page errors (excl. benign chunked-encoding): ${hard.length}`);
for (const e of hard.slice(0, 8)) console.log("  " + e.slice(0, 200));
process.exit(results.every((r) => r.pass) && hard.length === 0 ? 0 : 1);
