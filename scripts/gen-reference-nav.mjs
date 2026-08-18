// scripts/gen-reference-nav.mjs — regenerate the reference sidebar INSIDE app.scrml
// (the flobase-style marked region) from the filesystem. Run after adding or
// removing a reference page:
//     node scripts/gen-reference-nav.mjs
//
// The nav is GENERATED, not hand-maintained: a hand-written tree over 70+ pages
// silently drifts the moment someone adds a page, and a nav that omits a page is
// worse than no nav (the page becomes unreachable by browsing).
import { readdirSync, writeFileSync, readFileSync } from "node:fs";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// STUB DETECTION. The prose-vs-SPEC audit (2026-07-22) found 35 of 74 reference
// pages are ~60-word placeholders while the median real page is ~180 words. The
// sidebar makes all 74 browsable, so without a marker half the tree leads to
// near-empty pages with no warning. Measured from SOURCE (not dist/) so the nav
// can be regenerated without a build.
const STUB_WORDS = 120;
const wordsIn = (path) => {
  let t = readFileSync(path, "utf8");
  t = t.replace(/^\s*\/\/[^\n]*$/gm, "");          // strip scrml line comments
  t = t.replace(/#\{[\s\S]*?\}/g, "");              // strip scoped CSS blocks
  t = t.replace(/<[^>]+>/g, " ");                    // strip markup
  t = t.replace(/&[a-z]+;|&#\d+;/g, " ");
  return t.split(/\s+/).filter(Boolean).length;
};
const isStub = (rel) => wordsIn(`pages/reference/${rel}.scrml`) < STUB_WORDS;
const list = (d) => readdirSync(`pages/reference/${d}`).filter((f) => f.endsWith(".scrml"))
  .map((f) => f.replace(/\.scrml$/, "")).filter((n) => n !== "index").sort();

const link = (slug, label, mono) => {
  const stub = isStub(slug);
  // `hard` (SPEC §20.8.3) opts this link OUT of soft navigation. It is
  // LOAD-BEARING — see the SOFT-NAV OPT-OUT block in app.scrml. Removing it
  // here silently re-breaks 73 sidebar links on the next regeneration.
  return `        <a hard href="/reference/${slug}" data-ref="${slug}"`
    + ` class="refnav-link${mono ? " font-mono" : ""}${stub ? " refnav-stub" : ""}"`
    + (stub ? ` title="stub — not yet written"` : "")
    + `>${esc(label)}${stub ? `<span class="refnav-stubdot" aria-label="stub">·</span>` : ""}</a>`;
};

const section = (title, body) =>
  `      <div class="refnav-group">\n`
  + `        <div class="refnav-title">${title}</div>\n${body}\n      </div>`;

const elements = list("elements").map((n) => link(`elements/${n}`, `<${n}>`, true)).join("\n");
const keywords = list("keywords").map((n) => link(`keywords/${n}`, n, true)).join("\n");
const contexts = list("contexts").map((n) => link(`contexts/${n}`, n, true)).join("\n");

// 54 error pages flat would drown the nav — group by code family.
const errs = list("errors");
const fam = {};
for (const e of errs) {
  const m = e.match(/^([EW])-([A-Z0-9]+)/);
  const k = m ? `${m[1]}-${m[2]}` : "other";
  (fam[k] ||= []).push(e);
}
const errBody = Object.keys(fam).sort().map((k) =>
  `        <details class="refnav-fam">\n`
  + `          <summary class="refnav-fam-sum font-mono">${k}-… <span class="refnav-count">${fam[k].length}</span></summary>\n`
  + fam[k].map((e) => link(`errors/${e}`, e, true)).join("\n") + `\n        </details>`
).join("\n");

const START = "    // <<< GENERATED reference sidebar — node scripts/gen-reference-nav.mjs >>>";
const END   = "    // <<< END generated reference sidebar >>>";
const nav = `${START}
    <nav class="refnav" aria-label="Reference">
${section("Elements", elements)}
${section("Keywords", keywords)}
${section("Contexts", contexts)}
${section("Errors &amp; warnings", errBody)}
    </nav>
${END}`;

// The nav lives in the SHELL, authored once, and is hidden by default; each
// reference page un-hides it with a scoped `#{}` rule. Two things forced this:
//   1. V1 has ONE flat <outlet> per shell (SPEC §20.8.1 — nested layouts are
//      v1.next), so there is no per-section layout to hang a sidebar on.
//   2. Importing it as a component is broken today: a purely-static
//      presentational component still emits `const { X } = _scrml_modules[...]`
//      into the PAGE's client.js, the page never script-includes the component
//      module, and that module registers an empty object anyway. Result:
//      TypeError on every reference page. Reported to ../scrml.
// Inlining it into all 74 pages instead would be ~14k generated lines. The shell
// costs one hidden <nav> per page and keeps a single source of truth.
const shell = readFileSync("app.scrml", "utf8");
const si = shell.indexOf(START), ei = shell.indexOf(END);
let next;
if (si !== -1 && ei !== -1) next = shell.slice(0, si) + nav + shell.slice(ei + END.length);
else next = shell.replace(/(\n\s*<\/main>)/, `\n${nav}$1`);
writeFileSync("app.scrml", next);
const all = [...list("elements").map((n) => `elements/${n}`), ...list("keywords").map((n) => `keywords/${n}`),
             ...list("contexts").map((n) => `contexts/${n}`), ...errs.map((n) => `errors/${n}`)];
const stubs = all.filter(isStub);
console.log(`generated: ${list("elements").length} elements, ${list("keywords").length} keywords, `
  + `${list("contexts").length} contexts, ${errs.length} errors in ${Object.keys(fam).length} families`);
console.log(`coverage: ${all.length - stubs.length}/${all.length} written, ${stubs.length} stubs marked`);
