---
name: verify-install
description: Verify that the Architect Coding Playbook install on this machine matches the shipped manifest. Re-hashes every shipped file, validates settings.json shape, reports drift (OK / drifted / missing / foreign). Use to confirm a clean install or to diagnose a broken one.
when_to_use: User asks "verify the playbook install", "check my AGENTS setup", "did the playbook install correctly", "what's drifted in my Claude Code config". Also invoke after a botched install or when starting on a new machine.
allowed-tools: Read, Bash(shasum:*), Bash(sha256sum:*), Bash(cat:*), Bash(ls:*), Bash(test:*), Glob
---

# /verify-install

Drift-check the Architect Coding Playbook install against its shipped manifest.

## Inputs

- (Optional) path to the playbook clone — defaults to looking up `~/.architect-playbook-clone-path` first, then asking.
- (Optional) `--scope user|project|all` — narrow what to check.

## Outputs

A per-file status table:

| Status | Meaning |
|---|---|
| `OK` | File present, hash matches the shipped sha256 |
| `drifted` | File present but hash differs from shipped — user-modified or upgrade pending |
| `missing` | Manifest expects file; not found at install path |
| `foreign` | File present at install path; the manifest says we never wrote it (collision risk) |

Plus: settings-merge validation — for each entry in `settingsMerges`, confirm the merged file parses and contains the expected keys.

Exit non-zero if any `missing` or `foreign` results.

## Steps

1. **Locate the manifest.** Read `<playbook-clone>/CLAUDE_CODE/install.manifest.json`. If the clone path isn't known, ask once.
2. **Locate the install receipt.** Read `~/.architect-playbook-manifest.json` (per-machine record of what was actually written). If missing, fall back to manifest-only checking and warn.
3. **For each `shippedFiles[]` entry:**
   - Compute `sha256` of the file at `installPath` (expand `~` if present).
   - If absent → `missing`.
   - If hash matches `shippedFiles[].sha256` → `OK`.
   - If hash differs → `drifted`.
4. **For each `settingsMerges[]` entry:**
   - Read the target file; confirm it parses as JSON.
   - For every leaf key in `patch`, confirm the same key+value exists in the target.
   - Mismatch → report under "settings drift".
5. **Print summary table.** Group by status. Suggest next action per status:
   - `drifted` → "intentional? Save your version into the manifest as a custom; otherwise re-run install with `replace`."
   - `missing` → "re-run `CLAUDE_CODE/SETUP.md` to repair."
   - `foreign` → "no action; just FYI that this file exists but wasn't created by the playbook install."

## Implementation notes

- Use `shasum -a 256 <file>` (macOS) or `sha256sum <file>` (Linux). Detect once and reuse.
- Manifest paths may include `~/` — expand to the user's home dir before hashing.
- Never modify any file; this skill is strictly read-only.
- If the playbook clone has been edited locally (sha drift), the manifest's `shippedFiles[].sha256` may not match upstream — note this in the report.

## Safety

- Read-only. Never modifies anything.
- Asks before reading files outside `~/.claude/` or the playbook clone.
- Does not exfiltrate file contents — only the per-file status.
