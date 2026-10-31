export interface BookingAppearance {
  tema: 'bosque' | 'tinta' | 'oceano' | 'silla';
  portada: 'editorial' | 'compacta' | 'inmersiva' | 'cartel';
  tituloPortada: string;
  textoPortada: string;
  colorMarca: string;
  colorFondo: string;
  tipografia: 'condensada' | 'elegante' | 'moderna';
  tratamientoFoto: 'color' | 'mono';
  estiloServicios: 'tarjetas' | 'lista';
  formaBotones: 'suave' | 'recta' | 'redonda';
  ordenSecciones: BookingSection[];
  fotosServicios: Record<string, string>;
  tituloServicios: string;
  tituloEquipo: string;
  tituloHistoria: string;
  tituloContacto: string;
  posicionPortada: 'center' | 'top' | 'bottom';
  mostrarEquipo: boolean;
  mostrarServicios: boolean;
  mostrarHistoria: boolean;
  mostrarContacto: boolean;
  textoBoton: string;
  mensajeBienvenida: string;
  descripcionesServicios: Record<string, string>;
  mostrarGaleria: boolean;
  galeria: { id: string; url: string; title: string; alt: string; visible: boolean }[];
  instruccionesLlegada: string;
  politicasInformativas: string;
}
export const bookingSections = { servicios: 'Servicios', equipo: 'Equipo', historia: 'Historia', galeria: 'Galería', contacto: 'Contacto' };
export type BookingSection = keyof typeof bookingSections;
export const defaultSectionOrder = Object.keys(bookingSections) as BookingSection[];
export function bookingSectionOrder(raw: unknown): BookingSection[] {
  return [...new Set([...(Array.isArray(raw) ? raw.filter(key => typeof key === 'string' && Object.prototype.hasOwnProperty.call(bookingSections, key)) as BookingSection[] : []), ...defaultSectionOrder])];
}
export function colorInk(hex: string): string {
  if (!/^#[\da-f]{6}$/i.test(hex)) return '#000000';
  const channels = hex.replace('#', '').match(/../g)!.map(value => { const c = parseInt(value, 16) / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2] > .179 ? '#000000' : '#ffffff';
}
export const defaultBookingAppearance: BookingAppearance = {
  tema: 'bosque', portada: 'editorial', posicionPortada: 'center',
  tituloPortada: '', textoPortada: '', colorMarca: '', colorFondo: '', tipografia: 'condensada', tratamientoFoto: 'mono', estiloServicios: 'tarjetas', formaBotones: 'suave',
  ordenSecciones: defaultSectionOrder, fotosServicios: {}, tituloServicios: '', tituloEquipo: '', tituloHistoria: '', tituloContacto: '',
  mostrarEquipo: true, mostrarServicios: true, mostrarHistoria: true, mostrarContacto: true,
  textoBoton: 'Reservar cita', mensajeBienvenida: '', descripcionesServicios: {},
  mostrarGaleria: false, galeria: [], instruccionesLlegada: '', politicasInformativas: '',
};
export function publicGalleryUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 2000) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || /\/api\/|\/(?:citas?|reservas?)\/[^/]+\/(?:referencia|foto)|\/referencias?\/|\/cita\/|\/cut-reference/i.test(decodeURIComponent(url.pathname)) || [...url.searchParams.keys()].some(key => /token|secret|signature|auth|api.?key|credential/i.test(key))) return null;
    return url.href;
  } catch { return null; }
}
export function bookingAppearance(raw: unknown): BookingAppearance {
  let value = raw;
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { value = null; } }
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    ...defaultBookingAppearance,
    tema: ['bosque', 'tinta', 'oceano', 'silla'].includes(String(data.tema)) ? data.tema as BookingAppearance['tema'] : 'bosque',
    portada: ['editorial', 'compacta', 'inmersiva', 'cartel'].includes(String(data.portada)) ? data.portada as BookingAppearance['portada'] : 'editorial',
    ...Object.fromEntries(['tituloPortada', 'textoPortada', 'tituloServicios', 'tituloEquipo', 'tituloHistoria', 'tituloContacto'].map(key => [key, typeof data[key] === 'string' ? data[key].trim().slice(0, key === 'textoPortada' ? 240 : 100) : ''])),
    colorMarca: typeof data.colorMarca === 'string' && /^#[\da-f]{6}$/i.test(data.colorMarca) ? data.colorMarca : '',
    colorFondo: typeof data.colorFondo === 'string' && /^#[\da-f]{6}$/i.test(data.colorFondo) ? data.colorFondo : '',
    tipografia: ['condensada', 'elegante', 'moderna'].includes(String(data.tipografia)) ? data.tipografia as BookingAppearance['tipografia'] : 'condensada',
    tratamientoFoto: data.tratamientoFoto === 'color' ? 'color' : 'mono',
    estiloServicios: data.estiloServicios === 'lista' ? 'lista' : 'tarjetas',
    formaBotones: ['suave', 'recta', 'redonda'].includes(String(data.formaBotones)) ? data.formaBotones as BookingAppearance['formaBotones'] : 'suave',
    ordenSecciones: bookingSectionOrder(data.ordenSecciones),
    fotosServicios: Object.fromEntries(Object.entries(data.fotosServicios && typeof data.fotosServicios === 'object' && !Array.isArray(data.fotosServicios) ? data.fotosServicios : {}).filter(([id, url]) => /^[\da-f-]{36}$/i.test(id) && publicGalleryUrl(url)).slice(0, 200).map(([id, url]) => [id, publicGalleryUrl(url)!])),
    posicionPortada: ['center', 'top', 'bottom'].includes(String(data.posicionPortada)) ? data.posicionPortada as BookingAppearance['posicionPortada'] : 'center',
    ...Object.fromEntries(['mostrarEquipo', 'mostrarServicios', 'mostrarHistoria', 'mostrarContacto'].map(key => [key, typeof data[key] === 'boolean' ? data[key] : true])),
    textoBoton: typeof data.textoBoton === 'string' && data.textoBoton.trim() ? data.textoBoton.trim().slice(0, 32) : 'Reservar cita',
    mensajeBienvenida: typeof data.mensajeBienvenida === 'string' ? data.mensajeBienvenida.slice(0, 180) : '',
    descripcionesServicios: Object.fromEntries(Object.entries(data.descripcionesServicios && typeof data.descripcionesServicios === 'object' && !Array.isArray(data.descripcionesServicios) ? data.descripcionesServicios : {}).filter(([key, value]) => /^[\da-f-]{36}$/i.test(key) && typeof value === 'string').slice(0, 200).map(([key,value]) => [key, String(value).slice(0,500)])),
    mostrarGaleria: data.mostrarGaleria === true,
    galeria: (Array.isArray(data.galeria) ? data.galeria : []).slice(0, 12).filter(item => item && typeof item.id === 'string' && /^[\da-f-]{36}$/i.test(item.id) && publicGalleryUrl(item.url) && typeof item.title === 'string' && item.title.trim() && typeof item.alt === 'string' && item.alt.trim()).map(item => ({ id: item.id, url: publicGalleryUrl(item.url)!, title: item.title.trim().slice(0, 120), alt: item.alt.trim().slice(0, 180), visible: item.visible !== false })),
    instruccionesLlegada: typeof data.instruccionesLlegada === 'string' ? data.instruccionesLlegada.slice(0, 1000) : '',
    politicasInformativas: typeof data.politicasInformativas === 'string' ? data.politicasInformativas.slice(0, 1500) : '',
  };
}
export const bookingThemes = {
  bosque: { name: 'Bosque', primary: '#183b32', accent: '#ad7652', canvas: '#f7f9f8' },
  tinta: { name: 'Tinta', primary: '#292b32', accent: '#d8c6ad', canvas: '#f6f5f2' },
  oceano: { name: 'Océano', primary: '#163c51', accent: '#b8d5d9', canvas: '#f1f6f7' },
  silla: { name: 'Silla azul', primary: '#064ff4', accent: '#141619', canvas: '#faf9f6' },
};
export function bookingTheme(tema: BookingAppearance['tema']) { return bookingThemes[tema] || bookingThemes.bosque; }
