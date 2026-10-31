# QA integrado ST-01 a ST-09 · 2026-10-09

Responsable: calidad. Criterios: `BACKLOG_LANZAMIENTO.json`; Definition of Done: `PLAN_AGIL_LANZAMIENTO.md`, sección 4. El usuario delegó la revisión al equipo. Este documento registra evidencia de ejecución actual y distingue las pruebas externas pendientes; no cambia estados del backlog.

## Alcance y ejecución

- Fecha real: 9 de octubre de 2026, America/Mexico_City. Primer intento restringido falló por `EACCES` al conectar HTTP a loopback; fue interrumpido y la ejecución con permiso ampliado aprobó.
- `run_all_tests.js` recompiló la API actual y ejecutó las 13 suites en bases SQLite desechables. **13/13 suites, 274 comprobaciones aprobadas**. No se usó la base operativa como destino.
- La prueba adicional `test_inventory_receipt_integrity.js` aprobó **6/6** en SQLite, con dos procesos API. Adaptación mínima autorizada: conserva SQLite por defecto y acepta PostgreSQL únicamente con URL y cliente aislados juntos; los forks usan el mismo preload protegido.
- Backend recompiló la corrección final de CSV y aprobó **6/6** comprobaciones dirigidas SQLite de `test_inventory_permissions_csv.js`. Es evidencia entregada por backend, no una repetición propia de calidad. Comprueba escrituras permitidas/denegadas de inventario, proveedores/compras y CSV con 14 columnas, texto con comillas/coma/salto de línea, devolución 10.01, total 30.03, neto 20.02 y cobrador histórico.
- `test_postgres.js` completó **13/13 comprobaciones de migración/recuperación** y la regresión completa **13/13 suites, 274 comprobaciones** contra PostgreSQL 16, recompilando la API con la corrección final CSV. La regresión general SQLite ocurrió antes de esa corrección; la dirigida SQLite de backend comprobó el resultado final afectado.
- Calidad ejecutó las dos adicionales en PostgreSQL: **recepción 6/6 y permisos/CSV 6/6**, entre `2026-10-09T18:24:01.074Z` y `2026-10-09T18:24:18.796Z`. En total por motor: **286 comprobaciones funcionales en 15 suites** (13 generales + 2 dirigidas). Las 13 de migración/recuperación son comprobaciones separadas; una de ellas llama la regresión general, por lo que no deben contarse como otras 13 suites ni como verificaciones funcionales independientes.
- El snapshot `.tools/ci-source.db` se preparó con semilla sintética para el ensayo PostgreSQL. No contiene una copia de la operación actual; la evidencia histórica de copia operativa anonimizada conserva su fecha original.
- Los JSON de ST-05/ST-06/ST-07/ST-08 son resultados generados por los scripts actuales pero sus campos `date`/`fecha` están fijados en el código a 7/8 de octubre. La ejecución de este informe ocurrió el **9 de octubre**; las fechas fijas no deben presentarse como reloj de ejecución.
- Registros completos de esta ejecución: `.tools/qa-2026-10-09-sqlite.log`, `.tools/qa-2026-10-09-inventory-sqlite.log`, `.tools/qa-2026-10-09-postgres.log`, `.tools/qa-2026-10-09-additional-postgres.log`. Permanecen locales e ignorados por Git. Evidencia sanitizada versionable: `QA_REGRESION_ST01_09_2026-10-09.json` (cuenta las líneas PASS reales por suite y conserva nombres), `QA_ADICIONALES_POSTGRES_2026-10-09.json` y `POSTGRES_RESULTADOS_ACTUALES.json`.

## Conteos por suite

Cada comprobación agrupa solicitudes/aserciones; no equivale a un endpoint ni prueba exhaustiva de todas sus entradas.

| Suite | SQLite actual | PostgreSQL actual |
| --- | ---: | ---: |
| ST-09 tickets mostrador | 7/7 | 7/7 |
| ST-08 alta/correo | 17/17 | 17/17 |
| ST-07 agenda/reservas | 20/20 | 20/20 |
| ST-06 caja/custodia/devoluciones | 21/21 | 21/21 |
| ST-05 venta/stock/folio | 17/17 | 17/17 |
| Cuenta y sesiones | 19/19 | 19/19 |
| Fase 0 seguridad | 42/42 | 42/42 |
| Fase 1 finanzas/concurrencia | 19/19 | 19/19 |
| Fase 2 integraciones controladas | 25/25 | 25/25 |
| Fase 3 agenda/clientes/comisiones | 19/19 | 19/19 |
| Base comercial/licencias | 19/19 | 19/19 |
| Autorización | 19/19 | 19/19 |
| Catálogo/capacidad | 30/30 | 30/30 |
| **13 suites generales** | **274/274** | **274/274** |
| Recepción/integridad inventario, adicional | 6/6 | 6/6 |
| Permisos inventario/compras y CSV, adicional | 6/6 (backend) | 6/6 |
| **15 suites funcionales incluyendo adicionales** | **286/286** | **286/286** |

La suite de autorización inventarió **147 rutas montadas actuales**. Su prueba contrasta políticas y handlers, pero ese conteo no implica que se haya realizado una operación positiva y negativa específica en cada endpoint. Los números 110/137 de evidencias anteriores son históricos.

## Conservación de la base operativa

SHA-256 inicial, después de SQLite y después de PostgreSQL/adicionales: `B5AEBC3B7F87E5EEE7E4B9372F5795FF05A237064932D23EFC2EA609E9AC9E69`.

No se cambió el proveedor de `schema.prisma` ni el cliente Prisma global, ambos SQLite. El ensayo PostgreSQL genera su cliente exclusivamente en `.tools/prisma-postgres/client`. No se ejecutaron migraciones, semillas ni escrituras contra `packages/database/prisma/dev.db`.

La instancia PostgreSQL portátil de ensayo se detuvo al terminar la regresión; se abrió de nuevo exclusivamente para las adicionales y volvió a detenerse al terminar. Los procesos API de pruebas se cerraron y sus esquemas/bases SQLite desechables fueron retirados por los helpers.

## Migración y recuperación actuales

Nueve migraciones versionadas: `0_init`, `20261005_account_security`, `20261005_authorization`, `20261006_01_postgres_compatibility`, `20261006_02_postgres_integrity`, `20261007_booking_integrity`, `20261007_cash_traceability`, `20261007_pos_integrity`, `20261008_mail_onboarding`.

El ensayo confirmó instalación limpia; ausencia de drift; preflight de solo lectura sin cambiar filas tanto al aceptar como al rechazar esquema divergente/historial pendiente; actualización histórica con suscripción, cita y factura conservadas; deploy repetido idempotente; decimales/UTC/índices/uniquidad/FKs; actualización de snapshot sintético anonimizado con comparación de filas; fallo transaccional reversible y recuperación del historial; dump y restore en base nueva con registros idénticos; regresión general en esquemas separados y hash operativo inalterado.

El snapshot sintético actualizado contiene 4 negocios, 4 sucursales, 5 barberos, 4 clientes, 3 ventas, 4 partidas y 3 comisiones, además de catálogo/citas; no proviene de la operación actual. El restore usa el fixture histórico poblado (suscripción/cita/factura y producto decimal), no esos esquemas de regresión ni un conjunto integrado con ventas/devoluciones/custodia/intenciones/eventos de correo actuales. El campo `source_snapshot` del JSON estándar es genérico; este documento y el JSON agregado precisan el origen real. No se ejerció migración operativa, CI remoto ni recuperación ST-14.

## Límites de aceptación

| Historia | Evidencia técnica actual / histórica pertinente | Criterios que esta regresión no demuestra |
| --- | --- | --- |
| ST-01 | API directa, límites, concurrencia, conservación/downgrade y separación TEST/LIVE: catálogo 30 casos actuales por motor; revisión visual histórica | Tratamiento fiscal final revisado. La política `PENDIENTE` bloquea live; no satisface por sí sola la decisión fiscal. Mocks no certifican catálogo Stripe real. Importador inexistente conserva ST-26. |
| ST-02 | 19 escenarios actuales por motor; dos negocios y cuatro sucursales; IDs, CSV, archivos, permisos vivos, rutas públicas; inventario de 147 rutas. 6 adicionales por motor con permisos de compras/proveedores/movimientos | La cobertura específica positiva/negativa observada responde a los huecos revisados; no equivale a probar todas las entradas posibles de cada ruta. |
| ST-03 | 19 escenarios actuales por motor: tokens, caducidad, consumo atómico, limitación persistente, invitación/cuenta propia, revocación. Auditoría del 9/oct renovada por el coordinador: producción 0 avisos; total 9, sin críticos; mitigaciones documentadas | No se ejecutó imagen Docker; poda simulada aprobada. Los nueve avisos de desarrollo siguen sin reparar. Pruebas de secretos tienen alcance acotado, no escaneo íntegro del historial Git. Correo real conserva ST-08. |
| ST-04 | 13 comprobaciones actuales PostgreSQL; 9 migraciones, copia sintética anonimizada actual y restore poblado histórico actual | No valida operación/CI remoto, producción, restauración de nuevas ventas/devoluciones/compras, cifrado/retención ni RPO/RTO (ST-14). |
| ST-05 | 17 actuales por motor, última unidad/folio/intención única, pagos en centavos, rollback. Nueva recepción 6 actuales por motor | No certifica pago bancario ni offline; inventario manual completo conserva ST-41. |
| ST-06 | 21 actuales por motor: corte ciego/medios separados, devoluciones, comisión histórica, custodia, identificación y aviso persistente. CSV corregido y 6 dirigidos por motor. Revisión visual final del 9/oct propia del coordinador: entrega 20 reduce 50→30; diferencia −1 conserva aviso ámbar | Aviso sin recargar y cobro celular conservan recorrido histórico/emulado; la comprobación visual actual no certifica dispositivo físico. |
| ST-07 | 20 actuales por motor: exclusión, zona/DST/descansos, límites durables, capacidades privadas/caducidad, cita→venta y NO_SHOW | No certifica entrega externa ni capacidad bajo carga; no es alcance de esta historia. |
| ST-08 | 17 actuales por motor con proveedor/DNS controlados; alta sin datos ficticios, fallos/pendiente distintos de entrega; visual histórica | **Dominio/remitente reales, SPF/DKIM/DMARC, entrega, rebote y supresión reales pendientes**. No cerrable íntegramente con mocks. |
| ST-09 | 7 actuales por motor de tickets; revisión visual y recuperación histórica a 390×844, 768×1024 y 1440×900 | **Impresora física 58 mm y física 80 mm, modelo/controlador y matriz compatible pendientes**. Emulación no prueba equipos físicos. No certifica offline, gaveta, CFDI, Bluetooth ni liquidación bancaria. |

El cierre debe decidirse por los criterios y DoD de cada historia. El resultado agregado de 13 suites nunca sustituye el criterio externo pendiente de ST-08/ST-09 ni una decisión fiscal en ST-01.

La evidencia técnica vigente apoya el cierre de ST-02, ST-03, ST-04, ST-05, ST-06 y ST-07 en el alcance de sus criterios. ST-01, ST-08 y ST-09 conservan impedimentos externos explícitos. La actualización de estados del backlog corresponde al coordinador; calidad no la realizó.

## Auditoría de dependencias recibida del coordinador

Calidad leyó `ST03_DEPENDENCIAS.json` y `ST03_SEGURIDAD_CIERRE_2026-10-09.md` actualizados. Auditoría npm de producción terminada a `2026-10-09T18:23:40.428Z`: 0 avisos. Total: 9 paquetes señalados (7 altos, 2 moderados, 0 críticos). La poda en simulación retira 180 paquetes incluidos los 9 señalados y conserva Prisma 5.22.0 y su cliente; no se podó el entorno local. Dockerfile contiene poda y comprobaciones, pero el motor Docker denegó acceso: no se construyó, arrancó ni auditó una imagen. Las mitigaciones de herramientas de desarrollo están documentadas; los avisos no se declaran reparados. El resultado npm tampoco audita sistema operativo, imagen base ni todo el historial Git.

## Evidencia visual final recibida del equipo

`DV_VALIDACION_FINAL_2026-10-09.json`, observado `2026-10-09T18:22:46.914Z`, reporta y el coordinador confirmó en captura/DOM: saldo 50, entrega 20, campo restante 30; segundo turno fondo 0/conteo 19 contra 20 produce diferencia −1 y mensaje «Caja cerrada con diferencia: $-1 MXN» con estilos ámbar. La base ficticia conserva una venta por 200, una comisión por 80 y dos turnos; esta entrega no creó otra venta ni comisión. Capturas 15/16 inspeccionadas por el coordinador. Calidad leyó el JSON recibido; no realizó ese recorrido ni inspeccionó imágenes por su cuenta. Esta evidencia sustituye el pendiente visual de actualización de custodia/aviso de corte y no prueba hardware.
