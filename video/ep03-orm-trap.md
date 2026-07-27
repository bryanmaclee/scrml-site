# Ep. 03 — "The ORM trap"

**Format:** short (No Boilerplate register) · **Measured runtime:** ~5:15
**Narration:** 830 words @ 170 wpm (4:53 speech + ~24s frame beats)
**Cold open, no intro card, no sign-off**

**Source thesis:** `pages/articles/orm-trap.scrml` (live on scrml.dev).
**Source code:** probed directly against v0.7.1 (S287) on 2026-07-27 — see the
verification table below. Frames show real emitted output, not illustrations.

---

## ⚠ Verification table — read this first

The article names six compile-time refusals. **I probed all six.** Three hold,
one fires under a different code, and **two do not fire at all**. The script
below uses only the verified column. Do not restore the article's list.

| Article claims | Probed result |
|---|---|
| `E-PA-004` — bad table name is refused | **Refused, but the code is `E-PA-002`** |
| `E-PA-007` — `protect=` typo is refused | ✅ **`E-PA-007`, exactly as claimed** |
| `E-SQL-004` — `?{}` with no `db` ancestor | ✅ **`E-SQL-004`, exactly as claimed** |
| bound parameters are mandatory, no `.raw()` | ✅ **verified in emitted output** |
| `E-SQL-002` — invalid SQL caught at compile time | ❌ **DOES NOT FIRE** |
| `E-SQL-003` — runtime-constructed SQL refused | ❌ **DOES NOT FIRE** |

The two failures, precisely:

- **`SELCT usrnme FRM users WHERE`** — builds **exit 0** and ships to
  `app.server.js` verbatim as `` _scrml_sql`SELCT usrnme FRM users WHERE` ``.
  The article's *"validates the SQL template syntactically against the
  database… before the query ever ships"* is **not true today**.
- **`?{q}`**, where `q` is a local `const` holding a SQL string — builds
  **exit 0** and emits `` await _scrml_sql`q` ``. The compiler treats the
  identifier as literal SQL text. Not a refusal; a **silent
  reinterpretation**, which is worse than either refusing or working.

**This is also a live-site problem, not just a scripting one.** The article is
public on scrml.dev making a claim a viewer can disprove in thirty seconds.
Fix the article before this episode ships, or the episode becomes the thing
that draws attention to it.

---

## Production notes

**1. The honest beat is the episode's spine, not a disclaimer.** Ep. 02 put its
limitation at [4:32] and marked it do-not-cut. This one goes further: the
limitation is a full beat with the failing string on screen. A language video
that shows you its own hole is doing something almost none of them do, and this
audience will notice. Do not soften it, and do not move it to the end where it
reads as a footnote.

**2. Attribution.** The article is bylined *"authored by claude, rubber stamped
by Bryan MacLee."* If this is narrated first-person as your argument, that is
worth being comfortable with, given the episode's whole pitch is candour. The
technical claims in the script are mine-verified regardless of who drafted the
prose.

**3. Don't name a specific ORM.** Same rule as ep. 02. The article names
Prisma, Drizzle, Kysely and TypeORM; the script deliberately does not. "The
schema file", "the generate step", "the query DSL" are recognisable to everyone
who has used any of them, and naming one starts a fight about that one.

**4. The emitted-output frames are the proof.** F7, F8 and F10 show real
`app.server.js` content, copied from an actual build. If you re-record after a
compiler bump, **re-run the probe and re-copy** — do not trust these strings to
still be accurate. The build command is in the appendix.

---

## Script

### [0:00] Cold open — F1

> Every ORM starts with the same promise. Write code, not SQL.
>
> And every time, sooner or later, you end up reading the generated SQL anyway
> — because something was off, and the only way to find out what was to look at
> what it actually sent.

### [0:19] The bet — F2

> Here's the bet every one of them makes.
>
> Declare your schema in a separate file. Run a generator that turns it into a
> typed client. Use that client's query language, which reads like your host
> language. And at runtime, it compiles down to SQL.
>
> The first three steps each look like a win. The fourth is where the receipt
> comes due.

### [0:43] Two artifacts — F3

> Start with the schema file. That file is not your database.
>
> It's a description of what you would *like* the database to look like. The
> database has its own state. Something else keeps the two in sync, out of
> band, on a different schedule from your build.
>
> When they disagree, nothing raises its hand. Your generated types are just
> confidently wrong.

### [1:06] The stale client — F4

> Then the generated client, which is its own artifact with its own lifecycle.
>
> You change the schema. You forget to re-run the generator. Your editor is now
> autocompleting against a client that describes last week's database, and it
> is doing it with total confidence — full types, no squiggles.
>
> The build uses that stale client too. Quietly.

### [1:28] The escape hatch — F5

> And then the part that always gets me.
>
> Every one of these tools has an escape hatch for the query the DSL can't
> express. You reach for it maybe twice a project, and the moment you do, the
> type safety of the surrounding query stops applying.
>
> So you're writing a raw SQL string, with no schema awareness, inside a tool
> that exists *because* raw SQL strings have no schema awareness.
>
> That's the trap. Not that ORMs are bad — they're solving a real problem
> honestly. It's that the problem only exists because the schema lives
> somewhere the language can't see.

### [2:06] The turn — F6

> So put it somewhere the language can see.

**Hard cut. F6: schema, db and query in one file.**

> Schema. Connection. Query. One file, one syntax tree, one pass.
>
> There is no schema file, because the schema is right there. There is no
> generate step, because there's nothing to generate — the compiler already
> parsed it. And there's no query DSL to learn, because the query is SQL.

### [2:29] The proof — F7

> Now, that last one usually gets a raised eyebrow. If the query is a plain
> string in a template, where did the safety go?
>
> So let's not argue about it. Here's what the compiler actually emitted.

**F7: real `app.server.js` output.**

> A tagged template. That interpolation is a bound parameter — not
> concatenation, not escaping-by-convention. And there is no opt-out: there's
> no `.raw()` to reach for, because the grammar doesn't have one.

### [2:54] The things you didn't ask for — F8

> And look where that function ended up. It's in the *server* bundle.
>
> You didn't write a server. You didn't write an endpoint. You didn't choose
> where that code lives — the compiler put it there, because there's a query in
> the body, and queries belong on the server.
>
> It also generated the route, the client-side fetch to call it, and CSRF
> validation on the way in. None of which you asked for, and none of which you
> can forget.

### [3:24] What actually gets refused — F9

> So what does it catch?
>
> Misspell a table name in the connection — compile error, with the real table
> list printed.
>
> Typo a protected column — compile error, and the language server runs an edit
> distance over your actual columns and offers you the one you meant.
>
> Write a query with no database in scope at all — compile error naming the
> attribute you left out.
>
> All three are compile time. None of them reach a running program.

### [3:54] The honest part — F10

> Now the part you should hear from me rather than find out yourself.
>
> The compiler does **not** check your SQL syntax.

**F10: the failing string, held.**

> That's a real query, in a real build, and it compiled. Exit zero. It shipped
> to the server bundle spelled exactly like that, and it will fail the first
> time it runs — at runtime, in production, not on your machine.
>
> And one more. If you put a variable where the query should be — a string you
> built earlier — it doesn't refuse that either. It compiles the *variable
> name* as the SQL. Your query becomes the literal text "q".
>
> Both of those are documented as compile-time refusals. Neither one fires. I
> checked this week, and I'd rather say it than let you find it.

### [4:41] The landing — F11

> Here's the thing I'd want you to take away.
>
> The ORM isn't the mistake. It's an honest fix for a real gap — the schema is
> over there, your code is over here, and something has to bridge them.
>
> What changes here isn't that the bridge got better. It's that there's nothing
> to bridge. The schema and the query are in the same file, and the compiler was
> going to parse both of them anyway.
>
> Which is the same move as the last two episodes: don't defend the seam. Delete
> it.

### [5:15] CTA — F12

> ⟨PLACEHOLDER — do not record until `bun add -g scrml` resolves.⟩
> Docs and the full example: **scrml.dev**

---

## Code frames

Same treatment as eps. 01–02.

### F1 — the promise `[0:00–0:19]`

Text only, two lines, the second appearing late:

```
"write code, not SQL"
                        …so why are you reading the generated SQL?
```

### F2 — the four-step bet `[0:19–0:43]`

Build one line at a time. Steps 1–3 in white, step 4 lands in amber.

```
1.  declare the schema in a separate file
2.  run a generator → typed client
3.  write queries in the client's DSL
4.  the DSL compiles to SQL at runtime
```

### F3 — two artifacts `[0:43–1:06]`

Two boxes with a fragile line between them. Neither is authoritative.

```
   schema file                 the database
   "what I'd like"      ⇠?⇢    "what is"
        └── kept in sync out-of-band, on someone else's schedule
```

### F4 — the stale client `[1:06–1:28]`

An editor autocomplete popup listing a column that no longer exists, rendered
completely normally — no error state, no warning colour. The point is that it
looks correct.

### F5 — the escape hatch `[1:28–2:06]`

```
db.users.findMany({ where: { … } })      ← typed
raw("SELECT … FROM … WHERE …")           ← not typed
                                            ↑ inside a tool that exists
                                              because this isn't typed
```

### F6 — one file `[2:06–2:29]`

The turn. Real scrml, verified to build exit 0.

```scrml
<program db="./app.db">
    <schema>
        users {
            id:       integer primary key
            username: text not null unique
        }
    </>
    <db src="./app.db" tables="users"/>
    ${
        function getUser(uid) {
            return ?{`SELECT username FROM users WHERE id = ${uid}`}.all()
        }
    }
</>
```

Highlight in sequence: `<schema>` → `<db>` → `?{…}`. Then pull back to show all
three in one frame — that shot *is* the argument.

### F7 — the emitted output `[2:29–2:54]`

Verbatim from `app.server.js` of the build above. Do not retype from memory.

```js
return await _scrml_sql`SELECT username FROM users WHERE id = ${uid}`;
```

Highlight `${uid}` on "bound parameter."

### F8 — what you didn't write `[2:54–3:24]`

The emitted server handler, scrolled slowly. Real output; the CSRF lines are
genuinely compiler-generated.

```js
async function _scrml_handler_getUser_1(_scrml_req) {
  // route.query injection (SPEC §20.3)
  ...
  // CSRF validation (compiler-generated, baseline double-submit cookie)
  if (!_scrml_validate_csrf(_scrml_req)) { ... }
```

Caption, small, bottom-left: `app.server.js — generated`

### F9 — the three real refusals `[3:24–3:54]`

Three lines, each with its diagnostic appearing beside it. **These codes are
probe-verified; do not substitute the article's list.**

```
<db tables="usrs"/>            →  E-PA-002
<db protect="passwrd"/>        →  E-PA-007   + "did you mean password_hash?"
?{…} with no db in scope       →  E-SQL-004
```

### F10 — the honest part `[3:54–4:41]`

The failing string, alone, held long enough to read twice:

```js
_scrml_sql`SELCT usrnme FRM users WHERE`
```

Then, beneath it, in the same weight — not smaller, not greyed:

```
scrml build   →   exit 0
```

Then the second one:

```scrml
const q = "SELECT username FROM users"
return ?{q}.all()
```
```js
return await _scrml_sql`q`;     // ← the variable name became the SQL
```

### F11 — the landing `[4:41–5:15]`

```
ep 01   the state shape makes bad states unrepresentable
ep 02   the declaration carries its own contract
ep 03   the schema and the query are the same file
```

Dissolve to: `don't defend the seam — delete it`

### F12 — CTA `[5:15–end]`

`scrml.dev` only.

---

## Appendix — reproducing the probes

Every claim in F7–F10 came from this. Re-run after any compiler bump.

```bash
# baseline — bound parameter, server placement, CSRF
scrml build ./probe --output ./out && grep _scrml_sql out/app.server.js

# the two that do NOT fire
#   1. malformed SQL   → replace the query body with: SELCT usrnme FRM users WHERE
#   2. runtime SQL     → const q = "SELECT …"  /  return ?{q}.all()
# both build exit 0; inspect out/app.server.js to see what shipped
```

---

## Cut points if over-length

1. **[1:06] the stale client** (~25s). The two-artifacts beat already
   establishes the seam.
2. **[2:54] the things you didn't ask for** (~30s) — strong, but it belongs to
   the server-boundary long-form and will be repeated there.

Do **not** cut the honest beat [3:54]. Do **not** trim it to one example. The two failures
together are what make the preceding four minutes credible, and cutting to one
reads like an isolated bug rather than an honest accounting.
