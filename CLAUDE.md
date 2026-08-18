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

## Automatic Git Commit Protocol
- **Trigger:** Whenever any file is created, modified, or deleted.
- **Requirement:** Stage and commit all changes immediately using conventional commits (`feat:`, `fix:`, `docs:`, `chore:`).

## Skills Obligatorias & Buenas Prácticas de Código (Antes de Codear)
- **Trigger:** Antes de iniciar CUALQUIER tarea de desarrollo (backend, API, BD, servicios, tests) y al revisar código terminado.
- **Requirement — Importar y aplicar SIEMPRE las siguientes skills:**
  1. **`backend-architect`**: arquitectura de backend, diseño de APIs REST, autenticación/autorización, modelado de base de datos, microservicios e integración de servicios. Usar en la fase de diseño/planificación antes de implementar.
  2. **`code-reviewer`**: calidad de código, seguridad (OWASP), rendimiento, cobertura de tests y consistencia arquitectónica. Usar como auto-revisión obligatoria al terminar cada US/subtask antes de marcarla como completa.
- **Estándares mínimos obligatorios:**
  - **Diseño**: SOLID, DRY, YAGNI, separación de responsabilidades y respeto de límites entre capas.
  - **Seguridad**: validación de entrada en todos los límites de confianza; secretos SIEMPRE en variables de entorno (`.env`), nunca hardcodeados ni en el repo.
  - **API**: REST semántico con códigos HTTP correctos, errores descriptivos, paginación en listados y documentación visible en `/docs`.
  - **Rendimiento**: sin N+1, operaciones async no bloqueantes, manejo de colas con backoff/reintentos.
  - **Mantenibilidad**: funciones < 200 líneas, complejidad ciclomática < 10, nombres descriptivos, comentarios que expliquen "por qué" y no "qué".
  - **Tests**: unitarios + integración obligatorios por US, aislados, deterministas y ejecutables en CI/CD sin costos externos (mockear llamadas a IA).
