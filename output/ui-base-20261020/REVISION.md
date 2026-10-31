# Entrega 1 — navegación común y referencias operativas

20/oct/2026. Alcance: primer avance del [plan integral](../../docs/scrum/PLAN_REDISENO_UI_UX_INTEGRAL_2026-10-19.md), no cierre de sus 20 bloques.

## Cambios

- Agenda, Hoy y Cobrar comparten navegación. Se retiró el retorno especial de `Navbar` para POS. Sucursal, búsqueda, avisos, ayuda y cuenta siguen disponibles al cobrar.
- Base visual común: navegación grafito y acción azul, títulos y espacios más contenidos. Se modificaron los estilos fuente existentes, conservando los contratos y las rutas.
- Accesos rápidos móviles: Hoy/Agenda/Cobrar/Más para dueño y gerente; Agenda/Cobrar/Mi caja/Más para barbero/cajero. Se mantienen las restricciones anteriores de cada menú; no se ampliaron permisos API.
- Agenda: título directo, resumen compacto de fecha y estados, acciones secundarias agrupadas con cierre por Escape. Los contadores muestran carga en vez de cuatro ceros mientras se consulta la información.
- Cobrar: tarjetas y fotografías más pequeñas y títulos contenidos; los tres servicios de la muestra caben en la laptop revisada. Se conserva el motor de precios y el ticket. Barra móvil de cobro y navegación sin superponerse en la prueba.
- Hoy: título y mensajes directos, fecha y panel de pendientes más compactos, caja con fondo grafito. No se cambiaron las fórmulas del resumen.

## Pruebas

**22 comprobaciones automatizadas aprobadas:** 5 de navegación renderizada por rol, 10 del arnés de búsqueda y 7 de agenda/fechas/disponibilidad. TypeScript y compilación Vite correctos.

La prueba de navegación renderiza el componente real para dueño, barbero, cajero, gerente y superadministrador, comprobando estructura compartida y destinos que deben mostrarse/ocultarse. No sustituye pruebas de autorización por API ni recorridos autenticados completos con los cinco roles.

**Navegador, cuenta ficticia de dueño:**

- Navegación Hoy → Agenda → Cobrar → Hoy conservando la estructura y sucursal.
- Calendario visible en la primera pantalla de laptop 1366×768. Medida previa al último agrupado de acciones: inicio del calendario a 473 px del borde superior.
- Abrir ticket móvil, agregar Corte clásico: $200.00; revisar líneas, profesional y método. Se quitó el artículo y volvió a $0.00. No se pulsó confirmar cobro ni se creó una venta.
- Barra de cobro terminó exactamente donde comenzaba la navegación inferior: 779 px en viewport de 844 px, sin superposición.
- Nueva cita abrió con profesional, servicio, tarifa y campos disponibles; se canceló sin guardar.
- Búsqueda abrió desde la barra común y Escape devolvió el foco al disparador.
- Menú completo móvil abierto/cerrado. Menú de acciones de agenda corregido tras detectar que quedaba fuera del borde: rectángulo final x=16, ancho=250 en viewport de contenido 385 px.
- Revisión final con datos cargados: contenido/viewport 315/315 px en teléfono nominal de 320, y 1361/1361 en laptop nominal de 1366. Sin desbordamiento horizontal. Calendario a 473 px en la versión final; consola consultada sin errores.

Capturas en esta carpeta. `ticket-movil.jpg` muestra un borrador que fue vaciado; no es comprobante de venta. Se conserva la reserva ficticia previa en la agenda; no se creó otra ni se cambió su estado.

## Límites y continuación

No se cambiaron servicios externos, precios, API o base de datos financiera. El acceso creó/renovó únicamente la sesión de prueba existente. Sin despliegue ni cargos.

La consolidación de Mi negocio, separación de Caja/Equipo, enlaces a objetos concretos desde Hoy, filtros completos de Agenda, revisión de todos los estados y recorridos financieros permanecen en sus bloques. No se anuncia el cierre de UI-01 a UI-07 por esta entrega parcial.

Vite conserva la advertencia del paquete JS grande (~916 kB sin comprimir); no se midió rendimiento de carga. No se certificó WCAG, impresora física, API multitenant o regresión financiera completa en esta entrega.

Fuente principal: `Navbar.tsx`, `App.tsx`, `InicioView.tsx`, `AgendaView.tsx`, `PosView.tsx`, `studio-identity.css`, `studio-operation-design.css`, `agenda-operations.css`, `pos-silla.css`. Respaldos de entrada en `antes/`. Build separado `.tools/workspace-base-20261020`; demo servida desde el snapshot local existente, conservando archivos previos.
