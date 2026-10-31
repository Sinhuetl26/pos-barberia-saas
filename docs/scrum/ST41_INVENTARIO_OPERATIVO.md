# ST-41 · Inventario operativo y conteos confiables

Fecha: 2026-10-08. Estado: Pendiente; definición incorporada por autorización de Sinhue, sin implementación ni aceptación técnica. Sprint 4 provisional, sujeto a planificación; no se altera el trabajo en curso ni se promete fecha. Prioridad P1, talla L.

## Historia de usuario

Como dueño o gerente, quiero registrar entradas y conteos y conciliar ajustes con su evidencia, para confiar en mis existencias y evitar cambios de stock sin explicación.

## Dependencias

ST-02, ST-04, ST-05, ST-06.

## Criterios de aceptación

- [ ] Capturar inventario inicial y recibir compras por producto/sucursal con proveedor opcional, cantidad, costo, referencia, fecha y responsable; guardar stock y Kardex en una transacción.
- [ ] Reintentar entradas, mermas, uso interno y ajustes no duplica movimientos; rechazar cantidades inválidas, stock negativo y movimientos de servicios; definir SKU único por negocio y alcance de catálogo.
- [ ] Crear conteo físico con saldo y fecha de referencia, registrar cantidades contadas y mostrar diferencias; unidades no contadas no se convierten en cero.
- [ ] Conciliar ventas/entradas concurrentes durante el conteo; confirmar ajuste exige permiso y motivo, preserva historia y aplica la diferencia una sola vez.
- [ ] Separar edición de catálogo de movimiento de stock; mostrar entradas, salidas, merma, uso interno y ajustes con usuario, motivo y saldos anteriores/nuevos.
- [ ] Dueño y gerente operan solo sucursales autorizadas; negocio/sucursal ajenos no pueden leerse o alterarse; barbero no modifica existencias.
- [ ] Probar conteo parcial, inventario inicial, compras, devoluciones físicas aptas/no aptas, pérdida de respuesta, dos usuarios y fallos con rollback en SQLite y PostgreSQL; conciliar stock con Kardex.

## Entrega y prueba

Requerida: dataset conciliado, regresión de movimientos/conteos por motor y recorrido desde celular/PC. Definición docs/scrum/ST41_INVENTARIO_OPERATIVO.md; aún no implementada.

Refinar como 41A entradas y trazabilidad, 41B conteos y ajustes concurrentes. Sprint 4 provisional; priorizar en planificación tras revisión Sprint 2 antes de anunciar conteos certificados.

## Límites

Los movimientos básicos ya tienen rutas y pantalla; esta historia fortalece validación, trazabilidad, reintentos y conteos. Las existencias actuales son piezas enteras: líquidos y recetas corresponden a ST-42. Importación masiva mantiene ST-26; transferencias avanzadas deben refinarse con el modelo de sucursales. No se crea stock desde una recomendación analítica.

ST-30 consumirá los datos conciliados para recomendaciones. Margen histórico necesita además costo aplicado en cada venta/consumo; no se promete rentabilidad exacta con costo actual mutable. Investigación y propuesta: docs/scrum/PROPUESTA_INTELIGENCIA_INVENTARIO.md.
