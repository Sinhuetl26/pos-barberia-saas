import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Tenant, Barbero } from '../types';
import {
  Globe,
  Camera,
  Users,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Save,
  Instagram,
  Facebook,
  Phone,
  MessageCircle,
  HelpCircle,
  Eye,
  Sliders
} from 'lucide-react';

interface PersonalizarLandingViewProps {
  currentTenant: Tenant | null;
  onRefreshTenant?: () => void;
}

// Curated luxury preset banners for barbershops
const PRESET_BANNERS = [
  {
    name: 'Clásico Vintage',
    url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1600&q=80'
  },
  {
    name: 'Madera & Cuero Dark',
    url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1600&q=80'
  },
  {
    name: 'Navajas & Precisión',
    url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1600&q=80'
  },
  {
    name: 'Estudio Moderno Urbano',
    url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1600&q=80'
  }
];

// Curated avatar presets for barbers
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80'
];

export const PersonalizarLandingView: React.FC<PersonalizarLandingViewProps> = ({
  currentTenant,
  onRefreshTenant
}) => {
  // General Shop Fields
  const [nombre, setNombre] = useState(currentTenant?.nombre || '');
  const [slogan, setSlogan] = useState(currentTenant?.slogan || '');
  const [descripcion, setDescripcion] = useState(currentTenant?.descripcion || '');
  const [portadaUrl, setPortadaUrl] = useState(currentTenant?.portadaUrl || PRESET_BANNERS[0].url);
  const [logoUrl, setLogoUrl] = useState(currentTenant?.logoUrl || '');
  const [slug, setSlug] = useState(currentTenant?.slug || 'mi-barberia');
  const [whatsappPublico, setWhatsappPublico] = useState(currentTenant?.whatsappPublico || currentTenant?.telefono || '');
  const [instagram, setInstagram] = useState(currentTenant?.instagram || '');
  const [facebook, setFacebook] = useState(currentTenant?.facebook || '');
  const [tiktok, setTiktok] = useState(currentTenant?.tiktok || '');

  // Barbers Management
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [barberForms, setBarberForms] = useState<Record<string, {
    avatarUrl: string;
    especialidad: string;
    descripcion: string;
    visibleEnWeb: boolean;
  }>>({});

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const publicUrl = `${window.location.origin}/b/${slug || currentTenant?.slug || 'barberia'}`;

  useEffect(() => {
    if (currentTenant) {
      setNombre(currentTenant.nombre || '');
      setSlogan(currentTenant.slogan || '');
      setDescripcion(currentTenant.descripcion || '');
      setPortadaUrl(currentTenant.portadaUrl || PRESET_BANNERS[0].url);
      setLogoUrl(currentTenant.logoUrl || '');
      setSlug(currentTenant.slug || 'mi-barberia');
      setWhatsappPublico(currentTenant.whatsappPublico || currentTenant.telefono || '');
      setInstagram(currentTenant.instagram || '');
      setFacebook(currentTenant.facebook || '');
      setTiktok(currentTenant.tiktok || '');
    }
    loadBarberos();
  }, [currentTenant?.id]);

  const loadBarberos = async () => {
    try {
      const data = await api.getBarberos();
      setBarberos(data);
      const initialMap: Record<string, any> = {};
      data.forEach(b => {
        initialMap[b.id] = {
          avatarUrl: b.avatarUrl || '',
          especialidad: b.especialidad || 'Master Barber',
          descripcion: b.descripcion || 'Especialista en cortes clásicos, fades modernos y diseño de barba.',
          visibleEnWeb: b.visibleEnWeb !== false
        };
      });
      setBarberForms(initialMap);
    } catch (e) {
      console.error('Error al cargar barberos para landing:', e);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      // 1. Update Tenant Settings
      await api.updateTenantSettings({
        nombre,
        slogan,
        descripcion,
        portadaUrl,
        logoUrl,
        slug,
        whatsappPublico,
        instagram,
        facebook,
        tiktok
      });

      // 2. Update Barbers public profile
      for (const b of barberos) {
        const formData = barberForms[b.id];
        if (formData) {
          await api.updateBarbero(b.id, {
            avatarUrl: formData.avatarUrl,
            especialidad: formData.especialidad,
            descripcion: formData.descripcion,
            visibleEnWeb: formData.visibleEnWeb
          });
        }
      }

      setStatusMsg({ type: 'success', text: '¡Página web y perfil público actualizados exitosamente!' });
      if (onRefreshTenant) onRefreshTenant();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al guardar los cambios' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-luxury-in">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-stone-900 text-white shadow-xs">
              <Globe className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Personalizar Página Web de Clientes
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Configura la página que verán tus clientes al abrir el link de tu barbería (Instagram, WhatsApp, TikTok).
          </p>
        </div>

        {/* Public Link Share Bar */}
        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 p-1.5 rounded-xl shadow-xs">
          <div className="px-3 py-1 text-xs font-mono text-stone-600 truncate max-w-[240px] sm:max-w-xs">
            {publicUrl}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-800 transition"
            title="Copiar enlace al portapapeles"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
            <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver Página</span>
          </a>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl mb-6 text-xs sm:text-sm font-semibold flex items-center gap-2 ${
          statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {statusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <HelpCircle className="w-4 h-4 text-rose-600" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <form onSubmit={handleSaveAll} className="space-y-8">
        
        {/* SECCIÓN 1: IDENTIDAD Y PORTADA */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-base sm:text-lg font-bold text-stone-900">1. Identidad de la Barbería & Portada</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Nombre Comercial de la Barbería</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Barbería El Bigote"
                className="w-full bg-white border border-stone-200 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-stone-900 font-medium focus:outline-none focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Enlace / Slug Personalizado</label>
              <div className="flex items-center">
                <span className="bg-stone-100 border border-r-0 border-stone-200 px-3 py-2 text-xs text-stone-500 font-mono rounded-l-lg">
                  /b/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="el-bigote"
                  className="w-full bg-white border border-stone-200 rounded-r-lg px-3.5 py-2 text-xs sm:text-sm text-stone-900 font-mono font-bold focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">Slogan o Frase Destacada</label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                placeholder="Ej. El arte del corte clásico y diseño de vanguardia"
                className="w-full bg-white border border-stone-200 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-stone-900 font-medium focus:outline-none focus:border-stone-900"
              />
              <p className="text-[11px] text-stone-500 mt-1">Aparece en el banner superior de bienvenida.</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">Historia / Sobre Nosotros ("Nuestra Esencia")</label>
              <textarea
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Cuéntale a tus clientes lo que hace única a tu barbería, experiencia, bebidas de cortesía, toalla caliente..."
                className="w-full bg-white border border-stone-200 rounded-lg p-3 text-xs sm:text-sm text-stone-900 font-medium focus:outline-none focus:border-stone-900"
              />
            </div>
          </div>

          {/* Banner Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">Imagen de Portada (Banner Principal)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {PRESET_BANNERS.map((preset) => (
                <button
                  type="button"
                  key={preset.url}
                  onClick={() => setPortadaUrl(preset.url)}
                  className={`relative rounded-xl overflow-hidden border-2 text-left transition group ${
                    portadaUrl === preset.url ? 'border-stone-900 ring-2 ring-stone-900/20' : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-20 object-cover" />
                  <div className="p-1.5 bg-white text-[10px] font-bold text-stone-800 truncate">
                    {preset.name}
                  </div>
                  {portadaUrl === preset.url && (
                    <span className="absolute top-1 right-1 bg-stone-900 text-white p-0.5 rounded-full">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 whitespace-nowrap">O ingresa URL personalizada:</span>
              <input
                type="url"
                value={portadaUrl}
                onChange={(e) => setPortadaUrl(e.target.value)}
                placeholder="https://ejemplo.com/mi-portada.jpg"
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-900"
              />
            </div>
          </div>

          {/* Redes y Contacto */}
          <div className="pt-4 border-t border-stone-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Contacto Directo & Redes Sociales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  WhatsApp para Reservas
                </label>
                <input
                  type="tel"
                  value={whatsappPublico}
                  onChange={(e) => setWhatsappPublico(e.target.value)}
                  placeholder="55 1234 5678"
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5 text-rose-600" />
                  Instagram (@usuario)
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@mibarberia"
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Facebook className="w-3.5 h-3.5 text-blue-600" />
                  Facebook
                </label>
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="facebook.com/mibarberia"
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: EQUIPO DE BARBEROS (FOTOS, BIOGRAFÍA Y ESPECIALIDADES) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-stone-800" />
              <div>
                <h2 className="text-base sm:text-lg font-bold text-stone-900">2. Fotos y Perfil de Barberos</h2>
                <p className="text-xs text-stone-500">
                  Personaliza cómo se presentan tus barberos a los clientes (fotos, biografía y especialidades).
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
              {barberos.length} {barberos.length === 1 ? 'Barbero' : 'Barberos'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {barberos.map((b) => {
              const form = barberForms[b.id] || {
                avatarUrl: b.avatarUrl || '',
                especialidad: b.especialidad || 'Master Barber',
                descripcion: b.descripcion || '',
                visibleEnWeb: b.visibleEnWeb !== false
              };

              return (
                <div key={b.id} className="border border-stone-200 rounded-xl p-5 bg-stone-50/50 hover:bg-white transition space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {form.avatarUrl ? (
                        <img
                          src={form.avatarUrl}
                          alt={b.nombre}
                          className="w-12 h-12 rounded-full object-cover border-2 border-stone-900 shadow-xs"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-base">
                          {b.nombre.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-stone-900 text-sm">{b.nombre}</h4>
                        <span className="text-[11px] text-stone-500">{b.horarioInicio} - {b.horarioFin}</span>
                      </div>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.visibleEnWeb}
                        onChange={(e) => setBarberForms({
                          ...barberForms,
                          [b.id]: { ...form, visibleEnWeb: e.target.checked }
                        })}
                        className="rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                      />
                      <span className="text-xs font-semibold text-stone-700">Mostrar en Web</span>
                    </label>
                  </div>

                  {/* Avatar Picker */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1.5">Foto de Perfil (Avatar)</label>
                    <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1">
                      {PRESET_AVATARS.map((av, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setBarberForms({
                            ...barberForms,
                            [b.id]: { ...form, avatarUrl: av }
                          })}
                          className={`w-8 h-8 rounded-full overflow-hidden border-2 transition flex-shrink-0 ${
                            form.avatarUrl === av ? 'border-stone-900 scale-110' : 'border-stone-200 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={av} alt="Preset" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <input
                      type="url"
                      value={form.avatarUrl}
                      onChange={(e) => setBarberForms({
                        ...barberForms,
                        [b.id]: { ...form, avatarUrl: e.target.value }
                      })}
                      placeholder="URL de foto (ej. https://...)"
                      className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">Especialidad o Título</label>
                    <input
                      type="text"
                      value={form.especialidad}
                      onChange={(e) => setBarberForms({
                        ...barberForms,
                        [b.id]: { ...form, especialidad: e.target.value }
                      })}
                      placeholder="Ej. Fades milimétricos y ritual de barba"
                      className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">Breve Biografía para Clientes</label>
                    <textarea
                      rows={2}
                      value={form.descripcion}
                      onChange={(e) => setBarberForms({
                        ...barberForms,
                        [b.id]: { ...form, descripcion: e.target.value }
                      })}
                      placeholder="Ej. 6 años de experiencia creando estilos impecables y asesoría de imagen personalizada."
                      className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs sm:text-sm font-semibold transition"
          >
            Vista Previa de Clientes
          </a>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-bold transition shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Todo'}</span>
          </button>
        </div>

      </form>
    </div>
  );
};
