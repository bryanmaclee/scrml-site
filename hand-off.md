# scrml-site — hand-off

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

**GOLD-VERIFY 10/10 PASS** (Chromium via playwright from `../scrml/node_modules`,
absolute-path import). Source pane 177 lines · selector 2 buttons · flagship
iframe mounts · 287 JS cells · FORWARD hover lights exact sub-line cells (both
flagships) · unhover clears to 0 · REVERSE hover activates the source line ·
selector re-renders source (mario→triage) · active-state flips. **Zero page
errors.** Script: `scratchpad/gold-verify.mjs`; screenshot `scratchpad/gate.png`
shows the live Triage Board + real source + DragPhase engine graph.

**⚠ NEW FINDING — `scrml build` FAILS with 9 errors (the app source is not
v0.7.1-conformant).** `scrml dev` emits anyway (lenient), which is why the
runtime gate passes and the site works — but a production build is broken. This
is PRE-EXISTING language drift the rewire *revealed*, not damage it caused: the
source was written against a compiler 107 sessions old. Two error classes:
- **`E-TYPE-ANY-FORBIDDEN` ×8** — `any` is no longer a type in scrml. All 8 are
  `-> any` RETURN annotations: `pages/index.scrml` 138 `cellsForLine`, 184
  `buildJsCellLines`, 208 `toLines`, 284 `enginesOf`, 295 `flagshipList` ·
  `components/engine-graph-pane.scrml:26` `stateFlags` ·
  `components/output-tabs.scrml:11` `toLines` ·
  `components/source-pane.scrml:35` `toLines`. Each returns an array of records
  → needs a real record type declared and threaded.
- **`E-TYPE-045` ×1** — `lib/provenance.scrml:142` `if (not bucket.includes(...))`.
  `not` is now the unified ABSENCE value, not boolean negation.

**NEXT (recommended order):**
1. **Fix the 9 conformance errors** → `scrml build` green. Bounded but real:
   8 return types to author + 1 negation rewrite. This is the top item — the
   repo currently cannot produce a production build.
2. **Re-verify the remaining friction workarounds against v0.7.1** — (a) the
   `selectFlagship()` `[]`-clear (Tier-0 `for ... lift` index-keyed reconcile
   leaving static interpolated text stale) — **`../scrml` HEAD `df6d269c` is
   literally an each-mount reconciliation fix, so this may already be fixed**;
   (b) the dev-watcher not hot-recompiling. Report to `../scrml` ONLY what
   survives. The reconcile-list finding was never sent anywhere — good, it may
   have been stale before it went out.
3. **New lint surface to triage** (informational, not blocking): 22 ghost-pattern
   lints — `W-TAILWIND-UNRECOGNIZED-CLASS` ×17 (our custom classes; may want the
   `#{}` CSS-shim form) + `W-EACH-PROMOTABLE` ×6 (Tier-0 `for ... lift` → `<each>`;
   NOTE: `<each>` historically lost hover wiring, friction #7 — verify before
   promoting) + `W-DEAD-FUNCTION` ×2 (`buildJsCellLines`, `enginesOf`) +
   `E-ROUTE-001` computed-member-access ×7 + `W-STYLE-CONFLICT-POSSIBLE` ×20.
4. Then inc2 backlog: KB-nav · PE-layer toggle · postMessage live-pane↔source
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
