# scrml-site — hand-off

## Session 7 — `server` SPLIT MIGRATION executed (2026-07-22)

Executed the scrml PA's ruling. **10 migrated · 1 held · `server fn` untouched.**

**Corrected our own count first.** We had reported 31 sites; the real figure is
**43 `server`-keyword occurrences**. The original grep missed pages that
obfuscate keywords as numeric character refs (`s&#101;rver f&#117;nction`) so the
doc page's own compile doesn't parse the sample. Proper breakdown:

| | count | action |
|---|---|---|
| `server fn` | 9 | **untouched** — NOT deprecated (SPEC §48), permanent for pure server-pinned helpers |
| `server function` in prose / inline `<code>` | 22 | **untouched** — editorial, not code |
| `server function` in `<pre>` code samples | 11 | the migration scope |

**The PA's suggested detector could not be used.** `W-DEPRECATED-SERVER-MODIFIER`
cannot fire on our samples: every one omits the `<db>`/`<schema>` a doc snippet
naturally leaves out, so they die on `E-SQL-004`/`E-SCHEMA-003`/`E-PA-002` before
placement analysis says anything. So we **validated the rule on a minimal
compiling case** and applied it structurally:

| variant | `.server.js` emitted | `W-DEPRECATED` | SQL in client bundle |
|---|---|---|---|
| **with** `server` | yes | **fires** | 0 |
| **without** `server` | **yes** | — | 0 |

That is the exact safety property the PA warned about, confirmed in the direction
that matters: **removing the keyword from a `?{}`-bodied function keeps it on the
server.** All 10 migrated sites have `?{}` SQL in the function body.
Migrated: `lsp-and-giti-advantages` · `orm-trap` · `server-boundary-disappears` ·
`tier-ladder-promotion` (×3) · `learn/server-boundary` · `reference/contexts/sql` (×3).

**HELD — 1 site.** `articles/v0.2.0-announce.scrml`, `server function postMessage`
inside a `<channel>` writing `@messages`. Trigger-free by the PA's rule → held per
instruction. **Not the secret-leak shape** — it is the §38.4 channel-cell case and
currently fails `E-CHANNEL-SERVER-CELL-READ`. We fixed the IDENTICAL pattern on
`reference/elements/channel.scrml` in the content audit. Not applied here because
it is a **v0.2.0 announcement** and the client-held model is the later 2026-06-12
RULING A. **OPERATOR CALL: do historical announcement articles get updated to
current semantics, or preserved as period records?** That decision governs this
file and probably others.

**GATES: wiki 6/6 · showcase 11/11 · `scrml build` exit 0 · sample audit unchanged
at 9 self-contained failures (no regressions).**

**Sent** `../scrml/handOffs/incoming/2026-07-22-1930-…-split-migration-done-plus-
static-component-import-bug.md`: migration report + **the static-component import
bug** owed from session 6 (a purely-static component's import emits a client
destructure of a module the page never loads, and which exports an empty object
anyway — 66 of our 74 reference pages threw). Also flagged that
`E-CODEGEN-INVALID-LOGIC` on `forEach(x => lift …)` should reject earlier with the
canonical form named.

**STILL HELD:** the trigger-free sweep, pending
`g-trigger-3-server-only-import-does-not-escalate` landing on their side.

**NEXT:** operator call on historical articles · prose-vs-SPEC audit · make the 9
context-poor doc snippets self-contained · deploy decisions (CNAME, Pages).

## Session 6 — reference sidebar + scrml PA ruling received (2026-07-22)

### A. REFERENCE SIDEBAR — landed, gated

~99 routes were served by a 7-item header nav; the 73-page reference tree had no
navigation of its own. Now it does: Elements (12) · Keywords (4) · Contexts (3) ·
Errors & warnings (54, collapsed into 28 `<details>` families with counts).
Sticky, scrollable, current page highlighted.

**Architecture — three constraints forced it, in order:**
1. **The shell cannot branch on route.** `route.*` is page-scoped; using it in
   `app.scrml` is `E-SCOPE-001`. So "render the sidebar only on /reference/*"
   cannot be expressed in the shell directly.
2. **No per-section layout.** SPEC §20.8.1: V1 has ONE flat `<outlet>` per shell;
   nested layouts are v1.next. So there is nowhere to hang a section layout.
3. **Component import is BROKEN for static components** (compiler bug, see C).

**Resulting design:** the nav is authored ONCE in `app.scrml`, **hidden by
default**, and each reference page opts in with a scoped `#{}` rule that shows it
and marks its own link active. Fully static — **zero client JS**, present in the
server HTML, no flash, crawlable.
- **GENERATED**: `node scripts/gen-reference-nav.mjs` rewrites the marked region
  in `app.scrml` from the filesystem. A hand-maintained tree over 73 pages drifts
  the moment someone adds a page, and a nav that omits a page makes it
  unreachable by browsing.
- **`!important` on the opt-in is load-order, not laziness:** the shell's
  `app.css` is linked AFTER the page stylesheet, so its `.refnav{display:none}`
  default wins at equal specificity. Documented inline at all 74 sites.

**GATE: wiki 6/6** (new assertion: sidebar shown in-section, hidden out,
current link active — it fails silently otherwise, since a botched opt-in just
renders nothing) **· showcase 11/11 · `scrml build` exit 0.**

### B. WHAT I TRIED FIRST AND BACKED OUT — component import

The obvious design (a `ReferenceNav` component imported by each page) **compiles
clean and renders correctly server-side, but throws on every reference page.**
The wiki gate caught it — 4/5, `no uncaught page errors` FAIL. Two compiler
defects compounding:
1. The page's `client.js` emits
   `const { ReferenceNav } = _scrml_modules["components/reference-nav.client.js"]`
   but **the page never script-includes that module** — so it is `undefined` →
   `TypeError` on all 66 reference pages that emit client JS.
2. That module registers an **empty object** anyway: a purely-static
   presentational component has nothing to export client-side.
Reverted the 74-file wiring and rebuilt on the shell+CSS approach. **Do not retry
the import approach until the compiler fix lands.**

### C. SCRML PA REPLY RECEIVED — the `server` arc is PARTIALLY unblocked

`handOffs/incoming/read/2026-07-22-1815-…-server-keyword-ruling-and-two-findings.md`

**Ruling: option 1.** Inference is meant to cover every case; `server` is fully
deprecated with plain `function` as the migration. No replacement annotation, no
permanent dual-status.

**But our question exposed a live HIGH defect on their side.** SPEC §12.2
Trigger 3 (a function importing a server-only stdlib module escalates) **is
spec'd and NOT implemented** — `SERVER_ONLY_SCRML_MODULES` exists but is only
consumed by async classification, never wired as a placement trigger. They
reproduced it with our exact `issueToken` example: **without `server`, no
`.server.js` is emitted at all and the secret ships to the browser**
(`grep -c "s3cr3t" app.client.js` → 1). Filed
`g-trigger-3-server-only-import-does-not-escalate` (HIGH, confidentiality-adjacent).
They confirmed holding the arc was correct and `server` is currently
**load-bearing, not redundant**.

**Our action — SPLIT the 31 sites, migrate only half:**
- **Redundant** (body has another trigger — `?{}` SQL, `broadcast()`, `handle()`,
  a server-classified caller): **migrate now**, delete the keyword. Reliable
  detector: **`W-DEPRECATED-SERVER-MODIFIER` fires exactly where it is redundant.**
- **Trigger-free**: **HOLD.** Deleting today silently relocates the function and
  any secret it closes over to the client. They will notify when Trigger 3 lands.
- **`server fn` is NOT deprecated** — permanent for pure server-pinned helpers
  (SPEC §48). Must not be swept up in the migration.
- No target version for hard removal; warn-only until Trigger 3 ships.

**Also ruled: `docs/website/` STAYS** on their side as a live test fixture for 3
compiler tests (esm-script-tag-module-format, tailwind-phase1-coverage,
bs-layer-corpus-friction-bugs). **Our migration stands and scrml-site is the
wiki** — the copy is a fixture, not a second source of truth. Nothing to do.

**NEXT:** the split-migration above (use `W-DEPRECATED-SERVER-MODIFIER` as the
detector) · report the static-component import bug to ../scrml · prose-vs-SPEC
audit · make the 9 context-poor doc snippets self-contained · deploy decisions.

## Session 5 — CONTENT AUDIT of the migrated wiki (2026-07-22)

Audited the ~99 migrated pages for prose/semantics drift against v0.7.1. Made it
**executable** rather than reading 99 pages: extracted all **140 `<pre><code>`
samples** from the built site and compiled each against the linked compiler.
Docs that don't compile are provably wrong.

**4 REAL DOC BUGS FOUND AND FIXED** (each isolated to a minimal repro, fixed, and
re-verified compiling):
1. **`reference/keywords/lift.scrml`** — documented `${ @contacts.forEach(c => lift
   <li>…</li>) }`. Not lowerable → `E-CODEGEN-INVALID-LOGIC`. **The `lift` page was
   documenting `lift` with an idiom that does not compile.** → `for (let c of …) {
   lift … }`.
2. **`reference/keywords/derived.scrml`** — same `forEach + lift` idiom. Same fix.
3. **`articles/why-deprecate-overloading.scrml`** — 6× `if (not fn(…))`, i.e. the
   REMOVED boolean-negation `not` (`E-TYPE-045`). `not` is the absence value; `!`
   negates. (Source obfuscates keywords as numeric char refs — `n&#111;t` — so the
   page's own compile doesn't parse them; fixed in that encoding.)
4. **`reference/elements/channel.scrml`** — the worked example had a
   `server function` READING the channel cell `@messages` →
   `E-CHANNEL-SERVER-CELL-READ`. Per SPEC §38.4 a channel-cell WRITE is
   **client-side** and auto-syncs; it needs no `server` keyword. Dropped the
   keyword, and **reconciled the caption**, which still said "one server function
   exposed to clients" and would otherwise have contradicted the corrected code.
5. **`articles/realtime-and-workers.scrml`** — the worker example used
   `export function` + `await <#compute>.fibonacci(35)`. **That API does not
   exist.** SPEC §4.12.4: workers use `when message(data) { … send(result) }` in
   the worker and `<#name>.send(value)` in the parent. Rewritten to the normative
   protocol; verified exit 0.

**VERIFIED NOT BUGS — tested before touching, deliberately left alone:**
- **`server function` — CORRECTED 2026-07-22, see below.** 31 uses across 11
  pages, left untouched. My test compiled clean with no deprecation warning, but
  that test used a function with NO other escalation trigger. **That claim is
  incomplete as stated** — see the Session-5 addendum.
- **Plain `forEach` (no `lift`) is valid** — `learn/validators.scrml` untouched.
- **11 error-reference pages fail with their own error code** — that is the
  documentation being CORRECT, not broken. Auto-excluded by the tool.
- `/reference/elements/page #1` "failure" is a **directory listing** in a `<pre>`,
  not code — an extractor false positive.

**LANDED THE AUDIT AS A TOOL — `scripts/audit-samples.mjs`** (advisory, never
blocks). Extracts every documented sample from `dist/`, classifies
(self-contained / fragment / skeleton / shell), auto-excludes error-page
self-demos, compiles each, and reports **self-contained failures as actionable**.
Header documents the caveat: fragment failures usually mean the harness lacks
surrounding context, NOT that the doc is wrong — judge by whether the error names
a removed or invalid construct.

**Result: self-contained failures 17 → 9.** The remaining 9 are all
"snippet omits a `<db>`/`<schema>`/surrounding declarations it needs"
(`E-PA-002` ×2, `E-SQL-004` ×2, `E-SCHEMA-003`, `E-SCOPE-001`/`E-STATE-UNDECLARED`
×3) plus the one extractor false positive. **No further dead-syntax bugs.** Worth
a later pass to make those snippets self-contained, but they teach nothing false.

**GATES: wiki 5/5 · showcase 11/11 · `scrml build` exit 0.**

**WHAT THIS AUDIT DOES NOT COVER — be honest about it.** Compiling proves
*syntax*, not *semantics*. A sample can compile and still describe the wrong
behaviour, cite a stale SPEC §, or explain a rule that has since inverted. Prose
claims ("X is the default", "Y is not yet supported") are entirely unchecked.
Spot-checks against SPEC caught #4 and #5 — a systematic prose-vs-SPEC pass is
still open, and is the natural next audit.

### Addendum — `server` keyword: ARC HELD pending scrml PA reply

The operator confirmed the `server` keyword **is** meant to be deprecated, which
makes my session-5 "still valid, leave it" verdict the wrong end-state. Re-tested
properly; the compiler is behaving EXACTLY to spec:

| case | result |
|---|---|
| `server function` **+** another trigger (`?{}` SQL) | `W-DEPRECATED-SERVER-MODIFIER` **fires** |
| `server function`, **no** other trigger | compiles clean, **no warning** |

That matches §34 verbatim ("fires ONLY when at least one other trigger would
escalate") and is correct — in the trigger-free case, deleting the keyword would
silently **relocate the function to the client**. The warning is not missing; it
is deliberately scoped. My earlier claim was measured on a trigger-free function
only and is incomplete as a general statement.

**The open question** (why the arc is held): §12.2 Trigger 4 is the ONLY way to
force server placement when the body has no other trigger, so `server` is
currently *deprecated-but-not-removable*. Redundant uses have a clean migration
(delete the keyword); trigger-free uses have no replacement we can find.

**SENT, blocking:** `../scrml/handOffs/incoming/2026-07-22-1700-scrml-site-to-
scrml-server-keyword-deprecation-path.md` (`needs: reply`, `blocking: true`).
Asks: what is the intended end-state (replacement annotation / new trigger /
permanent dual-status), is there a version where `server` stops compiling, and
what spelling should the docs teach?

**DO NOT rewrite the 31 sites until that reply lands.** On the answer: classify
each site redundant vs trigger-free, rewrite, re-run `scripts/audit-samples.mjs`.

**NEXT:** KB-nav / reference sidebar (~99 routes, 7-item header nav, the reference
tree has no navigation of its own) · make the 9 context-poor snippets
self-contained · prose-vs-SPEC audit · coordinate `docs/website/` retirement with
the scrml PA · deploy decisions.

## Session 4 — PROJECT RESET: scrml-site IS THE WIKI (2026-07-22)

**Operator reframe:** *"this isn't meant to just be a novelty dashboard. it is
meant to be the wiki of scrml."* That changes what this repo IS. The
compile-transparent viewer is now ONE PAGE (`/showcase`) of the documentation
site — the page that PROVES the language is real, beside the reference that
explains it.

**The wiki already existed, in the wrong repo.** `scrml/docs/website/` held
**98 `.scrml` pages** — already written in scrml, with exactly the structure our
nav declared. Three facts made the move obvious:
1. It **compiles clean against v0.7.1** (built it before touching anything:
   exit 0, 0 errors, 98 HTML pages). Not stale like this repo had been.
2. **Nothing built or deployed it.** No Pages workflow; `docs:build` only renders
   the 10 articles. Untouched since 2026-06-19.
3. Its own tooling says it's temporary — `docs/build.ts` verbatim: *"This is
   interim tooling. Once scrml v0.2.0 ships, the site will be built with scrml
   itself; this script goes away."* We are at **v0.7.1**.

Operator ratified: absorb it here; defer deploy decisions until it's visible.

**MIGRATION DONE — 106 .scrml, ~99 routes, all green.**
1. `pages/index.scrml` (the dissector) → **`pages/showcase.scrml`** via `git mv`.
2. `scrml/docs/website/pages/*` → `pages/` (98 files). `scrml/docs/website/app.scrml`
   → `app.scrml`, REPLACING the viewer shell (sticky header, full nav, footer,
   dark theme — it is the real site shell).
3. Shell merged, not just copied: added `<outlet/>`, added the **Showcase** nav
   entry, ported `.mono` (the only shell style the showcase needed that the wiki
   shell lacked — it already had a better `.built-in-pill`), repointed **3 more**
   retired-`scrmlTS` links, corrected VERSION `v0.7.0` → `v0.7.1`.
4. `scrml build .` → **exit 0, 106 files, 0 errors, 100 pages**.

**⚠ FOUND AND FIXED — the reference pages' code blocks were INVISIBLE.** The
typography layer ships `.prose-slate :where(code) { color: #0f172a }`, a
LIGHT-theme value. Measured in-browser: `<pre>` bg `rgb(15,23,42)`, `<code>`
color `rgb(15,23,42)` — **identical**. Every fenced example on every reference
page rendered as dark-on-dark. For a documentation site whose core content IS
code samples, that is the whole product being broken. Fixed in `app.scrml`:
`pre code { color: inherit !important; background-color: transparent !important }`
— theme-agnostic, since the `<pre>` already carries `text-slate-100`.
Re-measured: `rgb(241,245,249)` on `rgb(15,23,42)`. **Now gated** (see below) so
it cannot regress.

**GATE IS NOW TWO SCRIPTS — both exit 0.**
- **`scripts/wiki-verify.mjs` (NEW, site-wide, 5/5 PASS):** every emitted route
  resolves 200 — **99/99**, with the route list **DERIVED from `dist/`** so a new
  page is covered the moment it compiles (a hardcoded list silently stops gating
  the thing it gates) · shell + outlet render on a spread of 6 pages · **soft nav
  is genuinely soft** (a `window` stamp survives an in-site click — a full reload
  would wipe it) · code-block contrast (fg/bg luminance separation) · no uncaught
  page errors.
- **`scripts/gold-verify.mjs` (11/11 PASS):** retargeted to `/showcase`, since
  `/` is now the wiki landing. `GATE_BASE` overrides the origin. The showcase
  survived the migration completely intact — provenance, both flagships, nested
  engine pane.

**Soft nav is now load-bearing, and it was off until today.** Enabling it in
session 3 looked like a small lint fix on a 2-page site; on a ~100-page wiki it
is the difference between a site and a stack of documents.

**SCOPE CHANGED: small → MEDIUM** (9 source files → 106). The `maps` module was
dropped at `/flobase` on "small scope" grounds — **that no longer holds; revisit.**

**NOT DONE — deliberately:**
- `scrml/docs/website/` is **still in place**; I copied, did not delete. Removing
  it is the compiler PA's call and needs a coordination message.
- **Deploy is untouched.** scrml.dev still serves the interim static HTML from
  `scrml/docs/`. CNAME, Pages, and retiring `docs/build.ts` are all open.
- **No content audit.** The 98 pages COMPILE against v0.7.1; that proves syntax,
  NOT that the prose matches current semantics. They sat untouched for a month
  while the compiler moved. Worth an audit pass.

**NEXT (recommended order):**
1. **Content audit** of the migrated wiki against v0.7.1 semantics — the highest
   risk now is confidently-wrong documentation, which is worse than none.
2. **KB-nav / reference sidebar.** ~99 routes with only a 7-item header nav; the
   reference tree (elements · keywords · errors · contexts) has no navigation of
   its own. This is what "KB-nav" in the old backlog actually meant.
3. **Coordinate with the scrml PA** — the wiki has moved; propose retiring
   `docs/website/` + `docs/build.ts`.
4. Then deploy decisions, and the showcase backlog (PE-layer toggle, postMessage
   live-pane↔source bridge).

## Session 3 — /flobase assembly + COMPILER REWIRE scrmlTS → scrml (2026-07-22)

**The headline: this repo was linked to a DEAD compiler.** `../scrmlTS` last moved
2026-06-07 (S172). The live compiler is `../scrml` — v0.7.1, S279, ~107 sessions
ahead. Every artifact in `data/` had been precompiled by the June-7 compiler, and
sessions 1–3 were watching `../scrmlTS`'s inbox for a fix notice that was never
coming. Operator-corrected mid-session; rewire executed and gate-verified.

**Done:**
1. **`/flobase` assembled** (first run on this repo). `.claude/CLAUDE.md`
   (flobase-fenced region) · `.pa-base/profile` (boot rehydrates from it) ·
   `.claude/settings.json` + `.flobase/hooks/notify-inbox.sh` (cross-pa-notify,
   turn-boundary inbox surface). `pa.md` / `README.md` untouched — flobase owns
   only the fenced region. Profile: `scrml · mid-flight · small · runtime-verify`.
   Modules: CORE · stack-pack-scrml · role-pa · continuity · cross-pa-notify.
   Dropped: stack-pack-ts (no TS) · maps (small; RECONSIDER — index.scrml is
   697 LOC) · vcs-drive · role-vpa · role-spa · role-cpa · dock. dpa/deliberation
   runtime-only. GATE ratified by user: runtime-verify PRIMARY (merge-blocking),
   `build:artifacts` exit-0 SECONDARY, byte-identity explicitly NOT blocking.
2. **REWIRED the compiler dep** `scrmlts` → `scrml`. `bun link` registered in
   `../scrml`; `package.json` dep `scrml: link:scrml`; `bun.lock` regenerated;
   `build-artifacts.mjs` import + both `FLAGSHIPS` source specifiers; `serve.sh`
   header + error message. Verified pre-flight: scrml's package.json has NO
   `exports` field (deep subpaths resolve), `bin` is still `{"scrml": ...}`,
   `compileScrml` exported by both. Mechanical, no API adaptation needed.
3. **`serve.sh` collapsed to `scrml dev .`** — the explicit-file-list workaround
   is retired. The scandir bug IS FIXED in `../scrml` (`scanDirectory` api.js:134
   skips dot-entries + `SCAN_SKIP_DIRS`, uses `lstatSync` so it never follows a
   bun-linked tree). The fix comment credits *"reported by scrml-site S154"* —
   our report landed and was fixed in `scrml`, so the notice never reached the
   `scrmlTS` inbox we were watching. **Absence-of-evidence trap; we waited on a
   dead channel for 3 sessions.**
4. **`data/` regenerated against v0.7.1.** Large delta (+468/−304 across 10
   files) — and `source.scrml.txt` changed for BOTH flagships, i.e. the upstream
   examples themselves evolved. Superseded runtime bundles removed
   (`scrml-runtime.00okhlvg.js`, `.01f11ozs.js`); new ones tracked.

5. **v0.7.1 CONFORMANCE — all 9 errors FIXED; `scrml build` now exits 0.** The
   rewire had revealed pre-existing language drift (source written against a
   compiler 107 sessions old); `scrml dev` emits leniently, so the site ran
   while a production build was broken. Two classes, both closed:
   - **`E-TYPE-ANY-FORBIDDEN` ×8** — `any` is no longer a type in scrml. All 8
     were `-> any` RETURN annotations. Fixed by declaring named structs and
     threading real types (inline object return types mis-compile — the
     pre-existing FRICTION note still holds, so every shape is a named struct):
     - `pages/index.scrml` — new records `Cell {text, srcLine}` ·
       `JsCellLine {n, cells:[Cell]}` · `TextLine {n, text}` ·
       `Flagship {id, title}` · and the engine-graph shape
       `EngineLifecycle` / `EngineState` / `EngineTransition` / `Engine`
       (mirrors the `--emit-engine-graph` JSON exactly). Signatures:
       `cellsForLine -> [Cell]` · `buildJsCellLines -> [JsCellLine]` ·
       `toLines -> [TextLine]` · `enginesOf -> [Engine]` ·
       `flagshipList -> [Flagship]`.
     - `components/output-tabs.scrml` + `components/source-pane.scrml` — local
       `TextLine` struct; `toLines -> [TextLine]`.
     - `components/engine-graph-pane.scrml` — `stateFlags -> [string]`.
   - **`E-TYPE-045` ×1** — `lib/provenance.scrml:142`
     `if (not bucket.includes(...))` → `if (!bucket.includes(...))`. `not` is
     now the unified ABSENCE value (`expr is not`), NOT boolean negation; `!` is
     the negation operator.

**GOLD-VERIFY 10/10 PASS** (Chromium via playwright from `../scrml/node_modules`,
absolute-path import). Source pane 177 lines · selector 2 buttons · flagship
iframe mounts · 287 JS cells · FORWARD hover lights exact sub-line cells (both
flagships) · unhover clears to 0 · REVERSE hover activates the source line ·
selector re-renders source (mario→triage) · active-state flips. **Zero page
errors.** Script: `scratchpad/gold-verify.mjs`; screenshot `scratchpad/gate.png`
shows the live Triage Board + real source + DragPhase engine graph.

**GATE RE-RUN after the conformance fix (type changes can move codegen):**
gold-verify **10/10 PASS again, zero page errors**, dev-server reports ZERO
compilation errors, `scrml build .` **exit 0**, and `build:artifacts` is now
**byte-identical on re-run** — reproducibility against v0.7.1 restored.

6. **FRICTION WORKAROUNDS RE-VERIFIED against v0.7.1 (all three probed empirically):**
   - **[KEEP — still broken, now sharply characterized]** the `selectFlagship()`
     `[]`-clear. Removed it and measured: **FLAT lists are FIXED** by `df6d269c`
     (source pane 177→152, every line's text updates). **NESTED lists are NOT.**
     The engine pane (`for engines > for states > for next`) still renders
     mario's `Big,Cape,Fire,Small` after switching to triage instead of
     `Idle,Dragging`; `jsCellLines > cells` leaves 7 stale cells (192 vs 185).
     It is a **SILENT wrong-render** — the pane looks plausible and is lying.
     Restored the workaround (engine pane then correctly shows `Dragging,Idle`).
     **REPORTED** → `../scrml/handOffs/incoming/2026-07-22-1120-scrml-site-to-
     scrml-nested-list-reconcile-stale.md` (needs: action). Drop the workaround
     only when that lands, and re-verify with gate assertion 11.
   - **[RETIRED — fixed upstream]** `serve.sh` explicit-file-list → `scrml dev .`
     (landed earlier this session).
   - **[RETIRED — fixed upstream]** the dev watcher DOES hot-recompile. Probed by
     editing a `.scrml` against a running server: the change reached `dist/` and
     the served page within 12s. No restart needed.
7. **GATE HARDENED + made executable.** The nested-stale bug **passed the 10/10
   gate** because no assertion reached into the nested engine pane — a gate that
   only checks flat lists cannot see it. Added assertion 11 (nested engine pane
   re-renders per flagship) and moved the whole thing out of scratch into
   **`scripts/gold-verify.mjs`** (version-controlled, `exit 0` = green, header
   documents why assertion 11 must not be deleted). **Now 11/11.**

8. **LINT SURFACE TRIAGED — most of it is compiler false positives.** Verdicts:
   - **`W-DEAD-FUNCTION` ×2 = FALSE POSITIVE.** `buildJsCellLines` + `enginesOf`
     ARE called (index.scrml:385, :398) — the analysis **does not traverse
     arrow-callback bodies**. Isolated the trigger: `parseMappings` (called on
     the line ABOVE, same arrow body), `cellsForLine` (called from a `fn`), and
     `flagshipList` (called from a `function` body) all escape. `toLines` is
     called 3× ONLY from arrow bodies and escapes solely because
     `components/{source-pane,output-tabs}.scrml` export the same NAME —
     renaming it to a unique name makes it flag immediately. **DO NOT "clean up"
     these two functions.**
   - **`W-TAILWIND-UNRECOGNIZED-CLASS` ×17 = FALSE POSITIVE.** Every flagged
     class is defined in our own `#{}` style blocks. The lint recommends the
     `#{}` shim we already wrote. Dev-only (build doesn't emit these).
   - **`E-ROUTE-001` ×7 = inert.** Route-placement heuristic firing on plain
     array/dict indexing (`raw[i]`, `byLine[k]`) in pure client helpers; this app
     wires **0 server routes**. The suggested fix (`row.fieldName`) can't apply.
   - **`W-STYLE-CONFLICT-POSSIBLE` ×21 = advisory, accepted.** Fires on the
     `.tok-*` classes, mutually exclusive by construction (`lineClass()` returns
     exactly one) but not provably so.
   - **`W-OUTLET-ABSENT-SOFT-NAV-DISABLED` ×1 = REAL, FIXED.** See #9.
   Both false-positive classes reported → `../scrml/handOffs/incoming/
   2026-07-22-1210-scrml-site-to-scrml-lint-false-positives-and-shell-watcher.md`.
9. **REAL BUGS FOUND AND FIXED while triaging:**
   - **Soft navigation was OFF.** `app.scrml` used a bare `<main>` route slot, so
     every nav click was a full document load. Added `<outlet/>` inside `<main>`;
     the warning clears, the runtime now carries the soft-nav code, and `<main>`
     stays the document landmark.
   - **The GitHub nav link pointed at the RETIRED `scrmlTS` repo** — in BOTH
     `app.scrml` (the live inlined nav) and `components/nav-skeleton.scrml` (the
     reference copy). Repointed to `bryanmaclee/scrml`.
   - **`README.md` was entirely scrmlTS-wired** — my miss: the rewire commit
     never touched it, so its setup instructions (`bun link scrmlts`, `../scrmlTS`)
     would have broken a fresh clone. Rewritten: correct setup, the gate
     documented, both flagships, column-precision (it still described
     line-granularity provenance), current status.
10. **WATCHER VERDICT CORRECTED.** Session-3 item #6 retired the dev-watcher
    friction outright. That was too broad — it was a PAGE-edit probe. **SHELL
    edits (`app.scrml`) do NOT recompose the already-emitted page HTML**: a fresh
    `scrml build` emits `<div data-scrml-outlet>`, the running `scrml dev` keeps
    serving the old bare `<main>`, and `rm -rf dist` + restart fixes it. So an
    `app.scrml` edit looks like a no-op. **`rm -rf dist` + restart `serve.sh`
    after any shell edit.** Reported in the same message.

**Gate re-run after all of the above: 11/11 PASS, zero page errors,
`scrml build` exit 0.**

**KNOWN, NOT ACTED ON:** the nav links `/reference`, which **404s** on this repo
(only `/` and `/dashboard` exist). `components/nav-skeleton.scrml` says the nav
"links OUT to the existing 97-page site routes", so this is probably intentional
— a link to the larger scrml.dev site, dead only in local dev. **Operator call:**
leave it, drop it, or stub a `/reference` page.

**NEXT (recommended order):**
1. inc2 backlog: KB-nav · PE-layer toggle · postMessage live-pane↔source
   hover (needs a provenance bridge in the flagship build). Blocked: Phase-2
   HTML/CSS provenance (needs compiler HTML/CSS maps) · live dashboard embed
   (needs `scrml:fs`). Parked: engine-graph multi-file write-loop bug.

**Channel correction — `scrmlTS` is DEAD, do not route to it.** Live channels:
`../scrml/handOffs/incoming/` (the compiler PA) and `../handOffs/incoming/`
(master, push coordination).

## Session 2 — inc2 #2: 25-triage-board as a 2nd flagship + selector (2026-06-02)

Added `25-triage-board` as a second dissected flagship with a data-driven
selector. **Gold-verified in Chromium (15/15). NOT pushed** (held for push
coordination / user authorization).

**Done:**
1. **build-artifacts.mjs** — added `triage` to `FLAGSHIPS`
   (`scrmlts/examples/25-triage-board.scrml`, base `25-triage-board`) + a new
   `sourceFile` manifest field (the honest "Source — <file>.scrml" label).
   Rebuilds BOTH; mario compiler outputs stayed byte-identical (only
   `manifest.json` gained the one `sourceFile` line). `data/triage/` is the full
   precompute (client.js, .js.map w/ x_scrml_kinds, html, css, source,
   `triage.engine-graph.json` = DragPhase Idle↔Dragging, runtime).
2. **pages/index.scrml** — flagship selector:
   - `<flagshipId>`/`<flagships>`/`<sourceName>` cells; `fn flagshipList()`
     (object-build-in-fn) drives data-driven `for ... lift` selector buttons.
   - `loadArtifacts()` parameterized off `@flagshipId`
     (`const base = "/data/" + @flagshipId + "/"`).
   - Live iframe = two `if=`-gated **literal-src** iframes (mario/triage) — only
     the active one mounts/runs. Deliberately NO reactive-attribute interpolation
     on the iframe src (lowest-risk given documented attr friction).
   - Source-pane label is reactive `${@sourceName}`.

**COMPILER FINDING (candidate report to scrmlTS — see below):** Tier-0
`${ for ... lift }` lists render via `_scrml_reconcile_list(wrapper, items,
item => item.id ?? index, createItem)`. Our line items carry **no `id`**, so they
key **by index**. Replacing the backing cell in place (mario→triage) reuses
index-matched DOM nodes and only patches *reactive* bindings — the create-time
**static interpolated line text stays stale**. (Per-element `class:`/`if=`
toggles DO update — which is why provenance kept working but text didn't.)
**Workaround (landed):** `selectFlagship()` clears every list cell to `[]` first,
then `loadArtifacts()` refills — routing through empty forces a full recreate
(the same []→content path the initial mount uses). This is the FIRST feature to
re-render a list **post-mount**; the prior app only did per-element toggles over
a once-built list, so it never hit this. `<each>` (Tier-1) reconciles on change
but loses hover wiring (friction #7) — so neither stock path is clean for a
hover-wired list that must re-render. Worth a scrmlTS signal.

**Gold-verify (Chromium via scrmlTS playwright), 15/15 PASS:** default=mario;
forward provenance on BOTH (mario src L49 → hot cell; triage src L98 → hot cell —
different lines prove the source list genuinely re-rendered); switch→triage
re-renders source + engine (DragPhase) + iframe + JS; button active-state flips;
switch back restores mario. Screenshots: `/tmp/gold-verify-2flagship.png`
(mario), `/tmp/shot-triage.png` (triage engine graph renders Idle↔Dragging).
Test: `/tmp/gold-verify-2flagship.mjs` (playwright imported by absolute path;
CommonJS default-import form).

**Env note:** fresh checkout had NO `node_modules` — ran `bun install` (resolves
`scrmlts: link:scrmlts` → sibling). `bun.lock` is now tracked (machine-INDEPENDENT;
no absolute paths). The dev-server watcher did NOT hot-recompile a `.scrml` edit
this session — had to restart `serve.sh` to serve fresh JS (minor friction).

**Remaining inc2 backlog (pick next):** KB-nav, PE-layer toggle, postMessage
live-pane↔source hover (needs provenance bridge in flagship build), Phase-2
HTML/CSS provenance (blocked: needs compiler HTML/CSS maps), live server-side
dashboard embed (blocked: needs `scrml:fs`). More flagships are now trivial: add
to `FLAGSHIPS` + `flagshipList()` + one `if=`-gated iframe line. Parked:
engine-graph multi-file write-loop bug. Watch inbox for scrmlTS scandir fix →
then optionally simplify serve.sh to `scrml dev .`.

## Session 1 — extraction finish + first inc2 increment (2026-06-02)

Did carry-forwards 1–3 + the first inc2 deliverable. **PUSHED to `origin/main`**
(user waived the master-PA push coordination after gold verification):
- `00b31e3` chore: complete extraction (wire dep, fix scripts/README, verify serve)
- `03955fd` inc2: column-precision provenance highlights (JS output)
- (+ this hand-off doc commit)

**Done this session:**
1. **scrmlTS wired as a LINKED dep** (adopter path). `package.json` declares
   `scrmlts` via `bun link`; `node_modules/scrmlts` → sibling scrmlTS. Scripts
   rewired off the old nested `../../../compiler` layout: build-artifacts.mjs
   imports `scrmlts/compiler/src/api.js` + resolves the example corpus through
   the package; serve.sh uses `node_modules/.bin/scrml`. build-artifacts
   reproduces `data/mario/` BYTE-IDENTICALLY through the link.
2. **README + all .scrml path headers reconciled** to root layout; canonical
   serve `bash scripts/serve.sh`; setup `bun link scrmlts`.
3. **serve-before-push (S146) re-verified** end-to-end: `/`, `/dashboard`,
   `/data/mario/*` static via dist/data symlink, real `.js.map`, client
   provenance bundle. (Port 8787.)
4. **inc2 #1 — column-precision highlights** (user-picked). Hovering a source
   line lights the EXACT generated character ranges in the JS tab (cells split
   at map segment boundaries, merged per source line), not whole rows. Reverse
   hover is per-cell. Algorithm validated against the real artifacts (lossless
   partition, synthetic dark, 16/16 mapped cells sub-line). Pattern reused from
   the proven source-line `class:` toggle.

**COMPILER BUG reported to scrmlTS PA** (dropbox:
`../scrmlTS/handOffs/incoming/2026-06-02-0617-scrml-site-to-scrmlTS-scandir-node_modules-bug.md`):
`scrml dev <dir>` → `scanDirectory` (api.js:86) recursively walks node_modules
with no skip + follows symlinks, so `scrml dev .` tries to compile the whole
linked scrmlTS repo and never listens. **Workaround in serve.sh:** pass the
app's own `.scrml` files explicitly (same inputFiles set, minus node_modules).
Once scrmlTS fixes scanDirectory, `scrml dev .` could replace the explicit list.
**scrmlTS PA replied (read/2026-06-02-0633): CONFIRMED, fix shape accepted
(skip dirs + lstatSync), QUEUED HIGH for next scrmlTS code session, workaround
endorsed. Watch the inbox for the landing notice → then optionally simplify
serve.sh back to `scrml dev .`.**

**Remaining inc2 backlog** (pick next): more flagships + selector (only
25-triage-board is the other engine-heavy example — mario already shipped),
KB-nav, PE-layer toggle, postMessage live-pane↔source hover (needs a provenance
bridge injected into the compiled flagship build), Phase-2 HTML/CSS provenance
(blocked: needs compiler-emitted HTML/CSS maps), live server-side dashboard
embed (blocked: needs `scrml:fs`). Parked: engine-graph multi-file write-loop bug.

**GOLD VERIFY done (Playwright/Chromium via scrmlTS).** Real-browser hover test
passed: forward (hover source L159 → exactly 2 sub-line JS cells light, true
column precision, baseline 0); reverse (hover a mapped JS cell → source L159 +
sibling cells light); unmapped cell → clears. Visual screenshot confirms live
flagship + source highlight render. `ERR_INCOMPLETE_CHUNKED_ENCODING` console
lines are benign dev-server static-chunking noise (live app + provenance both
fully work). Test scripts: /tmp/gold-verify.mjs, /tmp/gold-reverse.mjs (import
playwright by absolute path from scrmlTS/node_modules; bare specifier won't
resolve from /tmp).

## Session 0 — repo extraction (2026-06-02, by master PA)

scrml-site was extracted from `scrmlTS/docs/website-viewer/` (21 files, ~244K) into this new sibling repo. inc1 already landed in scrmlTS history at `c66af6b2` (S151) — that work is preserved here verbatim as this repo's initial commit.

Decisions ratified this session (user, via master PA):
- **Repo name:** `scrml-site`
- **scrmlTS relationship:** DEPENDENCY (bun link / published), NOT vendor. Test assets stay in scrmlTS, referenced cross-repo.

## Open carry-forwards for the FIRST scrml-site working session

1. **Wire the scrmlTS dependency.** Set up `scrmlTS` as a `bun link`ed / published dependency so the build + serve use the real compiler (dogfood the adopter path). No vendored copy.
2. **Reconcile README + serve docs.** `README.md` still says `scrml dev docs/website-viewer/` and uses old in-scrmlTS paths. Canonical serve is `bash scripts/serve.sh`. Fix README to this repo's root layout.
3. **Re-verify serve-before-push (S146).** Run `scripts/serve.sh`, confirm the viewer renders + hover-provenance works, before the first push of this repo.
4. ~~Create the GitHub remote + first push.~~ **DONE** 2026-06-02 — `origin` = `git@github.com:bryanmaclee/scrml-site.git`, pushed at `f9fe388`. (SSH remote; HTTPS would hang on GCM.)
5. **inc2 backlog** (see pa.md → C1 carry-forward): 3 more flagships, live dashboard embed, KB-nav, PE-layer toggle, postMessage live-pane↔source hover, Phase-2 HTML/CSS provenance, column-precision highlights. Parked forks: engine-graph multi-file write-loop bug, live-pane mount, dashboard live-embed.

## Cross-repo

- Watch `handOffs/incoming/` for scrmlTS codegen-output-shape-change notices → triggers a provenance-pane rebuild.
- scrmlTS PA will remove the original `docs/website-viewer/` from scrmlTS on master's signal (signal sent 2026-06-02). Confirm it's gone before treating the move as fully atomic.
