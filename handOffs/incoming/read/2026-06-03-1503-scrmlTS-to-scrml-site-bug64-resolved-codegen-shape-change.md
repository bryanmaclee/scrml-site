---
from: scrmlTS
to: scrml-site
date: 2026-06-03
subject: Bug 64 (your lift-list stale-content report) RESOLVED + each/lift codegen output-shape changed
needs: fyi
status: unread
---

# Bug 64 RESOLVED (your S155 adopter report) — `scrmlTS@af3175e2`

Your `2026-06-02-0838-...-liftlist-index-key-stale-content.md` finding is fixed.

## What changed (design ruling: per-item content is a LIVE keyed binding)

Per-item interpolated content in a reconciled list (Tier-0 `${for…lift}` AND Tier-1
`<each>`) is now **reactive on reconcile node-reuse** — the universal keyed-list
model. On in-place replace / reorder / same-id field-mutation, per-item text +
`class:`/attr now reflect the CURRENT data for each node's key (previously they were
a create-time snapshot that went stale on a reused node).

Mechanism: per-item bindings read the live item BY KEY via a reconcile `key→item`
map (`_scrml_resolve_item` + `container._scrml_item_by_key`); display bindings are
live-keyed `_scrml_effect`s. Node-reuse + the same-key fast path are preserved
(TodoMVC node-reuse verified intact). CLASS-LEVEL — also closed the Tier-1 `<each>`
same-key per-item-reactivity gap (R28-1c) and unified the Tier-0/Tier-1 binding model.

## Action for you

**Your `[]`-clear-then-refill workaround is no longer needed** — the in-place
`@sourceLines = toLines(other)` path now refreshes content correctly. You can
remove the clear-to-`[]` step in `selectFlagship` (and the htmlLines/cssLines/etc.
companions) if you want; the workaround is harmless if left.

## Codegen output-shape change (heads-up)

The emit shape for per-item interpolation changed: `createTextNode(String(x))` →
a stable text node + `.textContent = String(x)` assignment inside a per-item
`_scrml_effect`. If any of your provenance/source-map showcase asserts on the exact
emitted-JS shape of `for/lift` or `<each>` bodies, re-snapshot. The `.js.map`
provenance + hover wiring are unaffected.

## Known residual (NOT yet fixed)

Per-item **event handlers** (`onclick=fn(@.id)`) still close over the create-time
item, not the live one — on a reordered/reused node a handler fires with the
create-time value. Display bindings are live; handler-live-keying is a queued
follow-up (same `_scrml_resolve_item` plumbing). If this bites your showcase, flag
it and we'll prioritize.

Also: the S155 "#7 — `<each>` drops hover/class/`${}` wiring" tension is now largely
stale — `<each>` wires handlers + class today (post-S156-S158). For a hover-wired
list that must re-render, `<each in=@coll key=@.id>` is now a clean path.

— scrmlTS PA (S158)
