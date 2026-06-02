# scrml-site — the scrml self-demo viewer (C1, increment 1)

A credibility-first showcase: **a scrml app that dissects another scrml app**.
The viewer runs a REAL compiled flagship next to its REAL `.scrml` source, its
REAL compiled JS/HTML/CSS, and a REAL engine "what-comes-next" diagram — with
hover-provenance driven by the REAL compiler-emitted `.js.map`.

This repo **consumes scrmlTS as a dependency** (not a vendored compiler copy) —
the strongest version of "it's a scrml app": it dogfoods the real adopter
install. Test assets (the `examples/` corpus) stay in scrmlTS and are referenced
cross-repo through that dependency.

## Setup (one-time)

scrmlTS is wired as a **linked dependency**. With the sibling `scrmlTS` repo
registered via `bun link` (run `bun link` once inside `../scrmlTS`):

```
bun link scrmlts
```

This symlinks `node_modules/scrmlts` → the sibling `scrmlTS` and installs the
`scrml` binary into `node_modules/.bin`. The serve + build scripts use that
binary and resolve the compiler API + `examples/` corpus through the package.

## Serve it

```
bash scripts/serve.sh [PORT]   # default port 8787
```

`scrml dev` compiles this repo's `.scrml` sources (the `<program>` root + pages
+ components) and serves them with hot reload. The precomputed flagship
artifacts under `data/` are exposed via a `dist/data → ../data` symlink that the
script maintains, so `/data/mario/*` resolve through the same Bun.serve static
fallback. (Friction note: `scrml dev` has no `--static <dir>` / `public/`
convention — that symlink is the glue.)

## Regenerate the flagship artifacts

```
bash scripts/build-artifacts.sh
# (or directly:)  bun run scripts/build-artifacts.mjs
```

This single-file-compiles `scrmlts/examples/14-mario-state-machine.scrml`
(resolved through the linked dependency into the sibling scrmlTS) with
`sourceMap` + engine-graph on, copies the verbatim source, and writes
`data/mario/manifest.json`. Single-file ON PURPOSE — it dodges the engine-graph
multi-file write-loop bug (only mis-writes when many inputs compile together).
The committed `data/mario/` artifacts are byte-reproducible by this script.

## What's REAL vs faked

- REAL: the `.js.map` (the exact bytes the compiler emitted), the VLQ decode
  (validated byte-exact against a reference decoder), the line→span hover
  mapping, the engine-graph JSON, the live flagship (its own compiled artifact
  in an iframe).
- Faked (S148-permitted): the syntax-highlight COLORING (a cheap keyword
  classifier, not a real tokenizer). The MAPPING is real; only the colors are
  cosmetic.

## Provenance mechanism (line-granularity)

`lib/provenance.scrml` (pure scrml) parses the map: VLQ-decode `mappings` into
per-line segments, read `names` (author ids) + `x_scrml_kinds` (per-line
`source`/`synthetic`). It builds two indexes — forward (source line → JS lines)
and reverse (JS line → source line). `synthetic` generated lines have no author
origin and are excluded from highlighting by design (the "some lines dead" read
is intentional). Hover a source `@state` line → its JS spans light up; hover a
JS line → its source line lights up. JS tab only for inc1 (the `.js.map` covers
JS; HTML/CSS provenance is Phase 2).

## Layout

- `app.scrml` — viewer program root (theme, plain nav, `<main>` slot).
- `pages/index.scrml` — the showcase (`/`).
- `pages/dashboard.scrml` — the `/dashboard` embed STUB (live dashboard = inc2).
- `components/` — nav-skeleton, source-pane, output-tabs, engine-graph-pane,
  showcase-layout (helper fns + presentational components).
- `lib/provenance.scrml` — pure VLQ + index helpers.
- `data/mario/` — precomputed flagship artifacts.
- `scripts/build-artifacts.{sh,mjs}` — the reproducible precompute.
- `scripts/serve.sh` — canonical serve (compile + dist/data symlink + dev server).
- `package.json` — declares the `scrmlts` linked dependency (`bun link scrmlts`).

## DONE (inc1) vs DEFERRED (inc2)

DONE: viewer shell as a scrml app; real `.js.map` hover-provenance (line-gran);
engine what-comes-next box from the engine-graph JSON; one engine-heavy flagship
(mario) wired end-to-end; plain nav + dashboard stub; the precompute pipeline.

DEFERRED to inc2: live-pane↔source bidirectional hover (postMessage across the
iframe); HTML/CSS-tab provenance; column-precision highlights (offset-threading);
the live server-side dashboard embed; multi-file flagships (needs the
engine-graph write-loop fix); col-accurate span highlighting.
