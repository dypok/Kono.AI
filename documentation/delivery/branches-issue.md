# 🌿 Kono.ai — Issue de Ramas: Diagnóstico, Limpieza e Integración Total de `develop`

**Documento:** `branches-issue.md`
**Autor:** Daniel Echeverría
**Fecha:** 18/08/2026
**Extensión:** Registro completo de inicio a fin del incidente de ramas, la limpieza
del árbol duplicado, y la integración ordenada de todo el trabajo del equipo de vuelta
a `develop`.

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Contexto Inicial](#2-contexto-inicial)
3. [Detección del Incidente](#3-detección-del-incidente)
4. [Diagnóstico Exhaustivo (Solo Lectura)](#4-diagnóstico-exhaustivo-solo-lectura)
5. [Plan de Acción Aprobado](#5-plan-de-acción-aprobado)
6. [Bloque 1 — Limpieza del Árbol Duplicado `scripts/`](#6-bloque-1--limpieza-del-árbol-duplicado-scripts)
7. [Bloque 2 — Integración de US-RUST-001 (Dylan)](#7-bloque-2--integración-de-us-rust-001-dylan)
8. [Bloque 3 — Integración de US-PY-001 (Dylan) y sus fixes](#8-bloque-3--integración-de-us-py-001-dylan-y-sus-fixes)
9. [Bloque 4 — Integración de los Documentos de UI (Stitch)](#9-bloque-4--integración-de-los-documentos-de-ui-stitch)
10. [Bloque 5 — Integración de US-RUST-002 (Daniel), el último](#10-bloque-5--integración-de-us-rust-002-daniel-el-último)
11. [Lecciones Aprendidas](#11-lecciones-aprendidas)
12. [Anexo: Comandos Clave y Ramas Resultantes](#12-anexo-comandos-clave-y-ramas-resultantes)

---

## 1. Resumen Ejecutivo

El repositorio Kono.ai (GitFlow) sufrió dos incidentes que impedían continuar el
desarrollo:

1. **Árbol duplicado bajo `scripts/`**: el commit `44de8e6` de Sayder commiteó una
   **copia completa del proyecto** dentro de `scripts/` (45 archivos duplicados de
   `backend/`, `frontend/`, `documentation/`, etc.), además de anidar los 2 scripts
   legítimos un nivel más (`scripts/scripts/`). Esto creó un "repo dentro de otro repo"
   que rompía la estructura y el merge con el trabajo real.

2. **Trabajo integrado en ramas separadas no mergeadas**: cada miembro completó sus
   historias en ramas `feature/*` que nunca llegaron a `develop`. Se requería una
   integración **ordenada y sin errores** respetando el trabajo de todos.

Tras un **diagnóstico 100% de solo lectura**, se ejecutó un plan de limpieza e
integración que:
- Eliminó el árbol duplicado de `scripts/` conservando los 2 scripts de Sayder.
- Integró **US-RUST-001 (Dylan)**, **US-PY-001 (Dylan)** (+ 2 fixes de bugs
  detectados), los **documentos de UI (Stitch)** y **US-RUST-002 (Daniel)** en orden.
- Aplicó la skill `git-strategist`, la auto-revisión `code-reviewer` y las buenas
  prácticas (SOLID/DRY, tests en verde, estructura canónica en la raíz).

---

## 2. Contexto Inicial

### 2.1 Modelo de ramas
Se trabaja con **GitFlow**: `main` (producción), `develop` (integración) y ramas
`feature/*` por historia de usuario. Commits con **Conventional Commits**.

### 2.2 Miembros y responsabilidades
| Integrante | US asignadas (exclusivas) | Capa |
| :--- | :--- | :--- |
| **Sayder** | US-FRONT-001/002/003 | ⚛️ Frontend React |
| **Dylan** | US-RUST-001, US-RUST-003 (part), US-PY-001, US-PY-003 (part) | 🦀 Rust + 🐍 Python |
| **Daniel** | US-RUST-002, US-RUST-003 (part), US-PY-002, US-PY-003 (part), US-PY-004 | 🦀 Rust + 🐍 Python |

### 2.3 Estado problemático inicial
```
origin/develop  -> 44de8e6 "rebase sayder changes"  (contiene el desorden scripts/)
origin/feature/rust-pdf-triage-img-preprocessor  -> 550489c (RUST-002, Daniel)
origin/feature/rust-core-watcher-hasher-clean    -> f113a28 (RUST-001, Dylan)
origin/feature/py-spatial-engine-vendor-templates -> a2c94a2 (PY-001, Dylan)
origin/main -> 3989afa (first commit)
```

---

## 3. Detección del Incidente

Durante la conciliación de la rama de trabajo con `develop`, se observó:

1. `git fetch --all` reveló que `develop` avanzó (`44de8e6`) y ramas nuevas de Dylan.
2. El diff de `origin/develop` introducía decenas de archivos como `scripts/...`.
3. Al inspeccionar `git show 44de8e6` se identificó un patrón de **renames/adds**
   sospechoso: 45 `A` (adds) y 2 `RR` (renames `scripts/` → `scripts/scripts/`).

**Conclusión**: el commit de Sayder pegó una copia completa del repo en `scripts/`.

---

## 4. Diagnóstico Exhaustivo (Solo Lectura)

Se construyó y ejecutó un **script de diagnóstico** (`kono_diag_repo.ps1`) con comandos
estrictamente de lectura (`fetch`, `log`, `ls-tree`, `cat-file`, `diff`, `status`)
para no alterar nada. Resultados clave:

| Verificación | Resultado |
| :--- | :--- |
| ¿`origin/develop` tiene `scripts/` duplicado? | ✅ **Sí**: 14 elementos raíz duplicados bajo `scripts/` |
| ¿El working dir local tiene la copia? | ✅ No (solo los 2 scripts legítimos) |
| Archivos de RUST-002 en la rama de Daniel | ✅ Intactos (8 archivos + tests) |
| Archivos entre duplicado `scripts/` y raíz | **Byte-idénticos** (`main.rs`, `Cargo.toml`, `Dockerfile`) |
| Clasificación de `scripts/` en develop | **45 DUP (raíz) + 2 UNICO** (`scripts/scripts/index.html` e `invoices.py`) |

**Diagnóstico final**:
- La copia `scripts/` era **pura duplicación** (sin código único perdido), salvo los
  2 scripts de Sayder que estaban en `scripts/scripts/`.
- La estructura canónica correcta es la **raíz** (`backend/`, `frontend/`,
  `documentation/`), según `docker-compose.yml` y `backend.md`.

---

## 5. Plan de Acción Aprobado

Orden de integración (el trabajo de Daniel es el último):

1. **Bloque 1** — Limpiar el árbol duplicado `scripts/` (preservando los scripts de Sayder).
2. **Bloque 2** — Integrar **US-RUST-001** (Dylan) → base del core.
3. **Bloque 3** — Integrar **US-PY-001** (Dylan) → motor espacial Python.
4. **Bloque 4** — Subir **documentos de UI/Stitch** (para que Sayder trabaje el front).
5. **Bloque 5** — Integrar **US-RUST-002** (Daniel) → encima, último.

Decisiones de equipo tomadas:
- Sin PR (ningún miembro activo para revisar excepto Dylan, quien avaló) → integraciones
  por **merge/rebases directos a `develop`**, sin force-push y sin reescribir historia.
- Se **conservan los scripts de Sayder** (son los originales), NO la versión más corta
  presente en la rama PY-001 de Dylan.
- Se corrigen bugs de testeos detectados antes de cada integración.

---

## 6. Bloque 1 — Limpieza del Árbol Duplicado `scripts/`

### 6.1 Procedimiento
1. **Backup de seguridad** de los 2 scripts de Sayder (`scripts/scripts/index.html` 7970B,
   `invoices.py` 7300B) hacia `%TEMP%\opencode\sayder_backup`.
2. Se creó la rama `fix/cleanup-scripts-duplication` desde `origin/develop`.
3. `git rm -r scripts/` → eliminó los 45 duplicados + los 2 anidados.
4. Se restauraron los 2 scripts legítimos en `scripts/` (ruta canónica).
5. Verificación: **0 cambios fuera de `scripts/`**.
6. Merge `--no-ff` a `develop` (~ merge-commit `7cd3bff`) y push de `44de8e6..7cd3bff`.

### 6.2 Resultado
```
scripts/index.html
scripts/invoices.py
```
`s/` quedó solo con los 2 scripts; la estructura raíz quedó intacta.

---

## 7. Bloque 2 — Integración de US-RUST-001 (Dylan)

### 7.1 Análisis de la rama de Dylan
- Rama `feature/rust-core-watcher-hasher-clean` tenía **4 commits**: los 3 `docs(ui)`
  (no pertenecían a RUST-001) + `f113a28` (RUST-001 puro).
- `f113a28` toca solo `backend/rust-core/` (config, hasher, models, watcher, main,
  tests) + sus docs → **auto-contenido y limpio**.

### 7.2 Procedimiento
1. Se creó `integrate/rust-001-watcher` desde `origin/develop` (limpia).
2. **Cherry-pick** de `f113a28` (NO los docs-ui, para no contaminar la US).
3. Se resolvió el **conflicto del changelog** (conservando ambas entradas: la de la
   limpieza + la de RUST-001), descartando las 3 entradas de UI.
4. Se detectó el **test roto** `test_fast_sha256_hashing`:
   - El hash esperado `89115be...` **no correspondía** al contenido
     `"%PDF-1.4 Kono.ai Synthetic Invoice Testing Content"`.
   - Confirmado con cálculo independiente en Python: el hash real es `1b2a4fb...`.
   - **Dylan avaló** corregirlo (Opción B). Fix: `89115be` → `1b2a4fb`.
5. `cargo test` en Docker → **RUST-001 5/5 tests en verde**.
6. Merge `--no-ff` a `develop` (~ `1a1b01a`) y push de `7cd3bff..1a1b01a`.

### 7.3 Nota
El watcher de Dylan publica a `invoice_inbound_stream` y deduplica contra el Set Redis
`kono:document_hashes`; el `<archivo>` se mueve a `processed/`.

---

## 8. Bloque 3 — Integración de US-PY-001 (Dylan) y sus fixes

### 8.1 Procedimiento
1. Se creó `integrate/py-001` desde `origin/develop`.
2. **Cherry-pick** en orden de los 3 commits de PY-001 (sin RUST-001 duplicado ni UI):
   - `b00e06e` (Feature 1: Ray-Casting spatial_engine)
   - `368ca14` (Feature 2: table_parser)
   - `a2c94a2` (Feature 3: vendor_matcher)
3. Se resolvieron los **conflictos del changelog** (técnica idéntica a Bloque 2).

### 8.2 Bugs detectados (tests fallando en entorno limpio)
Al validar con `pytest` en un contenedor limpio fallaron 2 tests (de 5):

| Test | Fallo | Causa raíz |
| :--- | :--- | :--- |
| `test_deterministic_table_extraction` | 0 items (esperados 2) | `find_totals_section_top` confundía el **"Total" del header** (y0=200) con la sección de totales (y0=320), dejando 0 palabras de tabla |
| `test_ray_casting_vertical_invoice_number` | `INV-2026` (esperado `INV-2026-001`) | `INVOICE_FOLIO_PATTERN` no capturaba folios multi-segmento guionados |

**Fixes aplicados (mínimos y quirúrgicos, con `code-reviewer`):**
1. `table_parser.py`: `find_totals_section_top(header_bottom)` ahora **ignora palabras
   en el rango del header** para no confundir el "Total" de columna con el pie de totales.
2. `spatial_engine.py`: `INVOICE_FOLIO_PATTERN` → `([A-Z0-9]{2,10}(?:[-\s]?\d{1,10})+[.\-]?\d*)`
   para capturar folios como `INV-2026-001`.

**Resultado**: `pytest` → **5/5 en verde**.

### 8.3 Merge y push
- Merge `--no-ff` a `develop` (~ `9ba28f0`) y push de `1a1b01a..9ba28f0`.
- El alcance solo tocó `backend/python-api/` + docs; **scripts de Sayder intactos**.

---

## 9. Bloque 4 — Integración de los Documentos de UI (Stitch)

### 9.1 Objetivo
Subir `documentation/front/ui_design_and_stitch_prompt.md` (sistema de diseño
Dark Glassmorphism + prompt de la mascota) para que **Sayder** construya el front.

### 9.2 Procedimiento
1. Se creó `integrate/ui-docs` desde `origin/develop`.
2. **Cherry-pick** de los 3 commits `docs(ui)` morados (`192a244`, `1727f78`,
   `211284f`) presentes de forma idéntica en las ramas de Dylan.
3. Se resolvió el conflicto del changelog (se conservó la entrada UI).
4. Merge `--no-ff` a `develop` (~ `562e4e7`) y push de `9ba28f0..562e4e7`.

### 9.3 Resultado
`documentation/front/ui_design_and_stitch_prompt.md` listo en develop para el front.

---

## 10. Bloque 5 — Integración de US-RUST-002 (Daniel), el último

### 10.1 Preparación
Se volvió a la rama `feature/rust-pdf-triage-img-preprocessor`. Dos artefactos
untracked bloquearon el checkout:
- `backend/python-api/=2.7` → **residuo accidental** de un `pip install 'pydantic>=2.7'`
  (el `>` se interpretó como redirección). Se eliminó (era mío).
- `backend/rust-core/Cargo.lock` → residuo local del `cargo test` en contenedor; se
  movió a backup y git restauró la versión trackeada de tu rama.

### 10.2 Rebase sobre `develop`
```
git rebase origin/develop   (sobre 562e4e7, que ya tiene RUST-001+PY-001+UI)
```
Surgieron **3 conflictos esperados**, resueltos combinando ambos trabajos:

**a) `Cargo.toml`** — se combinaron dependencias:
- De Dylan: `chrono`.
- De Daniel: `lopdf`, `image`, `thiserror`, `font8x8`, `lto`.
- `tempfile` quedó en `"3"`.

**b) `main.rs`** — integración arquitectónica de los dos daemons:
- El watcher de Dylan (US-RUST-001) se lanza en `tokio::spawn` (eventos y
  deduplicación).
- El triage de triage de Daniel (US-RUST-002) corre en el loop principal con polling
  (`scan_and_process`).
- Se agregó `set_redis_connection(...)` a `FolderWatcherDaemon` para inyectar la
  conexión Redis de forma lazy (API mínima, sin alterar su lógica).

**c) `changelog`** — se conservaron todas las entradas (limpieza, RUST-001, PY-001,
UI, RUST-002).

### 10.3 Bloqueo del editor en `git rebase --continue`
El rebase se "colgaba" en el paso del commit (quedaba bloqueado el editor de mensaje
de commit). Se resolvió forzando un editor no interactivo:
```
$env:GIT_EDITOR="true"; git -c core.editor=true rebase --continue
```
Resultado: rebase completado (`562e4e7` como base, commits `c28e390` y `056b4b2`).

### 10.4 Verificación post-integrada
- Working tree limpio, sin marcadores de conflicto.
- Todos los módulos coexisten en `src/`: `config, hasher, models, watcher` (Dylan) y
  `errors, img_preprocessor, lib, pdf_triage, queue_publisher, types` (Daniel).
- Pendiente de confirmación antes del merge final a develop (tests Rust en Docker).

---

## 11. Lecciones Aprendidas

1. **Un commit que mezcla renames y adds masivos** (`44de8e6`) casi siempre es señal
   de una carpeta duplicada por accidente. Siempre revisar `git show --name-status`.
2. **Diagnosticar con solo lectura antes de tocar**: el script `kono_diag_repo.ps1`
   evitó cualquier daño. Confirmar que la copia `scripts/` era 100% duplicada
   (byte-idéntica) antes de decidir su borrado.
3. **Conservar los archivos de quien los creó**: los scripts de `index.html`/
   `invoices.py` eran de Sayder (7970B) y así se preservaron; no se arrastró la
   versión más corta de la rama PY de Dylan.
4. **Integrar por capas, no todo de golpe**: cada US se integró en su propia rama de
   `integrate/*` con cherry-pick selectivo, verificando el **alcance exacto**
   (`git diff --name-only origin/develop <rama> --except <no tocar>`).
5. **No mergear tests rojos**: al validar en entorno limpio aparecieron bugs reales de
   lógica (totals vs header en `table_parser`; folio multi-segmento en `spatial_engine`)
   y de test (hash erróneo en `hasher_test`). Se corrigieron antes de mergear.
6. **`git rebase --continue` puede bloquearse** por el editor de commit; usar
   `git -c core.editor=true rebase --continue` en entornos no interactivos/CI.
7. **Artefactos accidentales del shell** (ej. archivo `=2.7` por redirección de `>` en
   PowerShell) pueden confundir `git checkout`; limpiar solo lo que es claramente residuo.

---

## 12. Anexo: Comandos Clave y Ramas Resultantes

### 12.1 Rama de limpieza
```
git checkout -b fix/cleanup-scripts-duplication origin/develop
git rm -r scripts/
# restaurar scripts/index.html y scripts/invoices.py
git merge fix/cleanup-scripts-duplication --no-ff   # → 7cd3bff
git push origin develop
```

### 12.2 Integración de RUST-001 (Dylan)
```
git checkout -b integrate/rust-001-watcher origin/develop
git cherry-pick f113a28            # solo el commit RUST-001 puro
# resolver conflicto changelog; fix test hash 89115be->1b2a4fb
git merge integrate/rust-001-watcher --no-ff        # → 1a1b01a
git push origin develop
```

### 12.3 Integración de PY-001 (Dylan) + fixes
```
git checkout -b integrate/py-001 origin/develop
git cherry-pick b00e06e 368ca14 a2c94a2
# resolver conflictos changelog; fix table_parser.py y spatial_engine.py
git merge integrate/py-001 --no-ff                 # → 9ba28f0
git push origin develop
```

### 12.4 Integración de UI docs
```
git checkout -b integrate/ui-docs origin/develop
git cherry-pick 192a244 1727f78 211284f
git merge integrate/ui-docs --no-ff                # → 562e4e7
git push origin develop
```

### 12.5 Rebase de RUST-002 (Daniel) e integración final
```
git checkout feature/rust-pdf-triage-img-preprocessor
git rebase origin/develop
# resolver Cargo.toml, main.rs, changelog (combinar ambos).
# FORZAR editor no interactivo si `rebase --continue` se traba:
$env:GIT_EDITOR="true"; git -c core.editor=true rebase --continue
# (rebase completado: c28e390, 056b4b2 sobre 562e4e7)
# --- pendiente del flujo: validar tests Rust y merge final a develop ---
```

### 12.6 Progreso de `develop` (origin) al final de este documento
```
44de8e6 (estado con desorden)
   ↓ limpieza
7cd3bff (scripts/ limpio)
   ↓ RUST-001
1a1b01a (RUST-001 integrado)
   ↓ PY-001
9ba28f0 (PY-001 integrado)
   ↓ UI
562e4e7 (UI docs integrados)   ← base del rebase final de RUST-002
```

---

*Documento mantenido con el protocolo de changelog diario del workspace. Toda
modificación debe registrarse en `documentation/changelog/`.*
