# scrml-site — hand-off

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
