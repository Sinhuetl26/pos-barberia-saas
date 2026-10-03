import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { api } from './api';
import { Tenant, Sucursal, UserRole, Cita } from './types';
import { Navbar } from './components/Navbar';
import { SuperAdminView } from './views/SuperAdminView';
import { AgendaView } from './views/AgendaView';
import { PosView } from './views/PosView';
import { BarberosView } from './views/BarberosView';
import { InventarioView } from './views/InventarioView';
import { ReportesView } from './views/ReportesView';
import { NotificacionesView } from './views/NotificacionesView';
import { SuscripcionView } from './views/SuscripcionView';
import { PublicBookingView } from './views/PublicBookingView';
import { OnboardingModal } from './views/OnboardingModal';
import { LandingView } from './views/LandingView';
import { AuthModal } from './views/AuthModal';
import { ConfiguracionModal } from './views/ConfiguracionModal';
import { ClientesView } from './views/ClientesView';
import { CancelacionTokenView } from './views/CancelacionTokenView';
import { AvisoPrivacidadView } from './views/AvisoPrivacidadView';
import { TerminosCondicionesView } from './views/TerminosCondicionesView';
import { CentroAyudaModal } from './views/CentroAyudaModal';

export function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [currentSucursal, setCurrentSucursal] = useState<Sucursal | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('DUENO');

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
  const [authModalPlan, setAuthModalPlan] = useState<'BASICO' | 'PRO'>('PRO');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Pos transfer
  const [activeCitaForPos, setActiveCitaForPos] = useState<Cita | null>(null);

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
    const token = api.getAuthToken();
    if (!token) return;

    try {
      const session = await api.getCurrentSession();
      if (session.user && session.tenant) {
        setCurrentUser(session.user);
        localStorage.setItem('systech_user', JSON.stringify(session.user));
        setCurrentTenant(session.tenant);
        const role = (session.user.rol || 'DUENO') as UserRole;
        setCurrentRole(role);
        api.setContext(session.tenant.id, role, session.user.id);

        const sucs = await api.getSucursales();
        setSucursales(sucs);
        if (sucs.length > 0) {
          setCurrentSucursal(sucs[0]);
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
    } catch (e) {
      console.warn('Sesión no válida o expirada:', e);
      handleLogout();
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
  const handleStartTrial = (plan: 'BASICO' | 'PRO') => {
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
    navigate('/app/agenda');
  };

  const handleLogout = () => {
    api.logout();
    localStorage.removeItem('systech_user');
    setCurrentUser(null);
    navigate('/');
  };

  const currentView = location.pathname.replace('/app/', '') || 'agenda';

  return (
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
        element={<PublicBookingView onExit={() => navigate('/')} />}
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
      <Route path="/privacidad" element={<AvisoPrivacidadView />} />
      <Route path="/terminos" element={<TerminosCondicionesView />} />

      {/* 6. Legacy / Admin Redirects */}
      <Route path="/admin" element={<Navigate to="/app/superadmin" replace />} />

      {/* 6. Main Backoffice App (Protected Route) */}
      <Route
        path="/app/*"
        element={
          !api.getAuthToken() && !currentUser ? (
            <Navigate to="/login" replace />
          ) : (
            <div className="min-h-screen bg-[#FAFAFA] text-[#09090B] flex flex-col font-sans selection:bg-[#18181B] selection:text-white">
              <Navbar
              tenants={tenants}
              currentTenant={currentTenant}
              onSelectTenant={selectTenant}
              sucursales={sucursales}
              currentSucursal={currentSucursal}
              onSelectSucursal={setCurrentSucursal}
              currentRole={currentRole}
              onSelectRole={handleSelectRole}
              currentView={currentView}
              onSelectView={(v) => navigate(`/app/${v}`)}
              onOpenOnboarding={() => setShowOnboarding(true)}
              onOpenPublicBooking={() => navigate(`/b/${currentTenant?.slug || 'el-bigote'}`)}
              currentUser={currentUser}
              onOpenSettings={() => setShowSettingsModal(true)}
              onOpenHelp={() => setShowHelpModal(true)}
              onOpenLanding={() => navigate('/')}
              onLogout={handleLogout}
            />

            <main className="flex-1">
              <Routes>
                <Route
                  path="agenda"
                  element={
                    <AgendaView
                      currentSucursal={currentSucursal}
                      onOpenPosWithCita={handleOpenPosWithCita}
                      onOpenPublicBooking={() => navigate(`/b/${currentTenant?.slug || 'el-bigote'}`)}
                      publicSlug={currentTenant?.slug}
                    />
                  }
                />
                <Route
                  path="pos"
                  element={
                    <PosView
                      currentSucursal={currentSucursal}
                      activeCita={activeCitaForPos}
                      onClearActiveCita={() => setActiveCitaForPos(null)}
                    />
                  }
                />
                <Route
                  path="barberos"
                  element={
                    <BarberosView
                      currentSucursal={currentSucursal}
                      currentRole={currentRole}
                      plan={currentTenant?.plan || 'PRO'}
                      onNavigateToSubscription={() => navigate('/app/suscripcion')}
                    />
                  }
                />
                <Route path="clientes" element={<ClientesView />} />
                <Route path="inventario" element={<InventarioView currentSucursal={currentSucursal} />} />
                <Route path="reportes" element={<ReportesView currentSucursal={currentSucursal} />} />
                <Route path="notificaciones" element={<NotificacionesView />} />
                <Route
                  path="suscripcion"
                  element={
                    <SuscripcionView
                      onPlanChanged={() => {
                        if (currentTenant) selectTenant(currentTenant);
                      }}
                    />
                  }
                />
                <Route path="superadmin" element={<SuperAdminView />} />
                <Route path="auditoria" element={<SuperAdminView />} />
                <Route path="*" element={<Navigate to="agenda" replace />} />
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

            {/* Shop Customization Settings Modal */}
            <ConfiguracionModal
              isOpen={showSettingsModal}
              onClose={() => setShowSettingsModal(false)}
              tenant={currentTenant}
              onTenantUpdated={(updated) => {
                setCurrentTenant(updated);
                setTenants(prev => prev.map(t => t.id === updated.id ? updated : t));
              }}
            />

            {/* Centro de Ayuda & Soporte Modal */}
            <CentroAyudaModal
              isOpen={showHelpModal}
              onClose={() => setShowHelpModal(false)}
              tenantSlug={currentTenant?.slug}
              tenantName={currentTenant?.nombre}
            />

            <footer className="border-t border-stone-200/80 bg-white py-5 text-center text-[11px] text-stone-500">
              SYSTECH Studio Platform • Barber POS & Multi-Tenant Management Suite • Cumplimiento LFPDPPP México
            </footer>
          </div>
          )
        }
      />

      {/* Fallback to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
