# Cobrar: implementación del recorrido aprobado

22/oct/2026. Referencias: [vistas aprobadas](../cobrar-recorrido-20261022/REVISION.md), [especificación](../../docs/scrum/DISENO_COBRAR_2026-10-22.md), [diseño maestro](../../docs/scrum/DISENO_MAESTRO_SYSTECH_2026-10-22.md).

## Cambios

Catálogo en filas, búsqueda visible y filtros secundarios. Ticket carbón con textura atenuada, importes alineados y ajustes desplegables. En celular, resumen inferior legible y detalle bajo demanda, evitando mostrar el formulario entero al buscar servicios.

Pago con cuatro métodos, contexto del servicio/profesional, importe recibido y cambio; en móvil ocupa una vista completa. Las sugerencias de efectivo indican selección. Ajustes conservan la previsualización en vivo; Aplicar cierra la sección y Cancelar restaura descuento, propina y motivo de cuando se abrió.

La confirmación prioriza Nueva venta, mantiene el folio real y separa método, recibido y cambio. Ver ticket despliega el comprobante existente con sus opciones originales. Un fallo de impresión conserva el mensaje de venta registrada; datos históricos de pago ausentes o malformados no inventan un cambio.

El texto «Elige un servicio para empezar» heredaba tinta oscura. Corregidos ese contraste y el de la barra inferior móvil; comprobado en navegador. No se cambiaron precios ni reglas financieras.

## Archivos

- `apps/web/src/views/PosView.tsx`: composición, controles de ajustes, detalle móvil y uso de la confirmación.
- `apps/web/src/components/SaleConfirmation.tsx`: resultado confirmado y lectura defensiva de datos de efectivo del comprobante.
- `apps/web/src/styles/pos-carbon.css`: estilos limitados a Cobrar/pago/confirmación; reutiliza fotos y textura existentes.
- `scripts/test_sale_confirmation.cjs`: comprobaciones del componente y datos de pago.
- `antes/PosView.tsx` e `antes/index.html`: respaldo del estado previo a esta entrega, incluyendo los cambios anteriores del proyecto.

## Evidencias de navegador

- [Escritorio, ticket vacío y mensaje legible](escritorio.png).
- [Ajustes en escritorio](ajustes-escritorio.png).
- [Catálogo móvil y resumen](catalogo-movil.png).
- [Pago móvil](pago-movil.png).
- [Pago escritorio](pago-escritorio.png).
- [Confirmación: componente real con datos SSR ficticios](confirmacion-aislada-movil.png).
- [Impresión fallida: estado visual aislado](impresion-fallida-aislada.png).

Las últimas dos capturas son muestras estáticas del componente real, con aviso visible de prueba. Su función es verificar apariencia y contenido sin crear ventas. Sus botones de operación no ejecutan transacciones; Ver ticket sí permite abrir el detalle nativo. No equivalen a probar el registro completo de una venta ni una impresora física.

## Comprobaciones

TypeScript web y compilación Vite correctos. Pruebas existentes de recuperación financiera (5), retorno a cita (7) y búsqueda (10) correctas; la prueba nueva cubre la confirmación, valores inválidos/legados, escape del folio, prioridad de acciones y error de impresión. Revisión de los dos componentes React: hooks incondicionales, nombres accesibles, foco del diálogo conservado, lectura de datos sin solicitudes nuevas y ningún callback financiero duplicado.

Se comparó el bloque de cálculos, autorización y envío con el respaldo: permanece idéntico. Esto limita el alcance del cambio; no sustituye una regresión financiera completa.

Con dueño ficticio en navegador: subtotal 350, descuento 35 y propina 35 conservan total 350; recibido 300 bloquea registrar y recibido 500 muestra cambio 150. Reparto 200 efectivo + 150 tarjeta correcto; reparto 400 para total 350 bloqueado. Tarjeta y Transferencia seleccionables. Escape conserva el borrador y devuelve foco al botón de origen. Búsqueda sin coincidencias y restauración del catálogo comprobadas. Consola del recorrido consultada sin errores.

Aplicar ajustes comprobado con descuento 35 sin propina: total 315. Reabrir, cambiar descuento a 10, propina a 10 % y motivo, y cancelar restaura descuento 35, Sin propina y motivo vacío; total vuelve a 315 y foco al resumen. No se envía solicitud de cobro al aplicar o cancelar ajustes.

Reflujo de pago a ancho efectivo 315 px (viewport solicitado 320) sin desborde horizontal. Catálogo, detalle y pago móvil revisados a viewport 390 × 844. El selector de cliente/profesional y las restricciones por cita conservan su lógica. No se efectuó un cobro final, devolución, entrega, cierre ni envío externo. Al terminar se descarta únicamente el ticket que preparó esta revisión.

## Comparación visual y límites

Referencia y captura del pago se abrieron juntas para contrastar jerarquía, método, recibido, cambio y acción. Se atenuó el material, se explicitó el contraste de estados vacíos/resumen, se corrigió el estiramiento del ticket móvil y el pago móvil pasó a vista completa. Los importes son consistentes.

Adaptaciones deliberadas: tipografía local de lectura, naranja más oscuro para texto blanco legible, motivo de descuento libre y controles existentes de cliente/profesional. Se conserva la navegación general del producto; su simplificación integral pertenece a UI-03/UI-04. No se acredita fidelidad milimétrica a la imagen generada ni certificación WCAG global.

Esta entrega implementa la composición aprobada y verifica las interacciones enumeradas. UI-07 sigue en curso por autorización pendiente/rechazada y recuperación incierta con la nueva apariencia, recorrido autenticado del barbero y aceptación completa de sus criterios. Impresión física y conexiones reales continúan fuera de esta entrega.

## Operación y continuación

Compilación local en `.tools/cobrar-carbon-20261022`, copiada al snapshot servido por Docker preservando assets y muestras anteriores. API, volumen y configuración de negocio sin cambios. Para continuar, consultar [el punto guardado](../../docs/scrum/CONTINUACION_REDISENO_UI_UX.md).

Versión final: JavaScript `index-DCgvp0HG.js`, CSS `index-Df2JzdIr.css`, API local 3103. Vite conserva la advertencia de bundle grande (~923 kB sin comprimir); no se certificó rendimiento de carga. No se instaló dependencia ni se desplegó a producción.
