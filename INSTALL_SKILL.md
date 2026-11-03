# 🚀 Universal Team Setup Guide (Daily Changelog + Git Auto-Commit)

This repository includes native instructions so that **any AI Assistant** (Antigravity, Claude Code, OpenCode, Cursor, Codex) automatically:
1. Maintains a separate daily changelog under `documentation/changelog/[DD]-[MM]-[YYYY]-changelog.md`.
2. Automatically stages and commits workspace changes with conventional commit syntax (`feat:`, `docs:`, `fix:`, `chore:`) directly via pure skills and rules without external scripts.

---

## ⚡ 1-Step Global Installation (For Antigravity CLI Users)

Paste this single command in your terminal to install both the **Daily Changelog** and **Git Auto-Commit** skills globally:

### Linux / macOS (Bash / Zsh):
```bash
mkdir -p ~/.gemini/config/skills/daily-changelog ~/.gemini/config/skills/auto-commit ~/.gemini/config/rules && \
cat << 'EOF_SK1' > ~/.gemini/config/skills/daily-changelog/SKILL.md
---
name: daily-changelog
description: Creates and maintains separate daily changelog files under documentation/changelog/[DD]-[MM]-[YYYY]-changelog.md.
---
# Daily Changelog Skill
- Target: documentation/changelog/[DD]-[MM]-[YYYY]-changelog.md
- Format: - [Day]-[DD/MM/YYYY]-[HH:MM] : [Change Description]
EOF_SK1
cat << 'EOF_SK2' > ~/.gemini/config/skills/auto-commit/SKILL.md
---
name: auto-commit
description: Automatically stages and commits git changes with conventional commits whenever modifications are made.
---
# Auto-Commit Skill
1. Stage all changes: `git add -A`
2. Commit with conventional format: `git commit -m "<type>: <description>"`
EOF_SK2
cat << 'EOF_RUL' > ~/.gemini/config/rules/workspace_rules.md
# Automatic Changelog and Auto-Commit Rules
- Record every single modification in documentation/changelog/[DD]-[MM]-[YYYY]-changelog.md
- Stage and commit all changes immediately using conventional commit format (feat:, fix:, docs:, chore:).
EOF_RUL
echo "✅ Daily Changelog and Auto-Commit skills installed globally successfully!"
```

---

## 🌐 Out-of-the-Box Zero-Install for Claude Code & OpenCode
If your teammates use **Claude Code** or **OpenCode**, the repository already includes:
- [CLAUDE.md](file:///home/dypok/Projects/Kono.AI/CLAUDE.md)
- [AGENTS.md](file:///home/dypok/Projects/Kono.AI/AGENTS.md)

They don't need to configure anything; their CLI will automatically log changes and commit to Git.
