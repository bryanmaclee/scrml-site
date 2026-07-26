# Ep. 02 — "Your form doesn't need a validation library"

**Format:** short (No Boilerplate register) · **Measured runtime:** ~5:30
**Narration:** 853 words @ 170 wpm (5:01 speech + ~30s frame beats)
**Cold open, no intro card, no sign-off**

**Source:** `scrml/examples/30-validated-form.scrml` — the compiler's own test
corpus. Verified `scrml build` **exit 0** against v0.7.1 (S287) on 2026-07-26;
the only diagnostic is `W-PROGRAM-SPA-INFERRED`, which fires on every correct
single-file app and is not a defect.

**Runs after ep. 01.** The closing beat calls back to it explicitly. If these
ship out of order, cut the callback rather than reordering the argument.

---

## Production notes — read before recording

**1. Don't name a competitor.** The temptation is zod / yup / Formik /
react-hook-form. Naming them turns a technical argument into a tribal one and
guarantees the comments are about the library rather than the idea. The script
says "a validation library" throughout. Keep it that way.

**2. The `validate()` smell in F1 is not from the example file** — it's from
the example's *header comment*, which documents the anti-pattern it replaces
(lines 19–29). It's honest to show as "the code you already have," but do not
present it as scrml source; it's JavaScript-shaped pseudocode on purpose.

**3. The static-message limitation is load-bearing — do not cut it.** §55.10
Level-1 inline overrides are static strings only, no `${}` interpolation. A
viewer will try `req("must be at least ${n} characters")` within ten minutes of
picking this up. Saying it first costs 20 seconds and buys the whole video's
credibility.

**4. The sixth-field story is an archetype, not a citation.** It is written in
second person for exactly that reason — it describes a failure mode that is
true of a great many codebases, and it is not an account of a specific incident
at a specific company. **Do not add a company name, a dollar figure, or an
outage date to it.** The moment it sounds like a cited case study, someone will
ask for the source, and there isn't one. As written it's honest: this is the
shape of the bug, and every viewer has met it.

**5. Do not show the browser.** The pull is to demo the form filling in and
errors appearing. It's a worse video — the argument is about what is *absent
from the source*, and cutting to a browser changes the subject to UI polish.
Bank live demo for the long-form episodes.

---

## Script

### [0:00] Cold open — F1

> Every form you have ever written has these three things in it.
>
> A cell for the value. A cell for the error message. And a function called
> `validate`.
>
> The third one is the problem.

### [0:15] The arithmetic — F2

> Count what a single field actually costs you.
>
> The value. An error string. A branch inside `validate`. And a guard in the
> markup, so the error only renders when the string isn't empty.
>
> Four things. Per field.
>
> The form we're about to look at has five fields. That's twenty moving parts,
> and every one of them is kept in sync by hand.

### [0:42] The timing problem — F3

> But the count isn't the real problem. `validate` is a *pass*. Something has
> to run it.
>
> On every keystroke? On blur? Only on submit?
>
> Whatever you pick is wrong somewhere. Run it on submit, and the user fills in
> the entire form before you mention the email was malformed. Run it on every
> keystroke, and you're yelling at someone who has typed one letter of their
> name.
>
> And whenever you run it, the answer is a snapshot. It was true when the
> function returned. It is not necessarily true now.

### [1:18] The one that actually bites — F3b

> Then, six months later, someone asks for a sixth field. "How did you hear
> about us?" Required, obviously — marketing wants the attribution data.
>
> So you add the cell. You add the input. You put an asterisk on the label,
> because it's required. You ship it.
>
> And you forget to add the branch to `validate`.
>
> Nothing tells you. Not the compiler, not the type system, not the tests you
> wrote for the other five fields. QA doesn't catch it either, because QA fills
> the form in — the happy path always passes.
>
> So the field is required in the ticket. Required in the design. Required on
> the label, with a little red star. And optional in the only place that
> decides anything.
>
> Three months later someone opens a dashboard and asks why forty percent of
> the attribution data is null. And the hunt starts in the analytics pipeline,
> because that's where the nulls are.
>
> It isn't in the pipeline. It's four lines in a form component, and one
> function that was never told they existed.
>
> That's the whole bug: the field and its contract live in two different
> places, and only one of them is enforced.

### [2:29] The turn — F4

> So stop running a pass.

**Hard cut. F4: the declaration block, alone.**

> The validators are attributes. On the declaration itself. `req`. `length`.
> `pattern`. `eq`.
>
> There is no `validate` function in this file. There is no error cell. There
> is no `isValid` boolean. Not hidden somewhere else — they do not exist.
>
> And that sixth field? You cannot add it without its contract, because the
> contract is part of the declaration. There is no second place to forget.

### [2:58] The surface you didn't write — F5

> Because the compiler synthesises all of it, from those attributes.
>
> `signup.isValid` — true when every field passes. `signup.errors`. Then
> per-field: `email.isValid`, `email.errors`, and `email.touched`, so you know
> whether the user has actually been there yet. And `submitted`, which flips
> the first time they try.
>
> All read-only. All reactive. You wrote none of it.
>
> And you can't write to it either. Try, and the compiler stops you — that's a
> synthesised surface, not your state.

### [3:28] Cross-field — F6

> Here's the one that always breaks when it's hand-rolled.

**F6: the confirm line, isolated.**

> Confirm password. `eq`, pointing at the password field.
>
> That's cross-field validation, and it's the classic bug: the user fixes the
> password, and the confirm field stays angry — because your `validate` ran
> against the old value and nothing re-ran it.
>
> The compiler tracks that dependency. Change *either* cell and both
> re-validate. You didn't wire it up. More to the point, you couldn't forget
> to.

### [3:58] Rendering — F7

> And displaying the errors.

**F7: one `<errors of=…/>` line.**

> `errors of` the field. That's the whole thing.
>
> No length check. No ternary. None of that `&&` that renders a stray zero when
> the array is empty. A valid field renders nothing at all, because there's
> nothing to render.

### [4:16] The button — F8

> The submit button reads the rollup — disabled until the form is valid.
>
> Now look at `submit` itself. No guard clause. No re-validation at the top. It
> checks nothing.
>
> It doesn't have to. It cannot be reached with bad data.

### [4:32] The honest part — F9

> Two things to be straight about.
>
> There are fourteen built-in predicates. When you need one that isn't there,
> `custom` takes your own function, and it composes in declaration order with
> the rest.
>
> And the inline message — that string inside `req` — is static only. No
> interpolation. If you want "must be at least eight characters" with the eight
> coming from a variable, this feature will not do it. You'd reach for the
> error tags instead. That's a real limitation and you'll hit it in your first
> hour.

### [5:05] The landing — F10

> The shape of this is the same as the boolean episode.
>
> There, the state shape made bad states unrepresentable. Here, the declaration
> carries its own contract — so there's no pass to run at the wrong moment, and
> no branch to forget when the form grows.
>
> Both are the same move. Put the guarantee in the shape, and stop defending it
> by hand.

### [5:29] CTA — F11

> ⟨PLACEHOLDER — do not record until `bun add -g scrml` resolves.⟩
> Docs and the full example: **scrml.dev**

---

## Code frames

Same treatment as ep. 01 — dark theme, one monospace face, dim rather than hide.

### F1 — the smell `[0:00–0:15]`

From the example's header comment (lines 20–27). Deliberately JS-shaped: this
is the code the viewer already has, not scrml.

```js
<usernameError> = ""
<isValid> = false

function validate() {
  @usernameError = ""
  if (@username.length < 3) { @usernameError = "..." }
  @isValid = (@username.length >= 3 && ...)
}
```

Land on `function validate()`. Highlight it on "the third one is the problem."

### F2 — per-field cost `[0:15–0:42]`

Text only, built one line at a time, then a multiply:

```
    value
  + error string
  + a branch in validate()
  + a render guard
  ─────────────────────────
    4  ×  5 fields  =  20
```

### F3 — the timing problem `[0:42–1:18]`

Three call sites, each appearing then greying out as it's dismissed:

```js
onChange={validate}   // too eager
onBlur={validate}     // too late for some, too early for others
onSubmit={validate}   // way too late
```

Hold all three greyed.

### F3b — the sixth field `[1:18–2:29]`

Split screen, held for the whole beat. **Left:** the form gains a field. Type
it live, including the asterisk — the viewer should watch it being added
correctly.

```jsx
<label>How did you hear about us? <span className="req">*</span></label>
<input value={source} onChange={e => setSource(e.target.value)} />
```

**Right:** `validate()`, unchanged and dimmed. Nothing happens to it. Let the
silence sit — the omission is the whole frame.

```js
function validate() {
  @usernameError = ""
  if (@username.length < 3) { @usernameError = "..." }
  @isValid = (@username.length >= 3 && ...)
}
```

On "required in the ticket / design / label / and optional where it counts":
stamp four lines over the split, the last one red.

```
ticket    required ✓
design    required ✓
label     required ✓
validate  —
```

On the analytics line, cut to a single dimmed stat, no chrome:

```
attribution.source   null   41%
```

Then cut straight back to the red `validate —` line. Do not animate a
connection between them; the point is that nobody made that connection for
three months.

### F4 — the declaration `[2:29–2:58]`

Hard cut from F3. Source lines 60–66, verbatim.

```scrml
<signup>
    <name  req("Please enter your name") length(>=2)>     = <input type="text"/>
    <email req pattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)>      = <input type="email"/>
    <password req length(>=8)>                            = <input type="password"/>
    <confirm  req eq(@signup.password)>                   = <input type="password"/>
    <agree req("You must accept the terms")>              = <input type="checkbox"/>
</>
```

Highlight only the bare attributes — `req`, `length(>=2)`, `pattern(…)`,
`eq(…)` — leaving the rest dimmed.

### F5 — the synthesised surface `[2:58–3:28]`

From the header comment (lines 7–12). Reveal line by line; the point is the
accumulation.

```
@signup.isValid          — true iff every field passes
@signup.errors           — { name: [...], email: [...], ... }
@signup.submitted        — has the form been submitted once?
@signup.name.isValid     — per-field validity
@signup.name.errors      — per-field error tags
@signup.name.touched     — has the user interacted with this field?
```

Then stamp across it, held for the "you wrote none of it" line:

```
                 read-only · reactive · zero lines authored
```

### F6 — cross-field `[3:28–3:58]`

One line from F4, isolated and enlarged:

```scrml
<confirm  req eq(@signup.password)>   = <input type="password"/>
```

On "change either cell": animate a dependency edge between `confirm` and
`password`, both directions.

### F7 — the error element `[3:58–4:16]`

Source line 95, alone on screen:

```scrml
<errors of=@signup.name/>
```

Optionally split against the hand-rolled equivalent from the header comment
(line 27), dimmed:

```js
${ if (@usernameError.length > 0) { lift <span>${@usernameError}</> } }
```

### F8 — the button and the empty function `[4:16–4:32]`

Source line 128, then lines 74–78. The empty body is the punchline — hold on
it, don't cut early.

```scrml
<button type="submit" disabled=!@signup.isValid>
    Create account
</button>
```

```scrml
function submit() {
    // Persist the known-good data here.
}
```

### F9 — the honest part `[4:32–5:05]`

```
14 built-in predicates
custom(fn)          — your own, composed in declaration order

req("static string only")     ← no ${} interpolation
```

Red-underline the last line as it's narrated.

### F10 — the landing `[5:05–5:29]`

Two lines, ep. 01 above ep. 02:

```
ep 01 — the state shape makes bad states unrepresentable
ep 02 — the declaration carries its own contract
```

Then both dissolve into: `put the guarantee in the shape`

### F11 — CTA `[5:29–end]`

`scrml.dev` only. Install line withheld pending the install path.

---

## Cut points if over-length

At 5:30 this is the longest short so far and is comfortably inside the format.
Only cut if you need it under 5:00.

1. **[3:58] the rendering beat** (~18s). `<errors of=>` is elegant but the
   cross-field beat already carries the argument.
2. The F7 split-screen against the hand-rolled version (~8s).
3. Inside the sixth-field story, the analytics-dashboard turn (~20s) can go —
   keep the four-line "required / required / required / —" stamp, which is the
   part that lands.

Do **not** cut [4:32]. The static-message limitation is what makes the rest
believable.

Do **not** cut the sixth-field beat wholesale. It is the only concrete failure
in the episode, and the turn at [2:29] now answers it directly ("no second
place to forget") — losing the story orphans that line.
