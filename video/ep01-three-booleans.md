# Ep. 01 — "You were about to write three booleans"

**Format:** short (No Boilerplate register) · **Measured runtime:** ~4:55
**Narration:** 754 words @ 170 wpm (4:24 of speech + ~31s of frame beats)
**Cold open, no intro card, no sign-off**

> Timecodes below are computed per beat from the actual word counts, not
> estimated. If you re-write a beat, re-derive them — an earlier draft of this
> header claimed 6:00–6:30 and was wrong by 90 seconds.

**Source:** `scrml/examples/29-engine-vs-flags.scrml` — the compiler's own test
corpus. Verified `scrml build` **exit 0** against v0.7.1 (S287) on 2026-07-26.
Every frame below is that file, unmodified except for the staged reveal.

---

## Production notes — read before recording

**1. The count is 4 / 4, not 3 / 5.**
The source comment says *"Only THREE of them are real screen states. The other
five are nonsense"* — but its own table marks four rows ✓ (Idle, Loading,
Failed, Loaded) and four ✗. The prose contradicts the table. **The script uses
4 real / 4 nonsense.** Worth fixing upstream in the example; do not propagate
the wrong number into a video where viewers will pause and count.

**2. This file emits one advisory warning.** `W-ENGINE-SELF-WRITE-DETECTED` on
line 86 (`@itemsPhase = .Loading` inside `load()`). It is **informational and
correct to ignore here** — the compiler's own text says so when the behaviour
is intentional, and it is: `load()` is reachable from the boot effect *and*
from the Reload/Retry buttons, i.e. from multiple variants, which is the
documented intentional case.

Decide deliberately: either **(a)** don't show a terminal, or **(b)** use it as
a 15-second beat — the compiler noticed a subtle thing, explained the exact
semantics, and told you no action was needed. Option (b) is a strong argument
for the tooling but costs runtime and breaks the "one lesson" discipline.
**Recommendation: (a) for this episode**, and bank the diagnostic-quality
argument for its own video. Do not show a clean terminal you didn't get.

**3. Don't say "make impossible states impossible" until the last 40 seconds.**
It's Elm's phrase and the audience for this channel knows it. Leading with it
tells them they already know the video; landing it at the end reframes what
they just watched. Credit it explicitly when you do.

**4. The CTA is a placeholder** pending the install path. Do not record a
"go install it" line until `bun add -g scrml` actually resolves.

---

## Script

### [0:00] Cold open — F1

> You're about to write three booleans.
>
> `isLoading`. `hasError`. `isLoaded`. And then a fourth cell to hold the data
> when it finally shows up.
>
> Don't.
>
> Not because it's verbose. Because of what it lets you say.

### [0:16] The count — F2 → F3

> Three booleans is two to the third. Eight combinations you can write down.
>
> Four of them are real screens. Idle, before you've asked for anything.
> Loading. Failed. Loaded.
>
> The other four are nonsense.

**F3 reveals the table row by row.** Beat on each nonsense row.

> Loading *and* failed. Loading *and* loaded. Failed *and* loaded. And the
> full house — all three true at once.
>
> Your type system is perfectly happy with every one of them. It will let you
> construct all four, today, with no complaint.

### [0:49] The cost — F4

> So you defend.
>
> Every render becomes a chain. If loading, spinner. Else if error, the
> message. Else if loaded, the list.
>
> That chain is load-bearing. It is the only thing standing between you and a
> spinner rendered on top of an error message.
>
> And it rots. The order matters and nothing enforces it. Someone adds a
> fourth flag next quarter — `isRefreshing`, obviously — and now it's sixteen
> combinations and the same chain, one line longer.
>
> When it breaks, the bug won't be in your rendering code. The bug is that the
> state shape allowed it.

### [1:25] The part people skip

> And you can't test your way out. The nonsense states aren't edge cases you
> forgot — they're reachable by construction. You are writing guards against
> combinations your own data model invented and then handed to you.
>
> Every one of those guards is a line you maintain forever to defend against a
> problem you created in four lines at the top of the file.

### [1:47] The turn — F5

> So don't create them.

**Hard cut. F5: the enum, alone on screen.**

> Four variants. The four real screens. That is the entire state of this page.
>
> "Loading and failed" isn't guarded against here — it cannot be written down.
> The cell holds exactly one variant at a time. There is no eighth combination
> because there is no combination at all. There's just: which one is it.

### [2:10] Where the data went — F6

> And look where the data went.
>
> `Loaded` carries the items. `Failed` carries the message. The payload lives
> on the state that actually has it.
>
> Compare that to the fourth cell — the one holding the item list. In the
> three-boolean version that cell exists in every state. It's empty while
> you're idle, empty while you're loading, empty when you've failed. Three
> quarters of its life it's a lie you have to remember not to read.
>
> Here, if you're not in `Loaded`, there is no list to read. Not empty. Absent.

### [2:45] The transitions — F7

> Now the half that Elm doesn't give you.

**F7: the engine, `rule=` clauses highlighted one at a time.**

> Each state declares what it's allowed to become.
>
> Idle can go to Loading. Loading can go to Loaded, or Failed. Loaded and
> Failed can both go back to Loading.
>
> Loading cannot go back to Idle. Not by convention, not by code review — the
> compiler rejects the write.
>
> So the impossible *states* are impossible. And now the impossible
> *transitions* are impossible too. Your loading spinner cannot silently
> become an idle screen because someone reset a flag in the wrong branch.

### [3:21] The chain is gone — F8

> And the render chain isn't shorter. It's gone.
>
> Each state-child renders its own variant. It is the only thing that can
> render. There's no ordering to get wrong because there is no chain to order.
>
> That `effect` on the opener runs the load once, on mount. The Retry button
> writes `.Loading` and the machine walks the same path it walked the first
> time. One code path, not a special-cased retry.

### [3:48] The honest part — F9

> One thing I should say plainly.
>
> There's no built-in `RemoteData` type here. scrml has no generics. You write
> this enum yourself, per screen, in your own domain's words.
>
> That sounds like a downside. It reads better. `ItemsPhase`, with a `Loaded`
> arm that carries items, says more at the call site than `RemoteData<Item[]>`
> ever did. And when this screen grows a fifth state that no generic
> anticipated — `Stale`, `PartiallyLoaded`, whatever your product manager
> invents — you add a variant. You don't fight a type parameter.

### [4:21] The landing — F10

> None of this is a scrml invention. "Make impossible states impossible" is
> Elm's line, and it's been right for a decade.
>
> What's here is that the transitions are checked too — and that this is the
> whole stack. That `SELECT` in the fetch function? It runs on a server. You
> didn't write a server, you didn't write an endpoint, and you didn't pick
> where that code lives. The compiler did, because the query is in the body.
>
> That's a different video.

### [4:52] CTA — F11

> ⟨PLACEHOLDER — do not record until `bun add -g scrml` resolves.⟩
> Docs and the full example: **scrml.dev**

---

## Code frames

Dark theme, single monospace face. Dim rather than hide when narrowing focus —
the viewer should feel the surrounding code still exists.

### F1 — the smell `[0:00–0:16]`

Typed live, one line per beat.

```scrml
<isLoading> = false
<hasError>  = false
<isLoaded>  = false
<items>     = []
```

On "Don't" — flash the whole block red, hold, cut to black.

### F2 — the arithmetic `[0:16–0:28]`

Centred, no code:

```
2³ = 8
```

### F3 — the truth table `[0:28–0:49]`

Verbatim from the source (lines 38–47). Reveal ✓ rows first, then ✗ rows one
at a time. Nonsense rows in red.

```
isLoading  hasError  isLoaded   meaning
─────────  ────────  ────────   ─────────────────────────────
  false      false     false    Idle                  ✓ real
  true       false     false    Loading               ✓ real
  false      true      false    Failed                ✓ real
  false      false     true     Loaded                ✓ real
  true       true      false    loading AND failed?      ✗
  true       false     true     loading AND loaded?      ✗
  false      true      true     failed AND loaded?       ✗
  true       true      true     all three at once?       ✗
```

End state: the four ✗ rows pulse; the ✓ rows dim.

### F4 — the defensive chain `[0:49–1:47]`

Not from the source — this is the code the viewer already has.

```js
if (isLoading)      return <Spinner/>
else if (hasError)  return <Error msg={error}/>
else if (isLoaded)  return <List items={items}/>
else                return <Idle/>
```

On "it rots", insert a fourth flag and let the chain grow:

```js
if (isRefreshing && isLoaded) return <List items={items} stale/>
```

### F5 — the enum `[1:47–2:10]`

Hard cut from F4. Source lines 68–73.

```scrml
type ItemsPhase:enum = {
    Idle                        // before any fetch
    Loading                     // request in flight
    Loaded(items: Item[])       // success — payload carries the typed rows
    Failed(message: string)     // failure — payload carries the message
}
```

### F6 — payload placement `[2:10–2:45]`

Same frame. Highlight only:

```scrml
    Loaded(items: Item[])
    Failed(message: string)
```

Then split-screen against the dimmed `<items> = []` from F1 to land the
"three quarters of its life it's a lie" line.

### F7 — the engine `[2:45–3:21]`

Source lines 102–129, `rule=` values highlighted in sequence.

```scrml
<engine for=ItemsPhase initial=.Idle effect=${ load() }>

    <Idle rule=.Loading>
        <p class="hint">Press Reload to fetch.</p>
    </>

    <Loading rule=(.Loaded | .Failed)>
        <p class="loading">Loading…</p>
    </>

    <Loaded items rule=.Loading>
        <ul class="rows">
            <each in=items key=@.id>
                <li>${@.name}</li>
                <empty>
                    <li class="hint">No items.</li>
                </empty>
            </each>
        </ul>
        <button onclick=load()>Reload</button>
    </>

    <Failed message rule=.Loading>
        <p class="error">Failed: ${message}</p>
        <button onclick=load()>Retry</button>
    </>

</>
```

On "Loading cannot go back to Idle": overlay `.Loading → .Idle` struck through
in red. **Do not fake a compiler error message here** — either show the real
one from a real failing build, or show nothing. A fabricated diagnostic is the
one thing this audience will not forgive.

### F8 — no chain `[3:21–3:48]`

F4 and F7 side by side. Dissolve F4 out entirely, leaving F7 centred.

### F9 — the honest part `[3:48–4:21]`

Text only:

```
no generics
no RemoteData<T>
you name it yourself
```

### F10 — the whole stack `[4:21–4:52]`

Source lines 79–81, isolated:

```scrml
function fetchItems() ! string {
    return ?{`SELECT id, name FROM items ORDER BY name`}.all()
}
```

Highlight `?{...}` on "runs on a server". Nothing else moves.

### F11 — CTA `[4:52–end]`

`scrml.dev` only. Install line withheld pending the install path.

---

## Cut points if over-length

In priority order — remove whole beats, never trim within one:

1. **[1:25] "the part people skip"** (~28s). Strongest single cut; the argument
   survives without it.
2. **[3:48] the honest part** (~35s). Costs the most credibility to lose, so
   cut it only to save the episode. It is the beat that makes the rest
   trustworthy to a sceptical viewer.
3. The `isRefreshing` insert in F4 (~12s).

Do **not** cut the landing beat [4:21]. The whole-stack reveal is the hook for the series.
