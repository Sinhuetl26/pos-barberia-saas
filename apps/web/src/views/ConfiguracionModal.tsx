import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Tenant } from '../types';
import {
  X,
  Settings,
  Building,
  Phone,
  Mail,
  MapPin,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  Receipt
} from 'lucide-react';

interface ConfiguracionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  onTenantUpdated: (updatedTenant: Tenant) => void;
}

export const ConfiguracionModal: React.FC<ConfiguracionModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onTenantUpdated
}) => {
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [telefono, setTelefono] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
  const [direccion, setDireccion] = useState('');
  const [mensajeTicket, setMensajeTicket] = useState('¡Gracias por tu visita! Síguenos en redes sociales.');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setNombre(tenant.nombre || '');
      setSlug(tenant.slug || '');
      setTelefono(tenant.telefono || '');
      setEmailContacto(tenant.emailContacto || '');
      setDireccion(tenant.direccion || '');
    }
  }, [tenant]);

  if (!isOpen || !tenant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updated = await api.updateTenantSettings({
        nombre,
        slug,
        telefono,
        emailContacto,
        direccion
      });

      onTenantUpdated(updated);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 backdrop-blur-sm p-4 overflow-y-auto font-sans animate-fade-in">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold tracking-wider uppercase text-stone-500">Configuración Comercial</span>
          </div>
          <h2 className="text-lg font-bold text-stone-900">Ajustes de la Barbería</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Personaliza los datos públicos, enlace de reservas y formato de tickets de tu negocio.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Configuración actualizada correctamente.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre Comercial de la Barbería</label>
            <div className="relative">
              <Building className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Slug para Reservas Públicas</label>
            <div className="flex items-center">
              <span className="bg-stone-100 border border-r-0 border-stone-200 rounded-l-xl px-3 py-2 text-xs text-stone-500 font-mono">
                /#reservar?barberia=
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full bg-white border border-stone-200 rounded-r-xl px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
              />
            </div>
            <p className="text-[10px] text-stone-400 mt-1">Este es el enlace que compartirás en tu biografía de Instagram o WhatsApp.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">WhatsApp de Atención</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="55 1234 5678"
                  className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Correo de Contacto</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="email"
                  value={emailContacto}
                  onChange={(e) => setEmailContacto(e.target.value)}
                  placeholder="contacto@barberia.com"
                  className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Dirección Principal</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Av. Principal 123, Col. Centro"
                className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Mensaje al Pie del Recibo / Ticket</label>
            <div className="relative">
              <Receipt className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={mensajeTicket}
                onChange={(e) => setMensajeTicket(e.target.value)}
                placeholder="¡Gracias por tu visita! Síguenos en redes."
                className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
