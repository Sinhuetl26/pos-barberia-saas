# Aplicación de referencias — entrega 11/oct/2026

Plan: ../../scrum/PLAN_APLICACION_REFERENCIAS_UI_2026-10-11.md. Se preservaron cambios previos, datos y conexiones. Sin despliegue ni cambios de precios. Esta entrega aplica criterios de diseño y recuperación; no declara cerrado todo el plan CD.

## Implementado

- Reportes: carga y error visibles, reintento, limpieza de cifras anteriores, descarte de respuestas tras cambiar filtros/desmontar y vínculo entre datos y consulta resuelta. Equipo se recarga con aviso de error; cambio de sucursal reinicia selección del barbero. Reintento conserva el filtro elegido.
- Ventas como indicador principal, tarjetas sin sombras ornamentales, etiquetas legibles y filtros con nombre accesible/estado seleccionado. Vacíos del catálogo y tabla explicados. «Rotación» y «Servicios» se reemplazan por títulos que corresponden a ingresos y ventas registradas. CSV indica que exporta todas las ventas, sin fingir aplicar filtros.
- Acceso: etiquetas asociadas a campos, autocompletado apropiado, mostrar/ocultar contraseña en login y registro con estado accesible; vuelve oculta al cambiar modo o abrir/cerrar. No se cambiaron reglas de contraseña.
- Teclado: enlaces para saltar al contenido del panel y de reservas, destinos enfocables y margen para encabezados fijos.
- Reservas: encabezado sólido para lectura sobre fotografías, precio y duración incluidos en el nombre accesible de cada servicio. Se conserva la portada con identidad, retratos, resumen y selección existentes.
- Conservados: movimiento reducido global, estilos de impresión y controles de copia existentes. No se agregaron adornos ni librerías de las promociones de TikTok.

Archivos: ReportesView.tsx, AuthModal.tsx, PublicBookingView.tsx, App.tsx e index.css en apps/web/src.

## Verificado en esta entrega

- TypeScript y build Vite aprobados tras cambios TSX. Aviso preexistente de bundle grande: JS final aproximadamente 713 KB / 195 KB gzip; no se acredita rendimiento móvil de producción. Ajuste final de scroll-margin es CSS y se revisó en servidor local.
- Reportes desktop y móvil en fixture de cierre, API3102/frontend5190: vacío honesto con $0, tres barberos disponibles, cambio rápido de periodos sin error visible. No se forzó una respuesta lenta fuera de orden: esa protección se revisó en código, no se declara prueba de concurrencia de red.
- API de demo detenida deliberadamente: errores/reintentos visibles y cifras retiradas. Reiniciada en sesión77144, reintento recuperó datos y opciones. Se mantuvieron servidores de otros orígenes.
- Ancho de documento y viewport iguales en móvil: 385px tanto en Reportes como en reservas; desktop de Reportes:1275px. Tabla financiera tiene desplazamiento local intencional en móvil.
- Tab inicial enfoca «Saltar al contenido»; Enter enfoca workspace-content. Mostrar/ocultar login cambia input a text/password usando una cadena ficticia, sin enviar formulario; se limpió el campo.
- scripts/verify_closure_demo.cjs: nueve PASS nuevos, incluyendo login dueño/barbero/otro, catálogo aislado, reporte financiero denegado al barbero, saldo inicial/Kardex y reserva pública reintentada persistida una sola vez.
- Revisión React: efectos con limpieza de resultados, sin nuevas bibliotecas, estado de filtros explícito, controles con nombres accesibles. No se acredita auditoría completa de toda la app.

Capturas: reportes-escritorio.png, reportes-movil.png, reportes-recuperacion.png y reservas-movil.png en esta carpeta.

## Pendientes reales

No se ha probado toda la app con lector de pantalla, todo el contraste de cada tema configurable ni todos los navegadores. No hay impresora física disponible. Quedan los defectos P0 de inventario documentados en CD-01, el recorrido comercial completo y datos históricos transaccionales del plan de cierre. No cambiar historias a completas hasta satisfacer criterios originales.

## Guion visual de demo para CD-20

Preparar el negocio ficticio aislado. Mostrar nombre y sucursal antes de empezar. 1) Elegir servicio/profesional/hora desde el celular. 2) Mostrar la cita en agenda. 3) Registrar atención y venta con un producto. 4) Mostrar ticket, stock y comisión correspondientes. 5) Abrir el resumen del dueño y explicar el periodo; terminar con el cierre de caja. Capturar controles y resultado, no pantallas decorativas. El recorrido debe probarse de extremo a extremo antes de grabarlo o prometer una duración. Si se produce video, usar acercamientos discretos y material ficticio, sin contratar herramientas.
