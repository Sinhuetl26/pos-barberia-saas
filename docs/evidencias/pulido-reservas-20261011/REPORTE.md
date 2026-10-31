# Pulido de reservas tras evaluación externa

11 de octubre de 2026. Avance acotado de ST-31, sin despliegue ni aceptación global.

## Aplicado

- Catálogo público con filas completas tocables, precio compacto (conserva centavos cuando existen), moneda explicada una vez y chevron. Categoría visible también en móvil. No se modifican precios ni se inventan ahorros de combos.
- Botones del equipo secundarios y retratos cuadrados de 120 px en móvil, conservando la fotografía protagonista. Títulos de secciones con la tipografía de identidad y alineación común.
- Progreso verde con marcas de pasos completados, foco visible, horarios no disponibles tachados/deshabilitados y chips seleccionados con marca visible.
- Estado sin disponibilidad con icono, explicación, botón aparte y enlace a otro profesional. No afirma que el negocio está cerrado ni lleno porque el contrato actual no distingue esas causas.
- Tira de siete fechas consultables, respetando el máximo de 90 días. No son indicadores de cupo: consulta real al seleccionar y no promete un próximo horario aún no verificado.
- Atrás vuelve al paso anterior. Cabecera y resumen más compactos en móvil, sin repetir la sucursal cuando solo existe una.
- Formulario sin tarjeta interior, consentimiento separado de asistencia y lectura del aviso mediante control independiente. La revisión legal integral sigue pendiente.
- Preferencias con un solo título visible y una sola indicación de opcionalidad. Chips siguen siendo preferencias, no otro servicio ni cambio de precio. Indicaciones para la visita tienen un propósito distinto.
- Ayuda permanente del teléfono y explicación del folio/enlace privado después de confirmar. No promete envío automático de WhatsApp.
- Placeholder observado en la página: rgb(89,102,93), opacidad 1 sobre blanco; se oscureció respecto al anterior. No constituye certificación completa de contraste ni accesibilidad.

## Verificación

Compilación web correcta; persiste advertencia histórica del bundle superior a 500 kB.
Recuperación del cliente: 8/8. Referencia privada: 17/17. Verificador de demo: una sola cita, asignación correcta, referencia privada y apariencia persistente/restaurada.

Navegador: catálogo → profesional → día sin horarios → siguiente fecha → horario → formulario. Selección de preferencia y casilla comprobadas. Escape devuelve foco al aviso; nombre y preferencia se conservaron. Atrás vuelve al horario y al regresar conserva el nombre escrito. No se confirmó una nueva reserva para generar estas capturas.

Formulario revisado a 375/390 px y escritorio 1440 px. A 375: viewport 375, ancho útil 370 y scrollWidth 370, sin desplazamiento horizontal. Capturas guardadas y vistas: `movil.jpg`, `sin-horarios.jpg`, `formulario-movil.jpg`, `formulario-escritorio.jpg`. La captura de estado vacío precede al ajuste final del borde superior de bronce a verde.

## Sugerencias no convertidas en afirmaciones o funciones ficticias

- Descripciones configurables de servicios: Producto aún no tiene ese campo y la API pública no lo entrega. Requiere cambio de catálogo, validación, persistencia y lectura pública; no se agregaron descripciones inventadas.
- Preseleccionar el primer día con cupo y mostrar próximo horario por profesional: requiere consultar/contratar disponibilidad real, manejo de límites y cancelación de solicitudes. La tira actual ofrece consulta, no simula ese resultado.
- Diferenciar cerrado/sin cupo: requiere dato estructurado de la API. No se interpreta el texto libre de días laborales como una regla inequívoca.
- Fotos reales, teléfono y mapa requieren datos del negocio; permanecen omitidos cuando no existen. Retratos de esta demo siguen identificados como ficticios.
- Contrato legal, pruebas en teléfonos físicos, zoom y evaluación completa de confirmación/gestión siguen pendientes. No se modificaron historias globales ni precios/licencias.

Esta entrega incorpora el acabado visual verificable de ambas evaluaciones. Las sugerencias que necesitan nuevo contrato de datos o decisiones de operación quedan expresamente separadas del pulido implementado.
