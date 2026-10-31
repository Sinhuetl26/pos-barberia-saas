# ST-42 · Consumo de insumos por servicio y diferencias explicables

Fecha: 2026-10-08. Estado: Pendiente; definición incorporada por autorización de Sinhue, sin implementación ni aceptación técnica. Sprint 7 provisional, sujeto a planificación; no se altera el trabajo en curso ni se promete fecha. Prioridad P2, talla L.

## Historia de usuario

Como dueño, quiero conocer el consumo esperado por servicio y compararlo con conteos reales, para investigar diferencias de insumos sin confundirlas con robo.

## Dependencias

ST-41, ST-05, ST-06, ST-07.

## Criterios de aceptación

- [ ] Separar productos de reventa e insumos de operación; definir presentaciones y unidades compatibles (pieza/ml/g), precisión y tolerancias; migración no trunca stock existente.
- [ ] Configurar recetas versionadas por servicio y guardar consumo aplicado al servicio completado; un evento único evita descontar dos veces por cita y venta o reintento.
- [ ] Conteo inicial más entradas/devoluciones aptas/transferencias menos ventas/consumo/mermas/salidas produce saldo esperado; comparar con conteo físico y mostrar faltante/exceso y evidencia por sucursal.
- [ ] Frascos abiertos y mediciones aproximadas tienen método/tolerancia documentados; datos incompletos se muestran como insuficientes, no como fuga confirmada.
- [ ] Servicio cancelado antes de realizarse no consume; devolución monetaria de servicio realizado no repone insumos; correcciones requieren permiso, motivo y movimientos compensatorios.
- [ ] No atribuir robo o culpa a un empleado por diferencia compartida; edición de receta no reescribe consumo histórico; permisos y aislamiento probados.
- [ ] Probar conversiones/precisión, cambios de receta, doble registro, reintentos, devoluciones, conteos concurrentes y conciliación en SQLite/PostgreSQL; ensayo de conteo de insumos en barbería piloto.

## Entrega y prueba

Requerida: receta y saldos reproducibles, pruebas por motor y conteo piloto real. Definición docs/scrum/ST42_CONSUMO_INSUMOS.md; aún no implementada.

Refinar como 42A unidades/recetas/consumo y 42B conteos/diferencias. Sprint 7 provisional; depende de ST-41 y requiere medición real con Sinhue.

## Límites

El modelo actual no permite consumos fraccionarios: necesita diseño y migración ensayada. Una recomendación no prueba pérdida real. No incluye sensores, IA pagada, atribución automática a empleados ni ajustes de stock sin aprobación. Ejemplo ficticio: 500 ml iniciales − 60 servicios × 5 ml = 200 ml esperados; conteo 150 ml deja 50 ml por conciliar, sujeto a tolerancia y datos completos.

ST-30 consumirá los datos conciliados para recomendaciones. Margen histórico necesita además costo aplicado en cada venta/consumo; no se promete rentabilidad exacta con costo actual mutable. Investigación y propuesta: docs/scrum/PROPUESTA_INTELIGENCIA_INVENTARIO.md.
