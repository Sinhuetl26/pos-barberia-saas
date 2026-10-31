import React, { useEffect, useRef, useState } from 'react';
import { FinancialStatus } from './FinancialStatus';
import { WorkspaceSearch } from './WorkspaceSearch';
import { licensePlan } from '../utils/licenseCatalog';
import { UserRole, Tenant, Sucursal } from '../types';
import { Scissors, Calendar, CreditCard, Users, Package, BarChart3, Bell, ShieldAlert, ExternalLink, Crown, Settings, LogOut, Globe, HelpCircle, LayoutDashboard, Plug, Menu, X, ArrowUpRight, ChevronRight } from 'lucide-react';

interface NavbarProps {
  tenants: Tenant[]; currentTenant: Tenant | null; onSelectTenant: (tenant: Tenant) => void;
  sucursales: Sucursal[]; currentSucursal: Sucursal | null; onSelectSucursal: (sucursal: Sucursal) => void;
  currentRole: UserRole; onSelectRole: (role: UserRole) => void; currentView: string; onSelectView: (view: string) => void;
  onOpenOnboarding: () => void; onOpenPublicBooking: () => void; currentUser?: any;
  onOpenSettings?: () => void; onOpenLanding?: () => void; onOpenHelp?: () => void; onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = (props) => {
  const { currentTenant, currentSucursal, sucursales, currentRole, currentView, onSelectView, currentUser } = props;
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenu = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusables = () => Array.from(mobileMenu.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], select:not(:disabled)') || []).filter(el => el.getClientRects().length);
    focusables()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMobileOpen(false); }
      if (event.key !== 'Tab') return;
      const controls = focusables(), first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onDesktop = () => { if (desktop.matches) setMobileOpen(false); };
    desktop.addEventListener('change', onDesktop);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKey); desktop.removeEventListener('change', onDesktop); previousFocus?.focus(); };
  }, [mobileOpen]);
  const owner = currentRole === 'DUENO';
  const admin = currentRole === 'SUPER_ADMIN';
  const barber = currentRole === 'BARBERO';
  const cashier = currentRole === 'CAJERO';
  const items = admin ? [
    { id: 'superadmin', label: 'Negocios y licencias', icon: Crown, group: 'Plataforma' },
    { id: 'auditoria', label: 'Auditoría', icon: ShieldAlert, group: 'Plataforma' },
    { id: 'integraciones', label: 'Conexiones', icon: Plug, group: 'Plataforma' },
  ] : [
    ...(!barber && !cashier ? [{ id: 'inicio', label: 'Hoy', icon: LayoutDashboard, group: 'Tu barbería' }] : []),
    { id: 'agenda', label: barber ? 'Mi agenda' : 'Agenda', icon: Calendar, group: 'Tu barbería' },
    { id: 'pos', label: 'Cobrar', icon: CreditCard, group: 'Tu barbería' },
    ...(!barber ? [{ id: 'clientes', label: 'Clientes', icon: Users, group: 'Tu barbería' }] : []),
    ...([{ id: 'barberos', label: barber ? 'Mi caja y comisiones' : cashier ? 'Caja y cierres' : 'Equipo y comisiones', icon: Scissors, group: 'Gestión' }]),
    ...(!barber && !cashier ? [{ id: 'inventario', label: 'Inventario', icon: Package, group: 'Gestión' }, { id: 'reportes', label: 'Reportes', icon: BarChart3, group: 'Gestión' }] : []),
    ...(owner && ['PRO', 'CADENA'].includes(currentTenant?.plan || '') ? [{ id: 'notificaciones', label: 'Mensajes', icon: Bell, group: 'Gestión' }] : []),
    ...(owner ? [{ id: 'accesos', label: 'Accesos del equipo', icon: ShieldAlert, group: 'Tu negocio' }, { id: 'configuracion', label: 'Configuración', icon: Settings, group: 'Tu negocio' }, { id: 'integraciones', label: 'Conexiones', icon: Plug, group: 'Tu negocio' }, { id: 'suscripcion', label: 'Plan y licencia', icon: Crown, group: 'Tu negocio' }] : []),
  ];
  if (owner) items.push({ id: 'historial-operacion', label: 'Historial de operaciones', icon: ShieldAlert, group: 'Tu negocio' });
  if (owner || currentRole === 'GERENTE') items.push({ id: 'importacion', label: 'Importar y exportar', icon: Package, group: 'Tu negocio' });
  const title = items.find(i => i.id === currentView)?.label || 'SYSTECH Studio';
  const navigate = (id: string) => { onSelectView(id); setMobileOpen(false); };
  const role = owner ? 'Propietario' : barber ? 'Barbero' : admin ? 'Administrador' : cashier ? 'Cajero' : 'Gerente';
  const sidebar = <>
    <button onClick={() => navigate(admin ? 'superadmin' : barber || cashier ? 'agenda' : 'inicio')} className="studio-brand flex items-center gap-3 px-5 pt-8 pb-7 text-left w-full"><div className="studio-brand-symbol w-9 h-9 rounded-xl bg-[#cfb58d] text-[#19352c] flex items-center justify-center"><Scissors className="w-5 h-5" /></div><div><div className="studio-brand-name text-white tracking-[.14em] text-sm font-semibold">SYSTECH</div><div className="studio-brand-subtitle text-[#97a99f] text-[11px] tracking-[.3em] mt-1">STUDIO</div></div></button>
    <div className="studio-business mx-4 mb-5 rounded-xl border border-white/10 p-3 bg-white/[.025]"><div className="flex gap-2 items-center"><span className="w-6 h-6 rounded-md bg-white/5 text-[#c8b392] flex items-center justify-center text-[10px] font-semibold shrink-0">{currentTenant?.nombre.slice(0, 2).toUpperCase() || 'ST'}</span><span className="text-xs text-[#e5ebe6] font-medium truncate">{currentTenant?.nombre || 'Mi barbería'}</span></div><span className="text-[11px] text-[#93a99d] mt-2 block pl-8">{currentTenant ? licensePlan(currentTenant.plan)?.name || currentTenant.plan : 'Licencia por elegir'}</span></div>
    <nav aria-label="Navegación principal" className="px-3 flex-1 overflow-y-auto">{items.map((item, i) => <React.Fragment key={item.id}>{(i === 0 || items[i - 1].group !== item.group) && <div className="studio-nav-group text-[10px] tracking-[.18em] text-[#789184] font-medium px-3 pt-4 pb-2">{item.group}</div>}<button aria-current={currentView === item.id ? 'page' : undefined} onClick={() => navigate(item.id)} className={`studio-nav-item flex w-full items-center gap-3 px-3 py-2.5 my-1 rounded-lg text-[13px] transition-colors ${currentView === item.id ? 'text-[#ead7bb] bg-white/[.09]' : 'text-[#a3b5ab] hover:bg-white/5 hover:text-white'}`}><item.icon className={`w-4 h-4 ${currentView === item.id ? 'text-[#cfb58d]' : 'text-[#80998b]'}`} /><span className="flex-1 text-left">{item.label}</span>{currentView === item.id && <ChevronRight className="w-3 h-3" />}</button></React.Fragment>)}</nav>
    <div className="studio-sidebar-footer mx-4 mt-6 mb-5 border-t border-white/10 pt-4 space-y-1">
      <button onClick={() => navigate('seguridad')} className="text-[#9bb0a3] text-[13px] flex gap-3 items-center w-full p-2"><Settings className="w-4 h-4" />Seguridad de mi cuenta</button>
      <button onClick={() => { setMobileOpen(false); props.onOpenHelp?.(); }} className="text-[#9bb0a3] text-[13px] flex gap-3 items-center w-full p-2"><HelpCircle className="w-4 h-4" />Ayuda y soporte</button>
      <div className="flex gap-2 items-center pt-4 px-2"><span className="rounded-full bg-[#cfb58d] text-[#19352c] w-8 h-8 shrink-0 flex justify-center items-center text-[10px] font-semibold">{currentUser?.nombre?.slice(0, 2).toUpperCase() || 'US'}</span><div className="min-w-0 flex-1"><p className="text-[#e5ebe6] text-[13px] truncate">{currentUser?.nombre || 'Usuario'}</p><p className="text-[#b6c8bd] text-[11px] mt-1">{role}</p></div><button onClick={props.onLogout} title="Cerrar todas mis sesiones" aria-label="Cerrar todas mis sesiones" className="text-[#b6c8bd] hover:text-white p-1"><LogOut className="w-4 h-4" /></button></div>
    </div>
  </>;
  return <>
    <aside className="studio-sidebar hidden lg:flex fixed top-0 bottom-0 left-0 w-[232px] bg-[#17191c] flex-col z-40">{sidebar}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden bg-black/40" onClick={() => setMobileOpen(false)}><aside ref={mobileMenu} role="dialog" aria-modal="true" aria-label="Menú móvil" className="w-[260px] max-w-[85vw] h-full bg-[#17191c] flex flex-col relative" onClick={e => e.stopPropagation()}><button onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" className="absolute right-3 top-4 text-white p-2"><X className="w-4 h-4" /></button>{sidebar}</aside></div>}
    <header className="studio-topbar sticky top-0 z-30 bg-[#fffefa]/95 backdrop-blur border-b border-[#e8ebe4] lg:ml-[232px]">
      <div className="studio-topbar-inner h-[70px] px-4 sm:px-8 flex justify-between items-center gap-4"><div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} aria-label="Abrir menú" className="lg:hidden studio-icon-button"><Menu className="w-4 h-4" /></button><span className="workspace-label text-[13px] text-stone-400 hidden sm:inline">Espacio de trabajo</span><ChevronRight className="w-3 h-3 text-stone-300 hidden sm:inline" /><span className="workspace-title text-xs font-medium">{title}</span></div><div className="studio-topbar-tools flex items-center gap-4">{!admin && <WorkspaceSearch sucursalId={currentSucursal?.id} rol={currentRole} onNavigate={path => onSelectView(path.replace(/^\/app\//, ''))} />}<label className="flex items-center gap-2"><span className="text-[10px] text-stone-400 hidden xl:inline">Sucursal</span><select aria-label="Seleccionar sucursal" className="bg-transparent text-xs text-stone-600 border border-[#e6e9e1] rounded-lg py-2 px-2 max-w-[170px]" value={currentSucursal?.id || ''} onChange={e => { const branch = sucursales.find(s => s.id === e.target.value); if (branch) props.onSelectSucursal(branch); }}>{!sucursales.length && <option value="">Sin sucursal</option>}{sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label><button onClick={props.onOpenPublicBooking} className="text-[13px] flex items-center gap-2 text-[#6b7c70]" title="Abrir página de reservas"><ExternalLink className="w-3.5 h-3.5" /><span className="hidden md:inline">Ver página de reservas</span><ArrowUpRight className="w-3 h-3 hidden md:block" /></button></div></div>
      {['EN_RIESGO', 'SUSPENDIDO', 'CANCELADO'].includes(currentTenant?.estado || '') && !admin && <div className="bg-amber-50 text-amber-900 px-4 sm:px-8 py-3 text-xs flex flex-wrap gap-2 justify-between"><span>{currentTenant?.estado === 'EN_RIESGO' ? 'Hay un pago pendiente. Revisa el estado y la fecha de suspensión de tu licencia.' : 'Tu licencia no está activa. El propietario puede revisar la suscripción para recuperar el acceso.'}</span>{owner && <button className="underline font-semibold" onClick={() => navigate('suscripcion')}>Revisar licencia →</button>}</div>}
      {!admin && !(currentUser?.verificationRequired && !currentUser?.emailVerifiedAt) && <FinancialStatus key={`${currentTenant?.id}:${currentUser?.id}`} owner={owner} tenantId={currentTenant?.id || ''} branchId={currentSucursal?.id} />}

    </header>
    {!admin && <nav className="studio-mobile-nav" aria-label="Navegación rápida">{(barber || cashier ? [{id:'agenda',label:'Agenda',icon:Calendar},{id:'pos',label:'Cobrar',icon:CreditCard},{id:'barberos',label:'Mi caja',icon:Scissors}] : [{id:'inicio',label:'Hoy',icon:LayoutDashboard},{id:'agenda',label:'Agenda',icon:Calendar},{id:'pos',label:'Cobrar',icon:CreditCard}]).map(item => <button type="button" key={item.id} aria-current={currentView===item.id?'page':undefined} onClick={()=>navigate(item.id)}><item.icon size={20} aria-hidden="true"/><span>{item.label}</span></button>)}<button type="button" onClick={()=>setMobileOpen(true)} aria-label="Abrir menú completo"><Menu size={20} aria-hidden="true"/><span>Más</span></button></nav>}
  </>;
};
