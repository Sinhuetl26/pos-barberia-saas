# Informe de preparación para despliegue comercial

Fecha: 30/oct/2026 · Alcance: integridad del respaldo, pruebas sobre PostgreSQL 16 real en Docker aislado y evaluación de riesgos de salida.
Este informe no certifica producción: describe qué se comprobó, con qué evidencia y qué falta.

## 1. Veredicto

| Dimensión | Estado | Base |
|---|---|---|
| Integridad del código y la documentación | Verde | 0 archivos perdidos; clon limpio compila API y web |
| Comportamiento del producto (13 suites) | Verde | 279/279 en SQLite y 279/279 en PostgreSQL |
| Compatibilidad PostgreSQL y migraciones | Verde | 13/13 comprobaciones de migraciones y recuperación (R1 corregido) |
| Ingeniería de entrega (CI, lint, monitoreo) | Ámbar | CI ampliado y simulado en local; sin linter; sin monitoreo |
| Integraciones y cumplimiento comercial | Rojo | Stripe live, WhatsApp, CFDI, correo y hardware sin validar |

**Conclusión:** el producto está listo para un piloto controlado con datos ficticios o de un solo negocio acompañado; **no** está listo para venta general con cobros automáticos hasta cerrar R2 y R7 (R1 y R3 ya están corregidos; ver §9).

## 2. Integridad de los 8 commits

Comprobado sobre `production` (8 commits adelante de `origin/production`, sin push):

- `git fsck` sin errores: solo objetos colgantes normales de operaciones de indexado.
- **Cero archivos eliminados**: `git diff --diff-filter=D b5848d0..HEAD` devuelve vacío. Los 7 documentos raíz aparecen como renombrados con similitud **100 % (R100)** hacia `docs/archivo/inicial/`: `Auditoria_completa_POS_barberia.md`, `FUNCIONES_DEL_SISTEMA.md`, `PLAN_DE_CAMBIOS_SYSTECH.md`, `REPORTE_BUGS_CAMBIOS_MEJORAS_SYSTECH.md`, `ROADMAP_COMERCIALIZACION_POS_BARBERIA.md`, `srs.md` y la reauditoría del 3 de octubre (renombrada a `REAUDITORIA_2026-10-03.md`).
- **1,452 archivos versionados**; ninguno ausente en disco.
- **Clon limpio de HEAD** (1,452 archivos): `tsc` de la API y de la web terminan con 0 errores, y `vite build` produce el mismo paquete (311.29 kB, 101.30 kB gzip).
- **1,007 imports relativos** verificados contra el árbol de HEAD: 0 sin resolver. Las 55 referencias que apuntan a `apps/api/dist/*` son al artefacto compilado por `npm run build:api`, no código faltante.
- **20/20 scripts de `package.json`** apuntan a archivos existentes.
- **Configuración de build íntegra**: `tsconfig` (API y web), `tailwind.config.js`, `postcss.config.js`, `vite.config.ts`, `schema.prisma`, `schema.postgres.prisma`, `migration_lock.toml`, `Dockerfile`, `docker-compose.yml` y `compose.demo.yaml` están versionados; ningún archivo de configuración presente en disco quedó fuera.
- **`.gitignore`**: el único cambio añade `.playwright-mcp/` (consola y snapshots transitorios del navegador). No oculta fuentes ni configuración; sí excluye, como ya estaba previsto, `.env`, `*.db`, `*.zip`, `*.log`, `dist/`, `node_modules/` y `.tools/`.
- **Secretos**: 897 archivos de texto escaneados con 16 patrones; 0 credenciales reales (los aciertos son `sk_test_controlled`, `whsec_controlled`, `re_fixture_mail` y JWT de fixture). 0 archivos `.env`, `.db`, `.pem` o `.key` versionados.

Riesgo residual de esta dimensión: la evidencia visual pesa ~57 MB en el historial (R4) y 17 rutas de material ajeno al POS siguen sin versionar (R10).

## 3. PostgreSQL 16 real en Docker aislado

| Elemento | Valor |
|---|---|
| Imagen | `postgres:16` (PostgreSQL 16.15, Debian) |
| Contenedor | `systech-pg-integrity`, `127.0.0.1:55432`, base `systech_test_integrity` |
| Aislamiento | Un esquema `st04_*` desechable por suite, eliminado al terminar; 0 esquemas remanentes |
| Cliente | Generado aparte desde `schema.postgres.prisma` en `.tools/prisma-postgres/client` |
| Base operativa | `packages/database/prisma/dev.db`, SHA-256 idéntico antes y después (`B5AEBC3B…9AC9E69`) |

Resultados:

- **13/13 suites, 279 comprobaciones** sobre PostgreSQL. Las propias suites declaran el motor («isolated PostgreSQL», «en PostgreSQL», «isolated PostgreSQL database»). Ver `output/verificacion-20261030/SUITES_POSTGRES.md`.
- **Suite de migraciones y recuperación: 13/13 comprobaciones** con el defecto R1 corregido de forma temporal (parche revertido): instalación limpia de las 19 migraciones, cero drift contra el modelo canónico, preflight de solo lectura, upgrade de datos heredados, copia anonimizada de SQLite (496 registros de auditoría, 102 citas, 7 barberos, 1 bloqueo), simulacro de migración fallida con rollback, respaldo/restauración a una base nueva y regresión completa de la API sobre PostgreSQL.
- **Los 279 también pasan en SQLite** (corrida previa, mismo día): la paridad entre motores no es teórica.

## 4. Las 279 comprobaciones y su dependencia de motor

**Ninguna de las 279 comprobaciones es exclusiva de SQLite**: todas se ejecutaron y aprobaron en ambos motores, y no hay ramas que las omitan según el motor. Lo que sí depende del motor es *cómo* se ejecutan:

| Dependencia | Comprobaciones | Detalle |
|---|---|---|
| Inyección de fallo con DDL distinto | 2 | ST-05 «A late database failure rolls back every effect» y ST-06 «A late refund database failure rolls back…» usan trigger `plpgsql` en PostgreSQL y `RAISE(ABORT)` en SQLite |
| Huella del archivo SQLite | 5 | ST-05, ST-06, ST-07, ST-08 y ST-09 comprueban que `dev.db` no cambió. En PostgreSQL la aserción es trivialmente cierta |
| Dos procesos API simultáneos | 3 | ST-05 «16 concurrent duplicate submissions…», ST-06 «Eight concurrent openings…», ST-07 «Durable public limits span two API processes…» |
| Selección de motor en el runner | transversal | Sin `SYSTECH_TEST_PG_URL` todo corre en SQLite; PostgreSQL exige además un cliente Prisma generado desde `schema.postgres.prisma` |

Código de producto con lógica condicional por motor (3 puntos, todos justificados y cubiertos):

- `apps/api/src/services/durable-jobs.service.ts:17` — enlace de fechas (`Date` directo en SQLite, texto UTC con `::timestamp` en PostgreSQL).
- `apps/api/src/routes/operacion.routes.ts:32` — `INSTR` (SQLite) frente a `STRPOS` (PostgreSQL) para búsqueda literal.
- `packages/database/index.ts:10` — producción exige `DATABASE_URL` de PostgreSQL.

Fuera de las 279: el repositorio tiene **90 scripts `test_*`/`qa_*`** y solo 13 están en el runner (R9). ST-12 (jobs durables), personalización de reservas, importación CSV o auditoría de operación se validan con scripts sueltos, no en CI.

## 5. Riesgos confirmados

| # | Severidad | Riesgo | Evidencia | Qué lo cierra |
|---|---|---|---|---|
| R1 | ~~Bloqueante~~ **Resuelto** | `scripts/test_postgres.js` no terminaba: `compare()` ordenaba por `"id"` y `CitaReferencia` no tiene esa columna (`42703`) | `output/verificacion-20261030/postgres-migraciones.log` (antes) · `postgres-migraciones-r1.log` (después: 13/13) | Hecho: el orden se lee del catálogo y admite claves compuestas (§9) |
| R2 | Alta | Migraciones no verificadas sobre datos reales desde el 9-oct (13 checks); hoy hay 19 migraciones | `docs/scrum/POSTGRES_RESULTADOS_ACTUALES.json` | Aplicar el procedimiento ya probado: respaldo, `npm run db:migrate`, conciliación |
| R3 | ~~Alta~~ **Resuelto** | CI solo ejecutaba PostgreSQL: ni `npm test`, ni build de web | `.github/workflows/postgres.yml` | Hecho: build completo, suites SQLite y PostgreSQL en un job (§9) |
| R4 | Alta | 57 MB de capturas en el historial; repo de 68.4 MB | `git count` sobre los 8 commits | Decidir antes del push: mantener, Git LFS o excluir |
| R5 | Media | Sin linter: ESLint no está instalado y `npm run lint` falla | `npm run lint --workspace=@systech/web` | Instalar ESLint + configuración, o retirar el script |
| R6 | Media | El build web cae a `http://localhost:3001/api` si falta `VITE_API_URL` | `apps/web/src/api.ts:7` | Fallar el build cuando falte en modo producción |
| R7 | Media | Stripe live, WhatsApp/Meta, CFDI, correo real e impresora térmica sin validar; el cobro live está bloqueado por diseño (`LICENSE_TAX_POLICY=PENDIENTE`) | `packages/licensing/catalog.json`, `billing-checkout.service.ts` | Sandbox con cuentas reales, revisión fiscal y prueba de hardware |
| R8 | Media | Sin monitoreo ni cola real; despliegue Docker no ejercitado en esta verificación | `README.md`, `docker-compose.yml` | Instrumentar Sentry, definir despliegue y alertas |
| R9 | Media | 77 de 90 scripts de prueba fuera del runner y de CI | `scripts/run_all_tests.js` | Incorporar los críticos (ST-12, importación, personalización) |
| R10 | Baja | 17 rutas ajenas sin versionar; `.env.stripe-test` local ignorado; 30 directorios `.test-db-*` residuales | `git status --ignored` | Decidir destino del material ajeno y limpiar fixtures |
| R11 | Baja | Node 24 local frente a Node 20 en CI; la validación de copia anonimizada requiere Python 3.12 | `postgres.yml`, `test_postgres.js` | Fijar versión con `.nvmrc`/`engines` |
| R12 | Baja | Sin pruebas de UI automatizadas; la verificación visual es manual | `output/ui-100-20261030/REVISION.md` | Añadir Playwright a las rutas críticas |
| R13 | Baja | `npm run test:postgres` no limpia sus esquemas `st04_*` ni la base `systech_test_restore_*` que crea en el servidor de pruebas | Contenedor tras la corrida: 4 esquemas y 1 base extra | Limpiar al final o documentar que el servidor debe ser desechable |

## 6. Lo que esta verificación no cubre

Impresión en hardware físico, cobros reales o sandbox de Stripe con cuenta propia, mensajería real de WhatsApp/Meta, entrega real de correo, timbrado CFDI, dominio y TLS públicos, carga y rendimiento con volumen, restauración ante desastre del proveedor de nube, y revisión legal/fiscal de términos, aviso de privacidad y precios.

## 7. Reproducción

```sh
# PostgreSQL aislado (contenedor desechable)
docker run -d --name systech-pg-integrity -e POSTGRES_USER=systech_test \
  -e POSTGRES_PASSWORD=isolated-ci-only -e POSTGRES_DB=systech_test_integrity \
  -p 55432:5432 postgres:16

# Suites de producto sobre PostgreSQL (13 suites, 279 comprobaciones)
export SYSTECH_TEST_PG_URL=postgresql://systech_test:isolated-ci-only@127.0.0.1:55432/systech_test_integrity
export SYSTECH_ISOLATED_TESTS=true
node -e "require('./scripts/postgres_migration_utils').generateClient(process.env)"
SYSTECH_TEST_PRISMA_CLIENT=$PWD/.tools/prisma-postgres/client npm test

# Migraciones, respaldo y recuperación (13 comprobaciones; hoy bloqueada por R1)
npm run test:postgres

# Suites de producto sobre SQLite aislado
npm test
```

La base operativa no se toca en ninguno de los tres caminos: cada corrida usa su propia base (`.test-db-*`) o su propio esquema `st04_*`.

## 8. Evidencia

- `output/verificacion-20261030/SUITES.md` y `SUITES.json` — 13/13 suites en SQLite, 279 comprobaciones.
- `output/verificacion-20261030/SUITES_POSTGRES.md` — 13/13 suites en PostgreSQL 16, 279 comprobaciones.
- `output/verificacion-20261030/postgres-migraciones.log` — fallo R1 con el error exacto (antes).
- `output/verificacion-20261030/postgres-migraciones-r1.log` — 13/13 comprobaciones con la corrección definitiva.
- `docs/scrum/POSTGRES_RESULTADOS_ACTUALES.json` — última corrida registrada: 2026-10-30, 13 comprobaciones, 19 migraciones, base operativa intacta.
- Los archivos `.log` no se versionan (`*.log` en `.gitignore`); los informes `.md` y `.json` sí.

## 9. Corrección de R1 y R3 (30/oct/2026)

### R1 — instantáneas sin suponer una columna `id`

`compare()` de `scripts/test_postgres.js` ahora obtiene la clave primaria del catálogo (`pg_index` + `pg_attribute`, respetando el orden de columnas) y ordena por ella. Si una tabla futura no tuviera clave, ordena por todas sus columnas ordenables y, como último recurso, por posición física (`ctid`). Nombres de tabla y columna se validan con el mismo patrón antes de interpolarse.

Verificación: `npm run test:postgres` → **13/13 comprobaciones**, sin `42703`, incluida la regresión completa de la API sobre PostgreSQL (13 suites, 279 comprobaciones) y el respaldo/restauración.

### Preparación para un checkout limpio

Cinco suites huellaban `packages/database/prisma/dev.db`, que no existe en un checkout limpio (está en `.gitignore`). Ahora la huella es `null` antes y después cuando el archivo no existe; la aserción se conserva y sigue detectando que el archivo aparezca durante la corrida.

Demostrado en un clon limpio de HEAD: con la versión anterior, `npm test` falla en ST-09 con `ENOENT … prisma\dev.db`; con la corrección, **13/13 suites**.

### R3 — CI ampliado

`.github/workflows/postgres.yml` ejecuta en un solo job: `npm ci` → **build completo** (base de datos, API y web) → **13 suites SQLite** → instantánea sintética → **batería PostgreSQL 16** (migraciones, preflight, copia anonimizada, recuperación y regresión). Añade artefactos de evidencia de ambos motores con `if: always()`, concurrencia por referencia y límite de 45 minutos.

`SYSTECH_TEST_PG_URL` se define solo en el paso de PostgreSQL: si estuviera a nivel de job, el runner elegiría PostgreSQL mientras el cliente Prisma seguiría siendo SQLite.

Simulación local del job (clon limpio + build + suites + PostgreSQL): build correcto y 13/13 suites sin base de datos local. La primera ejecución real en GitHub queda pendiente de que se haga push.
