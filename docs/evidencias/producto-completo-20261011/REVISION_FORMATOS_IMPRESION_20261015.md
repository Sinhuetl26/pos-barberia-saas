# Formatos de impresión — revisión visual sin impresora

15/oct/2026. Sinhue no dispone de impresora; pidió conocer el aspecto y calidad. No se exige comprar hardware para continuar la aceptación digital. No hubo cambio de producto ni Stripe, nueva venta, entrega, corrección o cierre.

Se generaron muestras de HTML **mediante las rutas reales autenticadas**, leyendo únicamente el ticketA-000003/600 y cierre675 existentes de la copia ficticia. `scripts/capture_print_samples.cjs` comprueba manifiesto/base/puertos y dueño fixture.invalid, cifras y ausencia de credenciales en la salida. Copias guardadas en esta carpeta y en el snapshotlocal5197 para poder inspeccionarlas sin depender de ventanas emergentes. Solo contienen datos ficticios; este mecanismo de muestras estáticas no se debe usar con documentos reales ni sustituye su autorización.

## Inspección

- Ticket58mm: cuerpo219,20px; altura544px; sin desbordamiento de cuerpo en pantalla. Ticket80mm:302,36px/606px; también sin desbordamiento. Precios600 y líneas250+200+150 correctos, recibidos600/cambio0. Nombres largos envuelven líneas sin esconder importes en esta muestra. Tiene nombre del local, sucursal/dirección, folio, hora local, profesional, cobrador, cliente, métodos y «No esCFDI». Fuente monoespaciada y divisores adecuados para un ticket térmico sencillo; sin logo ni identidad gráfica avanzada. El cobrador se muestra como correo de la fixture, que conviene sustituir por nombre legible.
- Cierre: hoja con secciones de horarios, flujo, otros métodos, esperado/contado/diferencia, notas y firmas. Fondo100+entrega600−gasto25=675; ambos675 ycuadrada0. Separación de entrega y venta de caja conservada. Mejor acabado que ticket, pero título redundante y firma «Cajero/Operador» puede simplificarse para los negocios donde cobra dueño/barbero. La fecha usa zona del servidor en esta ruta; debe fijarse a zona de sucursal antes de certificar la nube.
- Regla CSS térmica actual `@page size:58mm auto/80mm auto` requiere verificar interpretación real en motor de impresión y selección de papel del driver. Medir ancho en pantalla no certifica ancho impreso, páginas, márgenes o corte. No se afirma que se imprimió o guardóPDF.

Capturas inspeccionadas: `ticket-80mm-vista-20261015.jpg`, `cierre-vista-20261015.jpg`; vistas locales `ticket-58mm-muestra-20261015.html`, `ticket-80mm-muestra-20261015.html` y `cierre-muestra-20261015.html`.

## Próximo paso para PC12

Verificar salida digital/PDF con formatos de papel explícitos, paginación, encabezados/botones ocultos, textos largos, fechas de sucursal y recuperación de errores; mejorar los detalles anteriores si se autoriza implementar el pulido. La vista estática observada acredita diseño HTML y cifras, no reproduce el diálogo emergente autenticado de la app ni reemplaza esa comprobación. Prueba física58/80mm, márgenes útiles, legibilidad real, avance/corte y compatibilidadUSB/Bluetooth/red quedan externas, sin bloquear por sí solas el resto de la demo. PC12 no se marca completo por esta inspección.
