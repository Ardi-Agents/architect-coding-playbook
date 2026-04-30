---
name: journal
description: Append a dated entry to a personal engineering journal at ~/.claude/journal/YYYY-MM-DD.md. Use to capture decisions, observations, or reflections that aren't worth a commit message but shouldn't be lost.
when_to_use: User asks to "journal", "note", "log", "capture", or "remember" something that's reflective rather than actionable. Also after a significant debugging session, design decision, or postmortem.
---

# /journal

Append a timestamped entry to today's journal file under `~/.claude/journal/`. Plain Markdown, one file per day.

## When to invoke

- User says "journal this", "log this", "note this for later".
- After completing a multi-day investigation, decision, or postmortem worth remembering.
- The user reflects on something — not a TODO, not a commit, just a thought.

## Inputs

- The text to record (prompt, paste, or extracted from the recent conversation).
- Optional category tag: `decision | observation | retro | idea | learning`.

## Outputs

- Appends to `~/.claude/journal/YYYY-MM-DD.md` (creates the file if absent).
- Each entry: `## HH:MM — <category>` heading + body.
- Confirms back: file path + first 80 chars of the entry.

## Steps

1. Resolve today's date in user's local timezone — file path is `~/.claude/journal/YYYY-MM-DD.md`.
2. If the file doesn't exist, create it with a top heading `# Journal — YYYY-MM-DD`.
3. Append a new section: `## HH:MM — <category>` then a blank line then the entry body.
4. Confirm with the path and a one-line preview.

## Notes

- Journals are personal. Don't reference them in committed code or PRs.
- This is for prose, not structured data. If you want todos, use `/todo` instead.
