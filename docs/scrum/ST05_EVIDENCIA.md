# ST-05 · Venta, stock y folio consistentes bajo concurrencia

Fecha: 2026-10-07. Estado: **En revisión**. Sprint 2. Solicitud: continuar el plan existente y aplicar por etapas la actualización profesional autorizada por Sinhue. No implica cierre del lanzamiento comercial.

## Criterios y entrega

- [x] Dos envíos simultáneos de una intención crean una venta y un movimiento de stock, con clave aislada por negocio. Comprobado con 16 envíos y dos procesos API independientes: mismo identificador, un descuento de inventario, una comisión y una actualización de cliente.
- [x] Dos cajeros no venden la última unidad dos veces ni duplican folios. Se comprobaron ventas diferentes, stock compartido entre sucursales, carritos en orden inverso y una entrada manual concurrente. La cadena del Kardex concuerda con el saldo final.
- [x] Descuentos, impuesto configurado incluido en precio, propinas y pagos mixtos cuadran en centavos; una operación fallida revierte sus efectos. Rechazo de diferencias de un centavo y fallo tardío provocado en la base de datos, seguido de reintento correcto.

ST-05A: la web guarda la intención antes de enviar, bloquea nuevos cobros cuando el resultado es incierto y consulta el resultado al reintentar. Recargar la misma pestaña conserva la intención. Un error desconocido no prueba que la venta haya sido revertida.

ST-05B: intención, venta, inventario, Kardex, folio, comisión, cita y acumulados del cliente se confirman en una transacción. Se bloquean sucursal, cita y productos en orden consistente. Los folios consideran el máximo histórico visible, incluyendo huecos de importaciones. La misma clave con contenido distinto devuelve conflicto.

ST-05C: cálculo decimal y reparto de descuentos conservando cada centavo; fotografía de descuento, impuesto, tasa y comisión por partida. Una comisión de 0% se conserva. La comisión excluye propina e impuesto incluido. El cliente no decide el precio del catálogo. Pagos mixtos deben sumar exactamente el total.

ST-05D: permisos y aislamiento comprobados; recuperar un resultado sigue funcionando si el producto deja de estar activo. Cajero no recibe comisión y otra sucursal no puede recuperar una venta ajena. Avisos de stock se registran como internos; no se presentan como WhatsApp enviado.

## Pruebas

| Verificación | Resultado | Evidencia |
| --- | --- | --- |
| ST-05 en PostgreSQL 16, dos procesos API | 17/17 | `ST05_RESULTADOS_postgres.json` |
| ST-05 en SQLite aislado, dos procesos API | 17/17 | `ST05_RESULTADOS_sqlite.json` |
| Regresión completa PostgreSQL | 9/9 suites | Ejecución completa de `test_postgres.js` |
| Regresión completa SQLite | 9/9 suites | Ejecución completa de `run_all_tests.js` |
| Instalación, actualización, precisión, rollback y restauración PostgreSQL | 10/10 | `POSTGRES_RESULTADOS_ACTUALES.json`, seis migraciones |
| TypeScript API y web; compilación web | Correctas | Compilación local; advertencia de tamaño vinculada a ST-31 |
| Navegador: respuesta perdida, recarga y recuperación | Una venta y una unidad descontada | `ST05_BROWSER_RESULTADOS.json`, capturas |

El escenario de navegador utilizó exclusivamente el negocio ficticio del servidor demo 3101. Se registró una Cera Reuzel de $390, se permitió guardar la venta y después se cortó su respuesta. Ventas: 3 → 4; stock: 8 → 7. La recarga conservó el cobro pendiente y el reintento recuperó el ticket A-000002, sin nueva venta ni nuevo descuento. Otra consulta al mismo resultado mantuvo cuatro ventas. Se retiró la interrupción de red al terminar.

La revisión visual detectó el ticket fuera del área visible móvil: los diálogos de cobro y ticket ahora se montan fuera del contenedor animado, con altura limitada y desplazamiento interno. Botones de finalizar y nueva venta visibles a 390 × 844; cobro también comprobado a 1440 × 900, sin desbordamiento horizontal. Capturas: `../screenshots/ST05_cobro_pendiente_movil.png` y `../screenshots/ST05_ticket_recuperado_movil.png`. Emulación de navegador; dispositivos e impresoras físicos permanecen en ST-09.

## Datos, herramientas y límites

La migración `20261007_pos_integrity` es aditiva y se verificó en bases desechables y copia anonimizada. La base SQLite de trabajo se conservó por hash en ambas ejecuciones. No se aplicó esta migración a los datos operativos; hacerlo requiere respaldo, ventana y conciliación acordados. La demo usa una base independiente preparada con el esquema nuevo. PostgreSQL portátil de ensayo se detuvo. Ningún cargo, envío externo, alta de cuenta, despliegue o contratación realizado.

Se aplicaron Find Skills, Plugin Management y React Best Practices. MCP usados: Context7 para contrastar transacciones/reintentos de Prisma; Playwright para navegación, fallo de respuesta y revisión visual; Notion para registrar el cierre. Se respetó Prisma 5.22 instalado y se comprobó su comportamiento, sin sustituir paquetes por una versión de documentación. Referencias: [transacciones Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) e [aislamiento PostgreSQL 16](https://www.postgresql.org/docs/16/transaction-iso.html).

- La tasa por producto es configurable y está incluida en su precio final. El valor inicial 0 significa sin desglose configurado; no acredita exención ni cumplimiento fiscal. CFDI, régimen y declaración siguen en sus historias. Ticket de venta no equivale a factura fiscal.
- Recuperación automática: misma pestaña y sesión de almacenamiento disponible. No constituye operación sin conexión ni recuperación automática tras borrar almacenamiento o cerrar la pestaña. Si el almacenamiento falla, no se inicia el cobro. Clientes API antiguos sin conservar clave no obtienen protección entre solicitudes nuevas; la web actual sí la conserva.
- Cancelaciones, devoluciones y conciliación de caja siguen en ST-06. El registro de efectivo/tarjeta/SPEI en POS no acredita cobro liquidado por un banco o terminal.
- Los folios históricos se consultan al registrar la venta; prueba de carga con grandes historiales pendiente en ST-19. Optimización del paquete web en ST-31.
- Workflow remoto preparado para publicar evidencia actual, sin push ni ejecución GitHub. Se conserva el resultado histórico de ST-04 del 6 de octubre; las siguientes ejecuciones escriben `POSTGRES_RESULTADOS_ACTUALES.json`.

Siguiente paso: revisar esta evidencia y continuar ST-06, caja, cancelaciones y devoluciones. Sinhue puede revisar el cobro y recuperación en la demo local sin utilizar datos reales.
