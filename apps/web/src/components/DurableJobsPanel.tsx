import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api, ApiError } from '../api';
import { DurableJob, DurableJobsStatus, JobProvider } from '../types/durableJobs';
import { OperationDialog } from './OperationDialog';
import { OperationState } from './OperationState';

const providerLabels: Record<JobProvider, string> = { MAIL: 'Correo de acceso', WHATSAPP: 'Recordatorios de WhatsApp', LICENSE: 'Revisión de licencia' };
const kindLabels: Record<string, string> = { MAIL_OUTBOX: 'Revisión de correos pendientes', DUNNING: 'Revisión de licencia', REMINDER_24H: 'Recordatorio de cita: 24 horas', REMINDER_2H: 'Recordatorio de cita: 2 horas' };
const stateLabels: Record<string, string> = { QUEUED: 'Pendiente', RETRY: 'Reintento programado', RUNNING: 'En proceso', ACCEPTED: 'Aceptado por el proveedor; entrega sin confirmar', NOT_CONFIGURED: 'Por conectar', CANCELED: 'Cancelada', UNCERTAIN: 'Resultado sin confirmar; requiere revisión', EXPIRED: 'Vencida; no se reintentará', FAILED: 'Falló; revisar antes de reintentar' };
const dateLabel = (value: string) => Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString('es-MX') : 'Fecha por revisar';
const jobLabel = (job: DurableJob) => job.state === 'SUCCEEDED' ? (job.provider === 'LICENSE' ? 'Evaluación terminada; no confirma un cobro' : 'Revisión terminada; no confirma entrega') : stateLabels[job.state] || 'Estado por revisar';
const canRetry = (job: DurableJob) => ['FAILED', 'NOT_CONFIGURED'].includes(job.state) && new Date(job.expiresAt).getTime() > Date.now();
type Action = { kind: 'retry'; job: DurableJob } | { kind: 'pause'; provider: JobProvider; paused: boolean };

export function DurableJobsPanel() {
  const [data, setData] = useState<{ jobs: DurableJob[]; status: DurableJobsStatus } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const mounted = useRef(false);
  const requestNumber = useRef(0);
  const actionInProgress = useRef(false);

  const load = useCallback(async () => {
    const request = ++requestNumber.current;
    if (mounted.current) { setLoading(true); setError(''); setUnavailable(false); }
    try {
      const [jobs, status] = await Promise.all([api.getDurableJobs(), api.getDurableJobsStatus()]);
      if (mounted.current && request === requestNumber.current) setData({ jobs, status });
      return true;
    } catch (caught) {
      if (mounted.current && request === requestNumber.current) {
        setData(null);
        setUnavailable(caught instanceof ApiError && caught.status === 404);
        setError(caught instanceof ApiError && caught.status === 404 ? 'Esta versión no dispone de automatizaciones.' : 'No pudimos consultar las automatizaciones. Revisa tu conexión y vuelve a consultar.');
      }
      return false;
    } finally {
      if (mounted.current && request === requestNumber.current) setLoading(false);
    }
  }, []);

  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; requestNumber.current += 1; }; }, [load]);

  const confirm = async () => {
    if (!action || actionInProgress.current) return;
    actionInProgress.current = true;
    setBusy(true); setNotice('');
    let answered = false;
    try {
      if (action.kind === 'retry') await api.retryDurableJob(action.job.id);
      else await api.setJobProviderPaused(action.provider, action.paused);
      answered = true;
      if (mounted.current) setNotice(action.kind === 'retry' ? 'Reintento registrado. Consulta su estado; esto no confirma un envío.' : action.paused ? 'Pausa registrada. Una tarea que ya estaba en proceso puede terminar.' : 'Reanudación registrada. Consulta el estado de las tareas.');
    } catch {
      if (mounted.current) setNotice('No confirmamos el resultado de la acción. Volvimos a consultar su estado; revísalo antes de repetirla.');
    } finally {
      if (mounted.current) setAction(null);
      const consulted = await load();
      if (mounted.current) {
        if (!consulted) setNotice(answered ? 'La acción fue registrada, pero no pudimos consultar el estado actual. Actualiza antes de hacer otra acción.' : 'El resultado sigue sin confirmar. Actualiza el estado antes de repetir la acción.');
        setBusy(false);
      }
      actionInProgress.current = false;
    }
  };

  return <section className="studio-panel mb-6 p-5 sm:p-6 operation-page" aria-labelledby="automations-title" aria-busy={loading || busy}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="automations-title" className="text-lg font-semibold">Automatizaciones</h2><p className="operation-muted mt-2 text-sm max-w-2xl">Consulta los recordatorios y revisiones que están pendientes de procesarse.</p></div>
      <button type="button" className="studio-button-secondary min-h-11" disabled={loading || busy} onClick={() => void load()}><RefreshCw aria-hidden="true" className={`w-4 h-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />{loading ? 'Consultando…' : 'Actualizar tareas'}</button>
    </div>
    {notice && <p role="status" className="mt-4 text-sm rounded-lg bg-amber-50 p-3 text-amber-950">{notice}</p>}
    {loading ? <div className="mt-5"><OperationState title="Consultando automatizaciones" busy>Espera para conocer el estado actual.</OperationState></div> : error ? <div className="mt-5" role="alert"><OperationState title={unavailable ? 'Automatizaciones no disponibles' : 'Estado sin consultar'} action={<button type="button" className="studio-button-secondary min-h-11" disabled={busy} onClick={() => void load()}>Reintentar consulta</button>}>{error}</OperationState></div> : data && <>
      <div className="mt-5 border-l-4 border-[#b08751] pl-4">
        <p className="font-semibold text-sm">{data.status.workerAvailable ? 'Se detectó actividad reciente del procesador' : 'Sin actividad reciente del procesador'}</p>
        <p className="operation-muted text-sm mt-1">{data.status.workerAvailable ? 'La actividad reciente no garantiza que una tarea haya terminado ni que un mensaje se haya entregado.' : 'Las tareas pendientes se conservan. Pide a soporte revisar el procesador si la espera continúa.'}</p>
        <p className="text-sm mt-2">Correos de acceso pendientes: <strong className="tabular-nums">{data.status.pendingActions}</strong>. Su entrega se consulta en «Correo de acceso e invitaciones».</p>
      </div>
      <div className="mt-6"><h3 className="font-semibold text-sm">Pausas por servicio</h3><p className="operation-muted text-sm mt-1">Pausar detiene el inicio de nuevas tareas de este servicio en tu negocio. Una tarea que ya está en proceso puede terminar.</p>
        {data.status.providers.length ? <ul className="mt-3 divide-y divide-stone-200">{data.status.providers.map(control => <li key={control.provider} className="py-3 flex flex-wrap items-center justify-between gap-3">
          <div><span className="font-medium text-sm">{providerLabels[control.provider] || 'Servicio por revisar'}</span><p className="operation-muted text-sm mt-1">{control.provider === 'LICENSE' ? 'Administrada por SYSTECH' : control.paused ? 'En pausa' : 'Sin pausa; depende de la configuración y del procesador'}</p></div>
          {control.provider === 'LICENSE'
            ? <p className="operation-muted text-sm">La revisión de licencia la administra SYSTECH.</p>
            : <button type="button" className="studio-button-secondary min-h-11" disabled={busy} onClick={() => setAction({ kind: 'pause', provider: control.provider, paused: !control.paused })}>{control.paused ? 'Reanudar' : 'Pausar'}<span className="sr-only"> {providerLabels[control.provider]}</span></button>}
        </li>)}</ul> : <p className="operation-muted text-sm mt-3">Todavía no hay servicios registrados para programar tareas en este negocio.</p>}
      </div>
      <div className="mt-6"><h3 className="font-semibold text-sm">Últimas tareas</h3><p className="operation-muted text-xs mt-1">Hasta las 100 tareas más recientes. Una revisión terminada no equivale a un mensaje entregado o un pago recibido.</p>
        {data.jobs.length ? <ul className="mt-3 divide-y divide-stone-200">{data.jobs.map(job => <li key={job.id} className="py-4 flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1 basis-52"><p className="font-semibold text-sm">{kindLabels[job.kind] || 'Tarea por revisar'}</p><p className={`text-sm mt-1 ${['FAILED', 'UNCERTAIN'].includes(job.state) ? 'text-rose-800' : ['NOT_CONFIGURED', 'EXPIRED'].includes(job.state) ? 'text-amber-900' : 'operation-muted'}`}>{jobLabel(job)}</p><p className="operation-muted text-xs mt-2">Intentos: {job.attempts} de {job.maxAttempts}</p><p className="operation-muted text-xs mt-1">{job.completedAt ? `Última evaluación: ${dateLabel(job.completedAt)}` : `Disponible desde: ${dateLabel(job.availableAt)}`}</p><p className="operation-muted text-xs mt-1">Vence: {dateLabel(job.expiresAt)}</p>{job.state === 'UNCERTAIN' && <p className="text-xs text-rose-800 mt-2">Pide a soporte revisar el resultado. Repetir el envío podría duplicarlo.</p>}</div>{canRetry(job) && <button type="button" className="studio-button-secondary min-h-11 shrink-0" disabled={busy} onClick={() => setAction({ kind: 'retry', job })}>Revisar reintento<span className="sr-only"> de {kindLabels[job.kind] || 'tarea'}</span></button>}</li>)}</ul> : <div className="mt-3"><OperationState title="No hay tareas registradas">Las nuevas tareas programadas aparecerán aquí.</OperationState></div>}
      </div>
    </>}
    <OperationDialog open={!!action} busy={busy} titleId="automation-action-title" onClose={() => setAction(null)}>
      {action && <div className="studio-panel p-6"><h2 id="automation-action-title" tabIndex={-1} className="text-lg font-semibold">{action.kind === 'retry' ? 'Reintentar tarea' : `${action.paused ? 'Pausar' : 'Reanudar'} ${providerLabels[action.provider]}`}</h2><p className="operation-muted mt-3 text-sm">{action.kind === 'retry' ? `Volverá a programarse «${kindLabels[action.job.kind] || 'esta tarea'}» si sigue vigente. El servicio debe estar configurado. Esto no confirma entrega ni un cobro.` : action.paused ? 'Se detendrá el inicio de nuevas tareas. Una tarea que ya está en proceso puede terminar.' : 'Las tareas vigentes podrán iniciarse cuando el procesador esté disponible. Esto no confirma entrega ni un cobro.'}</p><div className="flex flex-wrap gap-3 mt-6"><button type="button" className="studio-button min-h-11" disabled={busy} onClick={() => void confirm()}>{busy ? 'Guardando…' : action.kind === 'retry' ? 'Programar reintento' : action.paused ? 'Confirmar pausa' : 'Confirmar reanudación'}</button><button type="button" className="studio-button-secondary min-h-11" disabled={busy} onClick={() => setAction(null)}>Cancelar</button></div></div>}
    </OperationDialog>
  </section>;
}
