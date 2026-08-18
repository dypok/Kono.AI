# Workspace Rules for Claude Code & OpenCode

## Automatic Daily Changelog Rule
- **Trigger:** Whenever any file is created, modified, refactored, or deleted in this project.
- **Requirement:**
  1. Determine the current date and time (Day of week, DD/MM/YYYY, HH:MM).
  2. Target the specific daily file: `documentation/changelog/[DD]-[MM]-[YYYY]-changelog.md` (create directory if it doesn't exist).
  3. If the file for today does not exist yet, create it immediately as a new file starting with `# Changelog: [DD]-[MM]-[YYYY]`.
  4. Append the change entry using the mandatory format:
     `- [Day]-[DD/MM/YYYY]-[HH:MM] : [Summary of the change]`
  5. Each new calendar day automatically starts its own separate file (e.g. `18-08-2026-changelog.md`, `19-08-2026-changelog.md`).
