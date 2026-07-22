# scrml-site — the scrml self-demo viewer

A credibility-first showcase: **a scrml app that dissects another scrml app**.
The viewer runs a REAL compiled flagship next to its REAL `.scrml` source, its
REAL compiled JS/HTML/CSS, and a REAL engine "what-comes-next" diagram — with
bidirectional hover-provenance driven by the REAL compiler-emitted `.js.map`.

This repo **consumes the scrml compiler as a dependency** (not a vendored copy) —
the strongest version of "it's a scrml app": it dogfoods the real adopter
install. Test assets (the `examples/` corpus) stay in the compiler repo and are
referenced cross-repo through that dependency.

## Setup (one-time)

The compiler is wired as a **linked dependency** on the sibling `scrml` repo.
Register it once, then link it here:

```
cd ../scrml && bun link          # register the `scrml` package globally
cd -           && bun install    # resolves `scrml: link:scrml`
```

This symlinks `node_modules/scrml` → the sibling `scrml` repo and installs the
`scrml` binary into `node_modules/.bin`. The serve + build scripts use that
binary and resolve the compiler API + `examples/` corpus through the package.

> **The compiler repo is `../scrml`, not `../scrmlTS`.** `scrmlTS` is a retired
> predecessor (last commit 2026-06-07); this repo was rewired off it on
> 2026-07-22. Do not re-link `scrmlts`.

## Serve it

```
bash scripts/serve.sh [PORT]   # default port 8787
```

`scrml dev .` compiles this repo's `.scrml` sources (the `<program>` root + pages
+ components) and serves them with hot reload. The precomputed flagship
artifacts under `data/` are exposed via a `dist/data → ../data` symlink that the
script maintains, so `/data/<flagship>/*` resolve through the same Bun.serve
static fallback. (Friction note: `scrml dev` has no `--static <dir>` / `public/`
convention — that symlink is the glue.)

## The gate

This repo has **no test suite** — the running artifact is the truth
(serve-before-push). The gate is executable:

```
bash scripts/serve.sh 8787 &     # wait for it to listen
node scripts/gold-verify.mjs     # exit 0 = green
```

11 assertions in real Chromium: the flagship iframe mounts and runs; forward
hover lights the exact sub-line JS cells on both flagships; reverse hover
activates the source line; unhover clears; the selector re-renders source +
iframe + JS; and the **nested** engine pane re-renders. Playwright is imported by
absolute path out of `../scrml/node_modules` — this repo carries no
devDependencies of its own.

`scrml build . --output <dir>` must also exit 0 (`scrml dev` emits *leniently*,
so only `build` is a real shape-check).

## Regenerate the flagship artifacts

```
bash scripts/build-artifacts.sh
# (or directly:)  bun run scripts/build-artifacts.mjs
```

Single-file-compiles each flagship from `scrml/examples/` (resolved through the
linked dependency) with `sourceMap` + engine-graph on, copies the verbatim
source, and writes `data/<id>/manifest.json`. Single-file ON PURPOSE — it dodges
the engine-graph multi-file write-loop bug (only mis-writes when many inputs
compile together). The committed artifacts are byte-reproducible by this script
against the pinned compiler.

**Adding a flagship** is three edits: `FLAGSHIPS` in `scripts/build-artifacts.mjs`,
`flagshipList()` in `pages/index.scrml`, and one `if=`-gated literal-src iframe
line in the live pane.

## What's REAL vs faked

- REAL: the `.js.map` (the exact bytes the compiler emitted), the VLQ decode
  (validated byte-exact against a reference decoder), the column-precision
  source↔JS mapping, the engine-graph JSON, the live flagship (its own compiled
  artifact in an iframe).
- Faked (S148-permitted): the syntax-highlight COLORING (a cheap keyword
  classifier, not a real tokenizer). The MAPPING is real; only the colors are
  cosmetic.

## Provenance mechanism (column precision)

`lib/provenance.scrml` (pure scrml) parses the map: VLQ-decode `mappings` into
per-line segments, read `names` (author ids) + `x_scrml_kinds` (per-line
`source`/`synthetic`).

Each generated JS line is pre-split into **cells** at the map's segment
boundaries, each tagged with the 1-based source line it came from. Hovering a
source line lights only the precise character ranges the compiler generated from
it — not the whole row. Reverse: hovering a JS cell lights its source line and
every sibling cell from that line. The source side stays line-grained (the map
partitions *generated* positions, not source). `synthetic` generated lines have
no author origin and never light up, by design — the "some lines are dead" read
is intentional. JS tab only; HTML/CSS provenance needs compiler-emitted HTML/CSS
maps (Phase 2).

## Layout

- `app.scrml` — viewer program root (theme, plain nav, `<main>` route slot).
- `pages/index.scrml` — the showcase (`/`). The big one; every increment lands here.
- `pages/dashboard.scrml` — the `/dashboard` embed STUB (live dashboard needs `scrml:fs`).
- `components/` — source-pane, output-tabs, engine-graph-pane, showcase-layout,
  nav-skeleton (helper fns + presentational components). NOTE: the nav is
  currently INLINED in `app.scrml`; `nav-skeleton.scrml` is the reference copy.
- `lib/provenance.scrml` — pure VLQ + index helpers (reference copy; the page
  inlines its own, see the import-friction note in `pages/index.scrml`).
- `data/mario/`, `data/triage/` — precomputed flagship artifacts.
- `scripts/build-artifacts.{sh,mjs}` — the reproducible precompute.
- `scripts/serve.sh` — canonical serve (compile + dist/data symlink + dev server).
- `scripts/gold-verify.mjs` — the executable gate.
- `package.json` — declares the `scrml` linked dependency.

## Status

**Landed:** the viewer shell as a scrml app · real `.js.map` hover-provenance at
**column precision** · engine what-comes-next box from the engine-graph JSON ·
**two** engine-heavy flagships (`14-mario-state-machine`, `25-triage-board`) with
a data-driven selector · plain nav + dashboard stub · the precompute pipeline ·
the executable browser gate.

**Next:** KB-nav · PE-layer toggle · postMessage live-pane↔source hover
(bidirectional, across the iframe — needs a provenance bridge injected into the
flagship build).

**Blocked upstream:** HTML/CSS-tab provenance (needs compiler-emitted HTML/CSS
maps) · the live server-side dashboard embed (needs `scrml:fs`) · multi-file
flagships (needs the engine-graph write-loop fix).
