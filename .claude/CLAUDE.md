<!-- flobase:project:start (managed region — replaced by flobase assemble; do not edit by hand) -->

# scrml-site — flobase-assembled project config

*Assembled by `/flobase` 2026-07-22. Profile: `.pa-base/profile` (boot rehydrates from it — do not
re-derive). CORE (the 5 Rules · the GATE discipline · context economy · the PA loop) is always loaded
from `~/.claude/CLAUDE.md` and is NOT repeated here. Re-run `/flobase reinit` when the stack or scope
changes.*

## What this project is

**scrml-site** is the scrml self-demo showcase — **an application built with scrml**, not compiler
internals. The compile-transparent viewer: a scrml app that dissects another scrml app (live compiled
flagship beside its real `.scrml` source, real compiled JS/HTML/CSS, real engine transition-diagram),
with bidirectional hover-provenance driven by the real compiler-emitted `.js.map`.

The normative project contract is **`pa.md`** (repo root) — read it, it is not superseded by this
region. `hand-off.md` is the live session state.

## PROFILE (summary — full form in `.pa-base/profile`)

`STACK: scrml (+ thin plain-ESM Node scripts) · STAGE: mid-flight · SCOPE: small · GATE: runtime-verify`

Compiler dep: **`../scrml` v0.7.1 is the live one**; the repo is currently mis-wired to the retired
`../scrmlTS`. See the ⚑ block below.

## MODULES loaded (init)

CORE · **stack-pack-scrml** · **role-pa** · **continuity** · **cross-pa-notify**

Dropped: `stack-pack-ts` (no TS — `scripts/build-artifacts.mjs` is plain ESM) · `maps` (small scope) ·
`vcs-drive` (single `main`, no satellite branches) · `role-vpa` (no maintenance surface) · `role-spa`
(light backlog, worked directly) · `role-cpa` (single project; the master PA owns cross-project) ·
`dock` (0 coverage). Runtime-only, never at init: `role-dpa` · `deliberation`.

## stack-pack-scrml — §0, THE LOAD-BEARING FACT

**scrml is not a frontend framework — a scrml app IS the entire stack**: UI + server functions
(placement *inferred* by the compiler) + database (`?{}` SQL + `<schema>`) + auth (`scrml:auth` +
`<auth role=>`) + realtime (`<channel>`). **There is NO separate backend below scrml, and you do not
add one.** Reaching for Supabase / Firebase / Clerk / Auth0 / a Node API / an external DB "under"
scrml is the single most damaging misconception about scrml. scrml is a *compiled language +
compiler*, not a runtime framework/library; React / Vue / Solid / Qwik / Next.js are comparison points
and inspiration, **not** what scrml is. Correct the "front-end framework" shorthand at the source.

Full primer: `/home/bryan/scrmlMaster/flogence/flobase/modules/stack-pack-scrml/scrml-whole-stack-primer.md`.
Deeper tier (the scrml clone IS on this machine and is CURRENT — prefer it):
`../scrml/docs/PA-SCRML-PRIMER.md` · `../scrml/compiler/SPEC-INDEX.md` ·
`../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`.

**⚑ THE COMPILER IS `../scrml` — NOT `../scrmlTS`** (operator-corrected 2026-07-22).

`../scrmlTS` is **stale/retired**: HEAD `9e607bad` (S172, **2026-06-07**). The live compiler is
`../scrml` — HEAD `df6d269c` (S279, **2026-07-22**), v0.7.1, ~107 sessions ahead. It carries the same
`examples/` corpus (both flagships) and the same `compiler/src/api.js` entry point.

**This repo is still WIRED TO THE STALE ONE** — `package.json` declares `scrmlts: link:scrmlts`,
`node_modules/scrmlts` → `../../scrmlTS`, and both `build-artifacts.mjs` and `serve.sh` resolve
through it. Everything in `data/` was compiled by the June 7 compiler. **Rewiring to `../scrml` is
the top work item** — until it lands, treat every artifact and every compiler-friction note below as
provisional.

Rewire is mechanical: `scrml`'s package.json has **no `exports` field**, so deep subpath imports
(`scrml/compiler/src/api.js`, `scrml/examples/*.scrml`) resolve; `bin` is still `{"scrml": ...}` so
`node_modules/.bin/scrml` is unchanged; `compileScrml` is exported by both.

It is a **dependency, never a vendored copy** — that dogfoods the real adopter install path, which is
the whole point. Do NOT vendor a compiler into this repo.

## GATE — the executable source of truth (operator-ratified 2026-07-22)

**PRIMARY — runtime-verify (merge-blocking).** This repo has no test suite; the artifact is the truth.

1. `bash scripts/serve.sh` (port 8787) — the canonical serve. **Not** bare `scrml dev`.
2. Real-browser verification in Chromium via Playwright (imported by **absolute path** from
   `../scrml/node_modules` — a bare specifier will not resolve from `/tmp`): the flagship iframe
   mounts and runs; forward hover (source line → exact sub-line JS cells light); reverse hover (JS
   cell → source line + siblings); unmapped cell clears; the flagship selector re-renders source +
   engine graph + iframe + JS.

This is the **S146 serve-before-push** discipline the repo already runs (session 1: gold-verify passed;
session 2: 15/15). The user MAY waive on strong verification (S151 precedent) — that is the user's
call, never the PA's.

**SECONDARY — build (must exit 0, byte-identity NOT blocking).** `bun run build:artifacts` regenerates
`data/mario/` + `data/triage/` from the linked compiler. It must exit 0. Byte-identity against the
committed artifacts is **deliberately not merge-blocking**: `data/` tracks a *moving sibling compiler*,
so drift is expected, not a defect.

> Verified 2026-07-22: exit 0 against the STALE `scrmlTS`, but already non-reproducing (new runtime
> hashes both flagships; `25-triage-board.client.js` +35/−13 with a `.js.map` delta). Expect a much
> larger delta once the dep is rewired to `../scrml` — 107 sessions of codegen. The `.js.map` is what
> drives hover-provenance, so a rewire REQUIRES a full re-run of the primary gate, not a rubber stamp.

**No types gate** — no `tsc`, no `go vet` equivalent. The compile step inside `serve.sh` /
`build:artifacts` is the closest shape-check; a scrml compile error is a hard stop.

**`ERR_INCOMPLETE_CHUNKED_ENCODING`** console lines during verification are benign dev-server
static-chunking noise — not a failure signal.

## CONTINUITY

- **live hand-off:** `hand-off.md` (repo root) — read IN FULL at boot; newest session at top.
- **inbox:** `handOffs/incoming/` → processed moves to `handOffs/incoming/read/`.
- **outbox:** write directly into the sibling's inbox (e.g. `../scrml/handOffs/incoming/`). This is
  the ONE cross-repo write exception.
- **memory:** `~/.claude/projects/-home-bryan-scrmlMaster-scrml-site/memory/`.
- No delta-log here (small scope, few sessions) — the hand-off carries the state directly.
- Wrap via `/wrap`.

## CROSS-PA — the dropbox protocol

Message filename `YYYY-MM-DD-HHMM-<from>-to-<target>-<slug>.md`; frontmatter `from · to · date ·
subject · needs: push|action|reply|fyi · status`. `cross-pa-notify` surfaces unread
`needs: reply|action` notes at the turn boundary (`.claude/settings.json` → `UserPromptSubmit` →
`.flobase/hooks/notify-inbox.sh`); `needs: fyi` is left to the boot-time inbox read.

**Live channels:** **`scrml`** (`../scrml/handOffs/incoming/`) — THE compiler PA. Codegen
output-shape changes trigger a provenance-pane rebuild here; compiler bugs found here go out to its
inbox. · `master` (`../handOffs/incoming/`) — push coordination.

**DEAD channel — `scrmlTS`.** Do not route anything there; its PA is not running (last commit
2026-06-07). Two messages went to it historically: the scandir bug (**since FIXED in `../scrml`** —
the fix comment credits "reported by scrml-site S154"; we never saw the notice because we were
watching the wrong inbox) and its reply. The `handOffs/incoming/read/` entry from it is history.

## PROJECT CONVENTIONS (mined from the repo + its git arc)

- **Fidelity rule, project-specific:** the MAPPING is always real (real `.js.map` bytes, real VLQ
  decode, real engine-graph JSON, real live flagship). Only syntax-highlight **coloring** is faked
  (S148-permitted cheap keyword classifier). Never fake a mapping.
- **The precompute is single-file ON PURPOSE** — the engine-graph multi-file write-loop bug (parked)
  only mis-writes when many inputs compile together. Do not "optimize" `build-artifacts.mjs` into a
  batch compile.
- **Test assets stay in the compiler repo.** Flagships are referenced cross-repo out of the linked
  package's `examples/`; this repo owns no copies of the corpus, only the precomputed `data/` outputs.
  (Post-rewire that is `scrml/examples/`; today it is still `scrmlts/examples/`.)
- **Adding a flagship** is now three edits: `FLAGSHIPS` in `scripts/build-artifacts.mjs` +
  `flagshipList()` in `pages/index.scrml` + one `if=`-gated literal-src iframe line.
- **Iframe src is deliberately NOT reactive** — two `if=`-gated literal-src iframes, one per flagship.
  Reactive-attribute interpolation on `src` is documented friction; do not "simplify" it.
- **Known compiler friction (workarounds are load-bearing — do not remove without a compiler fix):**
  - `serve.sh` passes `.scrml` files **explicitly** rather than `scrml dev .` — the OLD scrmlTS
    `scanDirectory` walked `node_modules` and followed symlinks, so `scrml dev .` tried to compile the
    whole linked compiler repo and never listened. **FIXED in `../scrml`** (`scanDirectory` at
    api.js:134 now skips dot-entries + `SCAN_SKIP_DIRS` and uses `lstatSync`, so it never follows a
    `bun link`ed tree). The workaround is therefore obsolete **the moment the dep is rewired** —
    simplify `serve.sh` to `scrml dev .` as part of that arc, not before.
  - `selectFlagship()` clears every list cell to `[]` before refilling. Tier-0 `${ for ... lift }`
    reconciles **by index** when items carry no `id`, so replacing a backing cell in place reuses
    DOM nodes and leaves create-time static interpolated text stale. Routing through empty forces a
    full recreate. **Observed against the STALE compiler — RE-VERIFY against `../scrml` before
    reporting it; it may already be fixed.** (`df6d269c` is literally an `each`-mount reconciliation
    fix.) The finding was never sent anywhere; if it survives the rewire it goes to `../scrml`.
  - The dev-server watcher does not reliably hot-recompile a `.scrml` edit — restart `serve.sh` to
    serve fresh JS. Also observed against the stale compiler; re-verify.
- **Commits:** conventional-ish prefixes in use (`inc2:`, `chore:`, `docs(pa):`, `wrap(sN):`).
- **Remote:** `origin` = `git@github.com:bryanmaclee/scrml-site.git`. **SSH, never HTTPS** — HTTPS
  routes through git-credential-manager, which hangs in headless shells.
- **Commit to `main` only after explicit user authorization in the current session.** Never
  `--no-verify` without explicit authorization.

## INDIVIDUALISATION

A global Vintage already exists — applied, not re-mined. Personal layer:
`../scrml-support/pa-profile-bryan.md` (register + provenance + worked examples + the voice ledger).
Load-bearing here: field-direct register, no preambles, no reflexive hedging, **real disagreement is
requested**; the `---` answer delimiter; operator-authoritative context budget; session Profile A/B
picked by the operator (default A).

<!-- flobase:project:end -->
