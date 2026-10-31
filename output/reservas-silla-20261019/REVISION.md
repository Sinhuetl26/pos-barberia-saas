# Reservas Silla — revisión local, 19 de octubre de 2026

## Resultado

Implementada la identidad seleccionada para reservas: fotografía monocromática, títulos Anton, fondo claro y acentos azules. Tema opcional `silla`, llamado «Silla azul», guardado únicamente en la barbería ficticia `cierre-demo`. Se mantienen las paletas anteriores y los tres servicios existentes.

Se simplificaron textos, selección de servicios, pasos, resumen y datos opcionales. La selección de varios servicios permanece disponible. El resumen distingue precio de referencia y cotización del horario seleccionado. Las imágenes de servicios son ejemplos locales; no se presentan como trabajos reales de la barbería. Los servicios sin imagen reconocida permanecen como texto.

## Evidencia funcional

- Recorrido público real con API local Docker: servicio, profesional, disponibilidad, datos, aviso de privacidad y confirmación.
- Selección temporal Corte clásico + Degradado: 75 minutos y $450. Al quitar Degradado vuelve a 30 minutos y $200.
- Buscar primer horario libre mostró disponibilidad real de la demo.
- Enviar sin consentimiento fue bloqueado. Abrir y cerrar el aviso preservó los campos.
- Se creó una sola cita ficticia: folio `RES-62ADA0188AABF35B`, Corte clásico con Alex, 20/oct/2026 a las 11:30, 30 minutos, $200 MXN. Preferencia Clásico. No se generó venta, cargo ni mensaje externo.
- Tras recargar la página, «Mi reserva» recuperó por folio el servicio, profesional, fecha y total. Estado operativo mostrado: PENDIENTE. El enlace privado es necesario para cambiar o cancelar; no se incluye en este reporte.
- Tema persistido comprobado mediante lectura de la API pública.
- Ancho móvil: contenido 385 px / viewport 385 px. Escritorio: 1435 / 1435 px. Sin desbordamiento horizontal. Fuente local cargada. Consola consultada sin errores.

## Comprobaciones automatizadas

42 casos/comprobaciones aprobados:

- `test_service_illustration.cjs`: 10.
- `test_booking_gallery_ui.cjs`: 8.
- `test_public_booking_intent.js`: 11.
- `test_booking_client_recovery.js`: 8.
- `test_rebooking_selection.cjs`: 5.

TypeScript web sin errores; compilación API y compilación Vite correctas. Revisión independiente de contratos y CSS realizada; se corrigieron conflictos de especificidad en portada, botones y selector. No se repitió el cobro del POS.

## Capturas

- `portada-escritorio-final.jpg`: portada y servicios.
- `portada-movil-final.jpg`: portada móvil.
- `confirmacion-movil.jpg`: confirmación del único envío ficticio.
- `persistencia-folio-movil.jpg`: recuperación tras recargar.
- `servicios-flujo.jpg`, `profesional-final.jpg`, `horarios.jpg`: pasos intermedios revisados.

Las capturas iniciales y las de formulario previas a los últimos ajustes CSS se conservan como proceso, no como versión final. No se usa la captura de página completa con artefactos del encabezado fijo como evidencia visual final.

## Archivos y entorno

Cambios en `PublicBookingView.tsx`, `booking-silla.css`, `bookingAppearance.ts`, `booking-personalization.service.ts`, pruebas de personalización y nuevo helper `serviceIllustration.ts`, compartido con `PosView.tsx`. Sin nuevas dependencias.

Compilación: `.tools/reservas-silla-build-20261019`. Copiada a la vista local servida `.tools/product-ui-preview-verified-20261014`, conservando muestras y archivos previos. API Docker reconstruida sin reiniciar datos ni eliminar el volumen. Respaldos de vistas e índice anterior en `antes/`.

## Límites

Validación local con datos ficticios. No constituye aprobación de producción ni prueba de proveedores externos, impresión física o carga concurrente. El aviso de privacidad sigue siendo el borrador de demo existente. Vite conserva la advertencia del paquete JavaScript grande (~909 kB sin comprimir); no se midió rendimiento en redes lentas. No se desplegó ni se alteraron precios existentes.
