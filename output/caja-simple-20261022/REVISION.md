# Caja simple — rediseño de estructura

22/oct/2026. Petición: menor carga visual y uso directo. Base: tercera propuesta generada, simplificada según la última instrucción del usuario; no es una reproducción literal del titular gigante.

## Resultado

- Turno primero, con una acción destacada: abrir caja o contar/cerrar cuando haya turno abierto.
- Historial en una vista separada; no ocupa la operación inicial.
- Entregas en lista compacta. Una selección despliega el formulario correspondiente; nunca aparecen todos los campos abiertos desde el inicio.
- Sin turno, la entrega explica que primero hay que abrir caja; no ofrece confirmar una recepción. Se conserva también la comprobación antes del envío.
- Texto reducido, sin titular promocional ni métricas decorativas. En móvil el último cierre se consulta desde Historial, para priorizar la siguiente tarea.
- Custodia del barbero sigue siendo de lectura; no se amplían permisos. Mismos servicios/API, comprobantes, recuperación y controles de importes.

## Verificado

- TypeScript web correcto y build Vite correcto. Snapshot local actualizado desde `.tools/cash-simple-20261022`; JS `index-sSPZI2fP.js`, CSS `index-iMNSe1lL.css`. Persiste advertencia previa de tamaño de paquete.
- 12 pruebas de importes de entrega y 12 auxiliares existentes de caja/clientes correctos. No se volvió a ejecutar la regresión integral del servidor: no hubo cambios en API en esta entrega.
- Dueño ficticio: pantalla inicial sin campos de importe (0 inputs en main), abrir formulario de turno y cancelar, desplegar entrega cerrada sin posibilidad de enviarla, consultar historial con los dos cierres originales y volver al turno.
- Escritorio 1440×1024; móvil 390×844 y 320×740. Ancho de página/contenido coincidente (385/385 y 315/315), sin desbordamiento horizontal. Se revisaron capturas y legibilidad de acciones.
- No se abrieron turnos ni se recibieron entregas en la demo persistente; saldos $1110 y $200 e historial previo conservados.

## Comparación visual

Referencia generada `exec-c12ac569-a918-4cf1-bbed-f7eb49f2a7e6.png`, 1487×1058; implementación 1440×1024. Se inspeccionaron ambas juntas a escala visual comparable en la misma entrada de revisión; comparación de jerarquía, no afirmación de igualdad de píxeles. Se conservó la separación turno/lista lateral y el azul. Cambios deliberados por instrucción: titular de 34–48 px, solo dos vistas, sin avatares decorativos, último cierre secundario en escritorio y retirado del primer móvil.

Hallazgo P2 en primer móvil: el último cierre retrasaba la lista de pendientes. Se ocultó ese resumen en móvil (disponible en Historial), recompiló y volvió a capturar. Captura final muestra acción y las dos personas en el primer viewport. Sin P0/P1/P2 visuales pendientes en este alcance.

final result: passed

## Límites

No se probó aquí el recorrido autenticado del barbero ni una recepción/cierre nuevos mediante navegador. Se mantienen pendientes los estados completos de recuperación, impresión física, resto del rediseño y producción. Navegación lateral general conserva su estructura anterior: esta entrega modifica Caja, no toda la app.
