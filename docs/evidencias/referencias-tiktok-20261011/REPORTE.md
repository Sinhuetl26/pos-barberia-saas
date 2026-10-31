# Referencias de diseño de TikTok — 11/oct/2026

Solicitud: revisar los videos de diseño seleccionados por Sinhue y extraer criterios útiles para el POS. Revisión de reproductores y descripciones visibles mediante navegador autenticado. No se exportó el historial ni la lista de gustos personales. Este informe es investigación y propuesta; no acredita cambios implementados ni aceptación comercial.

## Fuentes y alcance observado

1. [Nigeria Best Web Developer — ajustes de dashboards](https://www.tiktok.com/@9jabestwebdev/video/7683417320932396309). Se inspeccionaron fotogramas de los cinco apartados: acento sin degradado ornamental, protagonismo de cifras, jerarquía entre indicadores, sombras reservadas a capas flotantes y revisión de textos. Es una referencia estética, no un estudio de usuarios. No se transcribió el audio completo.
2. [millee.md — patrones de interfaces genéricas](https://www.tiktok.com/@millee.md/video/7679967476544720148). Se inspeccionó la lista visual cerca del final. Aporta alertas sobre contraste insuficiente, espaciado inconsistente, texto genérico y efectos repetidos. Sus objeciones a bibliotecas de iconos, fuentes o tarjetas no se adoptan como prohibiciones: esos recursos pueden ser útiles y accesibles.
3. [imapro.in — cuatro estilos de UI](https://www.tiktok.com/@imapro.in/video/7691274655612636468). Se revisaron descripción y ejemplos visuales de vidrio y superficies suaves. Útil como vocabulario visual; no demuestra que alguno convierta mejor o facilite cobrar.
4. [Migue Baena — diseño con referencias y revisión](https://www.tiktok.com/@migue.baena/video/7692086645838875926). Se revisaron descripción y fotograma inicial. Rescatamos definir reglas y contrastar el resultado en navegador. No se verificaron ni instalaron las herramientas promocionadas; no se atribuye al video una evaluación completa de ellas.
5. Luis Álvarez: [lista inicial](https://www.tiktok.com/@luisalvarezweb/video/7685435219536596246) y [segunda parte](https://www.tiktok.com/@luisalvarezweb/video/7686185930645884182). Se leyeron las descripciones visibles, no la reproducción completa. Separamos móvil, contraste, imágenes y enlaces de las tareas de despliegue, analítica y legal. Las afirmaciones sobre motores de búsqueda requieren verificación independiente antes de usarse.

## Dirección propuesta para SYSTECH

Administración: superficies sobrias, texto legible, organización por tarea, cifras comparables y controles rápidos. Reservas: identidad del negocio mediante fotografía autorizada, retratos del equipo, títulos expresivos y servicios concretos; mantener precio, duración, disponibilidad y confirmación fáciles de encontrar. No convertir la caja en una exhibición de efectos ni sustituir una reserva usable por una portada vistosa.

| Aplicación | Cambio concreto propuesto | Bloque y evidencia requerida |
|---|---|---|
| Inicio del dueño | Un resumen principal de venta real del periodo; citas, pendientes de cobro y alertas como información secundaria. Mostrar sucursal y periodo. No calcular comparaciones sin datos válidos. | CD-15; cotejo con ventas y captura móvil/escritorio. |
| Color y tarjetas | Acento para acción principal/selección. Éxito, advertencia y error con texto e icono, nunca solo color. Fondos y bordes para agrupar; sombras para menús/modales. | CD-03/18; contraste, teclado y estados en navegador. |
| Reportes | Hacer explícitos carga, error y reintento. Evitar presentar cifras del filtro anterior bajo un periodo nuevo. Alinear importes y explicar qué incluye cada total. | CD-03 y CD-14; fallo de API y cambio rápido de filtros. |
| Agenda/POS | Priorizar próxima atención y cobro; menos decoración y acciones secundarias agrupadas. Mantener resumen y total al alcance en móvil. | CD-05/07; recorrido reserva→atención→venta. |
| Reservas | Fotografía y tono propios; formulario sobre superficie sólida. Una acción principal por paso y resumen claro. No agregar contadores, reseñas ni garantías ficticias. | CD-17; reserva persistida, validación, recuperación y capturas. |
| Textos | Sustituir promesas vagas por datos y acciones: “3 citas por atender”, “Registrar venta”, “Revisar stock bajo”. Mantener bienvenida solo si aporta contexto. | CD-03/15/17; revisión de vacíos, errores y datos reales. |
| Movimiento | Transiciones discretas de selección/estado; respetar movimiento reducido. Ninguna animación debe retrasar el cobro o esconder contenido. | CD-18; teclado, móvil y preferencia de movimiento reducido. |

## Qué se conserva y qué se pospone

Se conservan iconos consistentes, tarjetas que agrupan información y el flujo de reserva existente. No se cambia la fuente o toda la UI únicamente para evitar una etiqueta de “vibecoding”. Vidrio y superficies en relieve quedan como alternativas de exploración para detalles de marca, sin aprobar su uso en formularios, importes o controles críticos.

HTTPS, dominio, SEO de producción, monitorización, respaldos externos, analítica y textos legales siguen en el plan de conexiones/piloto. No se publican datos de prueba ni se contratan servicios durante esta demo.

## Orden de ejecución

Estos criterios complementan CD-03, CD-05, CD-07, CD-14 a CD-18. No alteran el orden A→G ni desplazan defectos P0 de inventario. Próximo trabajo: completar evidencia de CD-01/02; después estados comunes y reportes recuperables. La revisión TikTok está documentada; los cambios de producto de esta tabla siguen pendientes de implementación y prueba.

## Segunda pasada: recorrido desde el principio

A petición de Sinhue, se volvió al inicio de «Me gusta» y se recorrieron seis tramos de desplazamiento hacia videos anteriores, comprobando miniaturas y descripciones cargadas. No es una revisión exhaustiva de todos los favoritos ni reproducción completa de cada video. Se priorizaron referencias de UI; no se almacenaron contenidos personales ajenos al proyecto.

Selección por utilidad:

1. **Paneles de Nigeria Best Web Developer:** sigue siendo la referencia más directamente aplicable a Inicio y Reportes. Adoptar jerarquía de cifras y sobriedad de superficies con pruebas de lectura, no copiar su dashboard de suscripciones.
2. **MotionLove — [ejemplo de movimiento](https://www.tiktok.com/@motionlovee/video/7693603336481803542):** inspección del reproductor al inicio y alrededor de 00:07/00:14. Muestra una composición de informe con una cifra dominante, gráfica y un acento naranja. Puede inspirar una presentación comercial y la jerarquía de Reportes. La escena animada y la rotación de pantalla son recursos de video; no se trasladan al cobro ni justifican porcentajes inventados. Los datos mostrados pertenecen al ejemplo del creador, no al POS.
3. **Revolutia.ai — [grabación de demos](https://www.tiktok.com/@revolutia.ai/video/7688096971441114390):** descripción leída durante el recorrido. Interesa el enfoque de acercar la vista a una acción y mostrar el flujo con claridad; aplicable a CD-20, con datos ficticios. Sus afirmaciones sobre Recordly, precio, licencias, compatibilidad y popularidad no se verificaron. Es candidato para investigación posterior, no recomendación de instalación ni herramienta aprobada.
4. **millee.md:** útil como revisión de contraste, espaciado y exceso de recursos repetidos; menor prioridad que comprobar los recorridos reales.
5. **Luis Álvarez:** útil como lista de cierre de la página pública y siguiente plan de producción; no es una dirección estética para la caja.

También se abrió [Tunde Alao — Fact or Hype?](https://www.tiktok.com/@itstundealao/video/7686156516189080854), cuya miniatura parecía relevante. El fotograma revisado trataba sobre una herramienta/skill y mostraba un repositorio; no aporta evidencia suficiente de un patrón de UI. No se adopta ni instala a partir de ese fragmento.

Resultado: añadir a CD-20 un guion visual corto reserva→agenda→cobro→stock→resumen, con acercamientos a controles relevantes si facilitan entender la demo. Mantener la dirección de UI definida arriba. La revisión amplía referencias, sin cambiar estados de historias ni afirmar mejoras ya implementadas.
