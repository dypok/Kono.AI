# 🚀 Universal Daily Changelog Setup (Antigravity, Claude Code, OpenCode, Cursor)

This project has universal instructions configured so **any AI CLI tool** (Antigravity, Claude Code, OpenCode, Cursor, Codex) automatically maintains a separate daily changelog under `documentation/changelog/[DD]-[MM]-[YYYY]-changelog.md`.

---

## 🌐 1. Out-of-the-box Support (Zero-Install for Repository Collaborators)

The repository already includes the native rule files recognized by different CLIs:
- **Claude Code:** Reads [CLAUDE.md](file:///home/dypok/Projects/Kono.AI/CLAUDE.md)
- **OpenCode / Cursor / Copilot:** Reads [AGENTS.md](file:///home/dypok/Projects/Kono.AI/AGENTS.md)
- **Antigravity Workspace:** Reads `GEMINI.md` / `AGENTS.md`

👉 *Anyone who clones this repo using Claude Code or OpenCode will automatically follow the daily changelog rule without installing anything.*

---

## ⚡ 2. Global Machine-Wide Installation (For Antigravity CLI Users)

If your teammates use Antigravity globally across all their projects, they can run this 1-step command:

### Linux / macOS:
```bash
mkdir -p ~/.gemini/config/skills/daily-changelog ~/.gemini/config/rules && \
cat << 'SKILL_EOF' > ~/.gemini/config/skills/daily-changelog/SKILL.md
---
name: daily-changelog
description: >-
  Creates and maintains a separate daily changelog file for each day under `documentation/changelog/[DD]-[MM]-[YYYY]-changelog.md`.
  Ensures every change made across the workspace is recorded with the format `[Day]-[DD/MM/YYYY]-[HH:MM] : [Change Description]`.
---

# Daily Changelog Skill

## Core Concept
Every day gets its own separate file in `documentation/changelog/`.
- Today's changes go to `documentation/changelog/[DD]-[MM]-[YYYY]-changelog.md`.
- Tomorrow's changes will automatically create and go to a new day-specific file.
- Each new day generates a completely separate file.

## Mandatory Entry Format
`- [Day]-[DD/MM/YYYY]-[HH:MM] : [Change Description]`

## Instructions for the Agent
1. Determine current date and time (Day name, DD, MM, YYYY, HH:MM).
2. Check if `documentation/changelog/` exists; if not, create it.
3. Target `documentation/changelog/[DD]-[MM]-[YYYY]-changelog.md`.
4. If not created yet today, initialize it with `# Changelog: [DD]-[MM]-[YYYY]`.
5. Append: `- [Day]-[DD/MM/YYYY]-[HH:MM] : [Description of change]`
SKILL_EOF
cat << 'RULE_EOF' > ~/.gemini/config/rules/changelog_rule.md
# Automatic Daily Separate Changelog Rule

- **Trigger:** Whenever any file is created, modified, or deleted in the workspace.
- **Requirement:**
  1. Target the daily file: `documentation/changelog/[DD]-[MM]-[YYYY]-changelog.md`.
  2. If the file for today does not exist yet, create it immediately as a new separate file for the day.
  3. Append the change entry using the mandatory format:
     `- [Day]-[DD/MM/YYYY]-[HH:MM] : [Summary of the change]`
  4. Each new calendar day automatically starts its own separate file.
RULE_EOF
echo "✅ Daily Changelog skill and automatic rule installed globally successfully!"
```

### Windows (PowerShell):
```powershell
$SkillDir = "$HOME\.gemini\config\skills\daily-changelog"
$RuleDir = "$HOME\.gemini\config\rules"
New-Item -ItemType Directory -Force -Path $SkillDir, $RuleDir

@'
---
name: daily-changelog
description: >-
  Creates and maintains a separate daily changelog file for each day under `documentation/changelog/[DD]-[MM]-[YYYY]-changelog.md`.
  Ensures every change made across the workspace is recorded with the format `[Day]-[DD/MM/YYYY]-[HH:MM] : [Change Description]`.
---
# Daily Changelog Skill
- [Day]-[DD/MM/YYYY]-[HH:MM] : [Change Description]
'@ | Out-File -Encoding utf8 "$SkillDir\SKILL.md"

@'
# Automatic Daily Separate Changelog Rule
- Target: documentation/changelog/[DD]-[MM]-[YYYY]-changelog.md
- Format: - [Day]-[DD/MM/YYYY]-[HH:MM] : [Summary of the change]
'@ | Out-File -Encoding utf8 "$RuleDir\changelog_rule.md"

Write-Host "✅ Installed successfully!" -ForegroundColor Green
```
