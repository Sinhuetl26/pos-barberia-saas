# Correo de SYSTECH · conexión y prueba real pendiente

Preparado el 2026-10-08. El conector local está implementado; dominio, cuenta del proveedor y prueba externa todavía pendientes. No contratar servicios ni enviar a terceros como parte de las pruebas locales.

1. Con Sinhue, elegir su dominio y remitente; comprobar precio y renovación antes de comprar. Separar correo de acceso de SYSTECH de comunicaciones emitidas con identidad de cada barbería.
2. Crear/conectar Resend y agregar el dominio exacto del remitente. Copiar los valores DNS que entregue el proveedor: no inventar registros ni añadir un segundo SPF para el mismo nombre. Verificar dominio, SPF y DKIM y revisar la política DMARC con los demás servicios del dominio. Publicación de DMARC no equivale a política aprobada.
3. Configurar únicamente en el servidor `RESEND_API_KEY`, `EMAIL_FROM`, `RESEND_DOMAIN_ID`, `APP_URL` público seguro y `RESEND_WEBHOOK_SECRET`. El panel consultará el dominio; la credencial debe permitir esa lectura además de enviar. Usar alcance mínimo compatible y guardar secretos fuera de Git. Un identificador/clave presente no acredita conectividad.
4. Crear el webhook hacia `https://DOMINIO-DE-LA-APP/api/mail/webhook/resend` y seleccionar envío, entrega, retraso, rebote, spam, fallo y supresión. Copiar su secreto de firma al servidor. Verificar que un evento auténtico llega y uno alterado se rechaza; no exponer tokens de acceso en URL o evidencia.
5. Con destinatario autorizado por Sinhue, realizar una verificación o invitación. Registrar envío aceptado, evento de entrega, apertura de la bandeja y consumo del enlace. `email.delivered` indica aceptación por el servidor destinatario; no demuestra bandeja principal. Guardar evidencia sin contraseña, token, cuerpo privado ni claves.
6. Probar rebote/supresión mediante el mecanismo de prueba oficial del proveedor o una dirección de prueba bajo control autorizado. Comprobar estado negativo y que un nuevo envío queda suprimido. No provocar spam contra terceros. Si una dirección legítima rebota, investigar antes de retirar su supresión; el sistema no la libera automáticamente.
7. Revisar la evidencia y registrar aceptación externa en ST-08. La pantalla mantiene prueba real pendiente de evidencia: esa certificación no se deduce automáticamente de un evento aislado. Preparar actualización de esa indicación al incorporar el registro de certificación; no cerrar el criterio mientras siga ausente.

Fuentes oficiales usadas en la implementación: [verificación de webhooks](https://resend.com/docs/webhooks/verify-webhooks-requests) y [eventos de correo](https://resend.com/docs/webhooks/event-types). La verificación debe usar el cuerpo original y las cabeceras firmadas; su semántica separa aceptación, entrega y fallos.

Migración operativa, HTTPS, despliegue, respaldos y observabilidad conservan sus propias historias. La prueba local con proveedor controlado y DNS simulado no sustituye este recorrido.
