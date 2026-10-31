import { z } from 'zod';

export const bookingPersonalizationSchema = z.object({
  tema: z.enum(['bosque', 'tinta', 'oceano', 'silla']),
  portada: z.enum(['editorial', 'compacta', 'inmersiva', 'cartel']),
  tituloPortada: z.string().trim().max(100).optional(),
  textoPortada: z.string().trim().max(240).optional(),
  colorMarca: z.string().regex(/^#[\da-f]{6}$/i).or(z.literal('')).optional(),
  colorFondo: z.string().regex(/^#[\da-f]{6}$/i).or(z.literal('')).optional(),
  tipografia: z.enum(['condensada', 'elegante', 'moderna']).optional(),
  tratamientoFoto: z.enum(['color', 'mono']).optional(),
  estiloServicios: z.enum(['tarjetas', 'lista']).optional(),
  formaBotones: z.enum(['suave', 'recta', 'redonda']).optional(),
  ordenSecciones: z.array(z.enum(['servicios', 'equipo', 'historia', 'galeria', 'contacto'])).length(5).refine(items => new Set(items).size === 5, 'Incluye cada sección una vez').optional(),
  fotosServicios: z.record(z.string().uuid(), z.string().trim().max(2000).refine(value => {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.hash
      && !/\/api\/|\/(?:citas?|reservas?)\/[^/]+\/(?:referencia|foto)|\/referencias?\/|\/cita\/|\/cut-reference/i.test(decodeURIComponent(url.pathname))
      && !Array.from(url.searchParams.keys()).some(key => /token|secret|signature|auth|api.?key|credential/i.test(key)); }
    catch { return false; }
  }, 'Usa una fotografía pública HTTPS sin claves ni referencias privadas.')).refine(value => Object.keys(value).length <= 200).optional(),
  tituloServicios: z.string().trim().max(100).optional(),
  tituloEquipo: z.string().trim().max(100).optional(),
  tituloHistoria: z.string().trim().max(100).optional(),
  tituloContacto: z.string().trim().max(100).optional(),
  posicionPortada: z.enum(['center', 'top', 'bottom']),
  mostrarEquipo: z.boolean(),
  mostrarServicios: z.boolean(),
  mostrarHistoria: z.boolean(),
  mostrarContacto: z.boolean(),
  textoBoton: z.string().trim().min(1).max(32),
  mensajeBienvenida: z.string().trim().max(180),
  mostrarGaleria: z.boolean().default(false),
  galeria: z.array(z.object({
    id: z.string().uuid(), title: z.string().trim().min(1).max(120), alt: z.string().trim().min(1).max(180), visible: z.boolean(),
    url: z.string().trim().max(2000).refine(value => {
      try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password
        && !url.hash && !/\/api\/|\/(?:citas?|reservas?)\/[^/]+\/(?:referencia|foto)|\/referencias?\/|\/cita\/|\/cut-reference/i.test(decodeURIComponent(url.pathname))
        && !Array.from(url.searchParams.keys()).some(key => /token|secret|signature|auth|api.?key|credential/i.test(key)); }
      catch { return false; }
    }, 'Usa un enlace HTTPS público de una foto autorizada, sin claves ni referencias privadas.')
  }).strict()).max(12).refine(items => new Set(items.map(item => item.id)).size === items.length, 'Cada foto debe tener una referencia distinta').default([]),
  instruccionesLlegada: z.string().trim().max(1000).default(''),
  politicasInformativas: z.string().trim().max(1500).default(''),
  descripcionesServicios: z.record(z.string().uuid(), z.string().trim().max(500)).refine(value => Object.keys(value).length <= 200, 'Máximo 200 descripciones de servicios').default({})
}).strict();

export type BookingPersonalization = z.infer<typeof bookingPersonalizationSchema>;
export const defaultBookingPersonalization: BookingPersonalization = {
  tema: 'bosque', portada: 'editorial', posicionPortada: 'center',
  tituloPortada: '', textoPortada: '', colorMarca: '', colorFondo: '', tipografia: 'condensada', tratamientoFoto: 'mono', estiloServicios: 'tarjetas', formaBotones: 'suave',
  ordenSecciones: ['servicios', 'equipo', 'historia', 'galeria', 'contacto'], fotosServicios: {}, tituloServicios: '', tituloEquipo: '', tituloHistoria: '', tituloContacto: '',
  mostrarEquipo: true, mostrarServicios: true, mostrarHistoria: true, mostrarContacto: true,
  textoBoton: 'Reservar cita', mensajeBienvenida: '', descripcionesServicios: {},
  mostrarGaleria: false, galeria: [], instruccionesLlegada: '', politicasInformativas: ''
};

// Zod applies inner defaults even to partial objects; patches must preserve omitted stored fields.
const bookingPersonalizationPatchSchema = bookingPersonalizationSchema.partial().extend({
  mostrarGaleria: bookingPersonalizationSchema.shape.mostrarGaleria.unwrap().optional(),
  galeria: bookingPersonalizationSchema.shape.galeria.unwrap().optional(),
  instruccionesLlegada: bookingPersonalizationSchema.shape.instruccionesLlegada.unwrap().optional(),
  politicasInformativas: bookingPersonalizationSchema.shape.politicasInformativas.unwrap().optional(),
  descripcionesServicios: bookingPersonalizationSchema.shape.descripcionesServicios.unwrap().optional()
});

/** Legacy rows and malformed stored values receive safe, field-level defaults. */
export function normalizeBookingPersonalization(value: unknown): BookingPersonalization {
  let parsed = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value); } catch { parsed = null; }
  }
  const result = { ...defaultBookingPersonalization };
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return result;
  for (const key of Object.keys(result) as Array<keyof BookingPersonalization>) {
    const field = bookingPersonalizationSchema.shape[key].safeParse((parsed as Record<string, unknown>)[key]);
    if (field.success && field.data !== undefined) (result as Record<string, unknown>)[key] = field.data;
  }
  return result;
}

export function tenantWithPersonalization<T extends object>(tenant: T): T & { personalizacionWeb: BookingPersonalization } {
  return { ...tenant, personalizacionWeb: normalizeBookingPersonalization((tenant as any).personalizacionWeb) };
}

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
export const optionalSafeWebUrl = z.string().trim().max(2048).refine(value => {
  if (value === '') return true;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
}, 'Usa una dirección completa que empiece con https:// o http://').nullable().optional();

/** Store one safe official URL while allowing the owner's familiar @handle input. */
const optionalSocialUrl = (provider: 'instagram' | 'facebook' | 'tiktok') => {
  const domain = `${provider}.com`;
  const hosts = provider === 'facebook' ? [domain, `www.${domain}`, `m.${domain}`, `web.${domain}`] : [domain, `www.${domain}`, `m.${domain}`];
  return z.string().trim().max(2048).transform((value, ctx) => {
    if (!value) return '';
    const reject = () => { ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Escribe tu @usuario o un enlace oficial de ${provider}.com` }); return z.NEVER; };
    if (/\s|[\\\u0000-\u001f\u007f]/.test(value)) return reject();
    // Short usernames may contain dots, but a domain-looking string is never silently accepted as a handle.
    if (/^@?[a-zA-Z0-9._]+$/.test(value) && !/\.(?:com|net|org|invalid|mx)$/i.test(value)) {
      const handle = value.replace(/^@/, '');
      const max = provider === 'instagram' ? 30 : provider === 'tiktok' ? 24 : 80;
      if (!handle || handle.length > max || /^\.|\.$|\.\./.test(handle)) return reject();
      return `https://${domain}/${provider === 'tiktok' ? '@' : ''}${handle}`;
    }
    const source = /^https?:\/\//i.test(value) ? value : hosts.some(host => value.toLowerCase().startsWith(host + '/')) ? 'https://' + value : null;
    if (!source) return reject();
    try {
      const url = new URL(source);
      if (!['http:', 'https:'].includes(url.protocol) || !hosts.includes(url.hostname.toLowerCase()) || url.username || url.password || url.port || !url.pathname || url.pathname === '/') return reject();
      url.protocol = 'https:';
      return url.toString();
    } catch { return reject(); }
  }).nullable().optional();
};

export const tenantSettingsSchema = z.object({
  nombre: z.string().trim().min(2).max(120).optional(),
  telefono: optionalText(32),
  emailContacto: z.string().trim().max(254).email().or(z.literal('')).nullable().optional(),
  direccion: optionalText(300),
  logoUrl: optionalSafeWebUrl, portadaUrl: optionalSafeWebUrl,
  slug: z.string().trim().toLowerCase().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa letras minúsculas, números y guiones entre palabras').optional(),
  slogan: optionalText(180), descripcion: optionalText(3000),
  instagram: optionalSocialUrl('instagram'), facebook: optionalSocialUrl('facebook'), tiktok: optionalSocialUrl('tiktok'),
  whatsappPublico: z.string().trim().max(24).regex(/^[+\d\s()-]*$/, 'Usa un número de teléfono').nullable().optional(),
  personalizacionWeb: bookingPersonalizationPatchSchema.optional()
}).refine(value => Object.keys(value).length > 0, 'Envía al menos una opción de configuración');
