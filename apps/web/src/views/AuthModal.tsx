import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { LicensePlanSelector } from '../components/LicensePlanSelector';
import { OperationDialog } from '../components/OperationDialog';
import {
  X,
  Scissors,
  Sparkles,
  Lock,
  Mail,
  Building,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Crown
} from 'lucide-react';
import '../styles/secondary-workspaces.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
  defaultPlan?: 'BASICO' | 'PRO' | 'CADENA';
  onSuccess: (data: { user: any; tenant: any; sucursales: any[] }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
  defaultPlan = 'PRO',
  onSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  useEffect(() => { setShowLoginPassword(false); setShowRegisterPassword(false); }, [isOpen, mode]);
  const [error, setError] = useState<string | null>(null);

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form
  const [nombreBarberia, setNombreBarberia] = useState('');
  const [nombreDueno, setNombreDueno] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [plan, setPlan] = useState<'BASICO' | 'PRO' | 'CADENA'>(defaultPlan);

  useEffect(() => {
    if (isOpen) { setMode(defaultMode); setPlan(defaultPlan); setError(null); }
  }, [isOpen, defaultMode, defaultPlan]);

  if (!isOpen) return null;

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({
        email: loginEmail,
        password: loginPassword
      });
      onSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await api.register({
        nombreBarberia,
        nombreDueno,
        email: regEmail,
        password: regPassword,
        telefono,
        plan
      });
      onSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Error al registrar la barbería');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OperationDialog open={isOpen} busy={loading} titleId="auth-modal-title" onClose={onClose}>
      <div className="auth-workbench bg-white border border-stone-200 rounded-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl relative">
        
        {/* Close Button */}
        <button
          type="button"
          aria-label="Cerrar acceso"
          disabled={loading}
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center">
              <Scissors className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold tracking-wider uppercase text-stone-900">SYSTECH STUDIO</span>
          </div>
          <h2 id="auth-modal-title" tabIndex={-1} className="text-xl font-bold text-stone-900">
            {mode === 'login' ? 'Iniciar Sesión' : 'Registrar Mi Barbería'}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {mode === 'login'
              ? 'Accede a la consola de administración de tu salón'
              : 'Comienza tu prueba de 14 días gratis sin tarjeta obligatoria'}
          </p>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-stone-200/60 rounded-xl mt-4 text-xs font-semibold">
            <button
              type="button"
              disabled={loading}
              aria-pressed={mode === 'login'}
              onClick={() => { setMode('login'); setError(null); }}
              className={`py-1.5 rounded-lg transition ${
                mode === 'login' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              disabled={loading}
              aria-pressed={mode === 'register'}
              onClick={() => { setMode('register'); setError(null); }}
              className={`py-1.5 rounded-lg transition ${
                mode === 'register' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Prueba Gratis (14 Días)
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {error && (
            <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLogin} aria-busy={loading} className="space-y-4">
              <div className="mb-4 text-right"><a href="/cuenta/recuperar" className="text-xs underline">Olvidé mi contraseña</a></div>
              <div>
                <label htmlFor="login-email" className="block text-xs font-medium text-stone-700 mb-1">Correo electrónico</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="login-email"
                    autoComplete="username"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="dueño@barberia.com"
                    className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-medium text-stone-700 mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="login-password"
                    autoComplete="current-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                </div>
                <button type="button" className="mt-2 text-xs underline text-stone-700 min-h-[44px]" aria-controls="login-password" aria-pressed={showLoginPassword} onClick={() => setShowLoginPassword(v => !v)}>{showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Accediendo...' : 'Entrar a Mi Panel'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Registration toggle */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                <span>¿No tienes cuenta aún?</span>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setMode('register')}
                  className="font-bold text-stone-900 hover:underline"
                >
                  Registrar mi Barbería (14 Días Gratis) →
                </button>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} aria-busy={loading} className="space-y-3.5">
              <div>
                <label htmlFor="register-shop" className="block text-xs font-medium text-stone-700 mb-1">Nombre de la barbería</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={nombreBarberia}
                    id="register-shop"
                    autoComplete="organization"
                    onChange={(e) => setNombreBarberia(e.target.value)}
                    placeholder="Ej. The Gentleman Studio"
                    className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="register-owner" className="block text-xs font-medium text-stone-700 mb-1">Tu nombre</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={nombreDueno}
                      id="register-owner"
                      autoComplete="name"
                      onChange={(e) => setNombreDueno(e.target.value)}
                      placeholder="Dueño"
                      className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="register-phone" className="block text-xs font-medium text-stone-700 mb-1">WhatsApp / teléfono</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={telefono}
                      id="register-phone"
                      autoComplete="tel"
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="55 1234 5678"
                      className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="register-email" className="block text-xs font-medium text-stone-700 mb-1">Correo electrónico</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    id="register-email"
                    autoComplete="email"
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="contacto@mibarberia.com"
                    className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-password" className="block text-xs font-medium text-stone-700 mb-1">Crea tu contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="register-password"
                    autoComplete="new-password"
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    minLength={12} maxLength={72}
                    placeholder="Al menos 12 caracteres"
                    className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                </div>
                <button type="button" className="mt-2 text-xs underline text-stone-700 min-h-[44px]" aria-controls="register-password" aria-pressed={showRegisterPassword} onClick={() => setShowRegisterPassword(v => !v)}>{showRegisterPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</button>
              </div>

              {/* Plan Choice */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Plan de Prueba (14 Días Gratis)</label>
                <LicensePlanSelector value={plan} onChange={setPlan} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
              >
                {loading ? 'Configurando tu barbería...' : 'Crear Mi Cuenta & Comenzar'}
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </button>
            </form>
          )}
        </div>

      </div>
    </OperationDialog>
  );
};
