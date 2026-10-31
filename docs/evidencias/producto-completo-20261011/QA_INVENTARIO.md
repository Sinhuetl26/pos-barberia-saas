# QA independiente — PC-01 / PC-02

11 de octubre de 2026. Revisión del agente de calidad, separada de implementación. Estado: integridad API PC-01 verificada; PC-02 API histórica verificada y aceptación UI pendiente.

## Aislamiento y método

`scripts/qa_product_inventory.cjs` crea su base temporal propia y dos API locales en puertos efímeros. No usa `.tools/closure-demo.json`, `dev.db`, datos de presentación ni proveedores externos. PostgreSQL requiere URL `systech_test_*` y cliente de pruebas explícito. Los triggers de fallo solo se instalan en ese fixture y se retiran al finalizar; el fixture se elimina mediante el guard existente.

La primera ejecución sin escalación no pudo conectar al puerto loopback (EACCES). La ejecución aislada escalada fue aprobada automáticamente. No es un fallo de producto.

## Evidencia de partida

- `node scripts/test_inventory_permissions_csv.js`: **6/6 PASS SQLite**, API compilada de partida. Catálogo/Kardex por negocio y sucursal, roles restringidos, compras/proveedores y CSV conciliado con devolución parcial.
- Prueba independiente `QA_INVENTORY_ONLY=Injected node scripts/qa_product_inventory.cjs`: **FAIL reproducible**, creación de producto con stock y fallo artificial al insertar Kardex retorna HTTP500, pero número de productos cambia de1 a2. Demuestra alta no atómica; P0 de integridad. Avisado al implementador para corrección y repetición.
- La lectura aislada de `inventario.routes.ts` parecía carecer de restricciones de sucursal; el implementador confirmó defensa transversal por middleware/modelScope/prisma.$use. No se declaró ese punto como regresión: la prueba existente pasó. Se repetirá después de compilar cambios.

## Cobertura de aceptación nueva

1. Seis altas simultáneas en dos procesos y posterior reintento: un producto, un movimiento inicial y conflicto ante contenido distinto.
2. Pérdida de respuesta manual: recuperar mismo ID de Kardex sin nuevo saldo ni movimiento; payload distinto conflict409.
3. Otra barbería conoce key/producto: no obtiene respuesta anterior ni cambia saldo.
4. Ajuste absoluto sin saldo de referencia o con referencia vencida:409 sin escritura.
5. Ocho intenciones independientes, dos procesos: saldo exacto y cadena de saldos anterior/nuevo conciliada.
6. PUT de catálogo no modifica stock fuera del Kardex.
7. Snapshot de costo/referencia/responsable histórico conserva datos al editar costo; merma reduce saldo sin crear venta.
8. Trigger de fallo de Kardex SQLite/PostgreSQL: alta, saldo, historial e intención se revierten; quitar fallo y repetir misma intención permite éxito.
9. Revocar la sucursal del gerente impide recuperar respuesta almacenada de la sucursal anterior.

Adicional: reejecutar las suites existentes de permisos/CSV y recepción de órdenes, que incluyen cantidad inválida/servicios, carrera compra-venta, recepción repetida y cancelación simultánea.

## Resultados después de integración y build final

| Suite | SQLite | PostgreSQL |
|---|---|---|
| QA independiente `qa_product_inventory.cjs` | 10/10 PASS | 10/10 PASS |
| Permisos/CSV `test_inventory_permissions_csv.js` | 6/6 PASS | 6/6 PASS |
| Compras/concurrencia `test_inventory_receipt_integrity.js` | 6/6 PASS | 6/6 PASS |

44 comprobaciones aprobadas entre ambos motores. La suite independiente se repitió sobre el build final anunciado por el implementador. El P0 de alta no atómica reproducido en partida ya no aparece: los triggers devuelven500 y revierten producto, saldo, movimiento, intención y auditoría; quitando el fallo, la misma intención se recupera con éxito. No se sustituyó evidencia con revisión de código.

PostgreSQL se ejecutó con `postgres_test_runtime.start()` y cliente generado separado `.tools/prisma-postgres/client`, sobre esquemas temporales `st04_*` dentro de la DB local de pruebas guardada. No se imprimieron credenciales. Todos los fixtures limpiados al concluir.

## Pendientes y límites

Regresión posterior a PC-04 Decimal: `qa_product_inventory.cjs`10/10 PASS SQLite y10/10 PASS PostgreSQL. Las comparaciones de saldo/Kardex normalizan explícitamente los Decimal a Number para estos valores de fixture. Ningún criterio de transacción/replay/concurrencia se eliminó. Suites legacy6+6 todavía corresponden al motor anterior mientras se adapte su representación; no se asume automáticamente la aprobación sobre Decimal.

- Cualquier cambio posterior de integridad/schema/contrato requiere repetir los escenarios afectados.
- Verificación de formularios nuevos y recuperación desde navegador corresponde al coordinador/controlador único; este reporte verifica API y persistencia.
- PC-02 requiere UI que capture metadatos y explique efecto antes de confirmar. API histórica por sí sola no lo completa.

