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

Compiler dep: **`../scrml` v0.7.1** (linked). The retired `../scrmlTS` is NOT the compiler — see the
⚑ block below.

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

**Rewire LANDED** (`f2367b2` + `c5f3a14`, 2026-07-22): `package.json` declares
`scrml: link:scrml`, `node_modules/scrml` → `../../scrml`, `build-artifacts.mjs` + `serve.sh`
resolve through it, `data/` is regenerated against v0.7.1 and byte-identical on re-run, and the
source is v0.7.1-conformant (`scrml build` exits 0). **Keep the dep pointed at `../scrml`; do not
re-link `scrmlts`.**

It is a **dependency, never a vendored copy** — that dogfoods the real adopter install path, which is
the whole point. Do NOT vendor a compiler into this repo.

## GATE — the executable source of truth (operator-ratified 2026-07-22)

**PRIMARY — runtime-verify (merge-blocking).** This repo has no test suite; the artifact is the truth.

1. `bash scripts/serve.sh` (port 8787) — the canonical serve.
2. `node scripts/gold-verify.mjs` — **executable, version-controlled, exit 0 = green.** 11
   assertions in real Chromium (Playwright imported by absolute path from `../scrml/node_modules`;
   a bare specifier will not resolve): flagship iframe mounts and runs; forward hover lights the
   exact sub-line JS cells on **both** flagships; reverse hover activates the source line; unhover
   clears; the selector re-renders source + iframe + JS; **and the nested engine pane re-renders**.

> Assertion 11 (nested engine pane) exists because on 2026-07-22 this gate passed **10/10 while the
> engine pane silently rendered the wrong flagship's engine** — see the nested-list reconcile bug
> below. A gate that only checks flat lists cannot see it.

This is the **S146 serve-before-push** discipline the repo already runs (session 1: gold-verify passed;
session 2: 15/15). The user MAY waive on strong verification (S151 precedent) — that is the user's
call, never the PA's.

**SECONDARY — build (must exit 0, byte-identity NOT blocking).** `bun run build:artifacts` regenerates
`data/mario/` + `data/triage/` from the linked compiler. It must exit 0. Byte-identity against the
committed artifacts is **deliberately not merge-blocking**: `data/` tracks a *moving sibling compiler*,
so drift is expected, not a defect.

> Post-rewire 2026-07-22: exit 0 **and byte-identical on re-run** — reproducibility against v0.7.1
> is restored, so a `data/` diff after `build:artifacts` now genuinely means the compiler moved. The
> `.js.map` drives hover-provenance, so any compiler bump REQUIRES a full re-run of the primary gate.

**TYPES gate** (added 2026-07-22) — `node_modules/.bin/scrml build . --output <tmp>` must **exit 0**.
This is *not* redundant with the serve gate: `scrml dev` emits **leniently** (it emitted despite 9
type errors, so the site ran while a production build was broken). Only `scrml build` is the real
shape-check.

Language invariants that bit us at the v0.7.1 rewire — now conformant, **do not reintroduce**:
- **`any` is not a type** (`E-TYPE-ANY-FORBIDDEN`). Declare a named struct, return `[Struct]`.
  Inline object return types mis-compile (pre-existing friction), so it is *always* a named struct.
- **`not` is the absence value, not boolean negation** (`E-TYPE-045`). Use `!expr` to negate;
  `expr is not` to test absence.

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
  - **[KEEP — load-bearing]** `selectFlagship()` clears every list cell to `[]` before refilling.
    Tier-0 `${ for ... lift }` **nested** lists do not reconcile when the backing cell is replaced
    in place — the nested subtree keeps rendering the previous value. Flat lists were fixed by
    `df6d269c` (the source pane goes 177→152 correctly without the workaround), but the engine pane
    (`for engines > for states > for next`) still shows mario's `Big,Cape,Fire,Small` after
    switching to triage, and `jsCellLines > cells` leaves 7 stale cells. It is a **silent
    wrong-render** — the pane looks plausible and is lying. Reported to `../scrml` 2026-07-22.
    Drop it only when that lands, and re-verify with gate assertion 11.
  - **[RETIRED — fixed upstream]** `serve.sh` explicit-file-list → now `scrml dev .`.
    `scanDirectory` (api.js:134) skips dot-entries + `SCAN_SKIP_DIRS` and uses `lstatSync`.
  - **[RETIRED — fixed upstream]** the dev-server watcher **does** hot-recompile a `.scrml` edit
    (probed 2026-07-22: an edit reached `dist/` and the served page within 12s). No restart needed.
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
