# Cobrar: diseño completo del recorrido

Fecha: 22/oct/2026. Vinculado al [diseño maestro](DISENO_MAESTRO_SYSTECH_2026-10-22.md). Composición aprobada por Sinhue e [implementada con evidencia](../../output/cobrar-implementacion-20261022/REVISION.md): catálogo/ticket, ajustes con aplicar/cancelar, pago y confirmación. UI-07 sigue en curso por los estados y roles restantes.

## Referencias y objetivo

Las dos propuestas iniciales se conservan en [los archivos de referencia](../../output/diseno-maestro-20261022/LEEME.md). La dirección es catálogo blanco, ticket carbón y acento naranja. La referencia móvil se simplificará: cliente, profesional y ajustes quedan dentro de «Ver detalle»; total y «Cobrar» permanecen accesibles.

Objetivo: preparar una venta en una sola superficie, revisar su pago en un único paso y reconocer sin duda cuándo ya quedó registrada. Los datos y validaciones del sistema siguen siendo la autoridad.

## 1. Catálogo y ticket

**Escritorio:** catálogo ocupa aproximadamente dos tercios; ticket, el tercio restante. Cabecera breve «Cobrar», buscador y pestañas Servicios/Productos. Filas con foto pequeña, nombre, duración cuando corresponda, precio y botón de añadir. Sin fotografías enormes que obliguen a desplazarse para encontrar tres servicios.

Ticket: cliente y profesional, artículos con cantidad/eliminar, acceso «Descuento y propina», total y botón «Cobrar $350». El botón prepara el pago; todavía no registra nada. Historial y operaciones secundarias viven en «Más».

**Celular:** catálogo en una columna. Resumen fijo con cantidad de artículos, total y «Cobrar». «Ver ticket» abre la lista editable; «Ver detalle» expande cliente/profesional/ajustes. No mantener simultáneamente catálogo, formulario de cliente y ticket completo en una pantalla pequeña. El teclado no tapa búsqueda ni la acción de guardar.

Ticket vacío: «Elige un servicio o producto»; pago deshabilitado con motivo legible. Búsqueda vacía: «Sin resultados» y «Limpiar búsqueda». Foto ausente: marcador discreto; no impedir cobrar.

Datos de ejemplo de la demo: Corte clásico $200 / 30 min; Corte y barba $350 / 60 min; Degradado $250 / 45 min. Son referencias existentes, no un cambio de precios.

## 2. Cliente y profesional

Cliente: Público general como opción actual y selector para buscar/asignar cliente. Alta rápida solo con campos y permisos realmente soportados. No inventar cuenta obligatoria para una venta de mostrador.

Profesional: nombre visible y selector según permisos. Al llegar desde una cita, conservar su cliente, profesional y servicios; mostrar vínculo breve a la cita. No duplicar el ticket si la cita ya está cobrada. Al descartar, distinguir volver a la cita de cancelarla.

## 3. Descuento y propina

Abrir una sección de ajustes conservando el resumen de importes. Descuento en **pesos**, no un porcentaje nuevo. Motivo visible cuando la política lo requiera. Mostrar subtotal, descuento, propina y total solo cuando haya ajustes; no llenar el ticket de ceros.

Propina: Sin propina / 10 % / 15 % / 20 %, con importe calculado junto a la selección. La regla actual calcula sobre el subtotal antes del descuento. Cambiar esa base es otra decisión funcional y no se hará silenciosamente al rediseñar.

Ejemplo comprobable: subtotal $350, descuento $35, propina 10 % = $35, total $350. Sin propina, ese descuento produce $315.

Si excede la política: mostrar motivo y «Solicitar autorización» según soporte existente. Estados: pendiente, aprobada, rechazada, vencida y utilizada. No habilitar confirmar con aprobación vencida ni permitir que la misma cuenta se autoautorice indebidamente. Cambiar los datos que invalidan la solicitud obliga a volver a validar. Recuperar una solicitud pendiente no crea otra automáticamente.

Los campos explican el error junto al dato. El importe y motivo válidos se conservan al corregir. Guardar vuelve al ticket, descartar restaura ajustes anteriores.

## 4. Revisar y registrar pago

Escritorio: diálogo centrado de ancho contenido, sin otro diálogo encima. Móvil: vista completa con total y confirmación accesibles. Título «Cobrar», total grande pero proporcionado, métodos con texto. Un acceso «Volver al ticket» conserva todo antes del envío.

- **Efectivo:** «Recibido», sugerencias válidas y cambio visible. Con total $350 y recibido $500, cambio $150. Recibido insuficiente bloquea confirmar y muestra cuánto falta.
- **Tarjeta:** importe y método visibles. Este paso registra el método; no simula una autorización de terminal ni promete procesar una tarjeta.
- **Transferencia:** nombre comprensible; puede acompañarse de SPEI como aclaración. Registrar este método no significa que el sistema haya verificado el depósito bancario. El copy no afirmará «Transferencia verificada» sin integración real.
- **Dividido:** conservar la combinación soportada hoy, efectivo + tarjeta. Ambos importes deben sumar el total en centavos. Ejemplo $200 + $150 = $350. No ofrecer transferencia en el reparto sin soporte.

Botón final «Registrar cobro $350». Durante envío: «Registrando…», campos y envío bloqueados; navegación/cierre no deben provocar otra venta. El estado visible no depende solo del color. No borrar el ticket hasta conocer el resultado válido del servidor.

## 5. Resultado e impresión

Éxito únicamente con venta confirmada: icono, «Cobro registrado», total, folio real y método. Si existe información suficiente, mostrar cambio para efectivo. «Nueva venta» es la acción principal; «Ver ticket» la secundaria. Próxima visita cuando el flujo actual la permita.

El comprobante vive en un detalle secundario: negocio/sucursal, fecha, folio, artículos, descuentos/propina/impuesto cuando proceda, total y método; profesional y nombre de quien cobró. No exponer correo de una cuenta como sustituto del nombre.

Imprimir abre opciones 58 mm / 80 mm. Compartir solo cuando haya destino válido y acción explícita del usuario. No enviar mensajes durante estas pruebas. El fallo de impresión dice «La venta está registrada. Puedes reimprimir el ticket» y conserva el folio. Cerrar o volver a imprimir jamás registra otro cobro.

La vista digital no acredita impresión física: sigue pendiente comprobar con una impresora real. La recuperación del ticket debe separarse de la recuperación del cobro si falla la consulta del comprobante después de registrar la venta.

## 6. Errores y recuperación

- **Sin conexión antes de enviar:** conservar el borrador y mostrar que no se ha registrado. No prometer cobro offline.
- **Respuesta incierta después de enviar:** «Estamos comprobando el cobro». Recuperar el intento existente con su identificador; no ofrecer una venta nueva ni reenvío sin protección frente a duplicados.
- **Venta ya existente:** mostrar ese resultado. Nunca registrar otra por volver a pulsar o recargar.
- **Cambio de precio, stock o disponibilidad:** mostrar el conflicto del servidor, conservar contexto y pedir revisión antes de confirmar otro total. No aceptar silenciosamente importes distintos.
- **Sesión o permisos:** explicar bloqueo y recuperación segura. No continuar con permisos de otra cuenta o sucursal.
- **Servicio de comprobantes indisponible:** conservar la venta confirmada y permitir recuperar su ticket desde historial; no mostrar «Cobro fallido» si lo que falló fue el comprobante.

## 7. Historial y devolución

Desde «Más → Ventas», historial y detalle conservan filtros al volver. Reimprimir es una acción de lectura. Devolver exige permiso y revisión: venta original, cantidades, importe de propina a devolver, método y origen del efectivo cuando corresponda, motivo y confirmación. No agrupar «Devolver» junto a «Nueva venta» en la pantalla de éxito.

Los estados parcial, total, rechazo, operación pendiente y recuperación requieren diseño propio. Una devolución confirmada actualiza sus registros; no se modifica una venta histórica para que parezca que nunca ocurrió.

## 8. Criterios de revisión e implementación

La propuesta visual siguiente debe enseñar: escritorio con ticket, móvil con resumen compacto, ajustes abiertos, efectivo con cambio, dividido, éxito y recuperación incierta. Una imagen única del estado feliz no da por definido todo el recorrido.

Antes de darlo por verificado, comprobar en datos ficticios aislados: añadir/retirar/cantidad; cita a ticket; cambios de cliente/profesional; descuento permitido y autorización; propina y redondeo; efectivo insuficiente/exacto/con cambio; tarjeta/transferencia; dividido incorrecto/correcto; doble clic; pérdida de respuesta; recarga; folio y persistencia; impresión fallida; devoluciones; límites por rol y sucursal en API. Reutilizar pruebas pertinentes existentes y ampliar solo huecos reales.

Accesibilidad: recorrido por teclado, foco en apertura/cierre, avisos anunciados, controles de al menos 44 px y texto legible. Capturas escritorio/móvil, reflujo a 320 px y zoom 200 %. Guardar evidencia junto al estado del bloque; no efectuar nuevas ventas en el volumen activo para producir una captura.

## Base inspeccionada y límites de esta entrega

Fuente: `apps/web/src/views/PosView.tsx` y `apps/web/src/components/DiscountApprovalRequest.tsx`. Revisados descuentos en pesos, porcentajes de propina, cálculo del total, pago, recuperación y comprobante. La especificación no certifica ejecución end-to-end de esas funciones hoy.

La entrega inicial solo documentó el diseño; después se produjeron las vistas, Sinhue aprobó la composición y se implementó el recorrido enlazado arriba. No se registraron ventas durante esa implementación: la confirmación se revisó con el componente real y datos aislados. Faltan autorización pendiente/rechazada, recuperación incierta con la nueva apariencia y recorrido autenticado del barbero para cerrar UI-07.
