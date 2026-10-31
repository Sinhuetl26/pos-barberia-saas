# Suites 13/13 sobre PostgreSQL 16 real (Docker aislado)

Ejecutado: 2026-10-30T23:56:11-06:00
Contenedor: postgres:16 (16.15), 127.0.0.1:55432, base systech_test_integrity, esquema desechable por suite.

**13/13 suites aprobadas · 279 comprobaciones** (misma cuenta que en SQLite).

| # | Suite | Resultado | Comprobaciones |
|---|---|---|---|
| 1 | ST-09: tickets de mostrador | APROBADA | 7 |
| 2 | ST-08: alta y correo transaccional | APROBADA | 17 |
| 3 | ST-07: agenda y reservas concurrentes | APROBADA | 20 |
| 4 | ST-06: caja, custodia y devoluciones concurrentes | APROBADA | 21 |
| 5 | ST-05: ventas, inventario y reintentos concurrentes | APROBADA | 17 |
| 6 | Recuperación, invitaciones y revocación de sesiones | APROBADA | 19 |
| 7 | Seguridad y aislamiento | APROBADA | 42 |
| 8 | Finanzas y concurrencia | APROBADA | 19 |
| 9 | Integraciones y tickets | APROBADA | 25 |
| 10 | Agenda, clientes y comisiones | APROBADA | 23 |
| 11 | Base comercial y licencias | APROBADA | 19 |
| 12 | Roles, sucursales y capacidades públicas | APROBADA | 19 |
| 13 | Catálogo y capacidad por sucursal | APROBADA | 31 |

Cada suite creó su propio esquema `st04_*` y lo eliminó al terminar; la base operativa SQLite no se modificó.

Para reproducir: generar el cliente PostgreSQL aislado y ejecutar `npm test` con SYSTECH_TEST_PG_URL y SYSTECH_TEST_PRISMA_CLIENT.
