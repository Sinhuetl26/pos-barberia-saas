# QA independiente PC-09 — servicios combinados

11 de octubre de 2026. Estado: contratos API y persistencia verificados; recorrido UI coordinado aparte.

`scripts/qa_product_combined_services.cjs` usa datos ficticios propios, dos API locales y fixture descartable. No modifica demo, catálogo comercial, precios reales ni conexiones.

## Aceptación independiente

| Escenario | SQLite | PostgreSQL |
|---|---|---|
| Disponibilidad toma80min del catálogo para dos servicios aunque caller mande1min; slot fuera de capacidad no ofertado, servicio simple sí; ID ajeno/producto físico rechazados sin exponer nombre | PASS | PASS |
| Reserva pública suma116+58=174 y80min, guarda dos snapshots con IVA incluido16%, ignora estimaciones del cliente y bloquea toda la visita | PASS | PASS |
| POS rechaza servicio faltante, servicio extra, cantidad2 y ticket solo productos con409, sin venta, comisión, stock ni Kardex | PASS | PASS |
| Cambiar nombre/precio/IVA actuales no cambia snapshots; carrito puede agregar pomada20, total194 e IVA incluido24; seis reintentos dos procesos registran una venta | PASS | PASS |
| Reserva antigua con servicio identificado conserva nombre/precio guardados y usa tasa actual como compatibilidad documentada; cita sin identidad suficiente falla409 para revisión | PASS | PASS |

**10/10 comprobaciones independientes aprobadas**, cinco por motor.

La respuesta pública no incluye clienteId; las pruebas utilizan únicamente el fixture privado para enlazar el POS del propietario. No se añadió exposición de CRM para facilitar el test.

## Regresión de POS y caja

Se corrigieron exclusivamente dos fixtures ambiguos de `test_pos_integrity.js` y `test_cash_integrity.js`: antes creaban cita sin servicio ni nombre/precio y luego vendían solo un producto físico. Ahora la cita identifica el servicio real y su snapshot, y el ticket incluye ese servicio además del mismo producto con la misma cantidad. Se conservan todas las assertions de venta única, visita/CRM, devolución y stock; no se cambió comportamiento de producto para forzar PASS.

- POS:17/17 PASS SQLite y17/17 PostgreSQL.
- Caja:21/21 PASS SQLite y21/21 PostgreSQL.
- Total de este bloque con regresión:86 comprobaciones aprobadas entre ambos motores.

Los mensajes de error interno de pruebas de rollback corresponden a fallos deliberados inyectados y esperados, no a incidente de demo.

## Límite de migración por proveedor descubierto en la demo del coordinador

El coordinador informó que su adaptación de migración PostgreSQL a una copia SQLite dejó columnas TIMESTAMP(3), que Prisma SQLite no decodifica como DateTime. Sus pruebas sobre dbpush no detectan errores de adaptador manual. Se corrigió `prepare_product_demo.py` para convertir TIMESTAMP(3) a DATETIME y reparó solo tablas del fixture conservando cantidades de filas. La base demo/API originales no se modificaron.

Este reporte no certifica por inferencia ese arreglo: se requiere leer campos DateTime mediante API del fixture adaptado, crear/guardar/confirmar conteo y recuperar desde navegador. El coordinador mantiene esa verificación. Las migraciones PostgreSQL originales son válidas en su motor; no deben copiarse a SQLite literalmente para producción.
