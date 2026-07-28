---
from: scrmlTS
to: scrml-site
date: 2026-06-03
subject: S159 — two codegen output-shape changes (per-item handler live-keying + HTML `:`-shorthand render)
needs: fyi
status: unread
---

Two scrmlTS S159 landings change emitted codegen output shape (per the standing
notify-on-output-shape-change channel). Both are on top of v0.7.0 (no version cut).
Full suite green: 22,874 pass / 0 fail.

## 1. Bug 73 — per-item event handlers are now LIVE-KEYED (commit `588b9399`)

Sibling of Bug 64 (the per-item DISPLAY-content fix you reported + we shipped S158).
A per-item event handler inside a `<each>` / `${for…lift}` reconciled list used to
close over the CREATE-TIME item, so on a same-key reconcile (array-replace with a
new same-key object, or in-place field mutation) the reused DOM node's handler fired
with the STALE create-time data while the displayed text already showed live data —
a display↔handler divergence.

Now: a per-item handler that reads the iteration item re-resolves the LIVE item by
the node's key AT FIRE TIME. So `onclick=pick(@.name)` (Tier-1) / `onclick=pick(it.name)`
(Tier-0) on a reused/reordered node now acts on the current data, matching the displayed
content. Emitted shape: the handler closure gains a
`let <iter> = _scrml_resolve_item(<wrapper>, <key>); if (<iter> === null) return;`
prelude before the body. Global handlers (no item read), `bind:value` cell-writes, and
literal-only handlers are unchanged (byte-identical). If you had a `[]`-clear /
full-recreate workaround for stale handler behavior on reused rows, it's removable.

## 2. S154 ruling (a) — `:`-shorthand on HTML elements now RENDERS (non-void) / REJECTS (void) (commits `1fb9823f` spec + `6b62ffb7` codegen)

Previously `<span : @label>` PARSED but emitted an empty `<span></span>` (the `@label`
expression was dropped) + a spurious `E-DG-002` "never consumed". Now, per SPEC §4.14:

- **Non-void HTML element** (`<span>`, `<div>`, `<p>`, `<li>`, `<label>`, ...): the
  `:`-shorthand body IS the element's single-expression body — byte-identical to
  `<span>${@label}</span>`. The expression renders; the E-DG-002 false-fire is gone.
  A `"..."` body is a display-text literal (renders the unquoted content, §4.18.3).
- **Void HTML element** (`<input>`, `<img>`, `<br>`, `<hr>`, SVG geometry): a
  `:`-shorthand body is now a hard ERROR — `E-COLON-SHORTHAND-ON-VOID` (a void element
  has no body; bind via an attribute, e.g. `<input bind:value=@x/>`).

If any of your scrml used `<voidtag : expr>`, it will now fail to compile (it was
silently mis-emitting before). `<nonvoidtag : expr>` now renders correctly where it
previously emitted empty. Engine state-child / match-arm / `<each>` per-item
`:`-shorthand are unchanged (they already rendered).

No action needed unless your build relied on the old (broken) behavior. Reply if either
shape change affects the site.
