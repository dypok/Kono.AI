# Global Workspace Instructions for AI Coding Assistants (OpenCode, Cursor, Codex, Gemini)

## Daily Changelog Protocol
- **Trigger:** Whenever any file is created, modified, or deleted in the workspace.
- **Requirement:**
  1. Record every single modification in `documentation/changelog/[DD]-[MM]-[YYYY]-changelog.md`.
  2. If today's file does not exist, create it with `# Changelog: [DD]-[MM]-[YYYY]`.
  3. Format each entry strictly as:
     `- [Day]-[DD/MM/YYYY]-[HH:MM] : [Description of change]`
  4. Ensure each calendar day maintains its own isolated separate file.

## Automatic Git Commit Protocol
- **Trigger:** Whenever any file is created, modified, or deleted.
- **Requirement:** Stage and commit all changes immediately using conventional commits (`feat:`, `fix:`, `docs:`, `chore:`).
