# UI-03/UI-08 · Historial adaptable y opciones legibles

27/oct/2026. Entrega parcial del rediseño; indicador20 % sin cambios de etapa. UI-03 sigue En curso y UI-08 En revisión.

## Resultado

El historial de Cobrar usa fichas con folio, fecha/hora local de la sucursal, cliente, barbero, importe original y devolución. Un único marcado sirve para escritorio y móvil. Tickets58/80mm y devolución se despliegan en Ver opciones; se conservan callbacks y permisos existentes. Cabecera muestra sucursal y una sola acción Cerrar. Sin tabla horizontal, decoración adicional o dependencias nuevas.

Dirección: superficies blancas, texto Studio Text existente, importes destacados y estados discretos; naranja cuero reservado a opciones/foco. La identidad carbón del ticket y el resto de la pantalla permanecen. No se modifica la lógica de importes, devolución, stock, cobro, cierre o impresión.

Más opciones: los textos SÍ eran visibles en la captura inicial. El fallo visual comprobado era fondo azul heredado con texto oscuro en Movimiento de caja, y la representación AX del navegador no anunciaba etiquetas. Se quitaron las clases que provocaban ese fondo, se asignaron etiquetas ARIA explícitas y acciones neutrales de48px. DOM confirma etiquetas y contraste oscuro sobre blanco; localización por nombre accesible funciona. El volcado AX de IAB continúa omitiendo algunos nombres del menú: no se presenta como prueba de un lector de pantalla real.

El historial distingue carga, vacío, error y resultado. Si falla la consulta, oculta la lista anterior y permite Reintentar. No permite iniciar devolución desde datos antiguos mientras no se recupere la consulta.

## Teclado y diálogo compartido

La prueba descubrió que OperationDialog excluía summary de sus controles y podía considerar botones invisibles dentro de details cerrado, porque estos conservan rectángulos de layout en Chromium. Se incluyeron los summary y se excluyeron descendientes de cualquier details cerrado salvo su propio summary. Se mantiene el diálogo nativo, su retorno de foco y el bloqueo mientras se imprime/procesa.

Comprobación real final: Shift+Tab desde el título llega a Opciones del último folio; Tab vuelve a Cerrar con todos los apartados cerrados. Con opciones abiertas, el último botón Devolver unidades también vuelve a Cerrar. Enter abre opciones y Escape cierra el historial. Abrir devolución/cancelar Atrás devuelve el foco al botón del mismo folio. No se confirmó ninguna devolución.

## Evidencia y validación

- Capturas anteriores: antes/menu.png y antes/historial-movil.png. La tabla cortaba importes/estados/acciones a390px.
- Capturas nuevas: menu-movil.png, historial-movil.png, historial-escritorio.png, parcial-movil-final.png y parcial-320.png.
- A390×844: ancho útil385, documento385 y diálogo353 sin desbordamiento; contenido346/scroll346.
- A320×740: ancho útil315, documento315 y diálogo283/scroll283. Importe, devolución parcial y tres acciones caben.
- Dueño: abre devolución desde una ficha y la cancela sin operación. Historial de Sucursal UI12 muestra200 original,100 devuelto y estado parcial.
- Barbero ficticio: Historial de ventas, únicamente los tickets permitidos. Cero botones de devolución y sin Movimiento de caja. Captura barbero-escritorio.png con acciones abiertas.
- Consulta fallida503 simulada solo en proxyQA: mensaje/Reintentar, sin ventas antiguas; al recuperar red aparecen los folios de nuevo. Captura error-consulta.png. Sucursal QA alterna vacía muestra Sin ventas disponibles.
- TypeScript aprobado; scripts/test_sales_history_render.cjs comprueba permisos, estados parcial/cancelada, importe original, carga/error/vacío, bloqueo de impresión y escape de contenido. Navegador verifica el foco con aserciones reales.
- Lectura de integridad UI12 sin cambios: una venta200 parcialmente devuelta100, stock9, un cierre100/diferencia0. Sucursal original conserva sus tres ventas/devolución anterior y custodia550. Esta entrega NO creó ventas, devoluciones, entregas ni cierres.
- Demo principal conserva7 ventas,0 devoluciones y1 turno abierto. Docker API/web healthy. Sesión principal vencida: se comprobó login y JS servido, sin iniciar sesión ni alterar la pestaña del usuario.

## Archivos / continuación

Nuevo SalesHistory.tsx y sales-history.css, integración PosView.tsx, reglas acotadas pos-carbon.css y corrección OperationDialog.tsx. Revisión de React: componente de presentación sin efectos ni llamadas de red nuevas; callbacks de negocio siguen en PosView. Estado de error se limpia al consultar; no se muestran datos antiguos cuando falla. Sin cambios en paquetes o permisos del servidor.

Compilación principal .tools/ui-history-final-20261027 API3103: index-Bv_90jEw.js / index-B3WuLtOO.css. Copiada al snapshot Docker preservando archivos anteriores. QA .tools/ui-history-qa-20261027 usa3105; NO copiar al principal. Manifiestos/base ficticia conservados; sesiónQA restaurada a dueño sin borradores y serviciosQA detenidos al concluir.

Sigue UI-03: aplicar el patrón común a movimiento de caja/errores/autorizaciones pendientes y revisar integración con Agenda/UI-06. No se declara un bloque completo por esta entrega. La impresión física y servicios de producción siguen fuera de esta verificación.
