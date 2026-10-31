# Cobro desde celular y supervisión del dueño

Requisito solicitado por Sinhue el 5 de octubre de 2026. Implementación prevista en ST-06; prueba del recorrido completo en ST-09. Estado: pendiente. ST-03 continúa para una sesión posterior.

El dueño supervisa desde laptop o PC; los barberos utilizan su celular y cuentas propias del mismo negocio. La laptop es el puesto de administración: las ventas no deben depender de que permanezca encendida.

1. El barbero termina el servicio y abre su cita o una venta sin cita.
2. Agrega servicios o productos y registra el pago realmente recibido. Un cliente que todavía debe pagar en mostrador sigue pendiente de cobro.
3. Confirmar el cobro crea una sola venta, conserva quién hizo el servicio y quién cobró, y calcula la comisión.
4. El dueño recibe aviso dentro de su panel sin recargar: barbero, servicio, importe, método de pago y cobrador. Los avisos no leídos se conservan si el dueño está desconectado; reintentar no duplica venta ni aviso. Esta entrega no incluye envío automático por WhatsApp.
5. El efectivo recibido por el barbero queda bajo su custodia hasta entregar a caja. Se registra quién lo recibe y se concilia al cierre. La entrega no se cuenta como otra venta ni genera otra comisión.

Dueño y barbero son los roles principales; recepción y cobros es opcional. El detalle de caja compartida y entregas se revisará al implementar ST-06. ST-02 ya permite registrar ventas propias al barbero, pero no implementa este flujo completo de avisos/custodia.

Aceptación añadida al backlog local de ST-06 y ST-09. ST-09 se actualizó y verificó en Notion. El guardado de ST-06 en Notion falló con «Unknown tool»; la lectura posterior confirmó que la página mantiene sus criterios anteriores. Pendiente sincronizar este alcance con la página ST-06 al retomar.
