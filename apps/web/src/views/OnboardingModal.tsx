import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Sparkles,
  Scissors,
  CheckCircle,
  Building,
  Clock,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  X,
  ExternalLink,
  Check
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTenant: any) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<any[]>([]);

  // Step 1: Shop details
  const [nombreBarberia, setNombreBarberia] = useState('');
  const [telefono, setTelefono] = useState('');
  const [emailDueno, setEmailDueno] = useState('');
  const [nombreSucursal, setNombreSucursal] = useState('Matriz Centro');
  const [direccionSucursal, setDireccionSucursal] = useState('');
  const [horarioApertura, setHorarioApertura] = useState('09:00');
  const [horarioCierre, setHorarioCierre] = useState('20:00');
  const [plan, setPlan] = useState<'BASICO' | 'PRO'>('PRO');

  // Step 2: Services selected
  const [selectedTemplates, setSelectedTemplates] = useState<any[]>([]);

  // Step 3: First barber & commissions
  const [nombreBarbero, setNombreBarbero] = useState('');
  const [comisionServicios, setComisionServicios] = useState(50);
  const [comisionProductos, setComisionProductos] = useState(10);

  // Result
  const [createdTenant, setCreatedTenant] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const t = await api.getOnboardingTemplates();
      setTemplates(t);
      setSelectedTemplates(t); // pre-select all templates by default
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTemplate = (tmpl: any) => {
    if (selectedTemplates.some(t => t.nombre === tmpl.nombre)) {
      setSelectedTemplates(selectedTemplates.filter(t => t.nombre !== tmpl.nombre));
    } else {
      setSelectedTemplates([...selectedTemplates, tmpl]);
    }
  };

  const handleFinishOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.submitOnboarding({
        nombreBarberia,
        telefono,
        emailDueno,
        passwordDueno: '123456',
        nombreDueno: 'Dueño',
        nombreSucursal,
        direccionSucursal,
        horarioApertura,
        horarioCierre,
        plan,
        serviciosSeleccionados: selectedTemplates,
        nombreBarbero: nombreBarbero || 'Barbero Principal',
        comisionServicios,
        comisionProductos
      });

      setCreatedTenant(res.tenant);
      setStep(4);
      onSuccess(res.tenant);
    } catch (e: any) {
      alert(`Error en el asistente: ${e.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-stone-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl animate-luxury-in relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-900 p-1 rounded-lg hover:bg-stone-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Wizard Progress */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-stone-900">
                Alta de Nueva Barbería
              </h2>
              <p className="text-xs text-stone-500">Configuración guiada y catálogo precargado en menos de 3 minutos.</p>
            </div>
          </div>

          <div className="w-full bg-stone-100 h-[2px] rounded-full overflow-hidden mt-4">
            <div
              className="bg-stone-900 h-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: SHOP & BRANCH DETAILS */}
        {step === 1 && (
          <div className="space-y-4 animate-luxury-in">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">
              Paso 1: Datos de la Marca & Matriz
            </h3>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre de la Barbería *</label>
              <input
                type="text"
                required
                placeholder="Ej. Barbería Black Diamond"
                value={nombreBarberia}
                onChange={(e) => setNombreBarberia(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Teléfono WhatsApp *</label>
                <input
                  type="tel"
                  required
                  placeholder="55..."
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Email del Propietario *</label>
                <input
                  type="email"
                  required
                  placeholder="contacto@..."
                  value={emailDueno}
                  onChange={(e) => setEmailDueno(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre Sucursal Matriz</label>
                <input
                  type="text"
                  value={nombreSucursal}
                  onChange={(e) => setNombreSucursal(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Dirección / Zona</label>
                <input
                  type="text"
                  placeholder="Av. Masaryk 102"
                  value={direccionSucursal}
                  onChange={(e) => setDireccionSucursal(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Horario Apertura</label>
                <input
                  type="time"
                  value={horarioApertura}
                  onChange={(e) => setHorarioApertura(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Horario Cierre</label>
                <input
                  type="time"
                  value={horarioCierre}
                  onChange={(e) => setHorarioCierre(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Membresía Inicial</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPlan('BASICO')}
                  className={`p-3 rounded-xl border text-left text-xs transition ${
                    plan === 'BASICO'
                      ? 'bg-stone-50 border-stone-900 ring-1 ring-stone-900 text-stone-900 font-bold'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <div className="font-bold text-stone-900">Plan Básico ($499 MXN)</div>
                  <div className="text-[10px] text-stone-500 mt-1">1 sucursal, hasta 3 barberos</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPlan('PRO')}
                  className={`p-3 rounded-xl border text-left text-xs transition ${
                    plan === 'PRO'
                      ? 'bg-stone-50 border-stone-900 ring-1 ring-stone-900 text-stone-900 font-bold'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <div className="font-bold text-stone-900">Plan Pro ($999 MXN)</div>
                  <div className="text-[10px] text-stone-500 mt-1">Ilimitado + WhatsApp + Kardex</div>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                disabled={!nombreBarberia || !telefono || !emailDueno}
                onClick={() => setStep(2)}
                className="py-2.5 px-5 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <span>Siguiente: Catálogo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREDEFINED SERVICE TEMPLATES */}
        {step === 2 && (
          <div className="space-y-4 animate-luxury-in">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">
              Paso 2: Pre-cargar Catálogo de Servicios
            </h3>
            <p className="text-xs text-stone-500">
              Selecciona los servicios estándar para inicializar tu catálogo en un clic.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {templates.map(tmpl => {
                const isSelected = selectedTemplates.some(t => t.nombre === tmpl.nombre);
                return (
                  <button
                    key={tmpl.nombre}
                    type="button"
                    onClick={() => toggleTemplate(tmpl)}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-stone-50 border-stone-900 ring-1 ring-stone-900 text-stone-900 font-bold shadow-xs'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-stone-900">{tmpl.nombre}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5">
                        ${tmpl.precioVenta} MXN • {tmpl.duracionMinutos} min
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-stone-900 shrink-0 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="py-2.5 px-5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <span>Siguiente: Barbero</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FIRST BARBER & COMMISSIONS */}
        {step === 3 && (
          <div className="space-y-4 animate-luxury-in">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">
              Paso 3: Primer Barbero & Esquema de Comisiones
            </h3>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre del Master Barber Principal *</label>
              <input
                type="text"
                required
                placeholder="Ej. Carlos 'Charly' Mendoza"
                value={nombreBarbero}
                onChange={(e) => setNombreBarbero(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200/80">
              <div>
                <label className="block text-xs font-bold text-stone-900 mb-1">Comisión Servicios (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={comisionServicios}
                  onChange={(e) => setComisionServicios(Number(e.target.value))}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-bold"
                />
                <span className="text-[10px] text-stone-500 mt-1 block">Típico boutique: 50%</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Comisión Retail / Prod (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={comisionProductos}
                  onChange={(e) => setComisionProductos(Number(e.target.value))}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-bold"
                />
                <span className="text-[10px] text-stone-500 mt-1 block">Típico pomadas: 10%</span>
              </div>
            </div>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-2 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="py-2.5 px-6 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Crear y Lanzar Barbería</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS! */}
        {step === 4 && createdTenant && (
          <div className="text-center space-y-4 py-4 animate-luxury-in">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>

            <h3 className="text-xl font-bold tracking-tight text-stone-900">
              ¡{createdTenant.nombre} está lista!
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Tu catálogo, primer barbero y enlace público de citas ya se encuentran activos en el sistema.
            </p>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-left text-xs space-y-2">
              <div className="text-stone-500 uppercase text-[10px] tracking-widest font-semibold">Enlace Público de Reservas:</div>
              <div className="font-mono text-stone-900 font-bold bg-white p-2.5 rounded-lg border border-stone-200 break-all">
                {window.location.origin}/#reservar?slug={createdTenant.slug}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition shadow-sm"
              >
                Abrir Terminal POS
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
