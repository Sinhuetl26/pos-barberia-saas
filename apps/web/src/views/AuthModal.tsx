import React, { useState } from 'react';
import { api } from '../api';
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

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
  defaultPlan?: 'BASICO' | 'PRO';
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
  const [plan, setPlan] = useState<'BASICO' | 'PRO'>(defaultPlan);

  if (!isOpen) return null;

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({
        email: loginEmail,
        password: loginPassword
      });
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar la barbería');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setError(null);
    setLoading(true);

    api.login({ email, password: pass })
      .then(res => {
        onSuccess(res);
        onClose();
      })
      .catch(err => {
        setError(err.message || 'Error en acceso rápido');
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative my-8">
        
        {/* Close Button */}
        <button
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
          <h2 className="text-xl font-bold text-stone-900">
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
              onClick={() => { setMode('login'); setError(null); }}
              className={`py-1.5 rounded-lg transition ${
                mode === 'login' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
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
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
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
                <label className="block text-xs font-medium text-stone-700 mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Accediendo...' : 'Entrar a Mi Panel'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Fast 1-Click Demo Accounts */}
              <div className="pt-4 border-t border-stone-100">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                  Acceso Rápido para Pruebas (1-Clic)
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('dueno@elbigote.com', 'Dueno123!')}
                    className="p-2 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-left font-medium text-stone-800 transition flex items-center gap-1.5"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="truncate">
                      <div className="font-semibold leading-tight">Dueño (El Bigote)</div>
                      <div className="text-[10px] text-stone-500">Plan PRO</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('gerente@elbigote.com', 'Gerente123!')}
                    className="p-2 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-left font-medium text-stone-800 transition flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <div className="truncate">
                      <div className="font-semibold leading-tight">Gerente (Condesa)</div>
                      <div className="text-[10px] text-stone-500">Operaciones</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('barbero@elbigote.com', 'Barbero123!')}
                    className="p-2 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-left font-medium text-stone-800 transition flex items-center gap-1.5"
                  >
                    <Scissors className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                    <div className="truncate">
                      <div className="font-semibold leading-tight">Barbero (Carlos)</div>
                      <div className="text-[10px] text-stone-500">Mi Agenda & POS</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('admin@systech.com', 'Admin@Systech2026!')}
                    className="p-2 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-left font-medium text-stone-800 transition flex items-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <div className="truncate">
                      <div className="font-semibold leading-tight">Super Admin</div>
                      <div className="text-[10px] text-stone-500">Métricas SaaS</div>
                    </div>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Nombre de la Barbería</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={nombreBarberia}
                    onChange={(e) => setNombreBarberia(e.target.value)}
                    placeholder="Ej. The Gentleman Studio"
                    className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Tu Nombre</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={nombreDueno}
                      onChange={(e) => setNombreDueno(e.target.value)}
                      placeholder="Dueño"
                      className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">WhatsApp / Teléfono</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="55 1234 5678"
                      className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="contacto@mibarberia.com"
                    className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Crea tu Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Al menos 6 caracteres"
                    className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                </div>
              </div>

              {/* Plan Choice */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Plan de Prueba (14 Días Gratis)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setPlan('BASICO')}
                    className={`p-2.5 rounded-xl border cursor-pointer transition ${
                      plan === 'BASICO'
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    <div className="text-xs font-bold">BÁSICO</div>
                    <div className="text-[10px] opacity-80">$499 MXN/mes</div>
                    <div className="text-[9px] opacity-70 mt-1">1 Sucursal • 3 Barberos</div>
                  </div>

                  <div
                    onClick={() => setPlan('PRO')}
                    className={`p-2.5 rounded-xl border cursor-pointer transition relative ${
                      plan === 'PRO'
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    <span className="absolute -top-1.5 right-2 bg-amber-400 text-stone-950 text-[8px] font-extrabold px-1.5 py-0.2 rounded">Recomendado</span>
                    <div className="text-xs font-bold">PRO COMPLETO</div>
                    <div className="text-[10px] opacity-80">$999 MXN/mes</div>
                    <div className="text-[9px] opacity-70 mt-1">Ilimitado + WhatsApp Pro</div>
                  </div>
                </div>
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
    </div>
  );
};
