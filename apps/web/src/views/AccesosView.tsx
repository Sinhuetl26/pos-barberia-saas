import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Sucursal } from '../types';
import { OperationDialog } from '../components/OperationDialog';
import '../styles/secondary-workspaces.css';
import { hasLicenseCapability, LicensePlanCode } from '../utils/licenseCatalog';

export function AccesosView({ sucursales, plan, onUpgrade }: { sucursales: Sucursal[]; plan: LicensePlanCode; onUpgrade?: () => void }) {
  const defaultRole = hasLicenseCapability(plan, 'STAFF_ROLES') ? 'GERENTE' : 'BARBERO';
  const [users, setUsers] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nombre: '', email: '', rol: defaultRole, branchIds: [] as string[], barberoId: '', activo: true });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmChange, setConfirmChange] = useState(false);
  async function load() {
    setLoading(true); setError('');
    try { const [u, b] = await Promise.all([api.getTeamAccess(), api.getBarberos()]); setUsers(u); setBarbers(b); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  function edit(user: any) {
    setEditing(user); setError(''); setNotice('');
    setForm({ nombre: user.nombre, email: user.email, rol: user.rol, branchIds: user.branchIds, barberoId: user.barberoId || '', activo: user.activo });
  }
  function reset() { setEditing(null); setForm({ nombre: '', email: '', rol: defaultRole, branchIds: [], barberoId: '', activo: true }); }
  async function persistAccess() {
    setBusy(true); setError(''); setNotice('');
    try {
      if (editing) await api.updateTeamAccess(editing.id, { rol: form.rol, branchIds: form.branchIds, barberoId: form.barberoId || null, activo: form.activo });
      else await api.createTeamAccess({ ...form, barberoId: form.barberoId || null });
      setNotice(editing ? 'Permisos guardados. Se cerraron las sesiones anteriores.' : 'Invitación creada. Consulta el estado del envío en la lista; cada persona elige su contraseña.'); setConfirmChange(false); reset(); await load();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  function save(e: React.FormEvent) { e.preventDefault(); if (editing) setConfirmChange(true); else void persistAccess(); }
  async function invitation(id: string, cancel: boolean) {
    setBusy(true); setError(''); setNotice('');
    try { const result = await (cancel ? api.cancelInvitation(id) : api.resendInvitation(id)); setNotice(result.message); await load(); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  const roleNames: Record<string, string> = { DUENO: 'Propietario', GERENTE: 'Gerente', CAJERO: 'Recepción y cobros', BARBERO: 'Barbero', SUPER_ADMIN: 'Administrador de plataforma' };
  const staffRoles = hasLicenseCapability(plan, 'STAFF_ROLES');
  return <section className="studio-page studio-access secondary-workspace">
    <p className="text-sm text-stone-500">Cada persona, su espacio de trabajo.</p>
    <h1 className="text-3xl font-semibold text-[#19352c] mt-2">Accesos y sucursales</h1>
    <p className="text-sm text-stone-500 mt-3 max-w-2xl">Cada persona entra con su propia cuenta. El gerente administra las sucursales asignadas; el cajero opera ventas, agenda y caja; el barbero consulta su agenda, ventas y comisiones.</p>
    {error && <div role="alert" className="my-4 p-4 rounded-xl bg-red-50 text-red-800 text-sm">{error}</div>}
    {notice && <div role="status" className="my-4 p-4 rounded-xl bg-green-50 text-green-800 text-sm">{notice}</div>}
    <button disabled={busy} className="studio-button-secondary mt-4" onClick={load}>Actualizar estado de invitaciones</button>
    <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 mt-7">
      <div className="studio-panel p-5 space-y-3"><h2 className="font-semibold">Cuentas del negocio</h2>
        {loading ? <p className="text-sm text-stone-500">Cargando cuentas…</p> : users.map(user => <article key={user.id} className="p-4 border border-stone-200 rounded-xl flex flex-wrap justify-between gap-3">
          <div><p className="font-medium text-sm">{user.nombre}</p><p className="text-xs text-stone-500 mt-1">{user.email}</p><p className="text-xs mt-2">{roleNames[user.rol] || user.rol} · {user.invitationPending && user.activo ? 'Invitación pendiente' : user.activo ? 'Activo' : 'Desactivado'}</p><p className="text-xs text-stone-500 mt-1">{user.rol === 'DUENO' ? 'Todas las sucursales' : user.branchIds.map((id: string) => sucursales.find(s => s.id === id)?.nombre || 'Sucursal no disponible').join(', ') || 'Sin sucursal asignada'}</p></div>
          {user.invitationPending && <div className="w-full text-xs space-y-2"><p>{({ QUEUED: 'Envío pendiente', SENDING: 'Enviando', RETRY: 'Reintentando envío', ACCEPTED: 'Aceptado por el proveedor; falta que la persona acepte', NOT_CONFIGURED: 'Correo aún no conectado. Reenvía cuando esté listo.', FAILED: 'No se pudo enviar. Reintenta.', CANCELED: 'Enlace cancelado', EXPIRED: 'Enlace vencido' } as Record<string, string>)[user.invitationStatus] || 'Pendiente'}{user.invitationExpiresAt && new Date(user.invitationExpiresAt) < new Date() ? ' · Requiere un nuevo enlace' : ''}</p>{user.activo && <div className="flex gap-4"><button disabled={busy} className="underline" onClick={() => invitation(user.id, false)}>Reenviar invitación</button><button disabled={busy} className="underline text-red-800" onClick={() => invitation(user.id, true)}>Cancelar invitación</button></div>}</div>}
          {!['DUENO', 'SUPER_ADMIN'].includes(user.rol) && <button className="studio-button-secondary text-xs self-center" onClick={() => edit(user)}>Editar acceso</button>}
        </article>)}
      </div>
      <form onSubmit={save} className="studio-panel p-5 space-y-4 self-start"><h2 className="font-semibold">{editing ? 'Editar permisos' : 'Invitar a una persona'}</h2>
        {!editing && <><label className="block text-xs">Nombre<input required maxLength={120} className="studio-input mt-2 w-full" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></label><label className="block text-xs">Correo<input required type="email" autoComplete="off" className="studio-input mt-2 w-full" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><p className="text-xs text-stone-500">Le enviaremos una invitación por correo para que elija su propia contraseña. Caduca en 48 horas.</p></>}
        {!staffRoles && <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">Esencial incluye accesos individuales para barberos. Gerente y recepción están disponibles en Pro. <button type="button" className="underline font-semibold" onClick={onUpgrade}>Comparar planes</button></div>}
        <label className="block text-xs">Rol<select className="studio-input mt-2 w-full" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value, barberoId: '', branchIds: [] })}><option value="GERENTE" disabled={!staffRoles}>Gerente{!staffRoles ? ' · Pro' : ''}</option><option value="CAJERO" disabled={!staffRoles}>Recepción y cobros{!staffRoles ? ' · Pro' : ''}</option><option value="BARBERO">Barbero</option></select></label>
        <fieldset><legend className="text-xs mb-2">Sucursales permitidas{form.rol === 'BARBERO' ? ' (elige una)' : ''}</legend>{sucursales.map(branch => <label key={branch.id} className="flex gap-2 items-center text-sm py-2"><input type={form.rol === 'BARBERO' ? 'radio' : 'checkbox'} name="branches" checked={form.branchIds.includes(branch.id)} onChange={e => setForm({ ...form, barberoId: '', branchIds: form.rol === 'BARBERO' ? [branch.id] : e.target.checked ? [...form.branchIds, branch.id] : form.branchIds.filter(id => id !== branch.id) })} />{branch.nombre}</label>)}</fieldset>
        {form.rol === 'BARBERO' && <label className="block text-xs">Perfil del barbero<select required className="studio-input mt-2 w-full" value={form.barberoId} onChange={e => setForm({ ...form, barberoId: e.target.value })}><option value="">Selecciona un perfil activo</option>{barbers.filter(b => form.branchIds.includes(b.sucursalId) && b.activo).map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></label>}
        {editing && <label className="flex gap-2 text-sm items-center"><input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} />Permitir inicio de sesión</label>}
        <div className="flex gap-3"><button disabled={busy || !form.branchIds.length} className="studio-button">{busy ? 'Guardando…' : editing ? 'Guardar permisos' : 'Crear invitación'}</button>{editing && <button type="button" className="studio-button-secondary" onClick={reset}>Cancelar</button>}</div>
        <p className="text-xs text-stone-500">Solo el propietario puede asignar permisos. Las altas y cambios quedan registrados para revisión.</p>
      </form>
    </div>
    <OperationDialog open={confirmChange} busy={busy} titleId="access-change-title" onClose={() => setConfirmChange(false)}>
      <section className="studio-panel p-6 max-w-lg"><h2 id="access-change-title" tabIndex={-1} className="text-xl font-semibold">¿Guardar este acceso?</h2><p className="mt-3 text-sm text-stone-600">{form.activo ? 'La persona conservará acceso únicamente a las sucursales y funciones seleccionadas.' : 'La persona ya no podrá iniciar sesión. Sus ventas, citas e historial se conservan.'} Al confirmar se cerrarán sus sesiones anteriores.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" disabled={busy} className="studio-button-secondary" onClick={() => setConfirmChange(false)}>Volver a revisar</button><button type="button" disabled={busy} className="studio-button" onClick={() => void persistAccess()}>{busy ? 'Guardando…' : 'Guardar acceso'}</button></div></section>
    </OperationDialog>
  </section>;
}
