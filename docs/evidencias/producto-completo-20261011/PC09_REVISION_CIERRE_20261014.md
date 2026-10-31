# PC-09 — Servicios combinados: revisión de cierre

14 de octubre de 2026. Evidencia independiente de API y persistencia con bases ficticias desechables. No navegador ni modificaciones de producto, catálogo de demo, precios comerciales o servicios externos.

## Criterios originales

Una visita reúne varios servicios para el mismo profesional, suma precio/duración y reserva el intervalo completo. El catálogo posterior no debe modificar los snapshots históricos. Cancelar o reagendar mueve la visita como una unidad; POS recibe cada servicio reservado una vez. Las citas antiguas identificadas de un servicio mantienen compatibilidad, sin inventar el servicio de citas ambiguas.

## Comandos y resultados ejecutados

```powershell
node scripts/qa_product_combined_services.cjs
node scripts/qa_isolated_postgres.cjs qa_product_combined_services.cjs
```

- SQLite desechable: **6/6 pasan**, salida de proceso 0.
- PostgreSQL en clúster nuevo desechable: **6/6 pasan**, salida de proceso 0. Al finalizar el runner informó `Disposable PostgreSQL stopped; no preexisting process was stopped.` El clúster anterior y bases de trabajo permanecieron fuera del alcance.
- Única edición de esta entrega: agregar `qa_product_combined_services.cjs` a la lista explícita de scripts permitidos del runner PostgreSQL. La suite vigente había sido ampliada por root con el sexto caso y conversiones `Number` en comparaciones de importes Decimal; este subagente no cambió esa suite ni producto.

## Qué demuestran las seis comprobaciones

1. Disponibilidad pública obtiene duración total de IDs permitidos, independientemente del `duracion=1` enviado por cliente. Un servicio de negocio ajeno o un producto presentado como servicio se rechaza sin revelar su nombre privado.
2. Reserva combinada pública ignora precio/duración adulterados: conserva dos servicios, **116 + 58 = 174 MXN**, **30 + 50 = 80 minutos**, IVA original por línea. Un intento de reserva superpuesta se rechaza; no se fragmenta el intervalo.
3. Carrito de una cita debe incluir cada servicio exactamente una vez. Servicio faltante, extra no reservado, cantidad dos o sólo producto fallan sin venta, comisión, Kardex o descuento de stock parcial.
4. Renombrar servicios y cambiar sus precios de catálogo a 900 y su IVA a cero no modifica los importes/nombres/IVA reservados. POS acepta los dos servicios originales más una pomada de 20: cobro **194**, IVA **24**, stock pomada **10 → 9**. Seis reintentos concurrentes y otro posterior conservan una venta y el mismo identificador.
5. Cita antigua de un servicio identificado conserva su nombre y precio reservado, con la compatibilidad explícita de IVA que permite el contrato actual. Una cita antigua sin servicio identificable se rechaza como `BOOKING_SNAPSHOT_INVALID`; no se transforma arbitrariamente en una venta de productos.
6. Reprogramar una visita combinada mueve su única cita de 12:00 a 14:00, conserva `serviciosJson`, importe y 80 minutos y no agrega citas. Disponibilidad libera el intervalo anterior y ocupa el nuevo. Cancelar conserva el snapshot y único registro, marca `CANCELADA` y libera el nuevo intervalo.

Los importes/duraciones de esta fixture prueban el contrato de suma, sin cambiar precios de ninguna barbería existente. No se declara que reproduzcan literalmente el ejemplo ilustrativo 200/100 y 30/20 del plan.

## Evidencia visual a conciliar por root

Se localizaron `pc09-seleccion-combinada-mobile-20261014.jpg` y `pc09-visita-combinada-final-20261014.jpg` en esta carpeta. Este subagente no manejó ni inspeccionó el navegador; root adjunta su recorrido y descripción de selección/resumen/horario/cobro.

## Límites

La suite ejecuta API → transacción → base → respuesta. No acredita foco, layout móvil, impresora ni pagos externos. La prueba de costos históricos de insumos/artículos corresponde a la evidencia PC-04/PC-14; esta suite comprueba snapshots de nombres, precios, duración e IVA y evita duplicar servicios. No se cambió el estado de PC-09 ni se declaró aceptación visual independiente.
