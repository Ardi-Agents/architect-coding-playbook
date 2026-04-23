# Observability Template

Reference implementations for the patterns in [`AGENTS/AGENT_OBSERVABILITY.md`](../../AGENTS/AGENT_OBSERVABILITY.md).

## What you get

- `pre-tool-use.sh.template` — PreToolUse hook: deterministic execution-ID + log POST
- `post-tool-use.sh.template` — PostToolUse hook: match back via the same execution-ID
- `session-idle-detector.mjs` — background task transitioning sessions `active → idle → completed`
- `file-change-lifecycle.mjs` — tracked → pending → resolved state machine scaffold

## Installation

### Hooks (shell)

1. Copy the two `.sh.template` files to your hooks directory (`.claude/hooks/` or your runtime's equivalent), drop the `.template` suffix.
2. Make executable: `chmod +x pre-tool-use.sh post-tool-use.sh`.
3. Register in `settings.json`:

```json
{
  "hooks": {
    "PreToolUse":  [{ "type": "command", "command": ".claude/hooks/pre-tool-use.sh",  "timeout_ms": 100 }],
    "PostToolUse": [{ "type": "command", "command": ".claude/hooks/post-tool-use.sh", "timeout_ms": 100 }]
  }
}
```

4. Start your inspector core (or log collector) listening on `http://localhost:9999/hooks`. The hooks POST events asynchronously — if the collector is down, the agent is unaffected.

### Idle detector

Run `session-idle-detector.mjs` as a background daemon (or under a process manager like pm2 / systemd). It scans the session store every minute and transitions sessions whose `last_activity` has passed the configured thresholds.

```bash
IDLE_MINUTES=30 COMPLETED_HOURS=2 node session-idle-detector.mjs
```

### File-change lifecycle

`file-change-lifecycle.mjs` exports three functions: `recordTracked(executionId, filePath, before)`, `markPending(executionId, after)`, `resolve(executionId, outcome)`. Wire them into your pre/post tool-use handlers or your inspector core.

## Execution-ID contract

Both hook scripts compute the same execution ID from the same inputs:

```
session_id + "_" + tool_name + "_" + md5(canonical_json(tool_input))[:12]
```

The `canonical_json` serialization is deterministic (keys sorted; no trailing whitespace). Same inputs → same ID, regardless of which process runs the hash. This is what makes pre/post correlation work across process boundaries.

## Smoke test

Smoke-test the execution-ID is stable:

```bash
TOOL_NAME=Read TOOL_INPUT='{"file_path":"/tmp/x"}' SESSION_ID=test ./pre-tool-use.sh
TOOL_NAME=Read TOOL_INPUT='{"file_path":"/tmp/x"}' SESSION_ID=test ./post-tool-use.sh
# Both should print/log the same execution_id.
```

## Security

- Hook scripts run with the agent's tool authority. Keep them in version control; code-review changes.
- The log POST destination must be local-only (`localhost`, Unix socket) unless you've reviewed what the logs contain.
- Redact PII at source (emails, long numeric IDs, tokens). `post-tool-use.sh` shows a minimal redaction pattern you can extend.
