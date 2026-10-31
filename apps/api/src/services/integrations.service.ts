export type ConnectorStatus = 'missing' | 'sandbox' | 'configured' | 'planned';
import { configuredValue, publicAppOrigin, licenseCheckoutReadiness } from './provider-config.service';
export { configuredValue } from './provider-config.service';

// Configuration is not proof of delivery, a successful charge, or fiscal validity.
// Never return credential values to the browser.
export function getIntegrationCatalog(env: NodeJS.ProcessEnv = process.env) {
  const stripeKey = configuredValue(env.STRIPE_SECRET_KEY);
  const stripeWebhook = configuredValue(env.STRIPE_WEBHOOK_SECRET);
  let originReady = true;
  try { publicAppOrigin(env); } catch { originReady = false; }
  const mail = configuredValue(env.RESEND_API_KEY) && /^re_/.test(env.RESEND_API_KEY || '') && configuredValue(env.EMAIL_FROM) && originReady;
  const licenseChecks = ['BASICO', 'PRO', 'CADENA'].map(code => licenseCheckoutReadiness(code, env));
  const stripeReady = stripeKey && stripeWebhook && licenseChecks.every(check => check.ready);
  const whatsapp = configuredValue(env.META_WA_ACCESS_TOKEN || env.WHATSAPP_API_TOKEN)
    && configuredValue(env.META_WA_PHONE_NUMBER_ID || env.WHATSAPP_PHONE_NUMBER_ID);
  return [
    {
      id: 'stripe', name: 'Stripe Billing', category: 'Licencias', available: true,
      status: !stripeReady ? 'missing' : env.NODE_ENV === 'production' ? 'configured' : 'sandbox',
      configurationIssues: [...new Set(licenseChecks.flatMap(check => check.issues))],
      description: 'Cobra la licencia de SYSTECH y permite administrar tarjetas y cancelaciones.',
      detail: 'La licencia es independiente de los cobros que realiza cada barbería a sus clientes.',
      steps: ['Crear la cuenta de tu empresa en Stripe.', 'Configurar la clave del servidor y la firma del webhook.', 'Probar alta, renovación, pago fallido y cancelación antes de activar cobros reales.'],
      docsUrl: 'https://docs.stripe.com/billing', actionLabel: 'Abrir Stripe', actionUrl: 'https://dashboard.stripe.com/register',
    },
    {
      id: 'resend', name: 'Resend', category: 'Correo', available: true,
      status: mail ? 'configured' : 'missing',
      description: 'Envía enlaces de acceso y recibos digitales desde el dominio de tu marca.',
      configurationIssues: [!configuredValue(env.RESEND_API_KEY) || !/^re_/.test(env.RESEND_API_KEY || '') ? 'Configurar el proveedor de correo.' : '', !configuredValue(env.EMAIL_FROM) ? 'Configurar el remitente de correo.' : '', !originReady ? 'Configurar el dominio público seguro.' : ''].filter(Boolean),
      detail: 'Configuración no acredita entrega. Revisa dominio, SPF/DKIM, DMARC y estados firmados de entrega o rebote. Las claves permanecen en el servidor.',
      steps: ['Crear una cuenta en Resend.', 'Verificar tu dominio y definir el correo remitente.', 'Configurar la clave y hacer una prueba de recibo con un destinatario autorizado.'],
      docsUrl: 'https://resend.com/docs/introduction', actionLabel: 'Abrir Resend', actionUrl: 'https://resend.com/signup',
    },
    {
      id: 'whatsapp', name: 'WhatsApp Business', category: 'Agenda', available: false,
      status: whatsapp ? 'sandbox' : 'missing',
      description: 'Confirma reservas y recuerda las citas con la identidad de cada barbería.',
      detail: 'El conector actual usa un número global. Faltan conexión por barbería, plantillas aprobadas y seguimiento de entrega. Los enlaces manuales sí están disponibles.',
      steps: ['Crear Meta Business y registrar el número de WhatsApp Business.', 'Aprobar las plantillas de confirmación y recordatorio.', 'Implementar conexión por barbería y webhooks firmados antes de automatizar envíos.'],
      docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api', actionLabel: 'Abrir Meta Business', actionUrl: 'https://business.facebook.com/',
    },
    {
      id: 'facturapi', name: 'Facturapi', category: 'Facturación México', available: false,
      status: configuredValue(env.FACTURAPI_KEY) ? 'sandbox' : 'missing',
      description: 'Emite facturas con el RFC de la barbería que realizó la venta.',
      detail: 'El servicio existente necesita organización y certificado por emisor, persistencia e idempotencia fiscal antes de ofrecerse comercialmente.',
      steps: ['Crear cuenta de Facturapi.', 'Dar de alta una organización por RFC emisor y completar su configuración fiscal.', 'Implementar emisión, descarga y cancelación por barbería; validar con el contador.'],
      docsUrl: 'https://docs.facturapi.io/en/docs/guides/organizations/', actionLabel: 'Abrir Facturapi', actionUrl: 'https://www.facturapi.io/register',
    },
    {
      id: 'payments', name: 'Pagos en la barbería', category: 'Cobro', available: false, status: 'planned',
      description: 'Anticipos para reservar y conciliación de pagos con terminal.',
      detail: 'El POS registra tarjeta y transferencia, pero todavía no verifica esos pagos con una pasarela. Requiere cuentas de comercio por barbería.',
      steps: ['Definir el proveedor y la terminal que usarán los pilotos.', 'Separar los fondos de cada comercio de las licencias de SYSTECH.', 'Integrar anticipos, devolución y conciliación con webhooks.'],
      docsUrl: 'https://docs.stripe.com/connect', actionLabel: 'Ver opciones', actionUrl: 'https://docs.stripe.com/connect',
    },
    {
      id: 'calendar', name: 'Google Calendar', category: 'Productividad', available: false, status: 'planned',
      description: 'Consulta los turnos desde el calendario del barbero.',
      detail: 'Pendiente: autorización por usuario, renovación de acceso y resolución de cambios en ambas agendas.',
      steps: ['Definir si el primer lanzamiento necesita sincronización.', 'Crear la aplicación de Google y configurar consentimiento.', 'Probar cancelaciones, conflictos y desconexión por usuario.'],
      docsUrl: 'https://developers.google.com/calendar/api/guides/overview', actionLabel: 'Ver integración', actionUrl: 'https://developers.google.com/calendar/api/guides/overview',
    },
  ] as const;
}
