#!/usr/bin/env python3
"""Heuristic scan for hardcoded, untranslated UI text in src/components and src/pages.

Modes:
  translate-lint.py                 lint the staged git diff (added lines only)
  translate-lint.py --all [dirs]    lint every file under the given dirs (default: scope dirs)
  translate-lint.py <file> ...      lint specific files in full

It is a heuristic, not a parser. Read the hits before acting on them.
"""
import os
import re
import subprocess
import sys

SCOPE_DIRS = ('src/components/', 'src/pages/')
SCOPE_EXTS = ('.tsx', '.ts')
EXCLUDE_MARKERS = ('/i18n/',)

IGNORE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ignore-strings.txt')

SINGLE_WORD_OK = {
    'Save', 'Cancel', 'Close', 'Delete', 'Continue', 'Confirm', 'Submit',
    'Next', 'Back', 'Done', 'Skip', 'Retry', 'Yes', 'No', 'OK', 'Edit',
    'Remove', 'Add',
}

JSX_TEXT_RE = re.compile(r">\s*([A-Z][A-Za-z0-9À-ÿ'’.,:!?%€$#&()/→✓✕× -]{2,})\s*<")
PROP_RE = re.compile(r"\b(title|placeholder|aria-label|alt)\s*=\s*(['\"])([^'\"]{2,})\2")
OBJ_KEY_RE = re.compile(r"\b(text|label|title|name|description|subtitle|message|heading)\s*:\s*(['\"])([A-Z][^'\"]{2,})\2")


def load_ignore_list():
    if not os.path.exists(IGNORE_FILE):
        return []
    with open(IGNORE_FILE, encoding='utf-8') as f:
        return [line.strip() for line in f if line.strip() and not line.startswith('#')]


def in_scope(path):
    path = path.replace(os.sep, '/')
    if not path.startswith(SCOPE_DIRS):
        return False
    if not path.endswith(SCOPE_EXTS):
        return False
    if any(marker in path for marker in EXCLUDE_MARKERS):
        return False
    if path.endswith('.test.tsx') or path.endswith('.test.ts'):
        return False
    return True


def looks_like_ui_text(s, ignore_list):
    s = s.strip()
    if not s:
        return False
    if re.fullmatch(r"[\d\s.,%/:+\-→✓✕×#()&]*", s):
        return False
    if s.startswith('{') and s.endswith('}'):
        return False
    if any(ig in s for ig in ignore_list):
        return False
    if ' ' in s:
        return True
    return s.rstrip('.…!') in SINGLE_WORD_OK


def find_in_line(line, ignore_list):
    hits = []
    if 'i18n-ignore' in line:
        return hits
    for m in JSX_TEXT_RE.finditer(line):
        text = m.group(1).strip()
        if looks_like_ui_text(text, ignore_list):
            hits.append(('jsx-text', text))
    for m in PROP_RE.finditer(line):
        text = m.group(3).strip()
        if looks_like_ui_text(text, ignore_list):
            hits.append((m.group(1), text))
    for m in OBJ_KEY_RE.finditer(line):
        text = m.group(3).strip()
        if looks_like_ui_text(text, ignore_list):
            hits.append((m.group(1), text))
    return hits


def scan_lines(path, numbered_lines, ignore_list):
    findings = []
    for lineno, text in numbered_lines:
        for kind, snippet in find_in_line(text, ignore_list):
            findings.append((path, lineno, kind, snippet))
    return findings


def full_file_lines(path):
    with open(path, encoding='utf-8') as f:
        return [(i + 1, line.rstrip('\n')) for i, line in enumerate(f)]


def staged_diff_lines():
    out = subprocess.run(
        ['git', 'diff', '--cached', '--unified=0', '--diff-filter=ACM'],
        capture_output=True, text=True, check=True,
    ).stdout
    files = {}
    path = None
    new_lineno = 1
    for line in out.splitlines():
        if line.startswith('+++ '):
            p = line[4:]
            path = None if p == '/dev/null' else (p[2:] if p.startswith('b/') else p)
            continue
        if line.startswith('@@'):
            m = re.search(r"\+(\d+)(?:,(\d+))?", line)
            new_lineno = int(m.group(1)) if m else 1
            continue
        if path is None:
            continue
        if line.startswith('\\'):
            continue
        if line.startswith('+'):
            files.setdefault(path, []).append((new_lineno, line[1:]))
            new_lineno += 1
        elif line.startswith('-'):
            continue
        else:
            new_lineno += 1
    return files


def walk_scope(roots):
    for root in roots:
        for dirpath, _dirnames, filenames in os.walk(root):
            for fn in filenames:
                p = os.path.join(dirpath, fn).replace(os.sep, '/')
                if in_scope(p):
                    yield p


def main():
    args = sys.argv[1:]
    ignore_list = load_ignore_list()
    findings = []

    if args and args[0] == '--all':
        roots = args[1:] or list(SCOPE_DIRS)
        for p in walk_scope(roots):
            findings += scan_lines(p, full_file_lines(p), ignore_list)
    elif args:
        for p in args:
            if in_scope(p) and os.path.exists(p):
                findings += scan_lines(p, full_file_lines(p), ignore_list)
    else:
        for path, lines in staged_diff_lines().items():
            if in_scope(path) and os.path.exists(path):
                findings += scan_lines(path, lines, ignore_list)

    if not findings:
        print('translate-lint: no hardcoded UI text found.')
        return 0

    print(f'translate-lint: {len(findings)} possible untranslated string(s):\n')
    for path, lineno, kind, snippet in findings:
        print(f'  {path}:{lineno}  [{kind}]  "{snippet}"')
    print('\nMove this text into src/i18n (en.ts, types.ts, and the other 7 locales) and read it through t().')
    print('False positive? Add "// i18n-ignore" on the line, or add the exact substring to')
    print('.claude/skills/translate/ignore-strings.txt.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
