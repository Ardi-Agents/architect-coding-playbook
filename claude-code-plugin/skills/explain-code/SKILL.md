---
name: explain-code
description: Explain a function, module, or codepath in layered detail (one-liner → architecture → implementation). Tailored to the user's stated background per ~/.claude/CLAUDE.md.
when_to_use: User asks "explain this", "what does X do", "how does Y work", "walk me through Z". Especially valuable when the user is new to a codebase or a stack they don't fully know.
---

# /explain-code

Layered, audience-aware explanation of a code symbol or path. Reads `~/.claude/CLAUDE.md` for the user's background and adjusts depth.

## When to invoke

- "Explain this function."
- "How does X work?"
- "Walk me through the auth flow."
- "What does this regex / SQL / cron actually do?"

## Inputs

- The target: a file, function name, module, or selected lines.
- Optional depth flag: `quick | standard | deep`.

## Outputs

A three-layer explanation:

1. **One-liner.** What it is, in one sentence.
2. **Why it exists.** The problem it solves and where it sits in the architecture.
3. **How it works.** Implementation walkthrough with citations: `path/to/file.ext:line`.

If `deep`: add a "Gotchas" section with edge cases, performance notes, or known bugs.

## Steps

1. Locate the target. If ambiguous (multiple symbols share the name), list candidates and ask.
2. Read the file containing the target plus its direct callers and direct callees.
3. Read `~/.claude/CLAUDE.md` for stated background; tailor jargon density.
4. Produce the three-layer output. Keep total under 400 words for `standard`, under 800 for `deep`.
5. End with a "Want me to dig further into X?" suggestion if the deep dive surfaced anything notable.

## Notes

- Explain WHAT and WHY before HOW. Don't dump the function body verbatim.
- Cite specific lines so the user can navigate. Avoid vague "in some file somewhere".
- If the code is doing something genuinely surprising, say so — don't normalize bad patterns.
