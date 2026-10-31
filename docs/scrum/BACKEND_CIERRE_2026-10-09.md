# Evidencia técnica de recepción de compras — 2026-10-09

Alcance: corrección de integridad en rutas existentes para cierre técnico de Sprint 2. Esta evidencia no constituye aceptación funcional ni cambia historias a Validada. No implementa conteos ST-41, nuevos modelos, SKU únicos, recepción parcial ni idempotencia de movimientos manuales.

## Riesgos reproducidos antes de corregir

- Una compra con cantidad `1.5` devolvió HTTP 200 y guardó la orden, aunque el stock exige piezas enteras.
- Ocho solicitudes de recepción simultáneas, repartidas entre dos procesos API sobre SQLite desechable, produjeron cuatro respuestas HTTP 200 para la misma orden y cuatro HTTP 400. La comprobación de estado estaba fuera de la transacción: cada ejecución que había leído PENDIENTE podía incrementar el producto y registrar otro Kardex.
- La lectura del saldo antes de bloquear el producto permitía que una venta y una recepción documentaran saldos incompatibles. Se corrigió el mismo orden de bloqueo que emplea POS; la prueba posterior verifica la cadena completa de saldos, además del stock final.

## Corrección realizada

La ruta real de recepción es `apps/api/src/routes/proveedores.routes.ts`, no la ruta de movimientos manuales. La recepción bloquea y vuelve a consultar la orden dentro de una transacción. Una orden RECIBIDA devuelve su resultado con `replayed: true`, sin incrementar stock ni crear otro Kardex o auditoría. La transición PENDIENTE→RECIBIDA es condicional. La cancelación también cambia únicamente órdenes PENDIENTE; una cancelación repetida es reconocida, y una recepción ya aplicada impide cancelar.

Antes de leer y cambiar existencias se bloquean sucursal y productos en orden estable, siguiendo POS. Estado, stock, costo, Kardex y auditoría quedan dentro de la misma transacción. Conflictos Prisma transitorios se reintentan de forma acotada; agotarlos devuelve 503 e indica reintentar la misma orden. No se confirma un resultado que haya fallado.

Las compras exigen cantidades enteras positivas de hasta 1,000,000 y costos finitos no negativos de hasta 1,000,000,000. Se validan tanto la creación como los renglones históricos al recibir. Los servicios no pueden comprarse ni recibir movimientos manuales. Los ajustes manuales conservan el saldo cero permitido y rechazan fracciones, valores negativos, no finitos, booleanos y nulos. La recepción rechaza productos eliminados, inactivos o pertenecientes a otra sucursal, en lugar de omitirlos y cerrar la orden.

## Verificación ejecutada

- `npm run build --workspace=@systech/api`: correcto.
- `node scripts/test_inventory_receipt_integrity.js`: seis verificaciones correctas sobre SQLite desechable, dos procesos API locales y datos ficticios. Sin llamadas a integraciones externas ni acceso a la base operativa.

La nueva prueba comprueba:

1. Cantidades/costos inválidos y servicios rechazados sin crear órdenes ni cambiar stock/Kardex.
2. Movimientos manuales inválidos y servicios rechazados sin modificar existencias.
3. Ocho recepciones concurrentes y un reintento posterior: un solo incremento de cinco unidades, un Kardex y una auditoría.
4. Cuatro recepciones concurrentes con cuatro ventas POS: nueve movimientos totales incluyendo la recepción anterior, saldos enlazados desde 20 y stock final 37, conciliado con Kardex.
5. Carrera recepción/cancelación: termina RECIBIDA con exactamente un incremento o CANCELADA sin incremento.
6. Órdenes históricas con fracción, costo negativo o servicio tras un renglón válido: error y rollback de estado, fecha, stock, costo, Kardex y auditoría.

## Límites

PostgreSQL no se ejecutó en este trabajo; no se afirma validación de concurrencia en ese motor. La prueba verifica los caminos concretos descritos, sin sustituir la regresión integral ni el recorrido de aceptación del dueño desde celular/PC. Las recepciones anteriores posiblemente duplicadas requieren conciliación; esta corrección no reescribe su historia. ST-41 mantiene pendientes conteos físicos, conciliación de conteos concurrentes, inventario inicial transaccional, idempotencia manual y trazabilidad ampliada.
