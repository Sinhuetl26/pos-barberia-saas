# Configurar las conexiones con ayuda

Primero usar cuentas de prueba. Las claves no se pegan en el chat ni se incluyen en Git; se guardan en la configuración local/servidor o gestor de secretos del alojamiento.

## 1. Stripe: licencia de SYSTECH

Registro oficial: https://dashboard.stripe.com/register

1. El titular crea su cuenta con su correo y completa personalmente contraseña, verificación y cualquier aceptación contractual.
2. Mantener la cuenta en sandbox; no activar cobros ni proporcionar datos bancarios para esta prueba.
3. Obtener la clave secreta de pruebas y guardarla como `STRIPE_SECRET_KEY` en el servidor. La firma del listener/webhook se guarda como `STRIPE_WEBHOOK_SECRET`.
4. Configurar `APP_URL` y `CORS_ORIGINS`. El webhook receptor es `/api/suscripcion/webhook`; la aplicación vuelve a `/app/suscripcion`.
5. La versión del SDK actual usa eventos de la API **2023-08-16**. Mantener el endpoint alineado hasta realizar una actualización controlada del SDK y los payloads.
6. Probar checkout, renovación, impago, recuperación, cancelación, duplicado y reintento. Probar también cambios desde el portal; su sincronización completa sigue pendiente.
7. Revisar precios estables, promociones y límites. No activar producción hasta completar los pendientes de licencias de `REINVENTAR_SYSTECH.md`.

Para pruebas locales de webhooks se necesita un listener como Stripe CLI. La documentación oficial indica cómo reenviar eventos a localhost: https://docs.stripe.com/webhooks

### Conexión local de prueba preparada

La clave autorizada se guarda en `.env.stripe-test`, excluido de Git. Los precios mensuales del catálogo de prueba son Studio Básico (499 MXN) y Studio Pro (999 MXN). La API comprueba moneda, importe, vigencia e intervalo antes de usar un precio configurado. Estos importes aún requieren validación comercial.

`npm run demo:stripe` inicia datos ficticios y carga exclusivamente la conexión de Stripe de prueba de ese archivo. Rechaza claves de modo activo, desactiva el programador y exige firmas de webhook. No usa la base del negocio ni conecta otros proveedores.

Se completó un Checkout con la tarjeta ficticia de Stripe y se verificó la activación automática de Studio Básico a 499 MXN/mes, los límites del plan y el próximo periodo de Stripe. Los avisos `checkout.session.completed` e `invoice.paid` recibieron HTTP 200. La prueba adicional rechazó firmas ausentes/incorrectas, ignoró el evento duplicado y verificó factura antes de checkout en una base desechable. Evidencia sin secretos: `STRIPE_PRUEBA_VERIFICADA.json`.

Para repetir la conexión local:

1. Instalar la herramienta oficial dentro del proyecto: `npm install --prefix .tools/stripe --no-save --package-lock=false @stripe/cli@1.53.0`.
2. Ejecutar `npm run stripe:listen`. Guarda la firma en `.env.stripe-test` sin imprimirla. Usa la clave existente mediante una variable de entorno; no crea accesos adicionales ni requiere login.
3. Cuando indique que los avisos están conectados, iniciar `npm run demo:stripe` y el frontend de demostración.
4. Completar un Checkout con datos ficticios y comprobar el estado de la licencia. `npm run stripe:verify` comprueba un pago ya completado, firmas, duplicados y orden de eventos, sin generar otro pago.

La API de demostración y el listener deben permanecer abiertos para recibir eventos. Para producción se necesita desplegar un receptor HTTPS permanente y registrar su propio endpoint/firma en Stripe; la firma local no sirve para ese endpoint. La actualización general de planes desde el portal, cancelaciones fuera de orden, concurrencia de Checkouts y el ciclo completo de impagos aún requieren trabajo antes del lanzamiento.

## 2. Resend: recibos por correo

Registro: https://resend.com/signup

1. Crear la cuenta y añadir un dominio del que seas titular.
2. Copiar los registros DNS que muestre Resend en el administrador del dominio. Confirmar su verificación.
3. Guardar `RESEND_API_KEY` y `EMAIL_FROM` en el servidor.
4. Enviar un recibo de prueba exclusivamente a una dirección autorizada. Comprobar envío, recepción y error deliberado.

## 3. Meta: WhatsApp

Inicio: https://business.facebook.com/

Preparar empresa, número y plantillas. Para comercializarlo a varias barberías todavía hay que implementar conexión aislada por negocio, callbacks firmados y estados de entrega. No configurar un número global como si perteneciera a todos los negocios. Usar enlaces manuales en el piloto hasta terminar ese trabajo.

## 4. Facturapi: comprobantes fiscales

Registro: https://www.facturapi.io/register

Crear cuenta y una organización de prueba. Una barbería que factura necesita su propia organización/RFC y completar los requisitos del proveedor. No introducir certificados reales ni emitir comprobantes hasta que exista el flujo por emisor con persistencia e idempotencia y lo revise el contador.

La facturación de las licencias de SYSTECH y la facturación de los servicios de cada barbería son procesos distintos.

## Demostración local

`npm run demo:api` crea una base desechable con negocios ficticios en el puerto 3101. No usa la base de trabajo ni activa envíos automáticos. El frontend debe iniciarse con `VITE_API_URL=http://localhost:3101/api` y `npm run dev --workspace=@systech/web -- --host 127.0.0.1 --port 5178 --strictPort`.

Cuenta ficticia incluida por el seed: `dueno@elbigote.com`, contraseña `Dueno123!`. Solo sirve para esta demostración aislada; no habilitarla en producción. Al detener el proceso normalmente, su base se elimina.
