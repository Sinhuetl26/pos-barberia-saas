# Sprint 1: seguridad y licencia con límites claros

Fecha de preparación: 4 de octubre de 2026, horario de México. Calendario de trabajo todavía por acordar. Las tallas del backlog son complejidad, no promesa de duración.

Objetivo: que cada negocio opere con permisos definidos, una licencia coherente y una base de producción cuya migración pueda comprobarse. Historias ST-01, ST-02, ST-03 y ST-04. El alcance es inicial; se ajustará a la capacidad observada.

## Primera actividad: ST-01, catálogo y límites

Responsable de implementación: Codex. Decisiones comerciales/fiscales: Sinhue y contador cuando corresponda. ST-01 está en revisión: implementación local y pruebas completadas; PostgreSQL y validaciones comerciales pendientes. Véase [evidencia de ST-01](ST01_EVIDENCIA.md).

| Subtarea | Estado al preparar | Entrega comprobable |
| --- | --- | --- |
| ST-01.1 Inventariar precio/límites duplicados | Investigación inicial realizada | Mapa de puntos encontrados, debajo; ampliar al implementar |
| ST-01.2 Diseñar catálogo único y compatibilidad BASICO/PRO/Cadena | Implementado; revisión fiscal pendiente | JSON compartido versionado y fiscalidad explícita |
| ST-01.3 Aplicar límites en servidor | Probado en SQLite; pendiente PostgreSQL | Altas/restauraciones, última plaza simultánea y downgrade; no hay importador masivo |
| ST-01.4 Alinear landing y pantalla de licencia | Revisado visualmente | Tres planes y selector común, sin oferta vitalicia |
| ST-01.5 Alinear checkout y webhook | Lógica local probada; catálogo remoto pendiente | Test/live separado, comprobación de precio y plan; sin cargos reales |
| ST-01.6 Comprobar y demostrar | Evidencia local archivada | 149 comprobaciones, 6 suites; 27 casos nuevos; compilaciones y capturas |

Hallazgos iniciales de lectura, todavía sin corrección:

- `apps/api/src/services/billing-checkout.service.ts`: precios 499/999 y selección de precios Stripe por plan.
- `apps/api/src/services/stripe.service.ts`: alta y recuperación de factura aplican límites Pro de 999.
- `apps/api/src/routes/suscripcion.routes.ts`: importes y límites repetidos; rutas de cambio/simulación a verificar con política de producción.
- `apps/web/src/views/SuscripcionView.tsx`: planes definidos en la pantalla y oferta Pro de varias sucursales.
- `apps/web/src/views/LandingView.tsx`: precios duplicados y texto FUNDADOR de tarifa sin aumentos futuros.
- `packages/database/prisma/schema.prisma`: existe modelo de planes y límites guardados en tenant; resolver fuente de autoridad y migración, sin borrar contratos/datos.

Decisión propuesta ya documentada: Esencial 499/1 sucursal/3 barberos; Pro 999/1/8; Cadena 2699/3/8 por sucursal; adicional 799. Tratamiento fiscal por confirmar antes de cobrar live. No representar el catálogo nuevo como publicado hasta actualizar oferta, servidor y proveedor de forma consistente.

## Investigación necesaria para historias grandes

ST-02 implementado y En revisión el 5 de octubre: 110 rutas, permisos por negocio/sucursal/barbero, administración del equipo, impresión con usuario vivo y callbacks firmados. Regresión: 168 comprobaciones/7 suites; 18 escenarios nuevos de autorización. Evidencia: [ST02_EVIDENCIA.md](ST02_EVIDENCIA.md). Revisar matriz con Sinhue y comprobar PostgreSQL en ST-04; siguiente implementación ST-03.

ST-03 implementado y En revisión el 5 de octubre: recuperación, verificación e invitaciones de un solo uso, cierre de todas las sesiones e impresión, migración aditiva y 14 escenarios nuevos. Regresión: 182 comprobaciones / 8 suites. Evidencia: [ST03_EVIDENCIA.md](ST03_EVIDENCIA.md). Entrega real de correo en ST-08 y PostgreSQL en ST-04; no se representa un envío simulado como entrega. Siguiente implementación: ST-04.

ST-04: identificar motor disponible y preparar PostgreSQL aislado; migración limpia y actualización de copia; correr regresión y probar recuperación. No cambiar la base de trabajo ni sus servicios para montar el ensayo.

## Cierre del sprint

- Demostrar el alcance realmente terminado, con casos de error y acceso directo a API.
- Registrar evidencia y estados en backlog/bitácora.
- Comparar trabajo previsto/real y dividir pendientes; no moverlos como terminados por calendario.
- Elegir siguiente objetivo con la capacidad aprendida y bloqueos resueltos.
