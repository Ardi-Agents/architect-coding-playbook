---
name: todo
description: Manage a personal cross-project todo list at ~/.claude/todo.md. Add, list, complete, or remove items. Persists across sessions and projects.
when_to_use: User says "add a todo", "todo:", "remind me to", "what's on my todo list", "mark X done", "remove that todo". Use whenever the user wants something tracked beyond the current session.
---

# /todo

Personal cross-project todo list at `~/.claude/todo.md`. Plain Markdown checklist; survives session resets.

## When to invoke

- "Add a todo: …"
- "What's on my todo list?"
- "Mark X done."
- "Remove the todo about Y."

## Inputs

- The action: `add | list | complete | remove`.
- The item text (for add/complete/remove) — supports fuzzy match for complete/remove.

## Outputs

- Updated `~/.claude/todo.md`.
- Echo of the change (item added / N items pending / etc.).

## Format

```markdown
# Todo

## Pending
- [ ] <item> (added YYYY-MM-DD)

## Completed
- [x] <item> (added YYYY-MM-DD, done YYYY-MM-DD)
```

## Steps

1. Read existing `~/.claude/todo.md`. If absent, create with the two sections above.
2. For `add`: append `- [ ] <item> (added YYYY-MM-DD)` under `## Pending`.
3. For `list`: print the `## Pending` block; offer to also show completed.
4. For `complete`: find the matching pending item, move to `## Completed`, append `, done YYYY-MM-DD`.
5. For `remove`: find the matching pending item, delete the line.
6. Confirm action and counts.

## Notes

- This is personal, not project-scoped. For project todos, prefer GitHub Issues or the in-conversation `TaskCreate` tool.
- Don't auto-complete based on inferred work — only mark done when the user says so.
