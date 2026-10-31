# ST-06 · Caja, devoluciones y comisiones trazables

Fecha: 2026-10-07. Estado: **En revisión**. Sprint 2. Alcance autorizado por Sinhue: continuar ST-06 con cobro móvil del barbero, aviso al dueño y conciliación de efectivo. Las pruebas locales no cierran el lanzamiento comercial.

## Criterios y entrega

- [x] Apertura, movimientos y cierre protegidos por transacciones y claves persistentes. Conteo ciego: el servidor no entrega el efectivo esperado ni permite imprimirlo antes del cierre. Tarjeta y SPEI se separan del efectivo físico; una diferencia de un centavo se conserva.
- [x] Devolución parcial y cancelación del saldo restante requieren dueño/gerente, motivo y sucursal autorizada. Se preservan venta y comisiones originales; stock, Kardex, ajustes de comisión, cliente, efectivo y registro de devolución cambian juntos o se revierten juntos.
- [x] Porcentajes y base de comisión se guardan con la venta. Cambiar el catálogo o la comisión del barbero después no altera una devolución histórica. Los importes se calculan en centavos con redondeo acumulativo por cantidad.
- [x] Barbero cobra desde el celular con cuenta propia. La venta conserva sucursal, profesional que atendió y usuario que cobró; su efectivo pendiente aparece arriba de su perfil. No accede a saldos ajenos ni recibe permisos de devolución o liquidación.
- [x] Una venta confirmada crea un aviso interno persistente para el dueño, con servicio/productos, profesional, importe, medio de pago y cobrador. Consulta cada cinco segundos mientras el panel está visible; reintentos no crean avisos duplicados. No es envío de WhatsApp ni notificación del sistema operativo.
- [x] Recibir efectivo del barbero mueve su custodia a caja, sin crear otra venta ni otra comisión. El receptor autorizado verifica el importe físico y confirma; se registran cobrador, receptor, sucursal y turno.

## Reglas operativas

La venta no exige tener un turno abierto. El efectivo cobrado por un barbero siempre queda a su cargo hasta que un receptor autorizado lo registra en caja. Dueño/gerente/cajero cobran directamente a caja si hay turno abierto; sin turno queda a cargo del cobrador. Tarjeta y SPEI nunca incrementan su saldo de efectivo.

El efectivo esperado del cierre es fondo inicial más movimientos físicos de ese turno: ventas cobradas en caja, entregas recibidas, entradas, devoluciones pagadas desde caja y retiros/gastos. Los cobros que conserva el barbero se muestran en ventas, pero no en el efectivo físico esperado. Una entrega posterior al cierre entra al nuevo turno; el cierre anterior queda congelado. Se conserva respuesta de cierre para un reintento idéntico.

El total original de la venta permanece intacto. El importe devuelto y las partidas devueltas permiten mostrar ingreso neto y cantidades retenidas en historial y reportes. Los reportes comerciales restan devoluciones de la venta original; el movimiento de caja pertenece al turno en que se devuelve el dinero. No son estados contables ni declaraciones fiscales.

La comisión usa la base histórica después de descuentos y sin impuesto incluido ni propina. Cada partida redondea a centavos; la devolución aplica diferencia entre proporciones acumuladas, de modo que la última unidad absorbe los centavos restantes. Una devolución de una comisión ya pagada crea un ajuste negativo pendiente: no reescribe el recibo pagado. La siguiente liquidación debe incluir esos ajustes; un saldo negativo se conserva para compensar después, nunca se borra convirtiéndolo en cero.

Una devolución de producto repone únicamente las unidades devueltas. Una propina restante puede devolverse por separado. Partidas gratuitas o ventas con descuento del 100% se pueden devolver sin cancelar prematuramente las unidades pendientes. Una cita previamente atendida conserva la visita registrada del cliente.

Las devoluciones reparten el importe entre los medios originales según su saldo, conservando centavos. Para efectivo se elige el cobrador original o una caja abierta con fondos suficientes. Tarjeta/SPEI requieren devolver el dinero por el proveedor/banco y registrar aquí el movimiento; esta actividad no ejecuta un reembolso bancario.

## Pruebas

| Verificación | Resultado | Evidencia |
| --- | --- | --- |
| ST-06, SQLite aislado con dos procesos API | 21/21 | [Resultados](../ST06_RESULTADOS_SQLITE.json) |
| Regresión completa SQLite | 10/10 suites | Ejecución final de `run_all_tests.js` |
| ST-06, PostgreSQL 16 con dos procesos API | 21/21 | [Resultados por motor](../ST06_RESULTADOS_POSTGRES.json) |
| Regresión completa PostgreSQL | 10/10 suites | Ejecución final de `test_postgres.js` |
| Migraciones y recuperación PostgreSQL | 13/13, siete migraciones | [Resultado actual](POSTGRES_RESULTADOS_ACTUALES.json) |
| API y web: TypeScript; compilación web | Correctos | Advertencia de tamaño del paquete conservada en ST-31 |
| Navegador: cobro móvil, aviso, entrega, devolución con respuesta perdida y cierre ciego | Correcto en demo ficticia | [Registro](ST06_BROWSER_RESULTADOS.json) y capturas |

Los casos automatizados incluyen ocho aperturas/cobros/entregas/devoluciones simultáneos entre dos procesos, cierre contra venta concurrente, última unidad devuelta simultáneamente, permisos y negocios ajenos, pago duplicado, comisión previamente pagada, saldo negativo, catálogo histórico, propina restante, unidades gratuitas y visita de CRM. Un fallo tardío provocado en la base revierte stock, comisión, caja, cliente e intención; la misma clave puede reintentarse una vez con éxito.

## Recorrido en navegador

Demostración independiente con dos sesiones: dueño y barbero. Vista móvil de 390 × 844 y panel del dueño en escritorio. Se registró el ticket A-000002: dos ceras y un corte por $1,060, con $660 en efectivo y $400 en tarjeta. El dueño recibió el aviso sin recargar. Se recibió una entrega de $200; el saldo del barbero bajó a $460 sin cambiar venta ni comisión.

Se devolvió una cera por $390. La prueba permitió confirmar la transacción y cortó únicamente su respuesta. La recarga conservó la intención pendiente y Recuperar resultado devolvió el mismo registro: una sola devolución, stock 8 → 6 → 7 y comisión $218 − $39 = $179. Reparto de devolución: $242.83 de efectivo y $147.17 de tarjeta registrada manualmente. Efectivo pendiente del barbero: $217.17, actualizado sin recargar. Se retiró la interrupción simulada.

El turno cerró con $1,200 físicos: fondo de $1,000 más entrega de $200. Las ventas netas quedaron en $670: $417.17 efectivo y $252.83 tarjeta. La diferencia del corte fue $0.00. Antes de confirmar no se mostró el esperado. El comprobante guardado conserva ese desglose.

- [Conteo ciego móvil](../screenshots/ST06_arqueo_movil.png)
- [Ticket cobrado por barbero](../screenshots/ST06_ticket_barbero_movil.png)
- [Aviso y entrega en panel del dueño](../screenshots/ST06_aviso_entrega_dueno.png)
- [Custodia propia del barbero](../screenshots/ST06_custodia_barbero_movil.png)
- [Devolución parcial móvil con importe previo](../screenshots/ST06_devolucion_parcial_movil.png)
- [Recuperación después de recargar](../screenshots/ST06_recuperar_devolucion_movil.png)
- [Comprobante del cierre](../screenshots/ST06_comprobante_cierre.png)

## Datos, revisión y límites

Migración aditiva `20261007_cash_traceability`, con historial de operaciones, custodia, devoluciones y ajustes de comisión. La base de trabajo se conservó por hash en ambas ejecuciones. La migración operativa requiere respaldo, ventana y conciliación; no se aplicó a los datos reales. Ventas o turnos antiguos sin información suficiente se detienen para revisión explícita en lugar de inventar movimientos históricos. PostgreSQL de ensayo quedó detenido y la demo independiente se renovó con la versión final.

La intención financiera se conserva en almacenamiento local del navegador antes de enviar y se recupera con la misma clave, incluso después de recargar. No constituye operación sin conexión; borrar almacenamiento o perder acceso a la cuenta requiere conciliación. Los bloqueos de sucursal y producto conservan el orden de ST-05.

Se aplicaron React Best Practices, Playwright y Notion para implementación, comprobación y registro. No se añadieron proveedores o dependencias. Las pruebas no acreditan liquidación bancaria, CFDI, impresión física, apertura de cajón o preparación de toda la aplicación para producción. Hardware corresponde a ST-09; pagos/fiscalidad a sus historias; carga y paquete web a ST-19/ST-31. El workflow remoto conserva los artefactos nuevos; no se ejecutó CI remoto ni se desplegó.

Siguiente paso: revisión de Sinhue del flujo barbero → receptor → cierre, permisos de devolución y reglas de comisión; después acordar la migración operativa. La validación comercial y externa no se sustituye por estas pruebas locales.
