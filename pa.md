# scrml-site — Primary Agent Directives

## What is this repo?

**scrml-site** is the scrml self-demo / showcase website — **an application built with scrml**, not compiler internals. It was extracted from `scrmlTS/docs/website-viewer/` on **2026-06-02 (S154)** into its own sibling repo under `scrmlMaster` so that:

- `scrmlTS` stays **pure language / compiler**, "current truth only" per its charter.
- The website gets a **dedicated PA** that owns the app arc (inc2+) without context-splitting the scrmlTS PA between language work and app work.
- The v0.2.0 "no marketing work in scrmlTS while v0.2.0 is in flight" tension is resolved — here, the showcase is cleanly this PA's substantive work.

This is the compile-transparent viewer: **a scrml app that dissects another scrml app** — real compiled flagship beside its real `.scrml` source, real compiled JS/HTML/CSS, and a real engine "what-comes-next" diagram, with hover-provenance driven by the real compiler-emitted `.js.map`.

## Relationship to scrmlTS — DEPENDENCY, not vendor (ratified S154)

- This repo **consumes `scrmlTS` as a dependency** (published / `bun link`ed), NOT a vendored compiler copy. This dogfoods the real adopter install experience — the strongest version of "it's a scrml app." **Do NOT vendor a compiler copy into this repo.**
- **Test assets stay in scrmlTS.** The scrml-test-dashboard + `examples/` are scrmlTS test assets (S151: "demo corpus = our real tested assets"). This repo **references/imports them cross-repo** rather than owning copies.
- **Cross-repo notify channel:** when scrmlTS codegen changes its output shape, the provenance panes here need a rebuild. scrmlTS's PA drops a message into `scrml-site/handOffs/incoming/` on output-shape-changing landings. Watch that inbox.

## Serve it

Use the script, **not** bare `scrml dev` — there is no static-asset convention for the bare command:

```
bash scripts/serve.sh
```

> NOTE (carry-forward fix item): `README.md` still documents `scrml dev docs/website-viewer/` and references the old in-scrmlTS paths. Reconcile README paths to this repo's root layout + the `serve.sh` invocation in an early session.

## Layout

```
scrml-site/
├── pa.md                 this file
├── hand-off.md           session state (read at session start)
├── handOffs/
│   └── incoming/         messages from other PAs (esp. scrmlTS codegen-change notices)
├── app.scrml             viewer program root (theme, nav, <main> slot)
├── pages/
│   ├── index.scrml       the showcase (/)
│   └── dashboard.scrml   /dashboard embed STUB (live dashboard = inc2)
├── components/           nav-skeleton, source-pane, output-tabs, engine-graph-pane, showcase-layout
├── lib/provenance.scrml  pure VLQ decode + forward/reverse index helpers
├── data/mario/           precomputed flagship artifacts (14-mario-state-machine)
└── scripts/              build-artifacts.{sh,mjs} (reproducible precompute) + serve.sh
```

## C1 carry-forward context (so the PA doesn't re-acquire)

**inc1 (LANDED + pushed; S151 commit `c66af6b2` in scrmlTS history):** the S148-ratified compile-transparent viewer.
- Layout = site-left-60% (live `14-mario-state-machine` iframe) + right-40% **stacked** code panes: scrml source TOP / engine "what-comes-next" transition-diagram MIDDLE / tabbed compiled-output BOTTOM (JS · HTML · CSS).
- REAL byte-identical `.js.map` bidirectional hover-provenance (NOT a 0:0 stub). Engine box from `--emit-engine-graph`.
- REAL: the `.js.map` bytes, VLQ decode (byte-exact vs reference decoder), line→span hover mapping, engine-graph JSON, live flagship iframe.
- Faked (S148-permitted): syntax-highlight COLORING only (cheap keyword classifier). The MAPPING is real.

**inc2 (the forks this PA owns):**
- 3 more engine-heavy flagships
- live dashboard embed (server-side)
- KB-nav
- PE-layer toggle
- postMessage live-pane↔source-hover (bidirectional, across the iframe)
- Phase-2 HTML/CSS provenance (the `.js.map` only covers JS today)
- column-precision highlights (offset-threading)
- Parked open forks: engine-graph **multi-file write-loop bug** (only mis-writes when many inputs compile together — that's why the precompute is single-file ON PURPOSE), live-pane mount, dashboard live-embed.

**Process gate — serve-before-push (S146):** verify the site actually serves before a push. User MAY waive on strong verification (S151 precedent: user said "commit C1" after the PA flagged the hold).

**Authority / ratifications:** user-voice S148–S151 (C1 layout revision to 2-col stacked, demo-corpus = real tested assets, the 3 AskUserQuestion build decisions, viewer-built-as-a-scrml-app full dogfood).

## Coordination / messaging

This repo participates in the scrmlMaster file-based dropbox protocol:
- **Inbox:** `handOffs/incoming/` (processed → `handOffs/incoming/read/`)
- **To reach other PAs:** drop a message into the sibling's `handOffs/incoming/` (e.g. `../scrmlTS/handOffs/incoming/`).
- **Push coordination:** when at a push point, drop a `needs: push` message to the **master PA** (`../handOffs/incoming/`). Master verifies cleanliness across affected repos and pushes. Do not push a subset when cross-repo messages create dependencies.

Message file format (shared across the ecosystem):

```
Filename: YYYY-MM-DD-HHMM-<from>-to-<target>-<slug>.md
---
from: scrml-site
to: master | scrmlTS | ...
date: YYYY-MM-DD
subject: <one-line>
needs: push | action | fyi
status: unread
---
<body>
```

## Remote

`origin` = `git@github.com:bryanmaclee/scrml-site.git` (created + first-pushed 2026-06-02, `f9fe388`). **Use the SSH remote, not HTTPS** — HTTPS routes through git-credential-manager, which hangs in headless/non-interactive shells; the SSH key pushes cleanly. (This is why scrmlTS also uses an SSH remote while giti/scrml are on HTTPS.)
