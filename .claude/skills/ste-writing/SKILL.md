---
name: ste-writing
description: >
  Write prose in ASD-STE100 Simplified Technical English. Applies to documentation, READMEs,
  pull-request text, error messages, release notes, and comments. Does not apply to code,
  identifiers, or command syntax. Not for marketing copy or anything that needs a voice.
  Use when the user says "STE", "simplified technical english", "de-slop the docs",
  "rewrite the README", or invokes /ste-writing.
---

Write prose in ASD-STE100 Simplified Technical English. This applies to documentation, READMEs, pull-request text, error messages, release notes, and comments. It does not apply to code, identifiers, or command syntax. It is not for marketing copy, essays, or anything that needs a voice. STE strips voice on purpose.

## Rules

WORDS
- Use one name for one thing. Do not call the same item by two different names.
- Use the short common word: start (not begin/commence/initiate), use (not utilize/leverage), help (not facilitate), make sure (not ensure), before (not prior to), after (not subsequent to), about (not regarding/concerning), get (not obtain/acquire), show (not demonstrate), also (not additionally/furthermore/moreover).
- Give each word one meaning. "fall" means to move down, not to decrease.
- No marketing adjectives: seamless, robust, powerful, cutting-edge, effortless, world-class, next-generation, revolutionary.
- American spelling.

VERBS
- Active voice. "the parser reads the file", not "the file is read by the parser".
- Use a verb for an action. "analyze the log", not "perform an analysis of the log".
- No stacked auxiliaries. Not "it is important to note that this may help to improve". Write "this improves X".
- No "-ing" main verb where a simple tense works.

SENTENCES
- One instruction per sentence. Max 20 words (instruction), max 25 (descriptive).
- No contractions. Use articles: a, an, the, this, these.

PUNCTUATION
- No semicolons. Write two sentences.
- No em dashes. Use a period, colon, or hyphen instead. (STE itself bans only the semicolon. This project bans the em dash as well, in docs and in UI strings.)

STRUCTURE
- One topic per paragraph, max six sentences. For steps, use a numbered vertical list, one action per item, imperative form. Put a condition before its command.

Write only the requested text. No preamble, no summary, no closing remarks.

## Modes

- **strict**: procedures, runbooks, safety text, error messages. Apply every rule and both length caps.
- **STE-flavored**: general prose (READMEs, PR descriptions, docs). Apply the sentence, paragraph, active-voice, and no-phrasal-verb discipline. Relax the ~900-word dictionary lockdown so the text keeps enough range to read naturally.

Default to STE-flavored for this repo's Markdown docs. Use strict for error messages and step-by-step setup instructions.

## Self-lint (run before returning text)

1. Any sentence over 20 words? Split it.
2. Any semicolon or em dash? Replace with a period, colon, or hyphen.
3. Any contraction? Expand it.
4. Any passive voice with a known actor? Make it active.
5. Any "-ing" main verb, nominalization ("perform an analysis"), or phrasal verb ("spin up")? Replace with a plain verb.
6. Same thing named two ways? Pick one name.

Then run the mechanical checker on the file:

```bash
python3 .claude/skills/ste-writing/ste-lint.py README.md CLAUDE.md GameDesign.md TODO.md
```

It prints violations per 100 words and an em dash count per file. Lower is better. It is a heuristic, not a certified STE checker. Read its hits before you act on them, because passive-voice and nominalization detection both produce false positives.

## Limits

The mechanical rules above are lintable, and they are what removes slop. Full STE also needs human judgment: the right technical noun, and whether a sentence makes good sense. A checker cannot certify that. This skill fixes the FORM of slop. It cannot make a hollow paragraph true.

Source: distilled from ASD-STE100 by https://github.com/woosal1337/blog/tree/main/videos/ep01-the-cure-for-ai-slop
Free official standard (do not paste it in full, it is copyrighted): https://asd-ste100.org
