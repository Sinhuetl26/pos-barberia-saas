import React, { useState, useEffect,useRef } from 'react';
import { api } from '../api';
import { LicensePlanSelector } from '../components/LicensePlanSelector';
import { OperationDialog } from '../components/OperationDialog';
import '../styles/secondary-workspaces.css';
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
  const submitting=useRef(false);const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState('');

  // Step 1: Shop details
  const [nombreBarberia, setNombreBarberia] = useState('');
  const [telefono, setTelefono] = useState('');
  const [emailDueno, setEmailDueno] = useState('');
  const [nombreDueno, setNombreDueno] = useState('');
  const [passwordDueno, setPasswordDueno] = useState('');
  const [nombreSucursal, setNombreSucursal] = useState('Matriz Centro');
  const [direccionSucursal, setDireccionSucursal] = useState('');
  const [horarioApertura, setHorarioApertura] = useState('09:00');
  const [horarioCierre, setHorarioCierre] = useState('20:00');
  const [zonaHoraria,setZonaHoraria]=useState('America/Mexico_City'),[diasLaborales,setDiasLaborales]=useState('Lunes a Sábado');
  const [plan, setPlan] = useState<'BASICO' | 'PRO' | 'CADENA'>('PRO');

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
      setStep(1);setCreatedTenant(null);setError('');loadTemplates();
    }else{setPasswordDueno('');}
  }, [isOpen]);

  const loadTemplates = async () => {
    setTemplatesLoading(true); setTemplatesError('');
    try {
      const t = await api.getOnboardingTemplates();
      setTemplates(t);
      setSelectedTemplates([]); // Suggestions require an explicit choice.
    } catch {
      setTemplatesError('No pudimos consultar las sugerencias. Puedes volver a intentarlo o continuar sin servicios y capturarlos después.');
    } finally { setTemplatesLoading(false); }
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
    if(submitting.current)return;submitting.current=true;setSaving(true);setError('');
    try {
      const res = await api.submitOnboarding({
        nombreBarberia,
        telefono,
        emailDueno,
        passwordDueno,
        nombreDueno,
        nombreSucursal,
        direccionSucursal,
        horarioApertura,
        horarioCierre,
        zonaHoraria,diasLaborales,
        plan,
        serviciosSeleccionados: selectedTemplates,
        nombreBarbero: nombreBarbero.trim()||undefined,
        comisionServicios,
        comisionProductosPct:comisionProductos
      });

      setCreatedTenant(res.tenant);
      setStep(4);
      onSuccess(res.tenant);
    } catch (e: any) {
      setError(e.message);
    }finally{submitting.current=false;setSaving(false);}
  };

  if (!isOpen) return null;

  return (
    <OperationDialog open={isOpen} busy={saving} titleId="onboarding-modal-title" onClose={onClose} className="max-w-xl">
      <div className="onboarding-workbench bg-white border border-stone-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl animate-luxury-in relative">
        
        {/* Close Button */}
        <button
          type="button"
          aria-label="Cerrar alta de barbería"
          disabled={saving}
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
              <h2 id="onboarding-modal-title" tabIndex={-1} className="text-base font-bold tracking-tight text-stone-900">
                Prepara tu barbería
              </h2>
              <p className="text-xs text-stone-500">Configura tu sucursal y elige los servicios que realmente ofreces.</p>
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
              1. Datos esenciales
            </h3>

            <div>
              <label htmlFor="onboarding-nombreBarberia" className="block text-xs font-semibold text-stone-700 mb-1">Nombre de la Barbería *</label>
              <input id="onboarding-nombreBarberia"
                type="text"
                required
                placeholder="Ej. Barbería Black Diamond"
                value={nombreBarberia}
                onChange={(e) => setNombreBarberia(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
              />
            </div>

            <label className="block text-xs">Nombre del propietario<input required className="studio-input mt-2 w-full" value={nombreDueno} onChange={e => setNombreDueno(e.target.value)} /></label>
            <label className="block text-xs">Contraseña del propietario<input required type="password" autoComplete="new-password" minLength={12} maxLength={72} className="studio-input mt-2 w-full" value={passwordDueno} onChange={e => setPasswordDueno(e.target.value)} /><span className="block mt-1 text-stone-500">Mínimo 12 caracteres. Necesitarás verificar tu correo para operar.</span></label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="onboarding-telefono" className="block text-xs font-semibold text-stone-700 mb-1">Teléfono WhatsApp *</label>
                <input id="onboarding-telefono"
                  type="tel"
                  required
                  placeholder="55..."
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>
              <div>
                <label htmlFor="onboarding-emailDueno" className="block text-xs font-semibold text-stone-700 mb-1">Email del Propietario *</label>
                <input id="onboarding-emailDueno"
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
                <label htmlFor="onboarding-nombreSucursal" className="block text-xs font-semibold text-stone-700 mb-1">Nombre Sucursal Matriz</label>
                <input id="onboarding-nombreSucursal"
                  type="text"
                  value={nombreSucursal}
                  onChange={(e) => setNombreSucursal(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>
              <div>
                <label htmlFor="onboarding-direccionSucursal" className="block text-xs font-semibold text-stone-700 mb-1">Dirección / Zona</label>
                <input id="onboarding-direccionSucursal"
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
                <label htmlFor="onboarding-horarioApertura" className="block text-xs font-semibold text-stone-700 mb-1">Horario Apertura</label>
                <input id="onboarding-horarioApertura"
                  type="time"
                  value={horarioApertura}
                  onChange={(e) => setHorarioApertura(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                />
              </div>
              <div>
                <label htmlFor="onboarding-horarioCierre" className="block text-xs font-semibold text-stone-700 mb-1">Horario Cierre</label>
                <input id="onboarding-horarioCierre"
                  type="time"
                  value={horarioCierre}
                  onChange={(e) => setHorarioCierre(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Membresía Inicial</label>
              <LicensePlanSelector value={plan} onChange={setPlan} />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                disabled={saving || !nombreBarberia || !telefono || !emailDueno || !nombreDueno.trim() || passwordDueno.length < 12}
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
            {templatesLoading && <p role="status" className="text-sm text-stone-600">Consultando sugerencias de servicios…</p>}
            {templatesError && <div role="alert" className="text-sm text-rose-800"><p>{templatesError}</p><button type="button" disabled={templatesLoading} className="studio-button-secondary mt-2" onClick={() => void loadTemplates()}>Volver a consultar sugerencias</button></div>}
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">
              2. Servicios iniciales
            </h3>
            <p className="text-xs text-stone-500">
              Elige solo los servicios que ofreces y ajusta tus precios y duración. También puedes comenzar con el catálogo vacío.
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

            {selectedTemplates.map((serv,i)=><fieldset key={serv.nombre} className="rounded-lg border p-3"><legend className="text-xs font-semibold">{serv.nombre}</legend><div className="grid grid-cols-2 gap-3"><label className="text-xs">Tu precio (MXN)<input type="number" min="0" step="0.01" value={serv.precioVenta} onChange={e=>setSelectedTemplates(v=>v.map((s,j)=>j===i?{...s,precioVenta:Number(e.target.value)}:s))} className="mt-1 w-full rounded border p-2"/></label><label className="text-xs">Duración (min)<input type="number" min="15" max="480" value={serv.duracionMinutos} onChange={e=>setSelectedTemplates(v=>v.map((s,j)=>j===i?{...s,duracionMinutos:Number(e.target.value)}:s))} className="mt-1 w-full rounded border p-2"/></label></div></fieldset>)}
            <label className="block text-xs font-semibold">Zona horaria<input value={zonaHoraria} onChange={e=>setZonaHoraria(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label><label className="block text-xs font-semibold">Días de atención<input value={diasLaborales} onChange={e=>setDiasLaborales(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
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
        {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
        {step === 3 && (
          <div className="space-y-4 animate-luxury-in">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">
              3. Tu primer profesional
            </h3>

            <div>
              <label htmlFor="onboarding-nombreBarbero" className="block text-xs font-semibold text-stone-700 mb-1">Primer barbero (opcional)</label>
              <input id="onboarding-nombreBarbero"
                type="text"
                placeholder="Ej. Carlos 'Charly' Mendoza"
                value={nombreBarbero}
                onChange={(e) => setNombreBarbero(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200/80">
              <div>
                <label htmlFor="onboarding-comisionServicios" className="block text-xs font-bold text-stone-900 mb-1">Comisión Servicios (%)</label>
                <input id="onboarding-comisionServicios"
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
                <label htmlFor="onboarding-comisionProductos" className="block text-xs font-bold text-stone-700 mb-1">Comisión Retail / Prod (%)</label>
                <input id="onboarding-comisionProductos"
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
                disabled={saving} onClick={() => setStep(2)}
                className="py-2 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
              >
                Atrás
              </button>
              <button
                type="button"
                disabled={saving} onClick={handleFinishOnboarding}
                className="py-2.5 px-6 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Crear mi barbería</span>
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
                {window.location.origin}/b/{encodeURIComponent(createdTenant.slug)}
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
    </OperationDialog>
  );
};
