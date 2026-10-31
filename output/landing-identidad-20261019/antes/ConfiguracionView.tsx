import { CSSProperties, FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Building, Check, Clock, Copy, ExternalLink, Globe, Image, MapPin, Palette, Save, Scissors, Users } from 'lucide-react';
import { api } from '../api';
import { Barbero, Producto, Sucursal, Tenant } from '../types';
import { BookingAppearance, bookingAppearance, bookingTheme, bookingThemes, publicGalleryUrl } from '../utils/bookingAppearance';
import '../styles/settings-experience.css';

type Section = 'negocio' | 'apariencia' | 'equipo' | 'contacto' | 'horarios';
type ShopDraft = ReturnType<typeof shopDraft>;
function shopDraft(tenant: Tenant) {
  return { nombre: tenant.nombre || '', slug: tenant.slug || '', telefono: tenant.telefono || '',
    emailContacto: tenant.emailContacto || '', direccion: tenant.direccion || '', logoUrl: tenant.logoUrl || '',
    slogan: tenant.slogan || '', descripcion: tenant.descripcion || '', portadaUrl: tenant.portadaUrl || '',
    whatsappPublico: tenant.whatsappPublico || '', instagram: tenant.instagram || '', facebook: tenant.facebook || '',
    tiktok: tenant.tiktok || '', personalizacionWeb: bookingAppearance(tenant.personalizacionWeb) };
}
const sections = [
  { id: 'negocio', title: 'Tu negocio', text: 'Nombre, logo y enlace', icon: Building },
  { id: 'apariencia', title: 'Página de reservas', text: 'Diseño y contenido', icon: Palette },
  { id: 'equipo', title: 'Perfiles del equipo', text: 'Fotos y presentación', icon: Users },
  { id: 'contacto', title: 'Contacto y redes', text: 'Dónde te encuentran', icon: MapPin },
  { id: 'horarios', title: 'Sucursal y horarios', text: 'Cuándo atiendes', icon: Clock },
] as const;
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="settings-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
function ImagePreview({ url, name, className = '' }: { url: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return url && !failed ? <img className={className} src={url} alt={name} onError={() => setFailed(true)} /> : <span className={`settings-image-empty ${className}`}><Image aria-hidden="true" size={24} /><span>{url ? 'No pudimos cargar la imagen' : 'Sin imagen'}</span></span>;
}
function LivePreview({ draft, barbers }: { draft: ShopDraft; barbers: Barbero[] }) {
  const appearance = draft.personalizacionWeb, theme = bookingTheme(appearance.tema);
  const visible = barbers.filter(b => b.activo && b.visibleEnWeb !== false);
  return <aside className="settings-preview" aria-label="Vista previa de la página de reservas">
    <div className="settings-preview-heading"><EyeLabel /><span>Vista previa</span><small>Se aplica al guardar</small></div>
    <div className="settings-preview-browser" style={{ '--preview-primary': theme.primary, '--preview-accent': theme.accent, '--preview-canvas': theme.canvas } as CSSProperties}>
      <div className="settings-preview-brand">{draft.logoUrl ? <ImagePreview url={draft.logoUrl} name="Logo" /> : <Scissors size={18} />}<span>{draft.nombre || 'Nombre de tu barbería'}</span></div>
      <div className={`settings-preview-cover ${appearance.portada === 'compacta' ? 'is-compact' : ''}`}>
        {draft.portadaUrl && <ImagePreview url={draft.portadaUrl} name="Portada" className={`position-${appearance.posicionPortada}`} />}
        <div><h3>{draft.nombre || 'Tu barbería'}</h3><p>{draft.slogan || 'Tu próximo corte empieza aquí.'}</p><span className="settings-preview-cta">{appearance.textoBoton}</span></div>
      </div>
      <div className="settings-preview-body">
        {appearance.mensajeBienvenida && <p>{appearance.mensajeBienvenida}</p>}
        {appearance.mostrarServicios && <div className="settings-preview-line"><strong>Servicios y precios</strong><span>Tu catálogo se muestra aquí</span></div>}
        {appearance.mostrarEquipo && <><strong>Conoce a tu equipo</strong><div className="settings-preview-team">{visible.slice(0, 3).map(b => <div key={b.id}>{b.avatarUrl ? <ImagePreview url={b.avatarUrl} name={b.nombre} /> : <Scissors size={24} />}<span>{b.nombre}</span></div>)}{!visible.length && <p>Los perfiles visibles aparecerán aquí.</p>}</div></>}
        {appearance.mostrarHistoria && draft.descripcion && <div className="settings-preview-line"><strong>Sobre nosotros</strong><p>{draft.descripcion}</p></div>}
        {appearance.mostrarGaleria && appearance.galeria.some(photo => photo.visible) && <div className="settings-preview-line"><strong>Trabajos de la barbería</strong><div className="settings-preview-team">{appearance.galeria.filter(photo => photo.visible).slice(0, 3).map(photo => <div key={photo.id}><ImagePreview url={publicGalleryUrl(photo.url) || ''} name={photo.alt} /><span>{photo.title}</span></div>)}</div></div>}
        {appearance.mostrarContacto && (draft.direccion || draft.telefono || draft.whatsappPublico) && <div className="settings-preview-line"><strong>Encuéntranos</strong><p>{draft.direccion || draft.whatsappPublico || draft.telefono}</p></div>}
      </div>
    </div>
    <p className="settings-preview-note">Esta es una vista resumida del diseño. Abre la página guardada para recorrer la reserva completa.</p>
  </aside>;
}
function EyeLabel() { return <Globe size={16} aria-hidden="true" />; }

function BarberProfile({ barber, onSaved, onDirty, onBusy }: { barber: Barbero; onSaved: (b: Barbero) => void; onDirty: (id: string, dirty: boolean) => void; onBusy: (id: string, busy: boolean) => void }) {
  const initial = { avatarUrl: barber.avatarUrl || '', especialidad: barber.especialidad || '', descripcion: barber.descripcion || '', visibleEnWeb: barber.visibleEnWeb !== false };
  const [form, setForm] = useState(initial), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const saving = useRef(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => { onDirty(barber.id, dirty); }, [dirty, barber.id, onDirty]);
  useEffect(() => { onBusy(barber.id, busy); }, [busy, barber.id, onBusy]);
  useEffect(() => { if (dirty) setMessage(''); }, [form, dirty]);
  async function save(e: FormEvent) {
    e.preventDefault(); if (saving.current || !dirty) return;
    saving.current = true; setBusy(true); setError(''); setMessage('');
    try { const updated = await api.updateBarbero(barber.id, form); const fresh = { ...barber, ...updated }; setForm({ avatarUrl: fresh.avatarUrl || '', especialidad: fresh.especialidad || '', descripcion: fresh.descripcion || '', visibleEnWeb: fresh.visibleEnWeb !== false }); onSaved(fresh); setMessage(`Perfil de ${barber.nombre} guardado.`); }
    catch (e: any) { setError(e.message || 'No pudimos guardar el perfil. Conservamos tus cambios.'); }
    finally { saving.current = false; setBusy(false); }
  }
  return <details className="settings-barber"><summary><ImagePreview url={form.avatarUrl} name={barber.nombre} /><span><strong>{barber.nombre}</strong><small>{barber.sucursal?.nombre || 'Sucursal'} · {!barber.activo ? 'Inactivo' : form.visibleEnWeb ? 'Visible en reservas' : 'Oculto en reservas'}{dirty ? ' · Cambios sin guardar' : ''}</small></span><span className="settings-edit-label">Editar perfil</span></summary>
    <form onSubmit={save}><fieldset disabled={busy}><Field label={`Foto de ${barber.nombre}`} hint="Usa una foto real del profesional. Pega un enlace público https://."><input type="url" value={form.avatarUrl} onChange={e => setForm(f => ({ ...f, avatarUrl: e.target.value }))} placeholder="https://…" /></Field>
      <Field label={`Especialidad de ${barber.nombre}`}><input maxLength={150} value={form.especialidad} onChange={e => setForm(f => ({ ...f, especialidad: e.target.value }))} placeholder="Por ejemplo: degradados y arreglo de barba" /></Field>
      <Field label={`Presentación de ${barber.nombre}`}><textarea rows={3} maxLength={1000} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Cuenta su experiencia y estilo con sus propias palabras." /></Field>
      <label className="settings-toggle"><input type="checkbox" checked={form.visibleEnWeb} onChange={e => setForm(f => ({ ...f, visibleEnWeb: e.target.checked }))} /><span><strong>Mostrar a {barber.nombre} en reservas</strong><small>Los perfiles inactivos permanecen ocultos.</small></span></label>
      <div className="settings-inline-actions"><button type="submit" className="studio-button" disabled={!dirty || busy}>{busy ? 'Guardando…' : 'Guardar este perfil'}</button><button type="button" className="studio-button-secondary" disabled={!dirty || busy} onClick={() => { setForm(initial); setMessage(''); setError(''); }}>Restablecer perfil</button></div>
    </fieldset>{error && <p role="alert" className="settings-error">{error}</p>}{message && <p role="status" className="settings-success">{message}</p>}</form>
  </details>;
}

function BranchSettings({ branch, onSaved, onDirty, onBusy }: { branch: Sucursal; onSaved: (b: Sucursal) => void; onDirty: (dirty: boolean) => void; onBusy: (id: string, busy: boolean) => void }) {
  const initial = { sucursalId: branch.id, nombreSucursal: branch.nombre, direccionSucursal: branch.direccion || '', horarioApertura: branch.horarioApertura || '09:00', horarioCierre: branch.horarioCierre || '20:00', zonaHoraria: branch.zonaHoraria || 'America/Mexico_City', diasLaborales: branch.diasLaborales || 'Lunes a Sábado' };
  const [form, setForm] = useState(initial), [saved, setSaved] = useState(initial), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const saving = useRef(false), dirty = JSON.stringify(form) !== JSON.stringify(saved);
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  useEffect(() => { onBusy(branch.id, busy); }, [busy, branch.id, onBusy]);
  useEffect(() => { if (dirty) setSuccess(''); }, [form, dirty]);
  async function save(e: FormEvent) {
    e.preventDefault(); if (saving.current || !dirty) return;
    if (form.horarioCierre <= form.horarioApertura) { setError('El cierre debe ser posterior a la apertura.'); return; }
    saving.current = true; setBusy(true); setError(''); setSuccess('');
    try { const result = await api.savePreparation(form); setSaved(form); onSaved(result.branch); setSuccess('Sucursal y horarios guardados.'); }
    catch (e: any) { setError(e.message); }
    finally { saving.current = false; setBusy(false); }
  }
  return <form onSubmit={save}><fieldset disabled={busy} className="settings-fields"><Field label="Nombre de la sucursal"><input required minLength={2} maxLength={100} value={form.nombreSucursal} onChange={e => setForm(f => ({ ...f, nombreSucursal: e.target.value }))} /></Field><Field label="Dirección de esta sucursal"><textarea rows={2} maxLength={500} value={form.direccionSucursal} onChange={e => setForm(f => ({ ...f, direccionSucursal: e.target.value }))} /></Field>
    <div className="settings-field-pair"><Field label="Hora de apertura"><input required type="time" value={form.horarioApertura} onChange={e => setForm(f => ({ ...f, horarioApertura: e.target.value }))} /></Field><Field label="Hora de cierre"><input required type="time" value={form.horarioCierre} onChange={e => setForm(f => ({ ...f, horarioCierre: e.target.value }))} /></Field></div>
    <Field label="Días de atención" hint="Ejemplos: Lunes a Sábado, o Lunes, Miércoles, Viernes."><input required maxLength={150} value={form.diasLaborales} onChange={e => setForm(f => ({ ...f, diasLaborales: e.target.value }))} /></Field>
    <Field label="Zona horaria" hint="Determina cómo se muestran y reservan los horarios."><select value={form.zonaHoraria} onChange={e => setForm(f => ({ ...f, zonaHoraria: e.target.value }))}>{[...new Set([form.zonaHoraria, 'America/Mexico_City', 'America/Cancun', 'America/Tijuana', 'America/Hermosillo', 'America/Mazatlan'])].map(zone => <option key={zone}>{zone}</option>)}</select></Field>
    <p className="settings-help">El horario de cada barbero se administra en Equipo y comisiones. La disponibilidad considera también sus descansos y bloqueos.</p>
    <div className="settings-inline-actions"><button type="submit" disabled={!dirty || busy} className="studio-button">{busy ? 'Guardando…' : 'Guardar horarios'}</button><button type="button" disabled={!dirty || busy} onClick={() => { setForm(saved); setError(''); setSuccess(''); }} className="studio-button-secondary">Restablecer</button></div>
  </fieldset>{error && <p role="alert" className="settings-error">{error}</p>}{success && <p role="status" className="settings-success">{success}</p>}</form>;
}

interface Props { tenant: Tenant; branch: Sucursal | null; initialSection?: Section; onTenantUpdated: (tenant: Tenant) => void; onBranchUpdated: (branch: Sucursal) => void; onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void; onNavigate: (view: string) => void }
export function ConfiguracionView({ tenant, branch, initialSection = 'negocio', onTenantUpdated, onBranchUpdated, onDirtyChange, onBusyChange, onNavigate }: Props) {
  const [section, setSection] = useState<Section>(initialSection);
  const [draft, setDraft] = useState(() => shopDraft(tenant)), [saved, setSaved] = useState(() => shopDraft(tenant));
  const [barbers, setBarbers] = useState<Barbero[]>([]), [barberLoading, setBarberLoading] = useState(true), [barberError, setBarberError] = useState(''), [loadVersion, setLoadVersion] = useState(0);
  const [services, setServices] = useState<Producto[]>([]), [servicesError, setServicesError] = useState('');
  useEffect(() => { let active = true; setServicesError(''); api.getProductos({tipo:'SERVICIO'}).then(data => { if(active) setServices(data); }).catch(error => {if(active)setServicesError(error.message);}); return () => {active=false;}; }, [tenant.id,loadVersion]);
  const [profileDirty, setProfileDirty] = useState<Record<string, boolean>>({}), [branchDirty, setBranchDirty] = useState(false);
  const [requestsBusy, setRequestsBusy] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [copied, setCopied] = useState(false);
  const saving = useRef(false), copyTimer = useRef<ReturnType<typeof setTimeout>>();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved), anyDirty = dirty || branchDirty || Object.values(profileDirty).some(Boolean);
  const publicUrl = tenant.slug ? `${window.location.origin}/b/${tenant.slug}` : '';
  const profileDirtyCallback = useRef((id: string, value: boolean) => setProfileDirty(old => old[id] === value ? old : { ...old, [id]: value })).current;
  const busyCallback = useRef((id: string, value: boolean) => setRequestsBusy(old => old[id] === value ? old : { ...old, [id]: value })).current;
  useEffect(() => { onBusyChange(busy || Object.values(requestsBusy).some(Boolean)); }, [busy, requestsBusy, onBusyChange]);
  useEffect(() => { onDirtyChange(anyDirty); }, [anyDirty, onDirtyChange]);
  useEffect(() => () => { onDirtyChange(false); onBusyChange(false); if (copyTimer.current) clearTimeout(copyTimer.current); }, [onDirtyChange, onBusyChange]);
  useEffect(() => { if (!anyDirty) return; const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent); }, [anyDirty]);
  useEffect(() => {
    let active = true; setBarberLoading(true); setBarberError('');
    api.getBarberos().then(data => { if (active) setBarbers(data); }).catch(e => { if (active) setBarberError(e.message); }).finally(() => { if (active) setBarberLoading(false); });
    return () => { active = false; };
  }, [tenant.id, loadVersion]);
  const update = (key: keyof ShopDraft, value: string) => { setDraft(d => ({ ...d, [key]: value })); setMessage(''); };
  const appearance = <K extends keyof BookingAppearance>(key: K, value: BookingAppearance[K]) => { setDraft(d => ({ ...d, personalizacionWeb: { ...d.personalizacionWeb, [key]: value } })); setMessage(''); };
  async function save(e: FormEvent) {
    e.preventDefault(); if (saving.current || !dirty) return;
    saving.current = true; setBusy(true); setError(''); setMessage('');
    if (draft.personalizacionWeb.galeria.some(photo => !publicGalleryUrl(photo.url) || !photo.title.trim() || !photo.alt.trim())) { saving.current = false; setBusy(false); setError('Cada foto requiere enlace público HTTPS, título y descripción accesible. No agregues enlaces privados de clientes. Completa o quita la foto antes de guardar.'); return; }
    const patch = Object.fromEntries(Object.entries(draft).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(saved[key as keyof ShopDraft])));
    try { const result = await api.updateTenantSettings(patch); const fresh = shopDraft(result); setDraft(fresh); setSaved(fresh); onTenantUpdated(result); setMessage('Cambios guardados. Tu página de reservas ya está actualizada.'); }
    catch (e: any) { setError(e.message || 'No pudimos guardar. Conservamos tus cambios para que vuelvas a intentarlo.'); }
    finally { saving.current = false; setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(publicUrl); setCopied(true); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(false), 2400); }
    catch { setError('No pudimos copiar el enlace. Puedes seleccionarlo en la barra de arriba.'); }
  }
  const textField = (key: Exclude<keyof ShopDraft, 'personalizacionWeb'>, label: string, options: { hint?: string; type?: string; max?: number; required?: boolean; placeholder?: string; multiline?: boolean } = {}) => <Field label={label} hint={options.hint}>{options.multiline ? <textarea rows={3} maxLength={options.max || 1000} value={draft[key]} onChange={e => update(key, e.target.value)} placeholder={options.placeholder} /> : <input type={options.type || 'text'} required={options.required} maxLength={options.max || 200} value={draft[key]} onChange={e => update(key, e.target.value)} placeholder={options.placeholder} />}</Field>;
  const selected = sections.find(s => s.id === section)!;
  return <div className="studio-page settings-page">
    <header className="settings-page-heading"><div><h1 className="studio-title">Hazla tuya.</h1><p>La identidad, la página de reservas y los horarios de tu barbería.</p></div><span className="settings-status">{anyDirty ? 'Tienes cambios sin guardar' : 'Configuración guardada'}</span></header>
    <div className="settings-link-bar"><Globe size={18} /><div><strong>El enlace que compartes con tus clientes</strong><span>{publicUrl || 'Guarda un enlace en Tu negocio para compartir tus reservas.'}</span></div><button type="button" disabled={!publicUrl} onClick={copy} className="studio-button-secondary">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copiado' : 'Copiar enlace'}</button>{publicUrl && <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="studio-button-secondary">Ver página guardada <ExternalLink size={15} /></a>}</div>
    <div className="settings-workspace"><nav aria-label="Secciones de configuración" className="settings-tabs">{sections.map(({ id, title, text, icon: Icon }) => <button type="button" key={id} aria-current={section === id ? 'page' : undefined} onClick={() => { setSection(id); setMessage(''); }}><Icon size={18} /><span><strong>{title}</strong><small>{text}</small></span></button>)}</nav>
    <div className="settings-section-workspace">{error && <p role="alert" className="settings-error">{error}</p>}{message && <p role="status" className="settings-success"><Check size={17} />{message}</p>}
    <div className={`settings-layout ${section === 'equipo' || section === 'horarios' ? 'settings-layout-wide' : ''}`}>
      <section className="settings-content"><div className="settings-section-heading"><selected.icon size={23} /><div><h2>{selected.title}</h2><p>{section === 'negocio' ? 'La identidad que tus clientes reconocerán al reservar.' : section === 'apariencia' ? 'Elige el diseño y la información que aparecerá en tu página.' : section === 'equipo' ? 'Cada profesional tiene su propia presentación. Guarda los perfiles por separado.' : section === 'contacto' ? 'Agrega únicamente los canales que realmente atiendes.' : `Estos ajustes corresponden a ${branch?.nombre || 'la sucursal seleccionada'}.`}</p></div></div>
        <div hidden={section !== 'equipo'}><div className="settings-profiles">{barberLoading && <p role="status">Consultando perfiles…</p>}{barberError && <div role="alert" className="settings-error">{barberError}<button onClick={() => setLoadVersion(v => v + 1)} className="studio-button-secondary">Reintentar</button></div>}{!barberLoading && !barberError && !barbers.length && <p>No hay profesionales registrados. Agrega tu equipo desde Equipo y comisiones.</p>}{barbers.map(b => <BarberProfile key={b.id} barber={b} onBusy={busyCallback} onDirty={profileDirtyCallback} onSaved={updated => setBarbers(old => old.map(v => v.id === updated.id ? updated : v))} />)}<button type="button" onClick={() => onNavigate('barberos')} className="settings-text-link">Administrar equipo, horarios y comisiones <ExternalLink size={15} /></button></div></div>
        <div hidden={section !== 'horarios'}>{branch ? <BranchSettings key={branch.id} branch={branch} onBusy={busyCallback} onSaved={onBranchUpdated} onDirty={setBranchDirty} /> : <p>Selecciona una sucursal en la barra superior para configurar sus horarios.</p>}</div>
        {section !== 'equipo' && section !== 'horarios' && <form onSubmit={save}><fieldset disabled={busy} className="settings-fields">
          {section === 'negocio' && <>{textField('nombre', 'Nombre de la barbería', { required: true, max: 120 })}{textField('logoUrl', 'Enlace del logo', { type: 'url', max: 2000, hint: 'Pega la dirección pública de tu logo. No se agrega una imagen de ejemplo.', placeholder: 'https://…' })}
            {textField('slug', 'Nombre de tu enlace de reservas', { required: true, max: 80, hint: 'Solo letras minúsculas, números y guiones. Cambiarlo modifica el enlace que ya compartiste.', placeholder: 'mi-barberia' })}
            <p className="settings-help">Los clientes ven tu página de reservas. La configuración y la compra de licencias permanecen dentro de tu panel.</p></>}
          {section === 'apariencia' && <>
            <details className="settings-option-group"><summary>Qué incluye cada servicio</summary><p>Describe lo que ofreces. El precio y la duración siguen siendo los del catálogo.</p>{servicesError && <p role="alert">{servicesError}<button type="button" onClick={() => setLoadVersion(v => v+1)}>Reintentar</button></p>}{services.map(service => <Field key={service.id} label={`Descripción de ${service.nombre}`}><textarea rows={2} maxLength={500} value={draft.personalizacionWeb.descripcionesServicios[service.id] || ''} onChange={event => appearance('descripcionesServicios', {...draft.personalizacionWeb.descripcionesServicios,[service.id]:event.target.value})} placeholder="Qué incluye este servicio y qué puede esperar el cliente." /></Field>)}</details>
            <div className="settings-option-group"><h3>Paleta de tu página</h3><p>Elige una combinación con textos y botones legibles.</p><div className="settings-palette-options">{Object.entries(bookingThemes).map(([key, theme]) => <button type="button" key={key} aria-pressed={draft.personalizacionWeb.tema === key} onClick={() => appearance('tema', key as BookingAppearance['tema'])}><span className="settings-swatch" style={{ background: theme.primary, borderBottomColor: theme.accent }} /><span>{theme.name}</span>{draft.personalizacionWeb.tema === key && <Check size={16} />}</button>)}</div></div>
            <Field label="Estilo de portada"><select value={draft.personalizacionWeb.portada} onChange={e => appearance('portada', e.target.value as BookingAppearance['portada'])}><option value="editorial">Editorial · foto protagonista</option><option value="compacta">Compacta · reserva más directa</option></select></Field>
            {textField('portadaUrl', 'Imagen de portada', { type: 'url', max: 2000, hint: 'Usa una fotografía de tu local o de tu trabajo. Puedes dejarla vacía.', placeholder: 'https://…' })}
            <Field label="Encuadre de la imagen"><select value={draft.personalizacionWeb.posicionPortada} onChange={e => appearance('posicionPortada', e.target.value as BookingAppearance['posicionPortada'])}><option value="center">Centro</option><option value="top">Parte superior</option><option value="bottom">Parte inferior</option></select></Field>
            {textField('slogan', 'Frase de tu barbería', { max: 180, placeholder: 'Tu estilo, cuidado hasta el último detalle.' })}
            <Field label="Mensaje de bienvenida" hint="Opcional. Por ejemplo, explica cómo llegar o qué debe saber el cliente antes de reservar."><textarea rows={3} maxLength={180} value={draft.personalizacionWeb.mensajeBienvenida} onChange={e => appearance('mensajeBienvenida', e.target.value)} /></Field>
            <Field label="Texto del botón para reservar"><input required maxLength={32} value={draft.personalizacionWeb.textoBoton} onChange={e => appearance('textoBoton', e.target.value)} /></Field>
            {textField('descripcion', 'Sobre tu barbería', { multiline: true, max: 3000, placeholder: 'Cuenta qué hace especial a tu negocio, sin añadir servicios que todavía no ofreces.' })}
            <details className="settings-option-group"><summary>Galería de trabajos autorizados</summary><p>Agrega hasta 12 fotos públicas de tu local o trabajos que tengas permiso de publicar. No copies referencias privadas de clientes; ocultar una foto cambia su presentación y no convierte su enlace en privado.</p><label className="settings-toggle"><input type="checkbox" checked={draft.personalizacionWeb.mostrarGaleria} onChange={e => appearance('mostrarGaleria', e.target.checked)} /><span><strong>Mostrar galería pública</strong><small>Opcional. Sin fotos, la página sigue funcionando.</small></span></label>{draft.personalizacionWeb.galeria.map((photo, index) => <div key={photo.id} className="settings-gallery-item"><h3>Foto {index + 1}{!photo.visible ? ' · Oculta' : ''}</h3><ImagePreview url={publicGalleryUrl(photo.url) || ''} name={photo.alt || 'Vista previa sin descripción'} className="settings-gallery-preview" /><Field label={`Enlace público de la foto ${index + 1}`}><input type="url" required maxLength={2000} value={photo.url} placeholder="https://…" onChange={e => appearance('galeria', draft.personalizacionWeb.galeria.map(item => item.id === photo.id ? { ...item, url: e.target.value } : item))} /></Field><Field label={`Título de la foto ${index + 1}`}><input required maxLength={120} value={photo.title} onChange={e => appearance('galeria', draft.personalizacionWeb.galeria.map(item => item.id === photo.id ? { ...item, title: e.target.value } : item))} /></Field><Field label={`Descripción accesible de la foto ${index + 1}`} hint="Describe lo visible para quien no puede ver la imagen. No incluyas datos personales del cliente."><input required maxLength={180} value={photo.alt} onChange={e => appearance('galeria', draft.personalizacionWeb.galeria.map(item => item.id === photo.id ? { ...item, alt: e.target.value } : item))} /></Field><label className="settings-toggle"><input type="checkbox" checked={photo.visible} onChange={e => appearance('galeria', draft.personalizacionWeb.galeria.map(item => item.id === photo.id ? { ...item, visible: e.target.checked } : item))} /><span>Foto visible en la página pública</span></label><div className="settings-inline-actions"><button type="button" disabled={index === 0} onClick={() => { const list = [...draft.personalizacionWeb.galeria]; [list[index - 1], list[index]] = [list[index], list[index - 1]]; appearance('galeria', list); }} className="studio-button-secondary">Subir en el orden</button><button type="button" disabled={index === draft.personalizacionWeb.galeria.length - 1} onClick={() => { const list = [...draft.personalizacionWeb.galeria]; [list[index + 1], list[index]] = [list[index], list[index + 1]]; appearance('galeria', list); }} className="studio-button-secondary">Bajar en el orden</button><button type="button" onClick={() => appearance('galeria', draft.personalizacionWeb.galeria.filter(item => item.id !== photo.id))} className="studio-button-secondary">Quitar foto</button></div></div>)}<button type="button" disabled={draft.personalizacionWeb.galeria.length >= 12} className="studio-button-secondary" onClick={() => appearance('galeria', [...draft.personalizacionWeb.galeria, { id: crypto.randomUUID(), url: '', title: '', alt: '', visible: true }])}>Agregar foto autorizada</button></details>
            <Field label="Instrucciones de llegada" hint="Opcional. Orienta al cliente sin inventar ubicación ni servicios."><textarea rows={3} maxLength={1000} value={draft.personalizacionWeb.instruccionesLlegada} onChange={e => appearance('instruccionesLlegada', e.target.value)} /></Field>
            <Field label="Políticas informativas" hint="Se muestran antes de reservar. Este texto no activa cargos, depósitos ni reglas automáticas de cancelación."><textarea rows={4} maxLength={1500} value={draft.personalizacionWeb.politicasInformativas} onChange={e => appearance('politicasInformativas', e.target.value)} /></Field>
            <div className="settings-option-group"><h3>Secciones visibles</h3><p>Ocultarlas cambia la presentación. Tus servicios y profesionales siguen disponibles al reservar.</p>{([['mostrarServicios', 'Servicios y precios', 'Ayuda a elegir antes de entrar a la reserva.'], ['mostrarEquipo', 'Perfiles del equipo', 'Presenta a tus profesionales y sus fotos.'], ['mostrarHistoria', 'Sobre la barbería', 'Aparece cuando agregas una descripción.'], ['mostrarContacto', 'Ubicación y contacto', 'Muestra los canales y direcciones que hayas agregado.']] as const).map(([key, label, hint]) => <label className="settings-toggle" key={key}><input type="checkbox" checked={draft.personalizacionWeb[key]} onChange={e => appearance(key, e.target.checked)} /><span><strong>{label}</strong><small>{hint}</small></span></label>)}</div>
          </>}
          {section === 'contacto' && <>{textField('telefono', 'Teléfono de atención', { type: 'tel', max: 32 })}{textField('whatsappPublico', 'WhatsApp para consultas', { type: 'tel', max: 24, hint: 'Incluye el código de país. Por ejemplo, 52 seguido de los diez dígitos. Este enlace no activa mensajes automáticos.' })}{textField('emailContacto', 'Correo público de contacto', { type: 'email', max: 254 })}{textField('direccion', 'Dirección general del negocio', { multiline: true, max: 300, hint: 'La ubicación de cada sucursal se edita en Sucursal y horarios.' })}{textField('instagram', 'Instagram', { max: 200, placeholder: '@tubarberia' })}{textField('facebook', 'Facebook', { max: 300, placeholder: 'https://facebook.com/tubarberia' })}{textField('tiktok', 'TikTok', { max: 200, placeholder: '@tubarberia' })}</>}
          <div className="settings-save-bar"><span>{dirty ? 'Cambios del negocio sin guardar' : 'No hay cambios pendientes del negocio'}{profileDirty && Object.values(profileDirty).some(Boolean) ? '. Guarda también los perfiles que editaste.' : ''}</span><div><button type="button" disabled={!dirty || busy} onClick={() => { setDraft(saved); setError(''); setMessage(''); }} className="studio-button-secondary">Restablecer</button><button type="submit" disabled={!dirty || busy} className="studio-button"><Save size={16} />{busy ? 'Guardando…' : 'Guardar cambios'}</button></div></div>
        </fieldset></form>}
      </section>
      {section !== 'equipo' && section !== 'horarios' && <LivePreview draft={draft} barbers={barbers} />}
    </div>
    </div></div><div className="settings-related"><span>Otros ajustes</span><button onClick={() => onNavigate('accesos')}>Accesos del equipo</button><button onClick={() => onNavigate('seguridad')}>Seguridad de mi cuenta</button><button onClick={() => onNavigate('integraciones')}>Conexiones</button><button onClick={() => onNavigate('suscripcion')}>Plan y licencia</button></div>
  </div>;
}
