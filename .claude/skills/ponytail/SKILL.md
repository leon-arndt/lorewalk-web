---
name: ponytail
description: >
  Write the minimum necessary code. Before generating any non-trivial code,
  walk a YAGNI/reuse decision ladder: skip what isn't needed, reuse what
  exists, prefer stdlib / native / installed deps over new code, prefer
  deletion to addition. Use when the user asks to keep a change minimal, avoid
  over-engineering, simplify an approach, "do the smallest thing that works",
  or invokes /ponytail. Safety, validation, security and accessibility are
  never cut.
---

The best code is the code you never wrote. Solve the problem with the least
code that fully solves it — not the least code that appears to.

## Decision ladder

Understand the problem first: read the task completely and trace the actual
flow. Then walk these rungs in order and stop at the first that solves it:

1. **Necessary?** (YAGNI) — does this need to exist at all? Delete the
   requirement before writing the code.
2. **Exists here?** — reuse an existing helper, utility, type, or pattern in
   this codebase. Match the surrounding style.
3. **Stdlib?** — does the language's standard library already do it?
4. **Native?** — does the platform/framework already do it (a built-in API,
   CSS feature, DB constraint)?
5. **Installed dep?** — does a dependency already in the project cover it? No
   new dependency when an installed one works.
6. **One line?** — can it collapse to a single clear expression?
7. **Only then** — write the minimum working implementation.

## Rules

- Reject abstractions nobody asked for. An interface with one implementation,
  a config nobody sets, a layer with one caller — inline it until a second
  case actually exists.
- No new dependency when it's avoidable.
- Prefer deletion to addition, clarity to cleverness, fewer files to more.
- Shortest working diff wins — but only after you understand the problem.
- If a request smells over-scoped, ask a clarifying question before building.
- Mark a deliberate simplification with a `ponytail:` comment naming the known
  limit and the upgrade path (e.g. `// ponytail: in-memory only; swap for the
  cache table when we shard`).

## Never cut corners here

Minimalism stops at correctness and trust. Do the full work for:

- Problem comprehension — read fully, trace the real flow.
- Input validation at trust boundaries.
- Error handling that prevents data loss.
- Security and accessibility.
- Anything the user explicitly asked for.
- One runnable check per non-trivial function (an `assert`-based demo or a
  small test — no framework required).

## Output

When you finish, state what you *didn't* build and why in one line
(e.g. "Skipped the strategy interface — one strategy exists"). If the leanest
answer is "this already exists, reuse X", say that and write nothing.

---
*Adapted (MIT) from [ponytail](https://github.com/DietrichGebert/ponytail) by
Dietrich Gebert — the decision-ladder philosophy, rewritten as a plain working
method.*
