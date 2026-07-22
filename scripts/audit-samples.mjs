// scripts/audit-samples.mjs — compile every code sample the wiki documents.
//
//   scrml build . --output dist-audit   # or just run scripts/serve.sh once
//   node scripts/audit-samples.mjs [distDir]
//
// WHY: the wiki's gates prove routes resolve and pixels render. They cannot
// prove the DOCUMENTATION IS TRUE. The cheapest executable proxy for truth in a
// language reference is: does the code we tell people to write actually compile?
// This extracts every <pre><code> block from the built site and compiles each
// against the linked compiler.
//
// ADVISORY, not merge-blocking — read the caveat before treating a FAIL as a bug:
//
//   Samples come in kinds. A SELF-CONTAINED sample (contains `<program>`) must
//   compile standalone; those failures are real and actionable. A FRAGMENT is a
//   few lines lifted out of a larger program — it is wrapped in a minimal
//   <program> here, which cannot supply the surrounding declarations, so
//   E-STATE-UNDECLARED / E-CTX-00x / E-SCOPE-001 on a fragment usually means
//   "the harness lacks context", NOT "the doc is wrong". Judge fragments by
//   whether the error names a REMOVED OR INVALID CONSTRUCT.
//
//   Error-reference pages (/reference/errors/E-FOO) deliberately show code that
//   triggers E-FOO. A sample under that route failing with its own code is the
//   documentation being CORRECT; those are auto-excluded.
//
// Findings this caught on its first run (2026-07-22), all since fixed:
//   - reference/keywords/lift + derived documented `forEach(x => lift ...)`,
//     which is not lowerable (E-CODEGEN-INVALID-LOGIC). The `lift` page was
//     documenting `lift` with an idiom that does not compile.
//   - articles/why-deprecate-overloading used `not <expr>` for boolean negation
//     (E-TYPE-045) — `not` is the absence value; `!` negates.
//   - reference/elements/channel had a `server function` reading a channel cell
//     (E-CHANNEL-SERVER-CELL-READ). A channel-cell write is CLIENT-side (§38.4).
//
// It also cleared things that LOOKED wrong: `server function` is still valid
// (31 uses across the wiki, deliberately untouched), and plain `forEach` without
// `lift` is fine. Verify before "fixing" working documentation.
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const DIST = process.argv[2] || "dist";
const SCRML = "/home/bryan/scrmlMaster/scrml/compiler/bin/scrml.js";
const WORK = "/tmp/scrml-site-audit";

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
  .replace(/&mdash;/g, "—").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

const samples = [];
for (const f of walk(DIST)) {
  let route = "/" + relative(DIST, f).replace(/\.html$/, "");
  route = route.replace(/\/index$/, "") || "/";
  const doc = readFileSync(f, "utf8");
  const re = /<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g;
  let m, i = 0;
  while ((m = re.exec(doc))) {
    const code = unescape(m[1]);
    if (code.trim().length >= 10) samples.push({ route, i: i++, code });
  }
}

const isShell = (c) => /^\s*(curl|bun|npm|npx|git|cd|\$)\s/.test(c);
const isSkeleton = (c) => c.includes("...") || c.includes("…");
const kindOf = (c) => isShell(c) ? "shell" : isSkeleton(c) ? "skeleton"
  : c.includes("<program>") ? "self-contained" : "fragment";

let ok = 0, failReal = 0, failFrag = 0, skipped = 0;
const real = [];
for (const s of samples) {
  const kind = kindOf(s.code);
  if (kind === "shell" || kind === "skeleton") { skipped++; continue; }
  // error-reference pages demonstrate their own error on purpose
  const own = s.route.match(/\/reference\/errors\/(E-[A-Z0-9-]+)/)?.[1];
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  const src = kind === "self-contained" ? s.code : `<program>\n${s.code}\n</program>\n`;
  writeFileSync(join(WORK, "app.scrml"), src);
  let out = "", code = 0;
  try { out = execFileSync("bun", [SCRML, "build", WORK, "--output", join(WORK, "out")], { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = 1; out = (e.stdout || "") + (e.stderr || ""); }
  if (!code) { ok++; continue; }
  const codes = [...new Set(out.match(/E-[A-Z0-9-]+/g) || [])];
  if (own && codes.includes(own)) { skipped++; continue; }   // correct by design
  if (kind === "self-contained") { failReal++; real.push({ ...s, kind, codes }); }
  else { failFrag++; }
}

console.log(`\nsamples: ${samples.length}   compiled OK: ${ok}   skipped (shell/skeleton/self-demo): ${skipped}`);
console.log(`fragment failures (usually missing harness context — judge by error): ${failFrag}`);
console.log(`SELF-CONTAINED failures (actionable): ${failReal}`);
for (const r of real) console.log(`  FAIL ${r.route} #${r.i}  ${r.codes.slice(0, 3).join(",")}`);
process.exit(0);   // advisory — never blocks
