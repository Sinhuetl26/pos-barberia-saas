# Design QA — Hoy / propuesta3

Source visual truth: C:/Users/Sinhue/Desktop/POS Barberia/output/hoy-direcciones-20261027/propuesta-3.png.
Implementation: http://127.0.0.1:5198/app/inicio, sucursal Jornada UI15 ficticia.
Screenshot: output/hoy-daybook-20261027/desktop-final.png.

Viewport solicitado1487×1058 CSS, captura devuelta1482×1054px por el navegador; fuente1487×1058px. Densidad1. Para comparación global se normalizó proporcionalmente al marco de la fuente con PIL contain, sin estirar. Las diferencias de menos de5px del marco no se calificaron como fallos. Capturas móvil solicitadas390×844 y320×844; contenido devuelto385px y315px de ancho con scroll. Sin overflow horizontal comprobado por scrollWidth/clientWidth.

Estado: mismo día, mismos tres profesionales y cinco reservas ficticias; ingreso y reposición son los valores efectivos de la API (0/0), diferentes de cifras ilustrativas1050/2. El encabezado real conserva avisos de ventas y navegación Mensajes del producto. No se eliminan funciones para simular el mock.

## Comparación y correcciones

Iteración1: comparacion-1.png combina fuente e implementación en la misma imagen. P1: Nueva venta heredaba azul, ajeno al acento elegido. P2: clientes/horarios demasiado pequeños; columnas cortas adelantaban el resumen. P2: capitalización de cada palabra en fecha. Resultado inicial blocked.

Corregido: CTA cuero #ad4e24, títulos/horarios/clientes/estados ampliados, columnas580px mínimas en escritorio, fecha en caja oración. Captura posterior desktop-final.png. Comparación final conjunta: comparacion-final.png. Comparación enfocada: comparacion-detalle.png (cabecera de profesional, hora, cliente, servicio, estado y CTA). Se inspeccionaron ambas imágenes combinadas.

## Superficies revisadas

- Tipografía: Studio Text/Source Sans local, jerarquía clara Hoy/profesional/horario/cliente/estado. Fuente generada no identificable con precisión; el peso semibold local y el icono de confirmación delineado difieren levemente del render conceptual. P3, no bloquea. No se cambiaron fuentes globales ni descargaron dependencias.
- Ritmo: tres columnas abiertas, divisores finos, espacio central y franja inferior. Menos de tres profesionales deja espacio libre; cuatro o más fluyen en filas adicionales. Móvil apila por profesional;320px apila acciones principales. No se ocultan controles por overflow.
- Color: porcelana #fafaf7, carbón #171b1d, cuero #ad4e24. Estados acompañados de texto/icono, sin depender solo del color. Foco visible contrastante.
- Assets: se reutiliza logotipo real y lucide existente; iniciales son representación funcional de identidad como en la referencia, no sustitutos de fotos. No hay ilustraciones ni fotos nuevas.
- Contenido: fecha e identidad reales, sin cifras de muestra en app. Cada cita abre el objeto/fecha concreto. Cifras secundarias y checklist se conservan bajo desplegables. Más de tu negocio agrega una consulta de progresiva revelación que no aparece en el mock, necesaria para conservar capacidades.

## Comprobaciones

Navegador real: escritorio y móvil390/320; cita concreta, Abrir agenda con fecha, Nueva venta, Ver caja, Ver inventario; resumen expandible con Enter y foco. Estado vacío con equipo, carga, error503 sin datos antiguos y recuperación con Reintentar. Cambio de sucursal elimina citas previas. Sin errores JS en consola del recorrido. API: dueño200/barbero403/anónimo401 al resumen. Prueba automatizada de agrupación aprobada. TypeScript/Vite aprobados. No se probaron impresión física ni servicios externos porque esta entrega es Hoy.

No quedan P0/P1/P2 detectados en el alcance de esta pantalla. P3: matiz de peso tipográfico e icono semántico frente al concepto. Resto de pantallas no evaluado como rediseñado con esta entrega.

final result: passed
