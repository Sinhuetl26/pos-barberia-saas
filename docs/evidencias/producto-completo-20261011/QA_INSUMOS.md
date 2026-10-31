# QA independiente PC-04 / PC-05 — insumos y diferencias

11 de octubre de 2026. API y persistencia verificadas con fixtures propios. UI, medición de frascos abiertos y validación de barbería real se mantienen pendientes separados.

`scripts/qa_product_supplies.cjs` trabaja con dos API temporales, SQLite descartable o esquema PostgreSQL aislado, sin proveedores ni datos operativos. Cliente PostgreSQL generado separado; modelos nuevos usan Decimal y las assertions normalizan cantidades explícitamente con Number en el límite de prueba.

## Resultados

| Escenario | SQLite | PostgreSQL |
|---|---|---|
| Alta500ml costo0.05 por ml, media presentación250ml agrega125ml; rechazo de más de3decimales, negativo y booleano | PASS | PASS |
| Receta5ml versionada: replay exacto, unidad incompatible y contenido distinto rechazados | PASS | PASS |
| Sesenta servicios consumen300ml una sola vez con seis reintentos; queda200ml, costo histórico15 y versión1 conservados al editar costo; devolver dinero no devuelve insumo usado | PASS | PASS |
| Conteo150ml contra referencia200ml muestra50ml y conciliación genera ajuste−50, no venta | PASS | PASS |
| Completar cita y cobrar después no duplica consumo; cambiar receta a2ml solo afecta servicio nuevo | PASS | PASS |
| Cancelar antes de completar no consume; completar sin receta registra versión0 y cobrar tras publicar receta no consume retroactivamente | PASS | PASS |
| Completar y cobrar simultáneamente comparten evento único; API rechaza insumo operativo vendido como producto de reventa | PASS | PASS |
| Insumo posterior insuficiente revierte consumo anterior, venta, Kardex, intención y evento | PASS | PASS |
| Conciliación conserva diferencia física50ml; tolerancia49 indica fuera, tolerancia50 no; historial ausente informa insuficiencia y saldoEsperado null, lectura no cambia saldo | PASS | PASS |
| Barber no administra recetas ni conciliación; gerente no accede a sucursal ajena; reporte no revela insumos del otro negocio | PASS | PASS |
| Corregir consumo real5→3ml compensa+2ml una vez con cuatro intenciones repetidas; conserva evento/costo original y rechaza edición con versión vencida | PASS | PASS |

**22/22 comprobaciones independientes aprobadas**, once por motor, incluida corrección compensatoria posterior al primer build.

## Qué queda fuera de esta evidencia

- La expresión500−60×5=200 y observación física150→diferencia50 es un fixture calculado; no una medición de producto real ni prueba de robo. La API explica método, unidad, tolerancia y dato insuficiente.
- Costos de consumo son snapshots operativos, no utilidad fiscal ni declaración de impuestos.
- Se comprobaron modelos nuevos y migraciones PostgreSQL mediante fixture. La adaptación de copia de demo SQLite requiere recorrido API y campos DateTime, documentada con coordinador en QA_SERVICIOS_COMBINADOS.md.
- Las suites antiguas con assertions strict stocknumber necesitan adaptación a Prisma Decimal sin omitir criterios. Sus PASS anteriores a PC-04 no se trasladan automáticamente al schema Decimal nuevo.
- Falta UI decimal/unidades/receta y recorrido móvil de dueño/barbero/cliente con evidencia visual.
