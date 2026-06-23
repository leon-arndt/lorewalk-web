---
name: ponytail-review
description: >
  Review a diff for over-engineering only — what to delete. Finds reinvented
  standard library, needless dependencies, speculative abstractions, dead
  flexibility. One line per finding: location, what to cut, what replaces it.
  Use when the user says "review for over-engineering", "what can we delete",
  "is this over-engineered", "simplify review", or invokes /ponytail-review.
  Complements a correctness review — this pass only hunts complexity.
---

Review the diff for unnecessary complexity. One line per finding: location,
what to cut, what replaces it. The best outcome is the diff getting shorter.

## Format

`L<line>: <tag> <what>. <replacement>.` — or `<file>:L<line>: ...` for
multi-file diffs.

Tags:

- `delete:` dead code, unused flexibility, speculative feature. Replacement: nothing.
- `stdlib:` hand-rolled thing the standard library ships. Name the function.
- `native:` dependency or code doing what the platform already does. Name the feature.
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller.
- `shrink:` same logic, fewer lines. Show the shorter form.

## Examples

✅ `L12-38: stdlib: 27-line email validator. "@" check is 1 line; real validation is the confirmation mail.`

✅ `L4: native: moment.js imported for one format call. Intl.DateTimeFormat, 0 deps.`

✅ `repo.ts:L88: yagni: AbstractRepository with one implementation. Inline it until a second exists.`

✅ `L52-71: delete: retry wrapper around an idempotent local call. Nothing replaces it.`

✅ `L30-44: shrink: manual loop builds object. Object.fromEntries(pairs), 1 line.`

## Scoring

End with the only metric that matters: `net: -<N> lines possible.`
If there is nothing to cut: `Lean already. Ship.` and stop.

## Boundaries

- Scope is over-engineering and complexity only. Correctness bugs, security
  holes, and performance are out of scope — route those to a normal review.
- A single smoke test or `assert`-based self-check is the minimum, not bloat.
  Never flag it for deletion.
- Lists findings only; does not apply them.

---
*Adapted (MIT) from [ponytail](https://github.com/DietrichGebert/ponytail) by Dietrich Gebert.*
