// scripts/audit-samples.mjs — compile every code sample the wiki shows a reader.
//
//   scrml build . --target static --output <dir>
//   node scripts/audit-samples.mjs <dir>          # exit 0 = every sample honest
//
// WHY: the wiki's other gates prove routes resolve and pixels render. They
// cannot prove the DOCUMENTATION IS TRUE. The cheapest executable proxy for
// truth in a language reference is: does the code we tell people to write
// actually compile? This extracts every <pre><code> block from the BUILT site
// and compiles each against the compiler.
//
// THIS IS A GATE (since 2026-09-29). It exits 1 when any sample is dishonest,
// and CI (.github/workflows/deploy.yml) runs it before publishing. Until then
// it was advisory and ~20 reader-facing samples had quietly stopped compiling
// (some never had).
//
// THE RULE — every <pre> block is one of:
//
//   (unlabelled)  scrml the reader can copy. It MUST compile: as-is when it
//                 contains a <program> element, otherwise wrapped in a minimal
//                 <program>. A failure fails the gate. Exception: on an error
//                 reference page (/reference/errors/E-FOO) a sample that fails
//                 WITH ITS OWN CODE is the page being correct.
//   shell         auto-detected (starts with bun/git/cd/curl/npm/npx/scrml/$).
//
//   Or it carries a data-sample="…" label on the <pre>. Labels the reader can
//   SEE are rendered as a caption by app.scrml's `pre[data-sample]::before`:
//
//   fragment  "fragment — not a complete program": lines lifted out of a larger
//             program; they need declarations the block does not show.
//   syntax    "syntax summary": a grammar line with placeholders.
//   spec      "specified — not in the shipping compiler yet": designed and in
//             SPEC, but the compiler does not build it. Never use this for
//             something that is merely broken.
//   error     "does not compile — shows the error": the block exists to show
//             a diagnostic. The gate REQUIRES it to fail; if the compiler
//             starts accepting it, the page is now wrong and the gate says so.
//   other     not scrml at all (JavaScript/TypeScript "before" code, SQL, CSS
//             or JS the compiler emitted, terminal output). No caption.
//
// Labelling is a claim a reviewer can check; it is not an escape hatch. Prefer
// making a sample compile over labelling it.
//
// Env: SCRML (compiler entry, default: the linked dependency), AUDIT_WORK
// (scratch dir, default: $TMPDIR/scrml-site-audit-<pid>), AUDIT_JOBS
// (parallelism, default 6), AUDIT_ALL=1 also prints passing samples.
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";

const DIST = process.argv[2] || "dist";
// Resolve the compiler THROUGH the linked dependency, not an absolute path —
// a hardcoded /home/<user>/... breaks on any other machine. SCRML overrides.
const SCRML = process.env.SCRML
  || new URL("../node_modules/scrml/compiler/bin/scrml.js", import.meta.url).pathname;
const WORK = process.env.AUDIT_WORK || join(tmpdir(), `scrml-site-audit-${process.pid}`);
const JOBS = Number(process.env.AUDIT_JOBS || 6);
const LABELS = new Set(["fragment", "syntax", "spec", "error", "other"]);

const walk = (d, o = []) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) { if (e !== "data") walk(p, o); }
    else if (e.endsWith(".html")) o.push(p);
  }
  return o;
};

const unescape = (s) => s
  .replace(/<\/?span[^>]*>/g, "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&hellip;/g, "…")
  .replace(/&minus;/g, "−").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

const samples = [];
const badLabels = [];
for (const f of walk(DIST)) {
  let route = "/" + relative(DIST, f).replace(/\.html$/, "");
  route = route.replace(/\/index$/, "") || "/";
  const doc = readFileSync(f, "utf8");
  const re = /<pre([^>]*)>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g;
  let m, i = 0;
  while ((m = re.exec(doc))) {
    const label = (m[1].match(/data-sample="([^"]*)"/) || [])[1] || null;
    const code = unescape(m[2]);
    const idx = i++;
    if (label && !LABELS.has(label)) badLabels.push(`${route} #${idx} data-sample="${label}"`);
    samples.push({ route, i: idx, label, code });
  }
}

const isShell = (c) => /^\s*(curl|bun|npm|npx|git|cd|scrml|\$)\s/.test(c);
const hasProgram = (c) => /<program[\s>]/.test(c);

function compile(s, n) {
  const dir = join(WORK, String(n));
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const src = hasProgram(s.code) ? s.code : `<program>\n${s.code}\n</program>\n`;
  writeFileSync(join(dir, "app.scrml"), src);
  return new Promise((res) => {
    execFile("bun", [SCRML, "build", dir, "--output", join(dir, "out")],
      { encoding: "utf8", timeout: 120000, maxBuffer: 16 << 20 },
      (err, stdout, stderr) => {
        const out = (stdout || "") + (stderr || "");
        res({ rc: err ? 1 : 0, codes: [...new Set(out.match(/\bE-[A-Z0-9-]+/g) || [])] });
      });
  });
}

const results = [];
let next = 0;
async function worker() {
  while (next < samples.length) {
    const n = next++;
    const s = samples[n];
    if (s.label && s.label !== "error") { results.push({ ...s, verdict: "skip" }); continue; }
    if (!s.label && isShell(s.code)) { results.push({ ...s, verdict: "skip" }); continue; }
    const r = await compile(s, n);
    const own = s.route.match(/\/reference\/errors\/(E-[A-Z0-9-]+)/)?.[1];
    let verdict;
    if (s.label === "error") verdict = r.rc ? "ok-error" : "FAIL-compiles";
    else if (!r.rc) verdict = "ok";
    else if (own && r.codes.includes(own)) verdict = "ok-own-error";
    else verdict = "FAIL";
    results.push({ ...s, ...r, verdict });
  }
}
mkdirSync(WORK, { recursive: true });
await Promise.all(Array.from({ length: JOBS }, worker));
rmSync(WORK, { recursive: true, force: true });

results.sort((a, b) => (a.route + a.i).localeCompare(b.route + b.i));
const count = (v) => results.filter((r) => r.verdict === v).length;
const fails = results.filter((r) => r.verdict.startsWith("FAIL"));
const byLabel = {};
for (const r of results) byLabel[r.label || (isShell(r.code) ? "shell" : "scrml")] = (byLabel[r.label || (isShell(r.code) ? "shell" : "scrml")] || 0) + 1;

console.log(`\nsamples: ${results.length}   ${JSON.stringify(byLabel)}`);
console.log(`compiled OK: ${count("ok")}   error pages showing their own code: ${count("ok-own-error")}   labelled error demos failing as they should: ${count("ok-error")}   skipped (labelled/shell): ${count("skip")}`);
if (process.env.AUDIT_ALL) for (const r of results) console.log(`  ${r.verdict.padEnd(14)} ${r.route} #${r.i} ${r.label || ""}`);
for (const b of badLabels) console.log(`  FAIL unknown label ${b}`);
for (const r of fails) {
  const why = r.verdict === "FAIL-compiles" ? "labelled error but COMPILES" : (r.codes.slice(0, 4).join(",") || "non-zero exit");
  console.log(`  FAIL ${r.route} #${r.i}  ${why}\n       ${r.code.trim().split("\n")[0].slice(0, 100)}`);
}
const bad = fails.length + badLabels.length;
console.log(bad ? `\naudit-samples: RED — ${bad} dishonest sample(s)` : "\naudit-samples: GREEN");
process.exit(bad ? 1 : 0);
