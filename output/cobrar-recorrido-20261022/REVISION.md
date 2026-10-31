# Cobrar: vistas del recorrido

22/oct/2026. Propuestas visuales del mismo flujo, no tres alternativas de marca. Continúan la dirección carbón/naranja de Caja y la [especificación de Cobrar](../../docs/scrum/DISENO_COBRAR_2026-10-22.md).

## Vistas preparadas

- [Ajustes en escritorio](ajustes-escritorio.png): catálogo blanco, ticket carbón, detalle de cliente/profesional compacto y ajustes abiertos. Subtotal 350 − descuento 35 + propina 35 = total 350.
- [Revisión del pago en móvil](pago-movil.png): total 350, recibido 500, cambio 150; una acción final. El catálogo no compite con la revisión.
- [Confirmación en móvil](confirmacion-movil.png): resultado breve, nueva venta como acción principal y comprobante secundario. Folio DEMO-EJEMPLO ficticio.
- [Captura de la app antes de implementar](antes.png): ticket vacío existente, leído sin añadir artículos ni registrar una venta.

Las imágenes son maquetas generadas. No acreditan una transacción, una impresión o una implementación del nuevo diseño.

## Revisión del diseño antes de llevarlo a código

Los importes y los cuatro métodos representados corresponden a la especificación. Conservar Source Sans y las proporciones legibles del producto real; las dimensiones raster generadas no son mediciones CSS ni verificaciones de reflujo.

Corregir en el siguiente refinamiento/implementación:

- El motivo de descuento sigue siendo texto con validación; la flecha dibujada en la maqueta no autoriza inventar un catálogo de motivos.
- En confirmación, cambiar la etiqueta «Efectivo $500» a «Recibido $500» y mantener método Efectivo aparte si hace falta. Así no se confunden ventas por 350 con efectivo recibido por 500.
- Atenuar textura de móvil y reducir el bloque de confirmación si desplaza acciones en 390 × 844. Medir en navegador; no dar por cumplido por una imagen.
- El éxito solo aparece cuando el servidor confirma la venta. El folio de ejemplo se reemplaza por el real y la siguiente cita aparece solo cuando corresponda.
- En ajustes, el resumen corresponde al borrador; Aplicar no significa registrar una venta. Las solicitudes de autorización conservan sus validaciones originales.

## Recuperación y otros estados

La recuperación incierta aún no tiene maqueta visual. Diseño propuesto: conservar ticket y total, aviso «Comprobando cobro», acción «Consultar resultado» para el intento existente; sin segundo botón de registrar. Una venta confirmada con ticket no disponible muestra «Cobro registrado» y permite recuperar comprobante, sin repetir cobro. Implementar sobre la lógica existente, no crear un segundo mecanismo financiero.

También faltan las variantes visuales de dividido, autorización pendiente/rechazada, error de precio/stock, vacío y ticket móvil compacto. La especificación escrita las contempla; no declarar completo UI-07 por estas tres vistas.

## Entorno y límites

Docker Compose reportó API 3103 y web 5197 saludables en la consulta autorizada. El navegador integrado abrió `/app/pos`, con dueño ficticio y ticket vacío. Esto resuelve el impedimento de consulta de la sesión de organización: no fue necesario reiniciar ni reconstruir servicios.

No se efectuaron cobros, devoluciones, cierres, ajustes de inventario ni cambios de configuración de negocio. No se modificó el código de la app. Estas vistas quedan para revisión de composición antes de implementar.
