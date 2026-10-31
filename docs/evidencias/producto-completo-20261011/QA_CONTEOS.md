# QA independiente PC-03 — conteos físicos

11 de octubre de 2026. Estado: API y persistencia verificadas en SQLite y PostgreSQL aislados; UI y recorrido móvil pendientes del controlador de navegador.

## Método y resultados

`scripts/qa_product_inventory_counts.cjs` inicia dos API temporales contra un fixture propio. No modifica dataset de presentación, precios actuales ni bases operativas. PostgreSQL usa cliente separado `.tools/prisma-postgres/client` y esquema temporal en DB `systech_test_*`. Fixtures limpiados al finalizar.

| Caso independiente | SQLite | PostgreSQL |
|---|---|---|
| Borrador parcial persiste; dos operadores sobre misma versión producen un éxito y conflicto409, refrescar y guardar conserva ambas líneas | PASS | PASS |
| Conteo vacío, fracción, negativo, booleano, cadena y línea duplicada rechazados sin cambios | PASS | PASS |
| Respuesta perdida al iniciar/guardar recupera el mismo borrador/versión; otro operador con versión vencida no sobrescribe | PASS | PASS |
| Venta mientras se cuenta invalida referencia; recontar y confirmar conserva venta y saldo nuevo | PASS | PASS |
| Entrada seguida de uso devuelve saldo al mismo valor, pero cambios de Kardex todavía exigen recontar | PASS | PASS |
| Seis confirmaciones simultáneas en dos procesos y reintento posterior generan un solo ajuste; nueva intención o edición sobre confirmado falla | PASS | PASS |
| Fallo artificial en Kardex del segundo artículo revierte primer ajuste, segundo ajuste, versión, estado, auditoría e intención; quitar fallo y repetir intención funciona | PASS | PASS |
| Negocio ajeno/barbero no modifica borrador; gerente no accede a otra sucursal y lista solo su alcance | PASS | PASS |

**16/16 comprobaciones aprobadas**, ocho por motor, después del build PC-03 anunciado por implementador. No se aprobó únicamente por build.

No contado permanece `null`; el caso parcial confirma solo un artículo, preserva saldo del segundo. Dos operadores no se mezclan silenciosamente: API exige `versionEsperada`, uno recibe409 y debe refrescar antes de aplicar su observación. La recuperación usa exactamente la misma intención y payload original.

El fallo multitem se inyecta con trigger en fixture: se elige segundo ID ordenado para garantizar que el primer cambio ya se intentó. Snapshot independiente contiene productos, movimientos, conteos, auditoría e intenciones. Accesos denegados pueden producir auditoría legítima de seguridad; la prueba de permisos exige datos operativos intactos sin interpretar ese evento de rechazo como escritura financiera.

## Límites

Regresión posterior a PC-04: comparaciones de saldo adaptadas a Prisma Decimal. Caso de cadena inválida ahora usa `bad`; la nueva validación admite cadena numérica como `2` por contrato compartido de cantidades, sin permitir fracción en piezas. SQLite8/8 PASS y PostgreSQL8/8 PASS.

- Falta comprobar formularios, mensajes de conflicto/recuento, recarga y operación en390px/escritorio desde navegador.
- No se certifica conteo físico real de una barbería ni medición de frascos/insumos: este bloque opera piezas.
- Modificar contratos/schema posteriores exige regresión pertinente.
- No se encontraron fallos de producto abiertos en los ocho escenarios cubiertos. Un primer fallo del test comparaba toda auditoría tras acceso denegado; se corrigió el test para admitir el evento legítimo de seguridad, sin tocar producto.
