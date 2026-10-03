import React from 'react';
import { UserRole, Tenant, Sucursal } from '../types';
import {
  Scissors,
  Building2,
  Calendar,
  CreditCard,
  Users,
  Package,
  BarChart3,
  Bell,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Crown,
  Settings,
  LogOut,
  Globe,
  HelpCircle
} from 'lucide-react';

interface NavbarProps {
  tenants: Tenant[];
  currentTenant: Tenant | null;
  onSelectTenant: (tenant: Tenant) => void;
  sucursales: Sucursal[];
  currentSucursal: Sucursal | null;
  onSelectSucursal: (sucursal: Sucursal) => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  currentView: string;
  onSelectView: (view: string) => void;
  onOpenOnboarding: () => void;
  onOpenPublicBooking: () => void;
  currentUser?: any;
  onOpenSettings?: () => void;
  onOpenLanding?: () => void;
  onOpenHelp?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  tenants,
  currentTenant,
  onSelectTenant,
  sucursales,
  currentSucursal,
  onSelectSucursal,
  currentRole,
  onSelectRole,
  currentView,
  onSelectView,
  onOpenOnboarding,
  onOpenPublicBooking,
  currentUser,
  onOpenSettings,
  onOpenLanding,
  onOpenHelp,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200/80">
      {/* Subtle notification banner if in risk / suspended */}
      {currentTenant?.estado === 'EN_RIESGO' && currentRole !== 'SUPER_ADMIN' && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-1.5 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
            <span>Pago pendiente detectado. Tienes <strong>3 días de gracia</strong> antes de la suspensión del servicio.</span>
          </div>
          <button
            onClick={() => onSelectView('suscripcion')}
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2 transition"
          >
            Regularizar Pago →
          </button>
        </div>
      )}

      {currentTenant?.estado === 'SUSPENDIDO' && currentRole !== 'SUPER_ADMIN' && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-900 px-4 py-1.5 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            <span>Suscripción suspendida temporalmente por falta de pago. Los datos se mantienen aislados y seguros.</span>
          </div>
          <button
            onClick={() => onSelectView('suscripcion')}
            className="text-xs font-semibold text-rose-800 hover:text-rose-950 underline underline-offset-2 transition"
          >
            Reactivar Acceso →
          </button>
        </div>
      )}

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center shadow-sm">
              <Scissors className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-[0.18em] text-stone-900 uppercase font-sans">
                  SYSTECH
                </span>
                <span className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                  STUDIO
                </span>
              </div>
            </div>
          </div>

          {/* Tenant Selector & Branch */}
          <div className="flex items-center gap-2">
            {/* Tenant switcher */}
            <div className="relative">
              <select
                value={currentTenant?.id || ''}
                onChange={(e) => {
                  const t = tenants.find(x => x.id === e.target.value);
                  if (t) onSelectTenant(t);
                }}
                className="bg-white border border-stone-200 hover:border-stone-300 text-stone-900 text-xs rounded-lg pl-3 pr-7 py-1.5 font-medium focus:outline-none appearance-none cursor-pointer transition shadow-sm"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id} className="text-stone-900">
                    {t.nombre} ({t.plan}) {t.estado !== 'ACTIVO' ? `— [${t.estado}]` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-stone-500 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Branch selector */}
            {sucursales.length > 1 && currentRole !== 'SUPER_ADMIN' && (
              <div className="relative hidden md:block">
                <select
                  value={currentSucursal?.id || ''}
                  onChange={(e) => {
                    const s = sucursales.find(x => x.id === e.target.value);
                    if (s) onSelectSucursal(s);
                  }}
                  className="bg-stone-50 border border-stone-200 hover:border-stone-300 text-stone-700 text-xs rounded-lg pl-3 pr-7 py-1.5 font-normal focus:outline-none appearance-none cursor-pointer transition"
                >
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id} className="text-stone-900">
                      {s.nombre}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Quick Actions & Role Switcher */}
          <div className="flex items-center gap-2">
            
            {/* Landing page link */}
            {onOpenLanding && (
              <button
                onClick={onOpenLanding}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-xs text-stone-700 hover:text-stone-950 font-medium transition"
                title="Ver Página Web Comercial"
              >
                <Globe className="w-3.5 h-3.5 text-stone-600" />
                <span className="hidden xl:inline">Web Comercial</span>
              </button>
            )}

            {/* Shop Settings */}
            {currentRole === 'DUENO' && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-xs text-stone-700 hover:text-stone-950 font-medium transition"
                title="Configuración de Barbería"
              >
                <Settings className="w-3.5 h-3.5 text-stone-600" />
                <span className="hidden xl:inline">Ajustes</span>
              </button>
            )}

            {/* Help & Support Modal */}
            {onOpenHelp && (
              <button
                onClick={onOpenHelp}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-xs text-stone-700 hover:text-stone-950 font-medium transition"
                title="Centro de Ayuda y Soporte por WhatsApp"
              >
                <HelpCircle className="w-3.5 h-3.5 text-stone-600" />
                <span className="hidden md:inline">Ayuda</span>
              </button>
            )}

            {/* Public Booking Link */}
            <button
              onClick={onOpenPublicBooking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-xs text-stone-700 hover:text-stone-900 font-medium transition"
              title="Abrir Portal Público de Reservas"
            >
              <ExternalLink className="w-3 h-3 text-stone-600" />
              <span className="hidden md:inline">Portal Reservas</span>
            </button>

            {/* New Shop Onboarding */}
            <button
              onClick={onOpenOnboarding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition shadow-sm"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span className="hidden sm:inline">Nueva Barbería</span>
            </button>

            {/* Role Switcher */}
            <div className="relative">
              <select
                value={currentRole}
                onChange={(e) => onSelectRole(e.target.value as UserRole)}
                className="bg-white border border-stone-300 text-xs font-semibold text-stone-900 rounded-lg pl-2.5 pr-6 py-1.5 focus:outline-none cursor-pointer hover:border-stone-400 transition appearance-none shadow-sm"
              >
                <option value="DUENO">Dueño</option>
                <option value="GERENTE">Gerente</option>
                <option value="BARBERO">Barbero</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="CLIENTE_FINAL">Cliente Final</option>
              </select>
              <ChevronDown className="w-3 h-3 text-stone-500 absolute right-2 top-2.5 pointer-events-none" />
            </div>

            {/* Logout button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

          </div>
        </div>

        {/* Minimalist Tab Navigation */}
        <nav className="flex items-center space-x-1 overflow-x-auto py-2 border-t border-stone-100 no-scrollbar text-xs font-medium">
          {currentRole === 'SUPER_ADMIN' ? (
            <>
              <button
                onClick={() => onSelectView('superadmin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  currentView === 'superadmin'
                    ? 'bg-stone-900 text-white font-semibold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                Métricas SaaS & Cuentas
              </button>
              <button
                onClick={() => onSelectView('auditoria')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  currentView === 'auditoria'
                    ? 'bg-stone-900 text-white font-semibold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Bitácora de Auditoría
              </button>
            </>
          ) : currentRole === 'BARBERO' ? (
            <>
              <button
                onClick={() => onSelectView('agenda')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  currentView === 'agenda'
                    ? 'bg-stone-900 text-white font-semibold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Mi Agenda del Día
              </button>
              <button
                onClick={() => onSelectView('pos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  currentView === 'pos'
                    ? 'bg-stone-900 text-white font-semibold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Terminal POS
              </button>
              <button
                onClick={() => onSelectView('barberos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  currentView === 'barberos'
                    ? 'bg-stone-900 text-white font-semibold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Mis Comisiones
              </button>
            </>
          ) : (
            // DUENO or GERENTE
            <>
              <button
                onClick={() => onSelectView('agenda')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  currentView === 'agenda'
                    ? 'bg-stone-900 text-white font-semibold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Agenda & Citas
              </button>

              <button
                onClick={() => onSelectView('pos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  currentView === 'pos'
                    ? 'bg-stone-900 text-white font-semibold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Terminal POS
              </button>

              <button
                onClick={() => onSelectView('barberos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  currentView === 'barberos'
                    ? 'bg-stone-900 text-white font-semibold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Barberos & Comisiones
              </button>

              <button
                onClick={() => onSelectView('clientes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  currentView === 'clientes'
                    ? 'bg-stone-900 text-white font-semibold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Clientes CRM
              </button>

              <button
                onClick={() => onSelectView('inventario')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  currentView === 'inventario'
                    ? 'bg-stone-900 text-white font-semibold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Inventario & Kardex
              </button>

              {currentRole === 'DUENO' && (
                <button
                  onClick={() => onSelectView('reportes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                    currentView === 'reportes'
                      ? 'bg-stone-900 text-white font-semibold shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Analítica Financiera
                </button>
              )}

              {currentTenant?.plan === 'PRO' && (
                <button
                  onClick={() => onSelectView('notificaciones')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                    currentView === 'notificaciones'
                      ? 'bg-stone-900 text-white font-semibold shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Notificaciones Pro
                </button>
              )}

              {currentRole === 'DUENO' && (
                <button
                  onClick={() => onSelectView('suscripcion')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                    currentView === 'suscripcion'
                      ? 'bg-stone-900 text-white font-semibold shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Suscripción & Plan
                </button>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
