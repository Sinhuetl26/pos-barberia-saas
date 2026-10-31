import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {mailStateLabel} from '../components/MailDeliveryPanel';
import { api } from '../api';
import { OperationDialog } from '../components/OperationDialog';
import '../styles/secondary-workspaces.css';
import '../styles/account-experience.css';

export function AccountSecurityView({ privateAccount = false }: { privateAccount?: boolean }) {
  const { action = 'recuperar' } = useParams();
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [email, setEmail] = useState('');
  const [account, setAccount] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [done, setDone] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(privateAccount);
  const [reload, setReload] = useState(0);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const validAction = ['recuperar', 'restablecer', 'verificar', 'invitacion'].includes(action);
  const requiresPassword = privateAccount || ['restablecer', 'invitacion'].includes(action);
  useEffect(() => {
    // Keep the secret only in component memory, never in localStorage or request URLs.
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    let active = true;
    if (privateAccount) {
      setLoadingAccount(true); setError('');
      api.getAccountSecurity().then(value => { if (active) { setAccount(value); setEmail(value.email); } })
        .catch(e => { if (active) setError(e.message); })
        .finally(() => { if (active) setLoadingAccount(false); });
    }
    return () => { active = false; };
  }, [privateAccount, reload]);
  async function run(work: () => Promise<any>, logOut = false) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { const result = await work(); setNotice(result.message); if (privateAccount&&!logOut)api.getAccountSecurity().then(setAccount).catch(()=>{}); if (logOut) { api.logout(); setDone(true); setConfirmRevoke(false); } }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (requiresPassword && password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    if (privateAccount) return run(() => api.changePassword(currentPassword, password), true);
    if (action === 'recuperar') return run(() => api.requestAccountLink('recovery', email));
    const path = { restablecer: 'recovery/complete', verificar: 'verification/complete', invitacion: 'invitation/accept' }[action];
    if (!path || !token) { setError('Abre el enlace completo de tu correo o solicita uno nuevo.'); return; }
    await run(async () => { const result = await api.completeAccountAction(path, token, password); setDone(true); return result; });
  }
  const title = privateAccount ? 'Seguridad de tu cuenta' : { recuperar: 'Recupera tu acceso', restablecer: 'Elige una nueva contraseña', verificar: 'Confirma tu correo', invitacion: 'Bienvenido a tu equipo' }[action] || 'Enlace no disponible';
  return <section className={`operation-page secondary-workspace ${privateAccount ? 'studio-page studio-security' : 'min-h-screen bg-[#f5f4ee] flex items-center justify-center px-4 py-10'}`}>
    <div className={`studio-panel w-full ${privateAccount ? 'security-workbench' : 'max-w-xl mx-auto p-6 sm:p-9'}`}>
      <header className={privateAccount ? 'security-heading' : ''}>
      <p className="text-sm text-stone-500">Tu acceso a la barbería</p>
      <h1 className="text-2xl font-semibold text-[#19352c] mt-3">{title}</h1>
      <p className="text-sm text-stone-600 mt-3">{privateAccount ? 'Protege tu cuenta y controla el acceso desde tus dispositivos.' : action === 'invitacion' ? 'Crea tu propia contraseña. Tus permisos los administra el propietario de la barbería.' : action === 'recuperar' ? 'Escribe el correo con el que entras a tu barbería.' : 'El enlace solo puede utilizarse una vez. Confirma la acción para continuar.'}</p>
      </header>
      {error && <p role="alert" className="mt-5 p-3 bg-red-50 text-red-800 rounded-lg text-sm">{error}</p>}
      {notice && <p role="status" className="mt-5 p-3 bg-green-50 text-green-900 rounded-lg text-sm">{notice}</p>}
      {loadingAccount && <p role="status" className="py-6">Consultando la seguridad de tu cuenta…</p>}
      {privateAccount && !loadingAccount && !account && <button className="studio-button-secondary" onClick={() => setReload(n => n + 1)}>Volver a consultar mi cuenta</button>}
      {privateAccount && account && !done && <div className="security-identity text-sm"><h2>Correo de acceso</h2><p className="security-email">{account.email}</p><p className="mt-2 text-stone-600">{account.emailVerifiedAt ? 'Correo verificado' : 'Correo pendiente de verificar'}</p>{account.mail&&<p className="mt-2 text-sm text-stone-600">{mailStateLabel(account.mail.mailStatus,account.mail.deliveryStatus)}</p>}{!account.emailVerifiedAt && <button disabled={busy} className="studio-button-secondary mt-3" onClick={() => run(() => api.requestAccountLink('verification', email))}>Solicitar enlace de verificación</button>}</div>}
      {!done && validAction && (!privateAccount || account) && <form onSubmit={submit} className="security-password space-y-5 mt-6" aria-busy={busy}>
        {privateAccount && <div><h2>Actualizar contraseña</h2><p className="text-sm text-stone-600 mt-2">Al guardarla se cerrarán tus sesiones. Después entra con la contraseña nueva.</p></div>}
        {!privateAccount && action === 'recuperar' && <label className="block text-sm">Tu correo<input className="studio-input w-full mt-2" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>}
        {privateAccount && <label className="block text-sm">Contraseña actual<input className="studio-input w-full mt-2" type="password" autoComplete="current-password" required maxLength={256} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label>}
        {requiresPassword && <><label className="block text-sm">Nueva contraseña<input className="studio-input w-full mt-2" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} /><span className="block mt-2 text-xs text-stone-500">Mínimo 12 caracteres. Usa una frase larga y exclusiva para esta cuenta.</span></label><label className="block text-sm">Repite la nueva contraseña<input className="studio-input w-full mt-2" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label></>}
        {!privateAccount && action !== 'recuperar' && !token ? <p className="text-sm text-amber-900">Abre el enlace desde el correo. Si caducó, solicita uno nuevo; para una invitación, pídelo al propietario.</p> : <button disabled={busy} className="studio-button w-full">{busy ? 'Procesando…' : privateAccount ? 'Cambiar contraseña y cerrar sesiones' : action === 'recuperar' ? 'Solicitar enlace' : action === 'verificar' ? 'Verificar mi correo' : 'Guardar mi contraseña'}</button>}
      </form>}
      {privateAccount && account && !done && <div className="security-sessions border-t mt-7 pt-5"><h2>Dispositivos y sesiones</h2><p className="text-sm text-stone-600 mt-2 mb-4">Si dejaste tu cuenta abierta en una computadora compartida, puedes cerrar todas las sesiones.</p><button disabled={busy} className="studio-button-secondary w-full" onClick={() => setConfirmRevoke(true)}>Cerrar sesión en todos mis dispositivos</button></div>}
      <div className="flex flex-wrap gap-4 text-sm mt-6"><a href={done && privateAccount ? '/' : privateAccount ? '/app' : action === 'verificar' ? '/app/seguridad' : '/'} className="underline">{done && action === 'verificar' ? 'Continuar a mi cuenta' : done ? 'Volver al inicio' : 'Volver'}</a>{!privateAccount && action !== 'recuperar' && <a href="/cuenta/recuperar" className="underline">Recuperar acceso</a>}</div>
    </div>
    <OperationDialog open={confirmRevoke} busy={busy} titleId="revoke-sessions-title" onClose={() => setConfirmRevoke(false)}>
      <div className="studio-panel p-6"><h2 id="revoke-sessions-title" tabIndex={-1} className="text-xl font-semibold">¿Cerrar todas tus sesiones?</h2><p className="text-sm text-stone-600 mt-3">También saldrás de este dispositivo y se invalidarán los enlaces pendientes. Tus citas, ventas y configuración se conservan.</p>{error && <p role="alert" className="text-red-800 mt-3">{error}</p>}<div className="flex flex-wrap gap-3 mt-6"><button disabled={busy} className="studio-button-secondary" onClick={() => setConfirmRevoke(false)}>Conservar mis sesiones</button><button disabled={busy} className="studio-button" onClick={() => run(() => api.revokeAllSessions(), true)}>{busy ? 'Cerrando sesiones…' : 'Cerrar todas las sesiones'}</button></div></div>
    </OperationDialog>
  </section>;
}
