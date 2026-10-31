# Design QA — SYSTECH Studio

## 22/oct/2026 — Cobrar, composición aprobada

final result: passed para las pantallas y controles verificados en esta entrega; UI-07 completo sigue en curso.

Fuente: [ajustes, pago y confirmación](output/cobrar-recorrido-20261022/REVISION.md). Implementación y capturas: [revisión](output/cobrar-implementacion-20261022/REVISION.md). Referencia y captura de pago se abrieron en una misma entrada comparativa y se repitió la revisión tras los cambios. Se conservó el escenario total350/recibido500/cambio150; distintas resoluciones raster, mismo formato móvil. No se acredita comparación píxel a píxel.

Hallazgos iniciales y correcciones comprobadas:

- P1: mensaje del ticket vacío con tinta oscura sobre carbón; color final `rgb(237,237,223)` y captura escritorio legible.
- P1: resumen inferior móvil heredaba tinta oscura; enlace e importe ahora explícitamente claros sobre carbón.
- P2: flex móvil dejaba el ticket a ancho intrínseco; `align-items:stretch` y ancho353 en viewport efectivo385, sin desborde.
- P2: pago móvil conservaba ventana con márgenes y carecía de contexto; pasó a vista completa con servicio/profesional y sugerencia seleccionada. Diálogo315px/contenido sin desborde en viewport efectivo315.
- P2: ajustes carecían de salida explícita al aplicar o deshacer; botones nuevos con restauración de descuento/propina/motivo comprobada en navegador y foco al resumen.

Resultado posterior: jerarquía, métodos, importes, cambio y acción principal visibles; confirmación y fallo de impresión revisados en muestras aisladas del componente real. No quedan incidencias visuales P0/P1/P2 abiertas dentro de estos estados comprobados. Adaptación deliberada de tipografía local, tono naranja, menor textura y navegación existente. No se certifican los roles/estados pendientes de UI-07, impresión física, zoom200 o WCAG global.

## Historial — Caja Silla

final result: passed

## Referencia y alcance

Primera imagen del segundo grupo de propuestas, elegida por el usuario. Fuente: output/ui-silla-20261018/referencia.png. Implementación: /app/pos sobre la demo Docker local existente.

La referencia mide 1487×1058; captura de implementación 1483×1052, viewport solicitado 1488×1056. Para comparar se normalizó la referencia al tamaño de implementación. Mismo estado: Corte y barba, una unidad, Alex, $350, efectivo. Tres servicios reales frente a cuatro ilustrativos, inicial de profesional frente a foto ficticia y avisos financieros conservados son adaptaciones deliberadas.

## Comparaciones realizadas

Se inspeccionaron conjuntamente referencia e implementación en output/ui-silla-20261018/comparacion-escritorio-final.jpg y el detalle del pago en comparacion-ticket-final.jpg. Se inspeccionó además móvil a 390×844, menú y diálogo de pago.

## Hallazgos y correcciones

- P2: botón inferior quedaba por debajo del primer viewport al conservar los avisos financieros. Se ajustó la altura del ticket y su separación; captura posterior muestra el total, selector y Cobrar visibles.
- P2: un aviso de recuperación financiera pasó temporalmente al menú Más. La revisión independiente lo detectó; se restauró FinancialStatus fuera del menú.
- P2: selector de cuenta móvil perdía su nombre accesible al ocultar el texto. Se añadió aria-label con la cuenta registrada.
- P2: al ir al ticket en móvil, el encabezado podía tapar el título. Se amplió scroll-margin-top y se volvió a capturar: el encabezado termina en y=115.19 y el título del ticket comienza en y=156.66, completamente visible. Evidencia: output/ui-silla-20261018/movil-ticket-final.jpg.
- Se sustituyó la aproximación inicial de tipografía por Anton local y se simplificó el desglose cuando no existen ajustes.
- El enlace móvil ya no altera el hash fuera del enrutador; se verificó que enfoca el ticket sin cambiar la URL.

## Pruebas

TypeScript y compilación correctos; 27 comprobaciones automatizadas existentes pasaron. Recorridos de selección, cantidades, búsqueda, producto adicional, propina con centavos, pago efectivo/cambio, pago dividido y cancelación del diálogo verificados sin registrar una venta. No hay errores de consola en la comprobación final.

## Seguimiento P3 y límites

La barra informativa financiera se conserva por seguridad, aunque no figura en la imagen. No se inventaron fotos del equipo ni un cuarto servicio. Tipografía de cuerpo, selectores nativos y nombres de la demo conservan pequeñas diferencias. No se midieron conversión, rendimiento real ni conformidad integral de accesibilidad. No se ejecutó una venta, regresión completa de servidor, impresión física ni despliegue externo.

Reporte detallado: output/ui-silla-20261018/REVISION.md.

## Resultado final

La comparación posterior a las correcciones no muestra problemas P0/P1/P2 pendientes dentro del alcance de esta caja. Las diferencias funcionales deliberadas y los límites de pruebas se registran arriba. No equivale a certificar el resto del producto.


# Caja simple — 22/oct/2026

Referencia: tercera propuesta visual, adaptada a la petición explícita de menor carga visual. Informe y comparación: output/caja-simple-20261022/REVISION.md. Se revisaron referencia e implementación juntas, escritorio 1440×1024 y móvil 390×844/320×740. P2 del primer móvil (resumen histórico antes de pendientes) corregido y recapturado; sin hallazgos visuales P0/P1/P2 pendientes en Caja simplificada. No cubre toda la aplicación ni nuevas transacciones financieras.

final result: passed


# Caja carbón — 22/oct/2026

Versión refinada elegida e implementada con menos texto. Reporte de comparación, alcance y límites: output/caja-carbon-20261022/REVISION.md. Escritorio y móvil revisados; menú secundario, historial, revisión/cancelación de entrega y acceso al conteo comprobados. Estado real abierto respetado frente al cerrado de la referencia: comparación composicional, sin afirmar identidad de estado ni de píxeles. Ninguna transacción ejecutada. Sin P0/P1/P2 visuales pendientes en este alcance; otros roles y estados quedan pendientes.

final result: passed


# Cobrar: estados y barbero — 22/oct/2026

Autorizaciones y recuperación adoptan la composición carbón aprobada. Se revisaron capturas reales escritorio/móvil con los estados pendiente, rechazado, aprobado, incierto y recuperado. Contraste de panel y controles conservado; pruebas en base ficticia aislada y permisos de barbero comprobados. [Reporte](output/ui07-roles-20261022/REVISION.md). UI-07 En revisión: falta vencimiento visual real e integración completa con Agenda/componentes. Sin certificación de identidad de píxeles, accesibilidad integral, hardware ni producción.

final result: partial — En revisión


# Mi caja del barbero — 23/oct/2026

Se revisaron estados reales escritorio/móvil del efectivo del barbero, error de consulta, recepción revisada e incierta y su recuperación. Se corrigió el ocultamiento móvil de etiquetas de Perfil/Comisiones y el error de red en inglés. Evidencia: [reporte](output/ui08-barbero-20261023/REVISION.md), captura barbero-movil-final.png. Sin nuevo cierre ni operaciones sobre el volumen principal. Restan comprobantes/devoluciones/cierre confirmado e integración completa; no equivale a validar toda Caja.

final result: partial — En revisión


# Navegación y continuidad —23/oct/2026

Menú estable, Mi negocio y selección naranja revisados en escritorio/móvil; Ctrl+K, Tab/Shift+Tab y Escape comprobados. Capturas finales en output/ui-navegacion-20261023. Cita→ticket→retorno conserva contexto; expiración real retira permiso sin pulsar Comprobar. Pendientes: borrador al salir por menú, componentes y resto de Agenda/Caja.

final result: partial — En revisión


# Salida del ticket —23/oct/2026

Aviso móvil final con acciones completas y naranja; contraste y lectura revisados. Navegación bloqueada durante incertidumbre, retorno a cita sin doble aviso y protección previa de Configuración comprobados. [Reporte](output/ui-ticket-protegido-20261023/REVISION.md). No incluye persistencia de borradores ante cierre forzado ni certificación del resto del POS.

final result: partial — pendientes integrales del bloque
