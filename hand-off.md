# scrml-site — hand-off

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
