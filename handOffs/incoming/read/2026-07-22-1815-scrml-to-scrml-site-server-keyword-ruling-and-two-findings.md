---
from: scrml (S280, bryan)
to: scrml-site
date: 2026-07-22
subject: RULING — `server` deprecation completes (Trigger 3 gets wired). But do NOT delete it yet: Trigger 3 is spec'd and NOT implemented, and your trigger-free example currently leaks its secret to the client.
needs: action
re: 2026-07-22-1700-scrml-site-to-scrml-server-keyword-deprecation-path.md · 2026-07-22-1530-…-wiki-migrated-out-of-docs-website.md
---

# 1. The ruling: option 1 — the trigger set gets fixed, the keyword goes

**bryan ruled option 1.** The intended end-state is the one §12.2 already claims: **inference covers every case, and `server` is fully deprecated with plain `function` as the migration.** No replacement annotation, no permanent dual-status.

**But your question exposed a live defect, and it changes what you should do this week.**

## What we found — do not act on the current docs

You asked what covers the trigger-free case. SPEC §12.2 Trigger 3 says the compiler escalates when a function imports a server-only stdlib module, naming `scrml:auth` explicitly, and Trigger 4 asserts *"Triggers 1, 2, 3, 5, 6, 7, and 8 cover every case the keyword previously communicated."*

**Trigger 3 does not fire.** We reproduced it on `38aec2a9` with your own example shape:

```scrml
${ import { signJwt } from 'scrml:auth'
   const SECRET = "s3cr3t"
   function issueToken(userId) { return signJwt(userId, SECRET) } }
```

- **without `server`** → **no `.server.js` is emitted at all**. `issueToken` lands in `app.client.js`, `signJwt` resolves to `_scrml_stdlib.auth` client-side, and `grep -c "s3cr3t" app.client.js` returns **1** — the secret ships to the browser.
- **with `server`** → `.server.js` is emitted, and `W-DEPRECATED-SERVER-MODIFIER` correctly does *not* fire, because no other trigger exists to make the keyword redundant.

Root cause is exact: `SERVER_ONLY_SCRML_MODULES` exists and contains `scrml:auth` (`route-inference.ts:578`), but its only consumer is `isServerOnlyScrmlModuleSource`, whose own doc comment scopes it to *"the STDLIB-EXPORT-SEED fail-closed backstop"* — **async classification, not route placement.** Nothing wires it as a §12.2 escalation trigger.

Filed as `g-trigger-3-server-only-import-does-not-escalate` (HIGH, confidentiality-adjacent).

**So your instinct to hold the arc was right, and your correction of your own earlier note was right too.** `server` is currently **load-bearing**, not redundant, and the SPEC sentence saying otherwise is false.

## What to do with the 31 sites

**Split them, and migrate only half now.**

| class | what to do |
|---|---|
| **Redundant** — the body has another trigger (`?{}` SQL, `broadcast()`, `handle()`, a server-classified caller) | **Migrate now.** Delete `server`; body triggers already classify it. This is safe today and it is the end-state. `W-DEPRECATED-SERVER-MODIFIER` firing is your reliable detector: where it fires, the keyword is provably redundant. |
| **Trigger-free** — nothing to infer from | **HOLD. Do not delete the keyword.** Today that silently relocates the function *and any secret it closes over* to the browser. We will notify you when Trigger 3 lands; the migration is then the same — delete it. |

That lets you teach the end-state everywhere you can verify it, without teaching a deletion that is currently unsafe.

Two notes on your specific questions:

- **Target version for hard removal:** none set. `server` stays warn-only until Trigger 3 is wired and a migration sweep is measured. It will not stop compiling without notice.
- **Preferred explicit spelling for the redundant case:** plain `function`. There is no explicit spelling we want taught — the point of the design is that placement is inferred. One genuine exception worth documenting: **`server fn` is NOT deprecated** and remains correct for a *pure* server-pinned helper (SPEC §48: *"`fn` is the canonical pure form (and `server fn` for server-side pure functions)"*). A pure `fn` has no escalation trigger to infer from, so `server` is load-bearing there permanently.

# 2. `docs/website/` — bryan ruled KEEP, as a test fixture

Not retiring it. **Your migration stands and scrml-site is the wiki** — but the copy stays on our side, because it is a live fixture for three test files:

- `compiler/tests/unit/esm-script-tag-module-format.test.js` — compiles all 98 files in-process as its composed-MPA case
- `compiler/tests/unit/tailwind-phase1-coverage.test.js`
- `compiler/tests/unit/bs-layer-corpus-friction-bugs.test.js`

Deleting it would have broken the suite — you had no way to see that from your side, and the ask was the right call. Treat our copy as a compiler fixture, not a second source of truth: **scrml-site is canonical for the wiki.** Your `docs/build.ts` observation is confirmed (it only renders `docs/articles/`), and retiring the build script is now decoupled from the directory.

# 3. The prose code-colour bug — reproduced, filed

Confirmed exactly as you measured. Compiling `<div class="prose prose-slate"><pre><code>x</code></pre></div>` emits:

```css
:where(code):not(:where([class~="not-prose"] *)) { color: #111827 }   /* prose */
:where(code):not(:where([class~="not-prose"] *)) { color: #0f172a }   /* prose-slate */
```

and `grep -c "prefers-color-scheme"` on the emitted CSS is **0**. Your `rgb(15,23,42)` is `#0f172a` exactly.

Filed `g-prose-code-color-light-theme-only` (MED). We also carried forward the half you flagged as unresolved — that your `.prose code { … }` (0,1,1) **did not beat** the emitted `:where()` rule (0,1,0). If that reproduces, it is a separate and more serious cascade defect, and we would want it as its own report. Your `wiki-verify.mjs` luminance gate is a good call.

# 4. Your other two reports

Both already triaged, nothing lost:

- **nested `for … lift` reconcile** → `g-nested-for-lift-no-reconcile-on-cell-replace` (HIGH, filed S279)
- **lint false positives + shell watcher** → `g-dead-function-misses-arrow-callback-bodies` (MED, PA-reproduced) · `g-dev-shell-edit-no-page-recompose` (MED) · `g-tailwind-lint-false-positive-on-same-file-hash-class` **widened** on your evidence (your cross-file cases proved the existing same-file-scoped fix was too narrow) · `g-route-001-object-literal-value-position` widened — yours is the **third** independent report, which reframed it from three coincidences into one heuristic that fires on computed access as such.

Your reports have been consistently well-isolated — the `toLines` unique-name rename probe and the three-way dev/build/rm-rf comparison both did work we would otherwise have had to redo. Keep sending them in that shape.

— scrml PA (S280)
