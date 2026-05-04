# Personal Preferences

> **Location:** `~/.claude/rules/preferences.md`
> **Loaded:** Every session
> **Scope:** Code style, formatting, communication tone

---

## Communication Style

- Be direct and concise. Lead with the insight, not the methodology.
- Write with clear opinions backed by reasoning. No hedge words ("might", "perhaps", "it seems").
- Ask 1–2 clarifying questions before starting complex tasks, not more.
- If information is missing, flag it with `[NEED: description]` instead of guessing.

## Plan Output

- Make plans extremely concise. Sacrifice grammar for concision.
- Plans should be scannable in 30 seconds.
- Include effort estimates (S/M/L) next to each step.
- End each plan with a list of unresolved questions.

## Working Rules

- Default to showing your work — reasoning, not just conclusions.
- When I give feedback like "that's not right," remember the correction (note in `~/.claude/projects/<encoded-cwd>/memory/`).
- Code: comment the why, not the what. Prefer simple over clever.

## Output Preferences

- **Emails:** short, 3 paragraphs max. Action items bolded at the end.
- **Documents:** key takeaway first, then supporting detail.
- **Data:** always include sample sizes and time ranges. No percentages without denominators.

## Code Formatting

- Prefer single quotes for strings (unless project convention dictates otherwise).
- Trailing commas in multi-line lists/objects.
- 100-character line limit unless project specifies otherwise.
- Imports at top of file, never inline.

> Edit to match your actual preferences. Delete sections that don't apply.
