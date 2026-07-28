# scrml-site — hand-off

## ⇢ SESSION 10 CLOSE 2026-07-27 — video series started · **SHOWCASE GATE IS RED**

**READ FIRST — two things, in this order.**

### 🔴 1. THE SHOWCASE GATE IS 9/11. DO NOT BUMP THE CI PIN.

`node scripts/gold-verify.mjs` fails two assertions against the **current**
sibling compiler. **Our source did not change** — the only variable is
`../scrml` moving `50478f0e` (S287) → `ac527675` (S291), which touched 15
`compiler/src` files / +2053 lines.

What broke: the nested `${ for … lift }` that emits one `<span>` per sub-line
JS cell now emits **nothing**. Measured in Chromium:

```
.code-line                  ->  574     (outer list — fine)
.code-line > span:not(.ln)  ->    0     (inner cells — WAS 287)
first .code-line innerHTML  ->  <span class="ln">1</span>// Example 14: …
```

The line text is a bare text node now. That kills **column-precision hover
provenance** — inc2 #1, and the entire point of `/showcase`. Outer list fine,
inner emission gone: the same nested-lift path that already carries the
load-bearing `selectFlagship()` `[]`-clear workaround.

**WHY THE SITE IS STILL FINE:** `.github/workflows/deploy.yml` pins
`SCRML_REF: 50478f0e` (S287) — the commit that passed 11/11. scrml.dev is built
by that compiler and is unaffected (verified 200 at close). **Advancing that pin
ships the regression.** Do not bump it until the reply lands. Cost of holding:
we stop receiving their compiler fixes on the live site.

Reported: `../scrml/handOffs/incoming/2026-07-27-0730-…-showcase-subline-cells-
regression-S291.md`.

### 🔴 2. THE CROSS-PA INBOX IS PER-CLONE — and half the fix is ours

Their S291 wrap (`ac527675`) diagnosed why **four** of our notes sat unread:
`handOffs/incoming/` is git-tracked, but **a dropped message is an untracked
file until someone commits it.** scrml-site is colocated with their XPS clone,
so every ASUS session since S284 read an inbox that was clean only on its own
disk. This is the S154 wrong-inbox trap in a new costume.

**We drop message files and never commit them.** That is our half. The fix is
one line in our send procedure — commit-on-arrival — and it is **not taken**,
because committing into their repo is the operator's call and their `main` is
protected with a full pre-commit gate. Offered to them in the S291 note;
**pending an operator ruling here.**

They have *seen* the notes and compiled our blocking SQL claim against
`0d95c364`, but have **not replied**. Their words: *"scrml-site remains blocked
and unacknowledged; recorded as an accepted cost, not smoothed over."*

### What landed this session

**The video series thread opened** (operator-raised, so Rule 1 marketing
exclusion does not apply). Format ruled **6 short / 4 long**; maturity ruled
**ship an install path before producing**. Three shorts scripted, each with
frame-by-frame code states, production notes and ranked cut points:

- `video/ep01-three-booleans.md` — 4:56 — `29-engine-vs-flags`
- `video/ep02-no-validation-library.md` — 5:30 — `30-validated-form`
- `video/ep03-orm-trap.md` — 5:15 — the `orm-trap` article, **rewritten against
  probed behaviour**
- `video/measure.mjs` — derives timecodes from real word counts. Exists because
  ep01's hand-estimate was wrong by 90 seconds. **Re-run after editing a beat.**

**Every code frame is verified.** Sources compiled `exit 0` before scripting;
emitted-output frames are copied from real `app.server.js`.

### ⚠ scrml.dev is serving a page we have DISPROVED

`pages/articles/orm-trap.scrml` claims six compile-time refusals. We probed all
six against S287:

| claim | reality |
|---|---|
| `E-PA-007` protect typo | ✅ as documented |
| `E-SQL-004` no `db` in scope | ✅ as documented |
| bound params mandatory | ✅ **verified in emitted artifact** |
| `E-PA-004` bad table name | refused, but code is **`E-PA-002`** |
| `E-SQL-002` invalid SQL caught | ❌ **never fires** |
| `E-SQL-003` runtime SQL refused | ❌ **never fires** |

`SELCT usrnme FRM users WHERE` builds exit 0 and ships verbatim. `?{q}` with a
local const emits `` _scrml_sql`q` `` — **the identifier compiled as literal SQL
text.** Operator ruled this unacceptable; note escalated to `needs: reply`,
`blocking: true`.

**Ruled OUT deliberately: not an injection vector.** Probed Bun.SQL directly —
it binds every interpolation (`near "?": syntax error`, table intact). The
"`${expr}` SHALL be a bound parameter" guarantee **holds absolutely**. Do not
let the escalation imply otherwise; the defects are correctness + diagnostics.

Third defect found while ruling that out: **dynamic identifiers are a dead end
that compiles clean.** `?{`… FROM ${tbl}`}` builds exit 0 and fails 100% at
runtime for every input, with no `.raw()` escape hatch by design.

**OPEN OPERATOR CALL:** correct the article prose to today's behaviour, or leave
it as target state pending a compiler fix? A live docs page that overclaims is
worse than a modest one — recommend correcting now, restore when checks land.

### GATES AT CLOSE — honest

| gate | result |
|---|---|
| `scrml build` (types) | **exit 0** |
| `wiki-verify` | **6/6** |
| `gold-verify` | **🔴 9/11** — see item 1 |
| `build:artifacts` | exit 0; `data/` drifts vs S291 (reverted, not committed) |
| scrml.dev live | 200 |

**Changelog:** this repo has no `docs/changelog.md`; per `.pa-base/profile` it is
folded into this hand-off. **Delta-log:** none by profile design. Neither
skipped — both by prior ruling.
**Maps:** module dropped at `/flobase`; scope is now medium and this is the
third session it has been worth revisiting. Not run.
**Worktrees:** main checkout only. **Generated docs:** `gen-reference-nav.mjs`
re-run at close — no-op, nav current (73/73, 0 stubs).

### NEXT

1. **Operator ruling: commit-on-arrival for cross-PA notes?** Cheapest fix to a
   two-day comms failure.
2. **Operator ruling: correct `orm-trap.scrml` now?**
3. Await scrml PA on the SQL escalation + the S291 showcase regression. **Hold
   the CI pin at S287 until then.**
4. Install path (`bun add -g scrml`) — gates video *production*, not scripting.
   Three blockers scoped in the npm note; `handOffs/` leak is the urgent one.
5. Ep. 04 — `css-without-build-step` or `34-value-native-set`.
6. Page titles: all 99 render `<title>` as the filename. Fix verified (authored
   `<title>` per page; `<program title=>` does NOT cover routed pages).

## ⇢ SESSION 9 CLOSE 2026-07-26 — **scrml.dev IS LIVE, SERVING THIS REPO**

**READ FIRST.** The deploy landed. `scrml.dev` now serves the scrml-built wiki
out of `bryanmaclee/scrml-site` via GitHub Actions → Pages. Everything is
pushed; `main` == `origin/main`, tree clean.

### The state that matters next boot

- **Live:** `scrml.dev` (HTTPS enforced; cert covers `scrml.dev` +
  `www.scrml.dev`; `www` 301s to apex). Default URL
  `bryanmaclee.github.io/scrml-site/` also works but nav 404s there — the site
  uses ABSOLUTE links (`/reference`) and the compiler has NO base-path flag, so
  it is apex-only by construction. Do not try to host it under a path prefix.
- **Deploy path:** `.github/workflows/deploy.yml` — checks out the compiler
  (NOT on npm) and builds with `--target static`. **The compiler ref is PINNED**
  to `50478f0e` (S287), the commit this repo's gate suite was actually run
  against. **Bumping that SHA requires re-running the full gate first** — the
  emitted `.js.map` drives showcase hover-provenance.
- **Reference is complete:** 73/73 written, 0 stubs.

### ⚠ ONE LIVE DEFECT — page titles are filenames

`/`, `/reference`, `/articles` all render `<title>index</title>`. Pre-existing
content debt that only became consequential at go-live (tabs, search results).

**Fix is verified, not guessed.** SPEC §40.7 order: author-written `<title>`
wins → else `<program title=>` → else **basename**. Probed it: a page with an
authored `<title>` gets it; a page without falls to basename **even when
`<program title=>` is set**, so there is NO one-line shell fix. Needs a
`<title>` in each of the 99 pages, derivable from each page's `<h1>`.
**This is the recommended first item of the next thread.**

### What the deploy exposed (and why the gates missed it)

`/about` and `/learn` **404'd on static hosting**: `pages/about.scrml` emitted
`about.html` beside a directory `about/` with no `index.html`. `scrml dev`
resolves that; static hosts do not. Four sessions of green gates never saw it
**because the gates only ever exercised the dev server.** Fixed by moving both
to the `index.scrml`-in-directory shape `reference/` and `articles/` already
used. The workflow now carries a collision guard, verified to fail on the
pre-fix artifact and pass on the fixed one.

**Lesson worth keeping: gate the ARTIFACT, not the dev server.** The static
artifact was served through a Pages-alike static server and re-gated (6/6 +
11/11) — that is what caught this.

### Cross-repo: what was done to `../scrml` (operator-authorized)

The operator explicitly authorized editing the sibling repo for the cutover,
overriding the inbox-only rule. What happened:
- `../scrml` `main` is a **PROTECTED branch** (required check `gate`,
  0 approvals, `enforce_admins` on). Direct push was rejected; **nothing was
  bypassed.** Change went via **PR #187**, merged after `gate` passed.
  `tracking` failed — verified **pre-existing** on their `main` at `57789971`,
  identical failure, and our diff was one deleted line no test reads.
- `docs/CNAME` removed there so this repo could claim the domain (GitHub allows
  one repo per domain). **Their Pages stays ENABLED** at its default URL;
  nothing deleted, fully reversible.
- Their local `main` was restored byte-identical after the branch was cut;
  their working tree untouched apart from our inbox note.
- **NOT done, deliberately:** retiring `docs/build.ts` / `docs/website/` —
  still a live fixture for 3 compiler tests per their S280 ruling.

### AWAITING REPLY — scrml PA, `needs: action`

`../scrml/handOffs/incoming/2026-07-26-0400-…-three-unemittable-or-shadowed-
error-codes.md` — still **unread** in their inbox as of close. Three §34
codes that never reach a developer, each with a verified reproducer:
- **`E-CHANNEL-INSIDE-PAGE` — NEVER FIRES.** `<channel>` inside `<page>`
  compiles clean *and wires the channel*. Zero fire-sites; the source comment
  deferring it to "once `<page>` parser support lands" is stale.
- **`E-SQL-006`** — build exits 0; error ships as a runtime `throw` in emitted JS.
- **`E-CHANNEL-008`** — shadowed by `E-IMPORT-004`, even with `as` aliasing.

The operator has said we **wait for that reply** before acting on it.

### Compiler moved MID-SESSION — re-gate is mandatory after any dep move

`../scrml` went S281 `fix/each-multi-root` → S287 `main` while this session was
running. All gates were re-run against S287. A new upstream lint
**`W-INTERP-IN-RAW-CONTENT`** (§4.17: a literal `?{` or `${` inside raw-content
`<pre>`/`<code>`) appeared: fixed on our 3 new pages; **~120 occurrences remain
on pre-existing article + reference pages.** Warning-level, build exits 0.

### `data/` is still NOT attributable — open

Committed artifacts were baked from `feat/wave1c-nav`, a branch never merged to
`main`; nobody could tell because nothing records which compiler produced them.
The linked dep is a symlink to a live working tree, so `data/` reflects
whichever branch the sibling is on — **a `data/` diff does NOT reliably mean
"the compiler moved"** (correct that claim in `.pa-base/profile`). CI is now
pinned; `build-artifacts.mjs` is not. Stamping the compiler SHA into the build
manifest is the fix. Regeneration was **reverted** this session rather than bake
an unmerged branch in twice.

### GATES AT CLOSE

`dev server` wiki **6/6** · showcase **11/11** · 101 routes · **0 dead links**
`static artifact` wiki **6/6** · showcase **11/11**
`scrml build` **exit 0** · sample audit **9** known self-contained failures (no regressions)

### NEXT — recommended order

1. **Page titles** (99 pages, scriptable from `<h1>`) — the one live defect.
2. `/dashboard` ships a 212-word "coming soon" page — build it or drop it from nav.
3. `about/changelog.scrml` 60w stub; `about`/`learn` index pages are thin (~75w).
4. `data/` SHA attribution in `build-artifacts.mjs`.
5. Held on operator: historical-articles ruling (governs 1 held `server` site).
6. Held on scrml PA: the three findings above; trigger-free `server` sweep
   (`g-trigger-3`); dropping the nested-list reconcile workaround.
7. `maps` module still worth revisiting (dropped on small-scope grounds; scope
   is now medium).

## ⇢ SESSION CLOSE 2026-07-22 — (superseded; machine setup below still valid)

**READ THIS FIRST NEXT BOOT.** Everything is pushed (`origin/main` = local, 0
ahead / 0 behind, tree clean). The next session runs on the operator's **other
machine**, so the first thing to do is the per-machine setup, which is NOT in git.

### Cross-machine setup (per-machine state, gitignored)

`node_modules/` is gitignored and `bun link` is a **per-machine global registry**.
On the other machine, before anything else:

```
cd ../scrml && bun link          # register the `scrml` package on THAT machine
cd ../scrml-site && bun install  # resolves `scrml: link:scrml`
```

Then sanity-check the link before trusting any gate:
`ls node_modules/scrml/compiler/bin/scrml.js` and
`ls node_modules/scrml/node_modules/playwright/index.js` must both resolve.

**Requires the sibling layout** `<root>/scrml` + `<root>/scrml-site`. Playwright is
NOT a devDependency here — it is borrowed from the compiler repo's `node_modules`
through the link.

### Portability fix landed THIS wrap — do not undo it

All three scripts previously hardcoded `/home/bryan/...`, including **both
merge-blocking gates**. On a different machine or home dir they would all have
failed at the first boot. Now they resolve **through the linked dependency**
(`node_modules/scrml/...`), which is machine-independent by construction:
- `scripts/wiki-verify.mjs`, `scripts/gold-verify.mjs` — `PLAYWRIGHT` env override
- `scripts/audit-samples.mjs` — `SCRML` env override
Re-verified after the change: **wiki 6/6 · showcase 11/11.** If the sibling layout
differs on the other machine, set those env vars rather than re-hardcoding a path.

### Gate commands (the full green check)

```
bash scripts/serve.sh 8787 &      # wait ~30s for it to listen
node scripts/wiki-verify.mjs      # site-wide      -> 6/6
node scripts/gold-verify.mjs      # /showcase      -> 11/11
node_modules/.bin/scrml build . --output /tmp/x    # types gate -> exit 0
node scripts/audit-samples.mjs    # advisory       -> 9 known self-contained failures
```
**Dev-server caveat:** after ANY `app.scrml` (shell) edit, `rm -rf dist` and
restart `serve.sh` — the watcher recompiles pages but does NOT recompose emitted
page HTML on a shell change (reported to ../scrml).

### Inbox absorbed at close — scrml PA S281 triage (`needs: fyi`, no reply owed)

Our static-component `TypeError` is **three defects, one new**:
- `g-composition-strip-eats-last-dep-script` (pre-existing, now confirmed live) —
  **this is what actually throws**; the dep `<script>` is dropped in composed
  nested routes.
- **`g-static-component-import-dead-destructure` (NEW, HIGH)** — our suggested fix
  was recorded: don't emit the import/destructure when every binding resolves to
  static markup. Fixing this alone makes the dep-script gaps non-fatal.
- `g-runtime-script-tag-not-depth-prefixed` — the bare runtime tag is emitted
  *alongside* the correct `../` one: a duplicate 404, not a broken load.
Also filed from our report: `g-foreach-lift-codegen-stage-rejection` (LOW).
**Their guidance: KEEP the CSS-opt-in sidebar for now.** It works around the
dep-script strip, not around component reuse being unsound — ordinary component
reuse should work in flat layouts as soon as the destructure fix lands. They also
logged that this is the **second** feature pushed into CSS-opt-in shape by the V1
one-flat-`<outlet>` rule (§20.8.1), as a design signal for per-section layouts.
They will **ping us when `g-trigger-3-server-only-import-does-not-escalate` lands**
— that unblocks the held trigger-free `server` sweep.

### Wrap bookkeeping

- **Gates at close:** wiki **6/6** · showcase **11/11** · `scrml build` **exit 0** ·
  sample audit **9** known self-contained failures (all context-poor snippets, no
  regressions).
- **Changelog:** this repo has no `docs/changelog.md`; per `.pa-base/profile` the
  changelog is **folded into this hand-off** (small scope). Not skipped — by design.
- **Maps:** the `maps` module was dropped at `/flobase` on small-scope grounds.
  **Scope has since gone small → medium (9 → 106 source files), so this is worth
  revisiting** — noted in the profile, not silently skipped.
- **Worktrees:** only the main checkout; nothing to prune.
- **Generated docs:** `node scripts/gen-reference-nav.mjs` re-run at close — a
  no-op, so the committed nav is current (`coverage: 38/73 written, 35 stubs`).
- **Inbox:** empty. All traffic in `handOffs/incoming/read/`.

### Open decisions waiting on the operator

1. **Deploy + GitHub metadata** — explicitly deferred to next session on the other
   machine. scrml.dev still serves the interim static HTML from `scrml/docs/`;
   CNAME, Pages, and retiring `scrml/docs/build.ts` are all open. The repo
   (`github.com/bryanmaclee/scrml-site`) is **public** with **no description /
   topics / homepage** set — the README's first line is the ready-made description.
2. **Historical articles** — do v0.2.0/v0.3.0 announcements get updated to current
   semantics, or preserved as period records? Governs the 1 held `server` site and
   likely others.
3. **Stub coverage** — 35 of 74 reference pages are ~60-word stubs (errors 19/54).
   Write them, or narrow the sidebar to what exists.

## Session 8 — PROSE-vs-SPEC AUDIT (2026-07-22)

The class neither gate can see: prose that compiles and renders but is *wrong*.
Made it evidence-based by checking claims against SPEC + compiler rather than
reading for vibes.

### Mechanical cross-checks

**Error codes — 54 documented, cross-checked against compiler source AND the SPEC
diagnostics table.** All exist except one:
- **`E-PURE-001` was RETIRED 2026-07-16 (S263).** SPEC carries it struck through:
  *"Superseded by the E-FN-001..009 family (§33.6); the `pure` modifier is
  deprecated language-wide (use `fn`)."* Zero occurrences in `compiler/src`,
  while `E-FN-001..005/007/008` are all live. **The wiki had a full reference page
  for an error the compiler cannot emit**, plus `reference/contexts/logic.scrml`
  citing it as current.
  → page kept as a **tombstone** with a retirement banner (old build output and
  existing code still name it); `logic.scrml` updated to `E-FN-001…009`.
  *(Two other codes initially flagged — `E-CHANNEL-INSIDE-PAGE/PROGRAM` — were my
  grep artifact; they exist in `symbol-table.ts`.)*

**SPEC citations — all 156 distinct `§` references resolved against SPEC headings.**
4 unresolvable, of which only **1 is a real error**:
- `articles/components-are-states.scrml` cited **§52.2** for "no `authority=`, so
  client-local by default". §52 skips from 52.1 to 52.3 — **52.2 was removed**.
  The *claim is correct* (SPEC: *"`authority="local"` is the default"*); the
  citation was stale. → retargeted to **§52.3.2**.
- The other 3 (§0.1, §3.7, §9.7) cite **other documents** — master-list, the
  primer, giti's spec — not SPEC.md. Not errors. (My first parser also produced 8
  false positives by missing headings written `## §53.1` with the section symbol.)

### The structural finding — coverage, not correctness

**35 of 74 reference pages are ~60-word stubs** (median real page: 180 rendered
words). By section:

| section | written | note |
|---|---|---|
| contexts | 3/3 | complete |
| keywords | 4/4 | complete |
| elements | 11/12 | only `<db>` is a stub |
| **errors** | **19/54** | **65% stub** |

The conceptual surface is genuinely written; **the error-code reference is mostly
empty** — and that is precisely what the session-6 sidebar surfaces most
prominently (54 entries across 28 families). Browsing promised 73 written pages
and delivered 38.

*Measurement note:* an initial pass counted 40 stubs off a `// Day-30 placeholder
stub` header comment, but exactly one page (`E-IDLE-DUPLICATE`) had that stale
comment over real content. Re-measured from **rendered word count**, not comments.

→ **FIXED, not just reported:** `scripts/gen-reference-nav.mjs` now measures each
page from source and marks stubs in the sidebar (dimmed + `·`, `title="stub — not
yet written"`). It prints `coverage: 38/73 written, 35 stubs marked` on every
regeneration, so coverage is visible while authoring instead of discoverable only
by clicking.

### Coverage gap left open

**Zero pages document `E-FN-001…009`** — the family that replaced `E-PURE-001`.
A reader hitting `E-FN-003` today finds nothing.

**GATES: wiki 6/6 · showcase 11/11 · `scrml build` exit 0.**

**NEXT:** write the 35 stub error pages (or narrow the sidebar to what exists) ·
document `E-FN-001…009` · operator call on historical announcement articles ·
make the 9 context-poor doc snippets self-contained · deploy decisions.

## Session 7 — `server` SPLIT MIGRATION executed (2026-07-22)

Executed the scrml PA's ruling. **10 migrated · 1 held · `server fn` untouched.**

**Corrected our own count first.** We had reported 31 sites; the real figure is
**43 `server`-keyword occurrences**. The original grep missed pages that
obfuscate keywords as numeric character refs (`s&#101;rver f&#117;nction`) so the
doc page's own compile doesn't parse the sample. Proper breakdown:

| | count | action |
|---|---|---|
| `server fn` | 9 | **untouched** — NOT deprecated (SPEC §48), permanent for pure server-pinned helpers |
| `server function` in prose / inline `<code>` | 22 | **untouched** — editorial, not code |
| `server function` in `<pre>` code samples | 11 | the migration scope |

**The PA's suggested detector could not be used.** `W-DEPRECATED-SERVER-MODIFIER`
cannot fire on our samples: every one omits the `<db>`/`<schema>` a doc snippet
naturally leaves out, so they die on `E-SQL-004`/`E-SCHEMA-003`/`E-PA-002` before
placement analysis says anything. So we **validated the rule on a minimal
compiling case** and applied it structurally:

| variant | `.server.js` emitted | `W-DEPRECATED` | SQL in client bundle |
|---|---|---|---|
| **with** `server` | yes | **fires** | 0 |
| **without** `server` | **yes** | — | 0 |

That is the exact safety property the PA warned about, confirmed in the direction
that matters: **removing the keyword from a `?{}`-bodied function keeps it on the
server.** All 10 migrated sites have `?{}` SQL in the function body.
Migrated: `lsp-and-giti-advantages` · `orm-trap` · `server-boundary-disappears` ·
`tier-ladder-promotion` (×3) · `learn/server-boundary` · `reference/contexts/sql` (×3).

**HELD — 1 site.** `articles/v0.2.0-announce.scrml`, `server function postMessage`
inside a `<channel>` writing `@messages`. Trigger-free by the PA's rule → held per
instruction. **Not the secret-leak shape** — it is the §38.4 channel-cell case and
currently fails `E-CHANNEL-SERVER-CELL-READ`. We fixed the IDENTICAL pattern on
`reference/elements/channel.scrml` in the content audit. Not applied here because
it is a **v0.2.0 announcement** and the client-held model is the later 2026-06-12
RULING A. **OPERATOR CALL: do historical announcement articles get updated to
current semantics, or preserved as period records?** That decision governs this
file and probably others.

**GATES: wiki 6/6 · showcase 11/11 · `scrml build` exit 0 · sample audit unchanged
at 9 self-contained failures (no regressions).**

**Sent** `../scrml/handOffs/incoming/2026-07-22-1930-…-split-migration-done-plus-
static-component-import-bug.md`: migration report + **the static-component import
bug** owed from session 6 (a purely-static component's import emits a client
destructure of a module the page never loads, and which exports an empty object
anyway — 66 of our 74 reference pages threw). Also flagged that
`E-CODEGEN-INVALID-LOGIC` on `forEach(x => lift …)` should reject earlier with the
canonical form named.

**STILL HELD:** the trigger-free sweep, pending
`g-trigger-3-server-only-import-does-not-escalate` landing on their side.

**NEXT:** operator call on historical articles · prose-vs-SPEC audit · make the 9
context-poor doc snippets self-contained · deploy decisions (CNAME, Pages).

## Session 6 — reference sidebar + scrml PA ruling received (2026-07-22)

### A. REFERENCE SIDEBAR — landed, gated

~99 routes were served by a 7-item header nav; the 73-page reference tree had no
navigation of its own. Now it does: Elements (12) · Keywords (4) · Contexts (3) ·
Errors & warnings (54, collapsed into 28 `<details>` families with counts).
Sticky, scrollable, current page highlighted.

**Architecture — three constraints forced it, in order:**
1. **The shell cannot branch on route.** `route.*` is page-scoped; using it in
   `app.scrml` is `E-SCOPE-001`. So "render the sidebar only on /reference/*"
   cannot be expressed in the shell directly.
2. **No per-section layout.** SPEC §20.8.1: V1 has ONE flat `<outlet>` per shell;
   nested layouts are v1.next. So there is nowhere to hang a section layout.
3. **Component import is BROKEN for static components** (compiler bug, see C).

**Resulting design:** the nav is authored ONCE in `app.scrml`, **hidden by
default**, and each reference page opts in with a scoped `#{}` rule that shows it
and marks its own link active. Fully static — **zero client JS**, present in the
server HTML, no flash, crawlable.
- **GENERATED**: `node scripts/gen-reference-nav.mjs` rewrites the marked region
  in `app.scrml` from the filesystem. A hand-maintained tree over 73 pages drifts
  the moment someone adds a page, and a nav that omits a page makes it
  unreachable by browsing.
- **`!important` on the opt-in is load-order, not laziness:** the shell's
  `app.css` is linked AFTER the page stylesheet, so its `.refnav{display:none}`
  default wins at equal specificity. Documented inline at all 74 sites.

**GATE: wiki 6/6** (new assertion: sidebar shown in-section, hidden out,
current link active — it fails silently otherwise, since a botched opt-in just
renders nothing) **· showcase 11/11 · `scrml build` exit 0.**

### B. WHAT I TRIED FIRST AND BACKED OUT — component import

The obvious design (a `ReferenceNav` component imported by each page) **compiles
clean and renders correctly server-side, but throws on every reference page.**
The wiki gate caught it — 4/5, `no uncaught page errors` FAIL. Two compiler
defects compounding:
1. The page's `client.js` emits
   `const { ReferenceNav } = _scrml_modules["components/reference-nav.client.js"]`
   but **the page never script-includes that module** — so it is `undefined` →
   `TypeError` on all 66 reference pages that emit client JS.
2. That module registers an **empty object** anyway: a purely-static
   presentational component has nothing to export client-side.
Reverted the 74-file wiring and rebuilt on the shell+CSS approach. **Do not retry
the import approach until the compiler fix lands.**

### C. SCRML PA REPLY RECEIVED — the `server` arc is PARTIALLY unblocked

`handOffs/incoming/read/2026-07-22-1815-…-server-keyword-ruling-and-two-findings.md`

**Ruling: option 1.** Inference is meant to cover every case; `server` is fully
deprecated with plain `function` as the migration. No replacement annotation, no
permanent dual-status.

**But our question exposed a live HIGH defect on their side.** SPEC §12.2
Trigger 3 (a function importing a server-only stdlib module escalates) **is
spec'd and NOT implemented** — `SERVER_ONLY_SCRML_MODULES` exists but is only
consumed by async classification, never wired as a placement trigger. They
reproduced it with our exact `issueToken` example: **without `server`, no
`.server.js` is emitted at all and the secret ships to the browser**
(`grep -c "s3cr3t" app.client.js` → 1). Filed
`g-trigger-3-server-only-import-does-not-escalate` (HIGH, confidentiality-adjacent).
They confirmed holding the arc was correct and `server` is currently
**load-bearing, not redundant**.

**Our action — SPLIT the 31 sites, migrate only half:**
- **Redundant** (body has another trigger — `?{}` SQL, `broadcast()`, `handle()`,
  a server-classified caller): **migrate now**, delete the keyword. Reliable
  detector: **`W-DEPRECATED-SERVER-MODIFIER` fires exactly where it is redundant.**
- **Trigger-free**: **HOLD.** Deleting today silently relocates the function and
  any secret it closes over to the client. They will notify when Trigger 3 lands.
- **`server fn` is NOT deprecated** — permanent for pure server-pinned helpers
  (SPEC §48). Must not be swept up in the migration.
- No target version for hard removal; warn-only until Trigger 3 ships.

**Also ruled: `docs/website/` STAYS** on their side as a live test fixture for 3
compiler tests (esm-script-tag-module-format, tailwind-phase1-coverage,
bs-layer-corpus-friction-bugs). **Our migration stands and scrml-site is the
wiki** — the copy is a fixture, not a second source of truth. Nothing to do.

**NEXT:** the split-migration above (use `W-DEPRECATED-SERVER-MODIFIER` as the
detector) · report the static-component import bug to ../scrml · prose-vs-SPEC
audit · make the 9 context-poor doc snippets self-contained · deploy decisions.

## Session 5 — CONTENT AUDIT of the migrated wiki (2026-07-22)

Audited the ~99 migrated pages for prose/semantics drift against v0.7.1. Made it
**executable** rather than reading 99 pages: extracted all **140 `<pre><code>`
samples** from the built site and compiled each against the linked compiler.
Docs that don't compile are provably wrong.

**4 REAL DOC BUGS FOUND AND FIXED** (each isolated to a minimal repro, fixed, and
re-verified compiling):
1. **`reference/keywords/lift.scrml`** — documented `${ @contacts.forEach(c => lift
   <li>…</li>) }`. Not lowerable → `E-CODEGEN-INVALID-LOGIC`. **The `lift` page was
   documenting `lift` with an idiom that does not compile.** → `for (let c of …) {
   lift … }`.
2. **`reference/keywords/derived.scrml`** — same `forEach + lift` idiom. Same fix.
3. **`articles/why-deprecate-overloading.scrml`** — 6× `if (not fn(…))`, i.e. the
   REMOVED boolean-negation `not` (`E-TYPE-045`). `not` is the absence value; `!`
   negates. (Source obfuscates keywords as numeric char refs — `n&#111;t` — so the
   page's own compile doesn't parse them; fixed in that encoding.)
4. **`reference/elements/channel.scrml`** — the worked example had a
   `server function` READING the channel cell `@messages` →
   `E-CHANNEL-SERVER-CELL-READ`. Per SPEC §38.4 a channel-cell WRITE is
   **client-side** and auto-syncs; it needs no `server` keyword. Dropped the
   keyword, and **reconciled the caption**, which still said "one server function
   exposed to clients" and would otherwise have contradicted the corrected code.
5. **`articles/realtime-and-workers.scrml`** — the worker example used
   `export function` + `await <#compute>.fibonacci(35)`. **That API does not
   exist.** SPEC §4.12.4: workers use `when message(data) { … send(result) }` in
   the worker and `<#name>.send(value)` in the parent. Rewritten to the normative
   protocol; verified exit 0.

**VERIFIED NOT BUGS — tested before touching, deliberately left alone:**
- **`server function` — CORRECTED 2026-07-22, see below.** 31 uses across 11
  pages, left untouched. My test compiled clean with no deprecation warning, but
  that test used a function with NO other escalation trigger. **That claim is
  incomplete as stated** — see the Session-5 addendum.
- **Plain `forEach` (no `lift`) is valid** — `learn/validators.scrml` untouched.
- **11 error-reference pages fail with their own error code** — that is the
  documentation being CORRECT, not broken. Auto-excluded by the tool.
- `/reference/elements/page #1` "failure" is a **directory listing** in a `<pre>`,
  not code — an extractor false positive.

**LANDED THE AUDIT AS A TOOL — `scripts/audit-samples.mjs`** (advisory, never
blocks). Extracts every documented sample from `dist/`, classifies
(self-contained / fragment / skeleton / shell), auto-excludes error-page
self-demos, compiles each, and reports **self-contained failures as actionable**.
Header documents the caveat: fragment failures usually mean the harness lacks
surrounding context, NOT that the doc is wrong — judge by whether the error names
a removed or invalid construct.

**Result: self-contained failures 17 → 9.** The remaining 9 are all
"snippet omits a `<db>`/`<schema>`/surrounding declarations it needs"
(`E-PA-002` ×2, `E-SQL-004` ×2, `E-SCHEMA-003`, `E-SCOPE-001`/`E-STATE-UNDECLARED`
×3) plus the one extractor false positive. **No further dead-syntax bugs.** Worth
a later pass to make those snippets self-contained, but they teach nothing false.

**GATES: wiki 5/5 · showcase 11/11 · `scrml build` exit 0.**

**WHAT THIS AUDIT DOES NOT COVER — be honest about it.** Compiling proves
*syntax*, not *semantics*. A sample can compile and still describe the wrong
behaviour, cite a stale SPEC §, or explain a rule that has since inverted. Prose
claims ("X is the default", "Y is not yet supported") are entirely unchecked.
Spot-checks against SPEC caught #4 and #5 — a systematic prose-vs-SPEC pass is
still open, and is the natural next audit.

### Addendum — `server` keyword: ARC HELD pending scrml PA reply

The operator confirmed the `server` keyword **is** meant to be deprecated, which
makes my session-5 "still valid, leave it" verdict the wrong end-state. Re-tested
properly; the compiler is behaving EXACTLY to spec:

| case | result |
|---|---|
| `server function` **+** another trigger (`?{}` SQL) | `W-DEPRECATED-SERVER-MODIFIER` **fires** |
| `server function`, **no** other trigger | compiles clean, **no warning** |

That matches §34 verbatim ("fires ONLY when at least one other trigger would
escalate") and is correct — in the trigger-free case, deleting the keyword would
silently **relocate the function to the client**. The warning is not missing; it
is deliberately scoped. My earlier claim was measured on a trigger-free function
only and is incomplete as a general statement.

**The open question** (why the arc is held): §12.2 Trigger 4 is the ONLY way to
force server placement when the body has no other trigger, so `server` is
currently *deprecated-but-not-removable*. Redundant uses have a clean migration
(delete the keyword); trigger-free uses have no replacement we can find.

**SENT, blocking:** `../scrml/handOffs/incoming/2026-07-22-1700-scrml-site-to-
scrml-server-keyword-deprecation-path.md` (`needs: reply`, `blocking: true`).
Asks: what is the intended end-state (replacement annotation / new trigger /
permanent dual-status), is there a version where `server` stops compiling, and
what spelling should the docs teach?

**DO NOT rewrite the 31 sites until that reply lands.** On the answer: classify
each site redundant vs trigger-free, rewrite, re-run `scripts/audit-samples.mjs`.

**NEXT:** KB-nav / reference sidebar (~99 routes, 7-item header nav, the reference
tree has no navigation of its own) · make the 9 context-poor snippets
self-contained · prose-vs-SPEC audit · coordinate `docs/website/` retirement with
the scrml PA · deploy decisions.

## Session 4 — PROJECT RESET: scrml-site IS THE WIKI (2026-07-22)

**Operator reframe:** *"this isn't meant to just be a novelty dashboard. it is
meant to be the wiki of scrml."* That changes what this repo IS. The
compile-transparent viewer is now ONE PAGE (`/showcase`) of the documentation
site — the page that PROVES the language is real, beside the reference that
explains it.

**The wiki already existed, in the wrong repo.** `scrml/docs/website/` held
**98 `.scrml` pages** — already written in scrml, with exactly the structure our
nav declared. Three facts made the move obvious:
1. It **compiles clean against v0.7.1** (built it before touching anything:
   exit 0, 0 errors, 98 HTML pages). Not stale like this repo had been.
2. **Nothing built or deployed it.** No Pages workflow; `docs:build` only renders
   the 10 articles. Untouched since 2026-06-19.
3. Its own tooling says it's temporary — `docs/build.ts` verbatim: *"This is
   interim tooling. Once scrml v0.2.0 ships, the site will be built with scrml
   itself; this script goes away."* We are at **v0.7.1**.

Operator ratified: absorb it here; defer deploy decisions until it's visible.

**MIGRATION DONE — 106 .scrml, ~99 routes, all green.**
1. `pages/index.scrml` (the dissector) → **`pages/showcase.scrml`** via `git mv`.
2. `scrml/docs/website/pages/*` → `pages/` (98 files). `scrml/docs/website/app.scrml`
   → `app.scrml`, REPLACING the viewer shell (sticky header, full nav, footer,
   dark theme — it is the real site shell).
3. Shell merged, not just copied: added `<outlet/>`, added the **Showcase** nav
   entry, ported `.mono` (the only shell style the showcase needed that the wiki
   shell lacked — it already had a better `.built-in-pill`), repointed **3 more**
   retired-`scrmlTS` links, corrected VERSION `v0.7.0` → `v0.7.1`.
4. `scrml build .` → **exit 0, 106 files, 0 errors, 100 pages**.

**⚠ FOUND AND FIXED — the reference pages' code blocks were INVISIBLE.** The
typography layer ships `.prose-slate :where(code) { color: #0f172a }`, a
LIGHT-theme value. Measured in-browser: `<pre>` bg `rgb(15,23,42)`, `<code>`
color `rgb(15,23,42)` — **identical**. Every fenced example on every reference
page rendered as dark-on-dark. For a documentation site whose core content IS
code samples, that is the whole product being broken. Fixed in `app.scrml`:
`pre code { color: inherit !important; background-color: transparent !important }`
— theme-agnostic, since the `<pre>` already carries `text-slate-100`.
Re-measured: `rgb(241,245,249)` on `rgb(15,23,42)`. **Now gated** (see below) so
it cannot regress.

**GATE IS NOW TWO SCRIPTS — both exit 0.**
- **`scripts/wiki-verify.mjs` (NEW, site-wide, 5/5 PASS):** every emitted route
  resolves 200 — **99/99**, with the route list **DERIVED from `dist/`** so a new
  page is covered the moment it compiles (a hardcoded list silently stops gating
  the thing it gates) · shell + outlet render on a spread of 6 pages · **soft nav
  is genuinely soft** (a `window` stamp survives an in-site click — a full reload
  would wipe it) · code-block contrast (fg/bg luminance separation) · no uncaught
  page errors.
- **`scripts/gold-verify.mjs` (11/11 PASS):** retargeted to `/showcase`, since
  `/` is now the wiki landing. `GATE_BASE` overrides the origin. The showcase
  survived the migration completely intact — provenance, both flagships, nested
  engine pane.

**Soft nav is now load-bearing, and it was off until today.** Enabling it in
session 3 looked like a small lint fix on a 2-page site; on a ~100-page wiki it
is the difference between a site and a stack of documents.

**SCOPE CHANGED: small → MEDIUM** (9 source files → 106). The `maps` module was
dropped at `/flobase` on "small scope" grounds — **that no longer holds; revisit.**

**NOT DONE — deliberately:**
- `scrml/docs/website/` is **still in place**; I copied, did not delete. Removing
  it is the compiler PA's call and needs a coordination message.
- **Deploy is untouched.** scrml.dev still serves the interim static HTML from
  `scrml/docs/`. CNAME, Pages, and retiring `docs/build.ts` are all open.
- **No content audit.** The 98 pages COMPILE against v0.7.1; that proves syntax,
  NOT that the prose matches current semantics. They sat untouched for a month
  while the compiler moved. Worth an audit pass.

**NEXT (recommended order):**
1. **Content audit** of the migrated wiki against v0.7.1 semantics — the highest
   risk now is confidently-wrong documentation, which is worse than none.
2. **KB-nav / reference sidebar.** ~99 routes with only a 7-item header nav; the
   reference tree (elements · keywords · errors · contexts) has no navigation of
   its own. This is what "KB-nav" in the old backlog actually meant.
3. **Coordinate with the scrml PA** — the wiki has moved; propose retiring
   `docs/website/` + `docs/build.ts`.
4. Then deploy decisions, and the showcase backlog (PE-layer toggle, postMessage
   live-pane↔source bridge).

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

5. **v0.7.1 CONFORMANCE — all 9 errors FIXED; `scrml build` now exits 0.** The
   rewire had revealed pre-existing language drift (source written against a
   compiler 107 sessions old); `scrml dev` emits leniently, so the site ran
   while a production build was broken. Two classes, both closed:
   - **`E-TYPE-ANY-FORBIDDEN` ×8** — `any` is no longer a type in scrml. All 8
     were `-> any` RETURN annotations. Fixed by declaring named structs and
     threading real types (inline object return types mis-compile — the
     pre-existing FRICTION note still holds, so every shape is a named struct):
     - `pages/index.scrml` — new records `Cell {text, srcLine}` ·
       `JsCellLine {n, cells:[Cell]}` · `TextLine {n, text}` ·
       `Flagship {id, title}` · and the engine-graph shape
       `EngineLifecycle` / `EngineState` / `EngineTransition` / `Engine`
       (mirrors the `--emit-engine-graph` JSON exactly). Signatures:
       `cellsForLine -> [Cell]` · `buildJsCellLines -> [JsCellLine]` ·
       `toLines -> [TextLine]` · `enginesOf -> [Engine]` ·
       `flagshipList -> [Flagship]`.
     - `components/output-tabs.scrml` + `components/source-pane.scrml` — local
       `TextLine` struct; `toLines -> [TextLine]`.
     - `components/engine-graph-pane.scrml` — `stateFlags -> [string]`.
   - **`E-TYPE-045` ×1** — `lib/provenance.scrml:142`
     `if (not bucket.includes(...))` → `if (!bucket.includes(...))`. `not` is
     now the unified ABSENCE value (`expr is not`), NOT boolean negation; `!` is
     the negation operator.

**GOLD-VERIFY 10/10 PASS** (Chromium via playwright from `../scrml/node_modules`,
absolute-path import). Source pane 177 lines · selector 2 buttons · flagship
iframe mounts · 287 JS cells · FORWARD hover lights exact sub-line cells (both
flagships) · unhover clears to 0 · REVERSE hover activates the source line ·
selector re-renders source (mario→triage) · active-state flips. **Zero page
errors.** Script: `scratchpad/gold-verify.mjs`; screenshot `scratchpad/gate.png`
shows the live Triage Board + real source + DragPhase engine graph.

**GATE RE-RUN after the conformance fix (type changes can move codegen):**
gold-verify **10/10 PASS again, zero page errors**, dev-server reports ZERO
compilation errors, `scrml build .` **exit 0**, and `build:artifacts` is now
**byte-identical on re-run** — reproducibility against v0.7.1 restored.

6. **FRICTION WORKAROUNDS RE-VERIFIED against v0.7.1 (all three probed empirically):**
   - **[KEEP — still broken, now sharply characterized]** the `selectFlagship()`
     `[]`-clear. Removed it and measured: **FLAT lists are FIXED** by `df6d269c`
     (source pane 177→152, every line's text updates). **NESTED lists are NOT.**
     The engine pane (`for engines > for states > for next`) still renders
     mario's `Big,Cape,Fire,Small` after switching to triage instead of
     `Idle,Dragging`; `jsCellLines > cells` leaves 7 stale cells (192 vs 185).
     It is a **SILENT wrong-render** — the pane looks plausible and is lying.
     Restored the workaround (engine pane then correctly shows `Dragging,Idle`).
     **REPORTED** → `../scrml/handOffs/incoming/2026-07-22-1120-scrml-site-to-
     scrml-nested-list-reconcile-stale.md` (needs: action). Drop the workaround
     only when that lands, and re-verify with gate assertion 11.
   - **[RETIRED — fixed upstream]** `serve.sh` explicit-file-list → `scrml dev .`
     (landed earlier this session).
   - **[RETIRED — fixed upstream]** the dev watcher DOES hot-recompile. Probed by
     editing a `.scrml` against a running server: the change reached `dist/` and
     the served page within 12s. No restart needed.
7. **GATE HARDENED + made executable.** The nested-stale bug **passed the 10/10
   gate** because no assertion reached into the nested engine pane — a gate that
   only checks flat lists cannot see it. Added assertion 11 (nested engine pane
   re-renders per flagship) and moved the whole thing out of scratch into
   **`scripts/gold-verify.mjs`** (version-controlled, `exit 0` = green, header
   documents why assertion 11 must not be deleted). **Now 11/11.**

8. **LINT SURFACE TRIAGED — most of it is compiler false positives.** Verdicts:
   - **`W-DEAD-FUNCTION` ×2 = FALSE POSITIVE.** `buildJsCellLines` + `enginesOf`
     ARE called (index.scrml:385, :398) — the analysis **does not traverse
     arrow-callback bodies**. Isolated the trigger: `parseMappings` (called on
     the line ABOVE, same arrow body), `cellsForLine` (called from a `fn`), and
     `flagshipList` (called from a `function` body) all escape. `toLines` is
     called 3× ONLY from arrow bodies and escapes solely because
     `components/{source-pane,output-tabs}.scrml` export the same NAME —
     renaming it to a unique name makes it flag immediately. **DO NOT "clean up"
     these two functions.**
   - **`W-TAILWIND-UNRECOGNIZED-CLASS` ×17 = FALSE POSITIVE.** Every flagged
     class is defined in our own `#{}` style blocks. The lint recommends the
     `#{}` shim we already wrote. Dev-only (build doesn't emit these).
   - **`E-ROUTE-001` ×7 = inert.** Route-placement heuristic firing on plain
     array/dict indexing (`raw[i]`, `byLine[k]`) in pure client helpers; this app
     wires **0 server routes**. The suggested fix (`row.fieldName`) can't apply.
   - **`W-STYLE-CONFLICT-POSSIBLE` ×21 = advisory, accepted.** Fires on the
     `.tok-*` classes, mutually exclusive by construction (`lineClass()` returns
     exactly one) but not provably so.
   - **`W-OUTLET-ABSENT-SOFT-NAV-DISABLED` ×1 = REAL, FIXED.** See #9.
   Both false-positive classes reported → `../scrml/handOffs/incoming/
   2026-07-22-1210-scrml-site-to-scrml-lint-false-positives-and-shell-watcher.md`.
9. **REAL BUGS FOUND AND FIXED while triaging:**
   - **Soft navigation was OFF.** `app.scrml` used a bare `<main>` route slot, so
     every nav click was a full document load. Added `<outlet/>` inside `<main>`;
     the warning clears, the runtime now carries the soft-nav code, and `<main>`
     stays the document landmark.
   - **The GitHub nav link pointed at the RETIRED `scrmlTS` repo** — in BOTH
     `app.scrml` (the live inlined nav) and `components/nav-skeleton.scrml` (the
     reference copy). Repointed to `bryanmaclee/scrml`.
   - **`README.md` was entirely scrmlTS-wired** — my miss: the rewire commit
     never touched it, so its setup instructions (`bun link scrmlts`, `../scrmlTS`)
     would have broken a fresh clone. Rewritten: correct setup, the gate
     documented, both flagships, column-precision (it still described
     line-granularity provenance), current status.
10. **WATCHER VERDICT CORRECTED.** Session-3 item #6 retired the dev-watcher
    friction outright. That was too broad — it was a PAGE-edit probe. **SHELL
    edits (`app.scrml`) do NOT recompose the already-emitted page HTML**: a fresh
    `scrml build` emits `<div data-scrml-outlet>`, the running `scrml dev` keeps
    serving the old bare `<main>`, and `rm -rf dist` + restart fixes it. So an
    `app.scrml` edit looks like a no-op. **`rm -rf dist` + restart `serve.sh`
    after any shell edit.** Reported in the same message.

**Gate re-run after all of the above: 11/11 PASS, zero page errors,
`scrml build` exit 0.**

**KNOWN, NOT ACTED ON:** the nav links `/reference`, which **404s** on this repo
(only `/` and `/dashboard` exist). `components/nav-skeleton.scrml` says the nav
"links OUT to the existing 97-page site routes", so this is probably intentional
— a link to the larger scrml.dev site, dead only in local dev. **Operator call:**
leave it, drop it, or stub a `/reference` page.

**NEXT (recommended order):**
1. inc2 backlog: KB-nav · PE-layer toggle · postMessage live-pane↔source
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
