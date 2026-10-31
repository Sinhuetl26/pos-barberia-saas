# PC-21 — recorrido integrado por API, 14 de octubre de 2026

`node scripts/qa_demo_end_to_end.cjs`: **11/11 comprobaciones aprobadas en SQLite desechable**, con la API compilada actual. Evidencia estructurada: `PC21_RECORRIDO_API_sqlite.json`.

## Secuencia completa verificada

1. Dueño crea por API catálogo de dos servicios, insumo y producto de reventa con costos explícitos; publica dos recetas versión 1 y abre caja con fondo 100.
2. Cliente reserva públicamente corte + barba: 150, 45 minutos, una sola cita/cliente al repetir. La respuesta pública no expone clienteId; la fixture recupera el identificador privado desde su DB para las comprobaciones autenticadas.
3. Barbero asignado confirma, inicia y completa la cita. Completar otra vez no agrega visita ni consumo: loción 500 → 493 ML, dos eventos históricos (5 y 2 ML).
4. Barbero cobra servicios 150 + pomada 80 + propina 10 = 240. Reintento recupera la misma venta. Pomada 10 → 9; insumo permanece 493; una visita; una comisión agregada 83 y una notificación registrada del cobro.
5. Efectivo permanece 240 en custodia del barbero. Dueño recibe los 240 una vez; repetir entrega conserva recibo y no cambia ventas/comisiones.
6. Dueño registra gasto operativo en efectivo 25. Reintento no agrega gasto ni movimiento.
7. Conteo declarado: fondo 100 + entrega 240 − gasto 25 = **315**. Vista previa mantiene caja abierta, cierre tiene diferencia cero y el reintento recupera el mismo corte cerrado.
8. Inteligencia del dueño concilia importes de líneas y costos históricos: ventas netas 230, propinas 10, comisiones 83, costo de reventa 20, costo de insumos 1.40, gasto operativo 25, compras 0, utilidad operativa estimada **100.60**, sin datos insuficientes en esta fixture completa. Ocupación completada 45 minutos y ranking con los tres artículos correctos.
9. Gerente asignado accede a reportes; barbero no; negocio ajeno y sucursal no asignada no pueden obtenerlos. Se verifica ledger final, movimientos de consumo −7 y hash intacto de la base de trabajo.
10. Se detiene y reinicia únicamente el proceso API de la fixture. Venta recuperable, corte cerrado, finanzas del reporte y custodia cero permanecen iguales; no aparece venta duplicada.

## Límites de evidencia

Este es un recorrido completo de **API → transacciones → base → respuesta**, sin navegador y sin contacto con Stripe, WhatsApp, correo o facturación. No usó ni cambió datos de la demo visible o del negocio.

La reserva pública se programa para mañana para respetar el requisito de horario futuro. El avance de estados se acelera mediante las transiciones autenticadas que la API permite; no cambia fechas persistidas ni reloj del servidor. El informe cubre hoy y mañana y mantiene separadas fecha de cobro/consumo y horario de agenda.

Esta evidencia no reemplaza capturas móvil/escritorio, prueba de impresora física ni aprobación del recorrido visual PC-21. PostgreSQL queda a la coordinación de root mediante el runner aislado; el script soporta URL guardada y cliente Prisma separado conjuntamente.
