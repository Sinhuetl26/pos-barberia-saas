import { useEffect, useState } from 'react';
import { OperationDialog } from '../components/OperationDialog';
import { Plug, CreditCard, Mail, MessageCircle, Receipt, Calendar, ArrowUpRight, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import {MailDeliveryPanel} from '../components/MailDeliveryPanel';
import { DurableJobsPanel } from '../components/DurableJobsPanel';
import { api } from '../api';
import { IntegrationCatalog } from '../types/operations';
import '../styles/secondary-workspaces.css';

const icons: Record<string, typeof Plug> = { stripe: CreditCard, resend: Mail, whatsapp: MessageCircle, facturapi: Receipt, payments: CreditCard, calendar: Calendar };
const labels = { missing: 'Por conectar', sandbox: 'En preparación', configured: 'Configurado', planned: 'Próximamente' };

export function IntegracionesView() {
  const [data, setData] = useState<IntegrationCatalog | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    api.getIntegrations().then(result => { if (active) setData(result); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  const connector = data?.connectors.find(c => c.id === selected);
  return <div className="studio-page operation-page secondary-workspace connections-workspace animate-luxury-in">
    <div className="flex justify-between items-end gap-4 mb-7"><div><div className="studio-eyebrow">Disponibilidad y próximos pasos</div><h1 className="studio-title mt-2">Conexiones de tu barbería</h1><p className="text-sm text-stone-500 mt-2 max-w-xl">Pagos, mensajes y facturas. Conoce qué está disponible y el siguiente paso para conectarlo.</p></div><button className="studio-icon-button" onClick={() => setRevision(n => n + 1)} disabled={loading} aria-label="Actualizar conectores"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
    <div className="studio-panel p-5 mb-6 flex gap-3 items-start bg-[#f4f1ea]"><Plug className="w-5 h-5 text-[#987c51] shrink-0 mt-1" /><div><h2 className="text-sm font-semibold">Conexiones de la plataforma</h2><p className="text-xs leading-6 text-stone-600 mt-1">La configuración la administra SYSTECH. Un servicio configurado necesita una prueba real antes de activarse. WhatsApp y facturación requieren además la identidad de cada barbería.</p></div></div>
    <MailDeliveryPanel/>
    {api.getUserRole() === 'DUENO' && <DurableJobsPanel />}
    {error && <p role="alert" className="p-4 bg-red-50 text-red-800 rounded-xl mb-5 flex gap-2 text-sm"><AlertCircle className="w-5 h-5" />{error}</p>}
    {loading && !data && <p role="status" className="text-stone-500 text-sm py-10">Consultando conexiones…</p>}
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{data?.connectors.map(c => { const Icon = icons[c.id] || Plug; return <article key={c.id} className="studio-panel p-6 flex flex-col"><div className="flex justify-between items-center"><div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.id === 'whatsapp' ? 'bg-green-50 text-green-700' : c.id === 'stripe' ? 'bg-violet-50 text-violet-600' : 'bg-[#f3eee5] text-[#957b54]'}`}><Icon className="w-5 h-5" /></div><span className={`text-[10px] rounded-full px-2.5 py-1 font-medium ${c.status === 'configured' ? 'bg-emerald-50 text-emerald-700' : c.status === 'sandbox' ? 'bg-amber-50 text-amber-800' : 'bg-stone-100 text-stone-500'}`}>{labels[c.status]}</span></div><div className="studio-eyebrow mt-6">{c.category}</div><h2 className="text-lg font-semibold mt-1">{c.name}</h2><p className="text-sm text-stone-500 mt-3 leading-6 flex-1">{c.description}</p><div className="flex justify-between items-center border-t border-stone-100 pt-4 mt-5"><span className="text-[10px] text-stone-400">{c.available ? 'Conector implementado' : 'Desarrollo pendiente'}</span><button onClick={() => setSelected(c.id)} className="text-xs text-[#19352c] font-semibold flex items-center gap-1">Ver pasos<ArrowUpRight className="w-3.5 h-3.5" /></button></div></article>; })}</div>
    {data && <p className="text-[11px] text-stone-400 mt-5">Estado de configuración consultado: {new Date(data.checkedAt).toLocaleString('es-MX')}.</p>}
    {connector && <OperationDialog open={Boolean(connector)} busy={false} titleId="connector-title" onClose={() => setSelected(null)} className="max-w-lg"><section className="bg-[#fffefa] rounded-2xl max-w-lg w-full p-7 shadow-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center"><h2 id="connector-title" tabIndex={-1} className="text-xl font-semibold">Conectar {connector.name}</h2><button autoFocus className="studio-icon-button" aria-label="Cerrar" onClick={() => setSelected(null)}><X className="w-4 h-4" /></button></div><p className="text-sm text-stone-500 leading-6 mt-4">{connector.detail}</p>{!!connector.configurationIssues?.length && <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><h3 className="font-semibold">Pendiente de configuración</h3><ul className="mt-2 list-disc pl-5 space-y-1">{connector.configurationIssues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}<ol className="mt-6 space-y-4">{connector.steps.map((step, i) => <li key={step} className="flex gap-3 text-sm text-stone-600 leading-6"><span className="w-6 h-6 shrink-0 bg-[#f2ede4] rounded-full text-[#957b54] text-xs flex items-center justify-center">{i + 1}</span>{step}</li>)}</ol><div className="mt-7 flex flex-wrap items-center gap-4"><a href={connector.actionUrl} target="_blank" rel="noopener noreferrer" className="studio-button">{connector.actionLabel}<ArrowUpRight className="w-4 h-4" /></a><a href={connector.docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-stone-500 underline">Documentación oficial</a></div><p className="mt-5 text-[11px] text-stone-400 flex gap-2"><Check className="w-3.5 h-3.5 shrink-0" />Las credenciales se configuran de forma privada en el servidor.</p></section></OperationDialog>}
  </div>;
}

