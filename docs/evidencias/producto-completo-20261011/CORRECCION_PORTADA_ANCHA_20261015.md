# Portada de reservas: corrección en pantalla amplia

15/oct/2026. Reporte de Sinhue: título comprimido y fotografía desproporcionada en /b/cierre-demo.

Causa reproducida en navegador a1920px: el contenedor editorial tiene máximo1440px, pero el padding izquierdo de su columna se calculaba desde100vw sin límite. Resultaba408px de padding y solo164px útiles para el título; portada1228.25px de alto. Se limita el espaciado a28–64px en la variante editorial y en la portada base, conservando las reglas móviles existentes. Solo cambia apps/web/src/styles/booking-experience.css.

Verificación: build:web PASS (TypeScript y Vite; primer intento restringido EPERM, repetición autorizada completada). En1920px: padding64px, título475.19px, portada588.75px, sin desbordamiento horizontal. En390px: título337px, sin desbordamiento horizontal y captura inspeccionada. Botón Reservar cita abre Paso1de4 Servicios con tres servicios y Continuar deshabilitado sin selección. No se creó una reserva ni se alteraron datos financieros.

Capturas: reservas-portada-corregida-1920-20261015.jpg y reservas-portada-corregida-390-20261015.jpg, en esta carpeta.

Preview5197 actualizado únicamente con CSS compilado index-KvKj7dxY.css y su referencia en index.html. Se conserva JSindex-CsF_Gq8U.js, API3103, las muestras de impresión y los datos de demo. No se publicó a internet. La carpeta dist generada por build no sustituye al snapshot de presentación: seguir iniciando con la guía existente y su outDir. PC12/PDF permanece pendiente y no se retomó.
