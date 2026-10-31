# Primera revisión del equipo · 2026-10-09

Inspección estática y revisión de evidencia, no nueva ejecución de regresión ni aceptación de historias. Sin cambios de aplicación o base operativa. Los hallazgos de concurrencia requieren pruebas de reproducción antes de declarar su alcance exacto.

## Producto

Ordenar ST-41 en entradas/trazabilidad y después conteos conciliables; ST-42 en unidades/recetas y después diferencias físicas. Conservar ST-30 para análisis y excepciones; no confundir ST-28 (métricas del SaaS) con resultados de la barbería. Decidir con Sinhue catálogo por sucursal, roles de conteo, unidades iniciales y método de medición antes de implementar. No desplazar requisitos P0 por recomendaciones analíticas.

## Backend: hallazgos de inventario

- Alta de producto y registro de stock inicial separados: `apps/api/src/routes/inventario.routes.ts:75`. Falta atomicidad y sucursal/responsable consistentes.
- Movimientos manuales sin clave de reintento y recepción de compra con estado comprobado antes de la transacción: `inventario.routes.ts:173`, `proveedores.routes.ts:265`. Riesgo de repetir entrada o recepción; reproducir y proteger transición/idempotencia.
- Recepción lee saldo sin el bloqueo usado por POS: `proveedores.routes.ts:301`. Reproducir venta/recepción concurrentes y conciliar saldos del Kardex.
- Validación de tipo/cantidad/costo insuficiente en movimientos/órdenes: `inventario.routes.ts:175`, `proveedores.routes.ts:195`. Excluir servicios y entradas fuera de dominio.
- Ajuste absoluto no equivale a conteo conciliado: `inventario.routes.ts:180`. ST-41B debe conservar referencia y movimientos posteriores.

## Calidad

- CI publica resultados de ST-05/06 pero omite ST-07/08/09: `.github/workflows/postgres.yml:45`.
- Resultados ST-09 con fecha fija y sin versión/ejecución inequívoca: `scripts/test_counter_tickets.js:22`. Añadir fecha real e identificación de ejecución y estado del código.
- Las 13 suites no incluyen navegador automatizado versionado: `scripts/run_all_tests.js:5`. El recorrido observado es evidencia local, no regresión UI repetible.
- Ampliar restauración con operaciones nuevas pobladas (custodia, devoluciones y eventos), además del fixture histórico: `scripts/test_postgres.js:148`.
- Correo, impresoras y dispositivos reales conservan sus pendientes; no sustituir por emulación.

## Frontend

- Asociar etiquetas a inputs de reserva: `PublicBookingView.tsx:886` y campos siguientes.
- Modal de cobro necesita semántica/foco de diálogo y comportamiento de teclado revisado: `PosView.tsx:711`.
- Avisos dinámicos de POS necesitan anuncio accesible: `PosView.tsx:1193`.

No hubo inspección visual en esta primera revisión. Cambios propuestos requieren verificación de navegador.

## Integraciones

ST-10 debe completar y probar eventos de actualización de suscripción, orden de entrega y ciclo renovación/fallo/recuperación/cancelación; portal con permisos y estado remoto confirmado. ST-11 necesita intentos durables y conciliación antes de crear suscripciones paralelas. Referencias: `services/stripe.service.ts:109`, `routes/suscripcion.routes.ts:101`, `services/billing-checkout.service.ts:54`. La evidencia sandbox histórica no certifica catálogo actual ni ciclo completo; proveedor live/fiscalidad conservan sus puertas externas.

## Infraestructura

Construir y comprobar el despliegue real con secretos/URLs/orígenes explícitos; configuración Docker no demuestra operación. Migración con respaldo restaurado, conciliación y acceso comprobado antes de habilitar tráfico. ST-14 requiere copia independiente, cifrado/retención y objetivos RPO/RTO ensayados; un volumen persistente no es ese respaldo. Referencias: `Dockerfile:27`, `docker-compose.yml:46`, `docs/POSTGRES_MIGRACIONES_Y_RECUPERACION.md:37`. Confirmar qué variables de autenticación usa realmente la aplicación antes de modificar configuración heredada.

## Siguiente coordinación

Recibir prioridades de integraciones/infraestructura, comprobar y priorizar hallazgos, y asignar correcciones en archivos sin solapamiento. Sinhue mantiene tres recorridos de revisión de producto; ST-01 a ST-09 continúan En revisión y ST-41/42 Pendiente. La creación de agentes no cambia automáticamente el alcance o calendario.
