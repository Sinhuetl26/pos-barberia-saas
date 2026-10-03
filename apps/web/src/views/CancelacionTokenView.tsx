import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Scissors, AlertCircle, CheckCircle2, Clock, Calendar, ArrowLeft } from 'lucide-react';

export const CancelacionTokenView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [motivo, setMotivo] = useState('Imprevisto personal');
  const [submitting, setSubmitting] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setSubmitting(true);
      setError(null);

      const API_BASE = ((import.meta as any).env?.VITE_API_URL as string) || 'http://localhost:3001/api';
      const res = await fetch(`${API_BASE}/public/cita/token/${token}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo cancelar la reservación.');
      }

      setCancelled(true);
    } catch (err: any) {
      setError(err.message || 'Error al procesar la cancelación.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-between text-stone-900 font-sans selection:bg-stone-900 selection:text-white">
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 py-3.5">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-black">
              <Scissors className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-900">
              Gestión Segura de Reservación
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xl max-w-md w-full p-6 animate-fade-in">
          {cancelled ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-stone-950">Reservación Cancelada</h2>
              <p className="text-xs text-stone-500 leading-relaxed">
                Tu cita ha sido cancelada exitosamente y el horario se ha liberado en la agenda. Se notificó a la barbería y a los clientes en lista de espera.
              </p>
              <div className="pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver al Inicio
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200/60 p-3 rounded-xl mb-4 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Política: Las cancelaciones deben realizarse con al menos 2 horas de anticipación.</span>
              </div>

              <h2 className="text-lg font-bold text-stone-950 mb-1">¿Deseas cancelar tu cita?</h2>
              <p className="text-xs text-stone-500 mb-4">
                Estás accediendo mediante tu enlace único de gestión criptográfico seguro.
              </p>

              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl mb-4 font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleCancel} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Motivo de la cancelación (Opcional)
                  </label>
                  <select
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900"
                  >
                    <option value="Imprevisto personal">Imprevisto personal</option>
                    <option value="Cambio de horario/agenda">Cambio de horario/agenda</option>
                    <option value="Problemas de transporte">Problemas de transporte</option>
                    <option value="Otro motivo">Otro motivo</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Link
                    to="/"
                    className="px-3.5 py-2 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50 transition"
                  >
                    Conservar Cita
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm"
                  >
                    {submitting ? 'Cancelando...' : 'Confirmar Cancelación'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-stone-200/80 bg-white py-4 text-center text-[11px] text-stone-500">
        SYSTECH Studio • Portal de Autoservicio y Cumplimiento LFPDPPP
      </footer>
    </div>
  );
};
