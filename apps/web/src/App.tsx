import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useBlocker } from 'react-router-dom';
import { api } from './api';
import { Tenant, Sucursal, UserRole, Cita } from './types';
import { Navbar } from './components/Navbar';
import {ConnectionStatus} from './components/ConnectionStatus';
import { RebookingDraft } from './types/rebooking';
import { appointmentAgendaPath } from './utils/appointmentNavigation';
import { checkoutNeedsReview, emptyCheckoutNavigation } from './utils/checkoutNavigation';
import { OperationDialog } from './components/OperationDialog';

const lazyView = (loader: () => Promise<any>, key: string) => React.lazy(async () => ({ default: (await loader())[key] as React.ComponentType<any> }));
const SuperAdminView = lazyView(() => import('./views/SuperAdminView'), 'SuperAdminView');
const AgendaView = lazyView(() => import('./views/AgendaView'), 'AgendaView');
const PosView = lazyView(() => import('./views/PosView'), 'PosView');
const BarberosView = lazyView(() => import('./views/BarberosView'), 'BarberosView');
const InventarioView = lazyView(() => import('./views/InventarioView'), 'InventarioView');
const ReportesView = lazyView(() => import('./views/ReportesView'), 'ReportesView');
const NotificacionesView = lazyView(() => import('./views/NotificacionesView'), 'NotificacionesView');
const SuscripcionView = lazyView(() => import('./views/SuscripcionView'), 'SuscripcionView');
const PublicBookingView = lazyView(() => import('./views/PublicBookingView'), 'PublicBookingView');
const OnboardingModal = lazyView(() => import('./views/OnboardingModal'), 'OnboardingModal');
const LandingView = lazyView(() => import('./views/LandingView'), 'LandingView');
const AccountSecurityView = lazyView(() => import('./views/AccountSecurityView'), 'AccountSecurityView');
const OperationAuditView = lazyView(() => import('./views/OperationAuditView'), 'OperationAuditView');
const DataImportView = lazyView(() => import('./views/DataImportView'), 'DataImportView');
const AuthModal = lazyView(() => import('./views/AuthModal'), 'AuthModal');
const ConfiguracionView = lazyView(() => import('./views/ConfiguracionView'), 'ConfiguracionView');
const ClientesView = lazyView(() => import('./views/ClientesView'), 'ClientesView');
const CancelacionTokenView = lazyView(() => import('./views/CancelacionTokenView'), 'CancelacionTokenView');
const AvisoPrivacidadView = lazyView(() => import('./views/AvisoPrivacidadView'), 'AvisoPrivacidadView');
const TerminosCondicionesView = lazyView(() => import('./views/TerminosCondicionesView'), 'TerminosCondicionesView');
const CentroAyudaModal = lazyView(() => import('./views/CentroAyudaModal'), 'CentroAyudaModal');
const AccesosView = lazyView(() => import('./views/AccesosView'), 'AccesosView');
const InicioView = lazyView(() => import('./views/InicioView'), 'InicioView');
const IntegracionesView = lazyView(() => import('./views/IntegracionesView'), 'IntegracionesView');

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicReservation = () => /^\/b\/|^\/cita\/token\//.test(window.location.pathname);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [currentSucursal, setCurrentSucursal] = useState<Sucursal | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('DUENO');
  const [sessionLoading, setSessionLoading] = useState(Boolean(api.getAuthToken()));
  const [sessionError, setSessionError] = useState('');

  // Authenticated User & Session State
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('systech_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Commercial Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authModalPlan, setAuthModalPlan] = useState<'BASICO' | 'PRO' | 'CADENA'>('PRO');
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsResetVersion, setSettingsResetVersion] = useState(0);
  const [checkoutNavigation, setCheckoutNavigation] = useState(emptyCheckoutNavigation);
  const [checkoutResetVersion, setCheckoutResetVersion] = useState(0);
  const approvedCheckoutReturn = React.useRef(false);
  const reviewingCheckout = checkoutNeedsReview(location.pathname, checkoutNavigation);
  const navigationBusy = settingsBusy || reviewingCheckout && checkoutNavigation.busy;
  const [pendingNavigation, setPendingNavigation] = useState<{branch?: Sucursal; logout?: boolean} | null>(null);
  const settingsBlocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (currentLocation.pathname === nextLocation.pathname) return false;
    const approvedReturn = approvedCheckoutReturn.current;
    approvedCheckoutReturn.current = false;
    return settingsDirty || settingsBusy || !approvedReturn && checkoutNeedsReview(currentLocation.pathname, checkoutNavigation);
  });
  const navigateSafely = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // Pos transfer
  const [activeCitaForPos, setActiveCitaForPos] = useState<Cita | null>(null);
  const [rebookingDraft, setRebookingDraft] = useState<RebookingDraft | null>(null);
  const clearRebookingDraft = useCallback(() => setRebookingDraft(null), []);

  // Onboarding Wizard Modal
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    // Backwards compatibility: Redirect #reservar hash to clean /b/el-bigote route
    if (window.location.hash.includes('reservar')) {
      navigate('/b/el-bigote', { replace: true });
    }
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    // A stale session must never interrupt a public recovery or invitation link.
    if (window.location.pathname.startsWith('/cuenta/')) { setSessionLoading(false); return; }
    const token = api.getAuthToken();
    if (!token) { setSessionLoading(false); return; }
    setSessionLoading(true);
    setSessionError('');

    try {
      const session = await api.getCurrentSession();
      if (session.user && session.tenant) {
        setCurrentUser(session.user);
        localStorage.setItem('systech_user', JSON.stringify(session.user));
        setCurrentTenant(session.tenant);
        const role = (session.user.rol || 'DUENO') as UserRole;
        setCurrentRole(role);
        api.setContext(session.tenant.id, role, session.user.id);

        const verificationPending = session.user.verificationRequired && !session.user.emailVerifiedAt;
        const restricted = verificationPending || ['SUSPENDIDO', 'CANCELADO'].includes(session.tenant.estado);
        const sucs = restricted ? [] : await api.getSucursales();
        setSucursales(sucs);
        if (sucs.length > 0) {
          setCurrentSucursal(sucs[0]);
        } else { setCurrentSucursal(null); }
        if (!isPublicReservation()) {
          if (verificationPending) navigate('/app/seguridad', { replace: true });
          else if (restricted && role === 'DUENO') navigate('/app/suscripcion', { replace: true });
        }

        if (role === 'SUPER_ADMIN') {
          try {
            const allTenants = await api.getAdminTenants();
            setTenants(allTenants);
          } catch {}
        } else {
          setTenants([session.tenant]);
        }
      } else {
        handleLogout();
      }
    } catch (e: any) {
      console.warn('Sesión no válida o expirada:', e);
      if (e.status === 401) handleLogout();
      else setSessionError('No pudimos verificar tu sesión. Revisa tu conexión e intenta nuevamente.');
    } finally {
      setSessionLoading(false);
    }
  };

  const selectTenant = async (tenant: Tenant) => {
    setCurrentTenant(tenant);
    api.setContext(tenant.id, currentRole, currentUser?.id || '');

    try {
      const sucs = await api.getSucursales();
      setSucursales(sucs);
      if (sucs.length > 0) {
        setCurrentSucursal(sucs[0]);
      } else {
        setCurrentSucursal(null);
      }
    } catch (e) {
      console.error('Error cargando sucursales:', e);
    }
  };

  const handleSelectRole = (role: UserRole) => {
    setCurrentRole(role);
    if (currentTenant) {
      api.setContext(currentTenant.id, role, currentUser?.id || '');
    }

    if (role === 'SUPER_ADMIN') {
      navigate('/app/superadmin');
    } else if (role === 'BARBERO') {
      navigate('/app/agenda');
    } else if (role === 'CLIENTE_FINAL') {
      navigate(`/b/${currentTenant?.slug || 'el-bigote'}`);
    } else {
      if (location.pathname.includes('superadmin') || location.pathname.includes('auditoria')) {
        navigate('/app/agenda');
      }
    }
  };

  const handleOpenPosWithCita = (cita: Cita) => {
    setActiveCitaForPos(cita);
    navigate('/app/pos');
  };

  const handleNewTenantCreated = (newTenant: any) => {
    setTenants(prev => [newTenant, ...prev]);
    selectTenant(newTenant);
    navigate('/app/pos');
  };

  // Auth Handlers
  const handleStartTrial = (plan: 'BASICO' | 'PRO' | 'CADENA') => {
    setAuthModalPlan(plan);
    setAuthModalMode('register');
    setShowAuthModal(true);
  };

  const handleLoginClick = () => {
    setAuthModalMode('login');
    setShowAuthModal(true);
  };

  const handleLaunchDemo = () => {
    handleLoginClick();
  };

  const handleAuthSuccess = (data: { user: any; tenant: any; sucursales: any[] }) => {
    setCurrentUser(data.user);
    localStorage.setItem('systech_user', JSON.stringify(data.user));

    if (data.tenant) {
      setTenants(prev => {
        const exists = prev.some(t => t.id === data.tenant.id);
        return exists ? prev : [data.tenant, ...prev];
      });
      setCurrentTenant(data.tenant);
    }

    if (data.sucursales && data.sucursales.length > 0) {
      setSucursales(data.sucursales);
      setCurrentSucursal(data.sucursales[0]);
    }

    if (data.user?.rol) {
      handleSelectRole(data.user.rol);
    }

    setShowAuthModal(false);
    setSessionLoading(false);
    setSessionError('');
    navigate(data.user?.verificationRequired && !data.user?.emailVerifiedAt ? '/app/seguridad' : data.user?.rol === 'SUPER_ADMIN' ? '/app/superadmin' : ['BARBERO', 'CAJERO'].includes(data.user?.rol) ? '/app/agenda' : '/app/inicio');
  };

  const handleLogout = () => {
    approvedCheckoutReturn.current = true;
    setCheckoutNavigation(emptyCheckoutNavigation);
    setActiveCitaForPos(null);
    api.logout();
    localStorage.removeItem('systech_user');
    setCurrentUser(null);
    setCurrentTenant(null);
    setCurrentSucursal(null);
    setSucursales([]);
    setTenants([]);
    setSessionError('');
    if (!isPublicReservation()) navigate('/');
  };

  const handleUserLogout = async () => {
    if (settingsDirty || settingsBusy || reviewingCheckout) { setPendingNavigation({ logout: true }); return; }
    try { await api.revokeAllSessions(); handleLogout(); }
    catch (error: any) {
      if (error.status === 401) handleLogout();
      else setSessionError('No pudimos cerrar las sesiones en el servidor. Revisa tu conexión y vuelve a intentarlo desde Seguridad de mi cuenta.');
    }
  };

  const currentView = location.pathname.replace('/app/', '') || 'agenda';
  const defaultView = currentRole === 'SUPER_ADMIN' ? 'superadmin' : ['BARBERO', 'CAJERO'].includes(currentRole) ? 'agenda' : 'inicio';
  const permitted = (roles: UserRole[], view: React.ReactNode) => roles.includes(currentRole) ? view : <Navigate to={`/app/${defaultView}`} replace />;
  const ownerPanelTenantId = api.getAuthToken() && !sessionLoading && !sessionError &&
    currentUser?.rol === 'DUENO' && currentUser?.tenantId === currentTenant?.id
    ? currentTenant?.id : undefined;

  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-600 text-sm">Preparando tu espacio…</div>}>
    <Routes>
      {/* 1. Commercial Landing Page */}
      <Route
        path="/"
        element={
          <>
            <LandingView
              onStartTrial={handleStartTrial}
              onLogin={handleLoginClick}
              onLaunchDemo={handleLaunchDemo}
            />
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
              defaultMode={authModalMode}
              defaultPlan={authModalPlan}
              onSuccess={handleAuthSuccess}
            />
          </>
        }
      />

      {/* 2. Login & Registration Direct Routes */}
      <Route
        path="/login"
        element={
          <>
            <LandingView
              onStartTrial={handleStartTrial}
              onLogin={handleLoginClick}
              onLaunchDemo={handleLaunchDemo}
            />
            <AuthModal
              isOpen={true}
              onClose={() => navigate('/')}
              defaultMode="login"
              defaultPlan="PRO"
              onSuccess={handleAuthSuccess}
            />
          </>
        }
      />
      <Route
        path="/registro"
        element={
          <>
            <LandingView
              onStartTrial={handleStartTrial}
              onLogin={handleLoginClick}
              onLaunchDemo={handleLaunchDemo}
            />
            <AuthModal
              isOpen={true}
              onClose={() => navigate('/')}
              defaultMode="register"
              defaultPlan="PRO"
              onSuccess={handleAuthSuccess}
            />
          </>
        }
      />

      {/* 3. Direct Clean Public Booking by Barbershop Slug */}
      <Route
        path="/b/:slug"
        element={<PublicBookingView ownerPanelTenantId={ownerPanelTenantId} onExit={ownerPanelTenantId ? () => navigate('/app/inicio') : undefined} />}
      />
      <Route
        path="/b/:slug/cita/:token"
        element={<CancelacionTokenView />}
      />
      <Route
        path="/b/:slug/cancelar/:token"
        element={<CancelacionTokenView />}
      />

      {/* 4. Self-Service Token Cancellation (Link in WhatsApp / Email) */}
      <Route
        path="/cita/token/:token"
        element={<CancelacionTokenView />}
      />

      {/* 5. Legal Routes (LFPDPPP México) */}
      <Route path="/cuenta/:action" element={<AccountSecurityView key={location.pathname} />} />
      <Route path="/privacidad" element={<AvisoPrivacidadView />} />
      <Route path="/terminos" element={<TerminosCondicionesView />} />

      {/* 6. Legacy / Admin Redirects */}
      <Route path="/admin" element={<Navigate to="/app/superadmin" replace />} />

      {/* 6. Main Backoffice App (Protected Route) */}
      <Route
        path="/app/*"
        element={
          !api.getAuthToken() ? (
            <Navigate to="/login" replace />
          ) : sessionLoading ? (
            <div className="min-h-screen flex items-center justify-center text-stone-500 text-sm">Preparando tu espacio de trabajo…</div>
          ) : sessionError ? (
            <div className="min-h-screen flex flex-col gap-4 items-center justify-center px-5 text-center"><p className="text-sm text-stone-600" role="alert">{sessionError}</p><button className="studio-button" onClick={loadInitialData}>Reintentar</button><button className="text-xs text-stone-500 underline" onClick={handleLogout}>Volver al inicio de sesión</button></div>
          ) : (
            <div className={`studio-shell ${currentView === 'pos' ? 'studio-checkout-page' : ''} flex flex-col font-sans selection:bg-[#19352c] selection:text-white`}>
              <a className="studio-skip-link" href="#workspace-content">Saltar al contenido</a>
              <Navbar
              tenants={tenants}
              currentTenant={currentTenant}
              onSelectTenant={selectTenant}
              sucursales={sucursales}
              currentSucursal={currentSucursal}
              onSelectSucursal={branch => { if (branch.id === currentSucursal?.id) return; if (settingsDirty || settingsBusy || reviewingCheckout) setPendingNavigation({ branch }); else { setActiveCitaForPos(null); setCurrentSucursal(branch); } }}
              currentRole={currentRole}
              onSelectRole={handleSelectRole}
              currentView={currentView}
              onSelectView={(v) => navigateSafely(`/app/${v}`)}
              onOpenOnboarding={() => setShowOnboarding(true)}
              onOpenPublicBooking={() => navigateSafely(`/b/${currentTenant?.slug || 'el-bigote'}`)}
              currentUser={currentUser}
              onOpenSettings={() => navigateSafely('/app/configuracion')}
              onOpenHelp={() => setShowHelpModal(true)}
              onOpenLanding={() => navigate('/')}
              onLogout={handleUserLogout}
            />

            <main id="workspace-content" tabIndex={-1} className="flex-1 studio-workspace">
              <ConnectionStatus/>
              <Routes>
                <Route path="seguridad" element={<AccountSecurityView privateAccount />} />
                <Route path="accesos" element={permitted(['DUENO'], <AccesosView sucursales={sucursales} plan={currentTenant?.plan || 'BASICO'} onUpgrade={() => navigate('/app/suscripcion')} />)} />
                <Route path="inicio" element={permitted(['DUENO', 'GERENTE'], <InicioView rol={currentUser?.rol} currentSucursal={currentSucursal} tenant={currentTenant} name={currentUser?.nombre} onNavigate={(v: string) => navigate(`/app/${v}`)} onBranchUpdated={(branch: Sucursal)=>{setSucursales(v=>v.map(s=>s.id===branch.id?branch:s));setCurrentSucursal(s=>s?.id===branch.id?branch:s);}} />)} />
                <Route path="integraciones" element={permitted(['DUENO', 'SUPER_ADMIN'], <IntegracionesView />)} />
                <Route
                  path="agenda"
                  element={permitted(['DUENO', 'GERENTE', 'CAJERO', 'BARBERO'],
                    <AgendaView
                      currentSucursal={currentSucursal}
                      rol={currentUser?.rol || ''}
                      barberoId={currentUser?.barberoId}
                      onOpenPosWithCita={handleOpenPosWithCita}
                      onOpenPublicBooking={() => navigate(`/b/${currentTenant?.slug || 'el-bigote'}`)}
                      publicSlug={currentTenant?.slug}
                      rebookingDraft={rebookingDraft}
                      onRebookingConsumed={clearRebookingDraft}
                    />)
                  }
                />
                <Route
                  path="pos"
                  element={permitted(['DUENO', 'GERENTE', 'CAJERO', 'BARBERO'],
                    <PosView
                      key={`${currentTenant?.id}:${currentUser?.id}:${currentSucursal?.id}:${checkoutResetVersion}`}
                      currentSucursal={currentSucursal}
                      rol={currentUser?.rol || ''}
                      activeCita={activeCitaForPos}
                      onClearActiveCita={() => setActiveCitaForPos(null)}
                      onNavigationStateChange={setCheckoutNavigation}
                      onReturnToAppointment={() => { if (!activeCitaForPos) return; const path = appointmentAgendaPath(activeCitaForPos, currentSucursal); if (path) { approvedCheckoutReturn.current = true; setActiveCitaForPos(null); navigateSafely(path); } }}
                      onRebook={(draft: RebookingDraft) => { setRebookingDraft(draft); navigate('/app/agenda'); }}
                    />)
                  }
                />
                <Route
                  path="barberos"
                  element={permitted(['DUENO', 'GERENTE', 'CAJERO', 'BARBERO'],
                    <BarberosView
                      key="team-workspace"
                      currentSucursal={currentSucursal}
                      currentRole={currentRole}
                      currentUser={currentUser}
                      plan={currentTenant?.plan || 'PRO'}
                      onNavigateToSubscription={() => navigate('/app/suscripcion')}
                    />)
                  }
                />
                <Route path="caja" element={permitted(['DUENO', 'GERENTE', 'CAJERO'], <BarberosView key="cash-workspace" workspaceMode="caja" currentSucursal={currentSucursal} currentRole={currentRole} currentUser={currentUser} plan={currentTenant?.plan || 'PRO'} />)} />
                <Route
                  path="landing-config"
                  element={permitted(['DUENO'], <Navigate to="/app/configuracion?seccion=apariencia" replace />)}
                />
                <Route path="configuracion" element={permitted(['DUENO'], currentTenant ? <ConfiguracionView
                  key={`${currentTenant.id}:${settingsResetVersion}`}
                  tenant={currentTenant} branch={currentSucursal}
                  initialSection={location.search.includes('seccion=apariencia') ? 'apariencia' : 'negocio'}
                  onTenantUpdated={(updated: Tenant) => { setCurrentTenant(updated); setTenants(old => old.map(t => t.id === updated.id ? updated : t)); }}
                  onBranchUpdated={(updated: Sucursal) => { setSucursales(old => old.map(s => s.id === updated.id ? updated : s)); setCurrentSucursal(updated); }}
                  onDirtyChange={setSettingsDirty}
                  onBusyChange={setSettingsBusy}
                  onNavigate={(view: string) => navigateSafely(`/app/${view}`)}
                /> : null)} />
                <Route path="clientes" element={permitted(['DUENO', 'GERENTE', 'CAJERO'], <ClientesView sucursalId={currentSucursal?.id} onRebook={(draft: RebookingDraft)=>{setRebookingDraft(draft);navigateSafely('/app/agenda');}} />)} />
                <Route path="inventario" element={permitted(['DUENO', 'GERENTE'], <InventarioView currentSucursal={currentSucursal} />)} />
                <Route path="importacion" element={permitted(['DUENO', 'GERENTE'], <DataImportView branch={currentSucursal} />)} />
                <Route path="reportes" element={permitted(['DUENO', 'GERENTE'], <ReportesView currentSucursal={currentSucursal} plan={currentTenant?.plan || 'BASICO'} onNavigate={(path: string) => navigateSafely(path)} onUpgrade={() => navigate('/app/suscripcion')} />)} />
                <Route path="historial-operacion" element={permitted(['DUENO'], <OperationAuditView branches={sucursales} />)} />
                <Route path="notificaciones" element={permitted(['DUENO'], <NotificacionesView onNavigate={(path: string) => navigateSafely(path)} />)} />
                <Route
                  path="suscripcion"
                  element={
                    permitted(['DUENO'], <SuscripcionView
                      onPlanChanged={() => {
                        loadInitialData();
                      }}
                    />)
                  }
                />
                <Route path="superadmin" element={permitted(['SUPER_ADMIN'], <SuperAdminView />)} />
                <Route path="auditoria" element={permitted(['SUPER_ADMIN'], <SuperAdminView />)} />
                <Route path="*" element={<Navigate to={`/app/${defaultView}`} replace />} />
              </Routes>
            </main>

            {/* Onboarding Wizard Modal */}
            <OnboardingModal
              isOpen={showOnboarding}
              onClose={() => setShowOnboarding(false)}
              onSuccess={handleNewTenantCreated}
            />

            {/* Commercial Auth Modal */}
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
              defaultMode={authModalMode}
              defaultPlan={authModalPlan}
              onSuccess={handleAuthSuccess}
            />

            <OperationDialog open={Boolean(pendingNavigation) || settingsBlocker.state === 'blocked'} busy={navigationBusy} titleId="settings-leave-title" onClose={() => { setPendingNavigation(null); if (settingsBlocker.state === 'blocked') settingsBlocker.reset(); }}>
              <div className="workspace-leave-review studio-panel p-6">
                <h2 id="settings-leave-title" tabIndex={-1} className="text-xl font-semibold">{reviewingCheckout ? checkoutNavigation.busy ? 'Estamos comprobando el cobro' : checkoutNavigation.uncertain ? 'Hay un cobro por comprobar' : 'Tienes un ticket sin cobrar' : settingsBusy ? 'Estamos guardando tus cambios' : 'Revisa tus cambios antes de salir'}</h2>
                <p className="mt-3 text-sm text-stone-600">{reviewingCheckout ? checkoutNavigation.busy || checkoutNavigation.uncertain ? 'Vuelve al cobro y consulta su resultado antes de cambiar de pantalla, sucursal o cerrar sesión.' : 'Salir descarta este ticket, sus descuentos y propina. La cita sigue guardada y no se registra ningún cobro.' : settingsBusy ? 'Espera a que termine el guardado. Así podemos confirmar qué ajustes se aplicaron.' : settingsDirty ? 'Puedes seguir editando o salir y descartar los ajustes que todavía no guardaste.' : 'Los cambios ya se guardaron. Puedes continuar.'}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button disabled={navigationBusy} className="studio-button" onClick={() => { setPendingNavigation(null); if (settingsBlocker.state === 'blocked') settingsBlocker.reset(); }}>{reviewingCheckout ? 'Volver al cobro' : 'Seguir editando'}</button>
                  {!(reviewingCheckout && checkoutNavigation.uncertain) && <button disabled={navigationBusy} className="studio-button-secondary" onClick={() => {
                    const next = pendingNavigation; setPendingNavigation(null);
                    if (reviewingCheckout) { setCheckoutNavigation(emptyCheckoutNavigation); setActiveCitaForPos(null); setCheckoutResetVersion(v => v + 1); }
                    setSettingsDirty(false); setSettingsResetVersion(v => v + 1);
                    if (next?.branch) setCurrentSucursal(next.branch);
                    if (settingsBlocker.state === 'blocked') settingsBlocker.proceed();
                    if (next?.logout) { api.revokeAllSessions().then(handleLogout).catch((error: any) => { if (error.status === 401) handleLogout(); else setSessionError('No pudimos cerrar las sesiones. Vuelve a intentarlo.'); }); }
                  }}>{reviewingCheckout ? 'Descartar ticket y salir' : settingsDirty ? 'Descartar cambios y salir' : 'Continuar'}</button>}
                </div>
              </div>
            </OperationDialog>

            {/* Centro de Ayuda & Soporte Modal */}
            <CentroAyudaModal
              isOpen={showHelpModal}
              onClose={() => setShowHelpModal(false)}
              tenantSlug={currentTenant?.slug}
              tenantName={currentTenant?.nombre}
            />

            <footer className="studio-workspace py-5 text-center text-[10px] text-stone-400">
              SYSTECH Studio · Hecho para el oficio, pensado para tu negocio.
            </footer>
          </div>
          )
        }
      />

      {/* Fallback to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </React.Suspense>
  );
}

export default App;
