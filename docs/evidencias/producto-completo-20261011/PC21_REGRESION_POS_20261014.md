# PC-21 — regresión POS, 14 de octubre de 2026

## Resultado independiente

`node scripts/run_all_tests.js pos-integrity`: **17/17 comprobaciones, 1/1 suite aprobada**. El runner compiló la API actual y ejecutó pruebas con SQLite ficticia desechable; no contactó proveedores externos. El hash de la base de trabajo no cambió.

Se corrigió exclusivamente el test `scripts/test_pos_integrity.js`: stockActual y stockAnterior/stockNuevo ahora se comparan como números porque Prisma devuelve Decimal. Los valores esperados, cantidades, condiciones financieras y número de efectos permanecen iguales. También se ajustó el predicado que encuentra el primer movimiento de Kardex de stockAnterior 3 para no comparar un objeto Decimal por identidad con el entero.

## Cobertura aprobada

- Dieciséis envíos duplicados sobre dos procesos API: una venta, una intención, comisión, visita, alerta y Kardex.
- Claves exactas, conflicto por payload cambiado y aislamiento entre negocios.
- Recuperación de venta aunque catálogo esté desactivado y sin exponer comisión a cajero o resultado a gerente de otra sucursal.
- Última unidad vendida una sola vez; ocho ventas distintas conservan stock, cadena Kardex y folios consecutivos únicos.
- Inventario compartido entre sucursales con orden de carrito invertido; entrada de inventario concurrente con venta.
- Folios heredados con huecos; centavos exactos de pago mixto, IVA incluido configurado, descuento, propina y comisión cero.
- Rollback por artículo posterior agotado y por fallo tardío deliberado de base; reintento de esa intención se aplica una sola vez.
- Dos claves para una cita no duplican venta, visita ni comisión.
- Importes inválidos, líneas duplicadas y encabezados inconsistentes rechazados.
- Intenciones pendientes conservadas al recargar, aisladas por negocio/usuario, sin liberar resultado incierto.

El log `Error interno POS: P2003` corresponde a la inyección deliberada de fallo tardío. Su prueba pasó porque no quedó ningún efecto parcial y el reintento posterior funcionó una vez.

## Límites

No se cambió producto. Esta ejecución no sustituye el recorrido visual completo de PC-21 ni certifica preparación para producción. La corrida nueva PostgreSQL será coordinada por root para no competir por el puerto de QA. `ST05_RESULTADOS_sqlite.json` se regeneró por el runner existente, cuyo campo date todavía es el literal histórico 2026-10-07; la fecha de esta ejecución es la indicada en este reporte.
