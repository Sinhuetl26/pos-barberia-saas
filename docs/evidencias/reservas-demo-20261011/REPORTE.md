# Reservas de demo · ejecución del 11 de octubre de 2026

Inicio programado: 08:00 America/Mexico_City. La automatización inició efectivamente a las 08:00:23. Implementación y recorrido local realizados; aceptación global de ST-31 y ST-44 pendiente.

## Resultado

Demo pública: http://127.0.0.1:5179/b/estudio-norte-demo

Se creó **Estudio Norte**, negocio ficticio separado de Dueño Virtual R01, con una sucursal, cuatro servicios y tres profesionales ilustrados. La base operativa no se modificó; la preparación verifica su hash y conserva los registros preexistentes de QA. La foto de portada es ilustrativa y el mensaje de la demo lo aclara. No se enviaron mensajes, efectuaron cargos, contrataron servicios ni desplegaron cambios.

Portada editorial con fotografía, tipografías locales, paleta Bosque, catálogo legible y retratos amplios. Se eliminaron invitaciones repetidas. La acción inferior móvil aparece cuando la principal sale de pantalla y se retira durante el formulario. La página de clientes no ofrece configuración ni compra del SaaS.

El flujo conserva el servicio elegido, pide sucursal explícita cuando corresponde, muestra fecha legible, permite consultar el siguiente día sin horarios y presenta un resumen con precio y duración. Las preferencias y la fotografía quedan en una sección opcional. La confirmación distingue reserva de pago y muestra el profesional asignado por el servidor.

Además se corrigió el inicio de sesión: entrega los campos públicos de identidad guardados para que el dueño vea logo, portada, frase y contacto desde el primer acceso. La respuesta utiliza una lista explícita de campos; no incorpora relaciones privadas de facturación o cuentas.

## Evidencia funcional

- Reserva desde móvil emulado: Corte clásico, Alex, 12 de octubre de 2026 a las 10:00, 30 minutos, $200 ficticios. Doble clic en confirmar produjo **una sola cita**, folio `RES-7228C8E8E33745F8`.
- Se comprobó persistencia en la base aislada, asignación y agenda correcta. El dueño abrió la referencia privada. La agenda no devuelve los bytes de la foto; la consulta pública no devuelve foto, teléfono, preferencias privadas ni token.
- Teléfono inválido fue rechazado antes de enviar. El aviso de privacidad no perdió los datos del formulario; al cerrar con Escape devuelve el foco al botón que lo abrió.
- Servicio global con dos sucursales temporales exigió elección explícita y mostró únicamente el profesional de la sucursal elegida. Las variantes temporales se restauraron al terminar; no generaron citas adicionales.
- Inicio de sesión nuevo muestra identidad completa. Desde configuración se guardó Tinta, se verificó tras recargar y en la página pública. Después se restauró Bosque. Portada y perfiles conservan sus valores.
- El dueño accede a su página y vuelve al panel sin perder sesión. Una sesión de otro negocio no recibió el botón de panel del negocio de la demo.

Verificación final: [recorrido.json](recorrido.json). Los archivos no contienen enlaces privados de recuperación ni fotografías de personas reales.

## Pruebas ejecutadas

| Área | Resultado |
| --- | --- |
| Recuperación del cliente (`test_booking_client_recovery.js`) | 8/8 |
| Retención del intento (`test_public_booking_intent.js`) | 11/11 |
| Referencia privada (`test_cut_reference.js`) | 17/17 |
| Integridad, conflicto e idempotencia (`test_booking_integrity.js`) | 20/20 |
| Personalización e identidad al iniciar sesión (`test_booking_personalization.js`) | 16/16 |
| Total de casos automatizados distintos | **72/72** |
| Compilación web y API | Correcta |

Los casos se ejecutaron con clientes Prisma y bases de pruebas aislados. El recorrido de navegador y el verificador de la demo complementan estas suites; no se cuentan como casos adicionales para inflar el total.

Se reutiliza la evidencia previa del recorrido de cobro, custodia, comisión y corte en `docs/scrum/ST43_QA.md` y `docs/scrum/evidencia/st43-20261009/`. Esta ejecución no repitió todo el POS y no altera esas operaciones.

## Revisión visual y accesibilidad acotada

Se revisaron 375, 390, 768 y 1440 px emulados. No hubo desplazamiento horizontal. Los textos largos y las imágenes fallidas mantienen el recorrido; se corrigió un encabezado que crecía demasiado. Se comprobó foco de teclado y cierre de privacidad. Esto no es una auditoría completa de accesibilidad.

Contraste calculado mediante luminancia sRGB sobre colores observados en la demo Bosque:

| Combinación | Relación |
| --- | --- |
| Blanco / verde #183B32 | 12.28:1 |
| Texto claro #ECF1EE / verde | 10.75:1 |
| Secundario #586761 / fondo #F7F9F8 | 5.63:1 |
| Tinta #182220 / fondo | 15.41:1 |
| Sucursal #52645A / blanco | 6.31:1 |
| Mi reserva #44403C / #F5F5F4 | 9.42:1 |

Son pares principales del tema Bosque; no certifican todos los estados ni temas. El cobre se usa como detalle decorativo.

Capturas: [portada](portada.png), [escritorio completo](escritorio.png), [móvil completo](movil.png), [texto largo y fallback](texto-largo-fallback.png), [agenda](agenda.png), [referencia privada ficticia](referencia-privada.png), [antes](antes.png). La captura anterior corresponde a DV-R01; la posterior a la nueva fixture comercial, por lo que no representa el mismo contenido antes y después.

## Carga y assets

Foto local ~72 kB; fuentes locales ~54 kB en total, SVG de perfiles menores a 1 kB cada uno. Fuentes con licencias SIL OFL incluidas y procedencia en `apps/web/public/demo-reservas/ASSETS.md`. La portada tiene prioridad de carga; el funcionamiento no depende de solicitar fuentes externas.

Compilación: CSS 84.60 kB (16.01 gzip), JS 697.16 kB (189.98 gzip). Persiste la advertencia del bundle JavaScript superior a 500 kB. No se midieron Core Web Vitals ni latencia en un teléfono físico.

## Pendientes y punto de continuación

1. Comprobar zoom real del navegador al 200% y todos los estados de contraste/foco. Los tamaños emulados no sustituyen esa prueba. La captura móvil final está comprobada a 390 px reales de viewport.
2. Recorrido en celular físico y una sesión observada con un dueño; validar comprensión y duración, sin prometer un ahorro todavía no medido.
3. Revisar el texto legal compartido antes de producción: contiene datos/contactos de ejemplo y afirmaciones sobre comunicaciones y ejercicio de derechos que deben corresponder al servicio real.
4. Medir carga con red móvil y abordar división del bundle si las mediciones lo requieren.
5. Mantener las puertas de despliegue, restauración, correo real, licencias, fiscalidad e impresión física en sus historias respectivas.

La UI y el recorrido local están preparados para enseñar. **No se marcaron ST-31/ST-44 completas**, no se certifica producción y no se repetirán automáticamente las pruebas por la programación de hoy. Continuar con los pendientes anteriores sobre la misma fixture, evitando crear otro negocio o una segunda cita solo para aparentar actividad.

## Guion corto para enseñar

1. Abrir la URL pública y mostrar precio, duración y tres perfiles ficticios.
2. Elegir un servicio, profesional y horario disponible. Mostrar preferencias opcionales; no repetir confirmación si ya hay una reserva confirmada.
3. Enseñar la cita existente del 12 de octubre en la agenda del dueño, su importe y su referencia privada.
4. Mostrar configuración: portada, paleta, encuadre y secciones. Cambiar una opción y recargar la página pública; restaurar Bosque al cerrar la demo.
5. Explicar que es una demo local ficticia; pago y mensajes automáticos no ocurrieron.
