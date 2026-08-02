---
name: translate
description: >
  Add or change player-facing text in the Lorewalk Web UI. Applies whenever new copy is
  written in a component or page: button labels, headings, toasts, modal copy, error
  messages, data-driven strings (achievement names, benefit lists). Not for code comments,
  identifiers, or the Markdown docs (see ste-writing for those). Use when the user says
  "add this text", "add a string", "new copy", "translate this", or invokes /translate.
---

Lorewalk Web ships in 8 languages: en, de, ja, ko, zh, ms, id, ta (`src/i18n/`). No player-facing
string may live as a literal in a component. Every string goes through the `t()` function from
`useLocale()` and has a translation in all 8 locale files.

## Workflow for new text

1. **Never write literal English text in JSX or in a data object that renders to the UI.**
   Not `<div>Go Premium</div>`, not `{ text: 'Every landmark unlocked' }`. If the text depends
   on component state (a list built from data), build the list inside the component body so
   `t()` is in scope, not at module scope.
2. Pick a key name in the existing style: `<area>_<thing>`, snake_case, grouped by feature
   (`premium_`, `shop_`, `squads_`, `creatures_`, ...). Check `src/i18n/en.ts` for the area's
   existing prefix before inventing a new one.
3. Add the key to **all 9 files** in this order:
   - `src/i18n/types.ts` — add `key_name: string` to the `Translations` interface. This is
     what makes the TypeScript compiler catch a locale that forgets a key.
   - `src/i18n/en.ts` — the source string.
   - `src/i18n/de.ts`, `ja.ts`, `ko.ts`, `zh.ts`, `ms.ts`, `id.ts`, `ta.ts` — a real translation,
     not a copy of the English string. Match the tone and terminology already used in that
     file (informal "you" register in en/de/ms/id, polite standard register in ja/ko, and the
     existing terms for Premium/landmark/medal/subscription in each language). Use the file's
     existing convention for a dash-like pause: a spaced double-hyphen `"  -  "`, never an em
     dash (the project bans em dashes everywhere, see CLAUDE.md).
   - Placeholders use `{name}` and get substituted by `t(key, { name: value })`. Keep the same
     placeholder names across every locale.
4. Replace the literal with `t('key_name')` (or `t('key_name', { ... })` for placeholders) at
   the call site.
5. Run `npx tsc -b`. A locale file missing the new key, or a stray key not in `types.ts`, fails
   the build.
6. Run the checker below before committing. It also runs automatically as a pre-commit hook
   once enabled (see Setup).

## The checker

```bash
python3 .claude/skills/translate/translate-lint.py
```

With no arguments it scans the **staged diff only** (added lines under `src/components/` and
`src/pages/`) for text that looks hardcoded: JSX text nodes, `title`/`placeholder`/`aria-label`/
`alt` string literals, and object properties like `text:`/`label:`/`name:` holding a capitalized
string. It is a heuristic, not a parser, so read the hits before acting on them.

- `python3 .claude/skills/translate/translate-lint.py --all` scans every in-scope file in full,
  not just the staged diff. Use this for an audit, not as a commit gate. As of this writing it
  reports pre-existing debt outside the Premium flow; fixing all of it is a separate, larger
  task, not something to do incidentally while adding one new string.
- A false positive: add `// i18n-ignore` on that line, or add the exact substring to
  `.claude/skills/translate/ignore-strings.txt` (for something that recurs, like a mock display
  name in seed data).

## Setup (once per clone)

The hook lives in the repo at `.githooks/pre-commit` but Git does not use it until you point
`core.hooksPath` at it:

```bash
git config core.hooksPath .githooks
```

This is a local, per-clone setting. It does not commit itself into anyone else's checkout.

## Limits

The checker cannot see into `src/data/` (creature names, POI descriptions, cosmetics) because
those are largely real-world proper nouns that are not meant to be translated by design. If a
new data file genuinely needs localized copy, add `t()` keys for it by hand. The checker also
cannot verify translation *quality*, only that a key exists in all locales, so a lazy or wrong
translation still passes.
