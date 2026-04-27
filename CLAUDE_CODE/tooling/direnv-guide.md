# Multi-Project Environment Management with direnv

When you run multiple projects on the same machine, each with its own stack, database URLs, API keys, and tool configs — direnv is the cleanest way to manage it. It automatically loads and unloads environment variables as you `cd` into different directories. No manual `source .env`, no wrong database URL in the wrong terminal.

---

## Install

```bash
# macOS (Homebrew)
brew install direnv

# Add to your shell (zsh — add to ~/.zshrc)
eval "$(direnv hook zsh)"

# Reload your shell
source ~/.zshrc
```

---

## How it works

Each project directory gets an `.envrc` file. When you `cd` into the directory, direnv loads it. When you `cd` out, it unloads it. First time you add or edit `.envrc`, you need to run `direnv allow` once.

```
~/Desktop/Dev/
├── project-alpha/
│   ├── .envrc          ← loaded when you're in project-alpha/
│   └── .claude/
├── project-beta/
│   ├── .envrc          ← loaded when you're in project-beta/
│   └── .claude/
└── project-gamma/
    ├── .envrc          ← loaded when you're in project-gamma/
    └── .claude/
```

---

## Per-project `.envrc` template

```bash
# .envrc — project-alpha

# Project identity (picked up by Claude Code sessions)
export CLAUDE_PROJECT="project-alpha"
export APP_ENV="development"

# Database
export DATABASE_URL="postgresql://user:password@localhost:5432/alpha_dev"

# API keys (use a secrets manager in production — never commit these)
export OPENAI_API_KEY="sk-..."
export STRIPE_SECRET_KEY="sk_test_..."

# Add local scripts to PATH
PATH_add ./scripts
PATH_add ./bin

# Activate Python venv (if applicable)
# source .venv/bin/activate
```

After creating or editing:
```bash
direnv allow   # run once per new/changed .envrc
```

---

## Gitignore `.envrc`

`.envrc` typically contains secrets — add it to `.gitignore`:

```
# .gitignore
.envrc
.env
.env.local
```

If you want to share a template with your team, commit `.envrc.example` instead and document what each variable does.

---

## Integration with Claude Code

Claude Code sessions inherit environment variables from your shell. With direnv active:

- Each project's env vars are automatically available in Claude Code sessions started from that directory.
- `CLAUDE_PROJECT` lets Claude identify which project it's working in.
- Combine with `settings.local.json` (gitignored) for per-project tool permissions:

```json
// <project>/.claude/settings.local.json
{
  "permissions": {
    "allow": [
      "Bash(poetry run pytest*)",
      "Bash(docker-compose up*)"
    ]
  }
}
```

---

## Troubleshooting

**direnv: error .envrc is blocked**
Run `direnv allow` in the project directory.

**Variables not showing up in Claude Code**
Make sure you opened the terminal from inside the project directory after direnv is active. Run `echo $CLAUDE_PROJECT` to verify.

**Want to check what's loaded**
```bash
direnv status   # shows current .envrc and its export state
```
