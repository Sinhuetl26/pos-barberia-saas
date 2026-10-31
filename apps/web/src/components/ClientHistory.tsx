import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { RebookingDraft } from '../types/rebooking';
import { isCutReferenceDataUrl } from '../utils/cutReferencePhoto';
import '../styles/client-history.css';
type HistoryEvent = { key: string; when: string; appointment?: any; sale?: any; completedService: boolean; services: { id: string; nombre: string; precio?: number; duracion?: number }[] };
function historicalNumber(value: unknown): number | undefined { return value == null || typeof value === 'boolean' || typeof value === 'string' && !value.trim() || !Number.isFinite(Number(value)) ? undefined : Number(value); }
export function clientHistoryEvents(appointments: any[], sales: any[]): HistoryEvent[] {
  const result: HistoryEvent[] = [];
  const joined = new Set<string>();
  for (const appointment of appointments) {
    const sale = sales.find(s => s.citaId === appointment.id && s.estado !== 'CANCELADA');
    if (sale) joined.add(sale.id);
    let services: HistoryEvent['services'] = [];
    if (sale) services = (sale.items || []).filter((item: any) => item.tipoItem === 'SERVICIO').map((item: any) => ({ id: item.productoId, nombre: item.nombreItem, precio: Number(item.precioUnitario) }));
    else {
      try { const saved = JSON.parse(appointment.serviciosJson || '[]'); if (Array.isArray(saved)) services = saved.filter((s: any) => s && typeof s.id === 'string').map((s: any) => ({ id: s.id, nombre: s.nombre, precio: historicalNumber(s.precio), duracion: historicalNumber(s.duracion) })); } catch { /* malformed history is not replaced by current catalogue */ }
      if (!services.length && appointment.servicioId) services = [{ id: appointment.servicioId, nombre: appointment.nombreServicio || 'Servicio reservado', ...(appointment.precioEstimado != null ? { precio: Number(appointment.precioEstimado) } : {}), duracion: appointment.duracionMinutos }];
    }
    result.push({ key: `cita:${appointment.id}`, when: appointment.fechaHora, appointment, sale, services, completedService: appointment.estado === 'COMPLETADA' && services.length > 0 });
  }
  for (const sale of sales) {
    if (joined.has(sale.id) || sale.estado === 'CANCELADA') continue;
    const services = (sale.items || []).filter((item: any) => item.tipoItem === 'SERVICIO').map((item: any) => ({ id: item.productoId, nombre: item.nombreItem, precio: Number(item.precioUnitario) }));
    result.push({ key: `venta:${sale.id}`, when: sale.fecha, sale, services, completedService: services.length > 0 });
  }
  return result.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime() || a.key.localeCompare(b.key));
}
export function historicalPreference(events: HistoryEvent[], kind: 'professional' | 'service') {
  const counts = new Map<string, { name: string; count: number }>();
  for (const event of events.filter(e => e.completedService)) {
    const entries = kind === 'professional' ? [{ id: event.sale?.barberoId || event.appointment?.barberoId, name: event.sale?.barbero?.nombre || event.appointment?.barbero?.nombre }] : event.services.map(s => ({ id: s.id, name: s.nombre }));
    for (const entry of entries) if (entry.id && entry.name) { const old = counts.get(entry.id); counts.set(entry.id, { name: entry.name, count: (old?.count || 0) + 1 }); }
  }
  const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
  return !sorted.length ? 'Sin atenciones realizadas registradas' : sorted[1]?.count === sorted[0].count ? 'Sin preferencia predominante' : `${sorted[0].name} (${sorted[0].count} atenciones)`;
}

export function ClientHistory({ client, branchId, onRebook, showAmounts = false }: { client: any; branchId?: string; onRebook?: (draft: RebookingDraft) => void; showAmounts?: boolean }) {
  const events = clientHistoryEvents(client.citas || [], client.ventas || []);
  const last = events.find(event => event.completedService);
  const [serviceId, setServiceId] = useState('');
  const [reference, setReference] = useState<{ id: string; type: string | null; photo: string | null } | null>(null);
  const [loadingReference, setLoadingReference] = useState(false);
  const [referenceError, setReferenceError] = useState('');
  const request = useRef(0);
  useEffect(() => { setServiceId(''); setReference(null); setReferenceError(''); setLoadingReference(false); return () => { request.current++; }; }, [client.id, branchId]);
  const selectedService = last?.services.find(service => service.id === serviceId) || last?.services[0];
  const phone = String(client.telefono || '').replace(/\D/g, '');
  const validPhone = /^\d{10,15}$/.test(phone);
  const openReference = async (appointment: any) => {
    const serial = ++request.current; setReference(null); setReferenceError(''); setLoadingReference(true);
    try { const data = await api.getCitaReferencia(appointment.id); if (serial === request.current) setReference({ id: appointment.id, type: data.tipoCorte, photo: data.fotoReferencia && isCutReferenceDataUrl(data.fotoReferencia) ? data.fotoReferencia : null }); }
    catch (e: any) { if (serial === request.current) setReferenceError(e.message || 'No pudimos consultar la referencia privada.'); }
    finally { if (serial === request.current) setLoadingReference(false); }
  };
  return <section className="client-history" aria-labelledby="client-history-heading"><h3 id="client-history-heading">Atenciones, reservas y tickets</h3><p>Historial reciente disponible: hasta 10 citas y 10 ventas. Una cita reservada o cancelada no cuenta como atención realizada; la venta vinculada se muestra junto a su cita.</p><dl className="client-history-facts"><div><dt>Profesional habitual en este historial</dt><dd>{historicalPreference(events, 'professional')}</dd></div><div><dt>Servicios realizados en este historial</dt><dd>{historicalPreference(events, 'service')}</dd></div></dl>
    {last && <div className="client-next-visit"><h4>Preparar próxima visita</h4><p>Usaremos este cliente y el contexto de su última atención. El horario se elige y confirma en la agenda; esta acción no crea una reserva ni cobra.</p>{last.services.length > 1 && <label htmlFor="client-next-service">Servicio para iniciar la próxima reserva<select id="client-next-service" value={selectedService?.id || ''} onChange={e => setServiceId(e.target.value)}>{last.services.map(service => <option key={service.id} value={service.id}>{service.nombre}</option>)}</select></label>}<p>Servicio inicial: {selectedService?.nombre}. Revisa el servicio, precio y horario al abrir la agenda. La foto privada no se adjunta automáticamente a otra visita.</p><button type="button" className="studio-button-secondary" disabled={!onRebook || !branchId || !selectedService || !validPhone} onClick={() => { if (!onRebook || !branchId || !selectedService) return; onRebook({ tenantId: api.getTenantId(), sucursalId: branchId, clienteNombre: client.nombre, clienteTelefono: phone, barberoId: last.sale?.barberoId || last.appointment?.barberoId || '', servicioId: selectedService.id, tipoCorte: last.appointment?.tipoCorte || '' }); }}>Abrir próxima visita en agenda</button>{!validPhone && <p>Primero registra un teléfono válido para conservar la identidad del cliente al reservar.</p>}</div>}
    {!events.length && <p>Aún no hay citas ni ventas en este historial. No se presume una visita realizada.</p>}
    {events.map(event => <article key={event.key} className="client-history-event"><div className="client-history-event-heading"><strong>{event.completedService ? 'Atención realizada' : event.appointment ? event.appointment.estado === 'CANCELADA' ? 'Reserva cancelada' : event.appointment.estado === 'NO_SHOW' ? 'No asistió' : 'Reserva / atención aún pendiente' : 'Compra de productos'}</strong><time dateTime={event.when}>{new Date(event.when).toLocaleString('es-MX')}</time></div><p>{event.sale?.barbero?.nombre || event.appointment?.barbero?.nombre || 'Profesional registrado'} · {event.services.map(s => s.nombre).join(' + ') || event.appointment?.nombreServicio || 'Productos del ticket'}</p>{event.appointment && <p>Fecha de reserva: {new Date(event.appointment.fechaHora).toLocaleString('es-MX')} · {event.appointment.duracionMinutos} minutos · {event.appointment.estado}</p>}
      {event.sale ? showAmounts ? <div><p>Ticket {event.sale.folio || 'guardado'} · cobro original ${Number(event.sale.total).toFixed(2)} · devuelto ${Number(event.sale.totalDevuelto || 0).toFixed(2)} · neto cobrado ${Math.max(0, Number(event.sale.total) - Number(event.sale.totalDevuelto || 0)).toFixed(2)}.</p><ul>{(event.sale.items || []).map((item: any) => <li key={item.id}>{item.nombreItem} · {item.cantidad} × ${Number(item.precioUnitario).toFixed(2)}{Number(item.descuento) > 0 ? ` · descuento de línea $${Number(item.descuento).toFixed(2)}` : ''}</li>)}</ul><p>Precios del ticket original; no se recalculan con el catálogo actual. El neto cobrado puede incluir impuestos y propina; no es utilidad.</p></div> : <p>Ticket registrado. Los importes se consultan con acceso del dueño.</p> : event.appointment && <p>{showAmounts && event.appointment.precioEstimado != null ? `Precio reservado: $${Number(event.appointment.precioEstimado).toFixed(2)}.` : 'Precio histórico no informado.'} {event.completedService ? 'Venta no incluida en esta consulta; revisar antes de afirmar que está pendiente de cobro.' : 'Esta reserva no representa por sí sola una venta.'}</p>}
      {event.appointment?.tipoCorte && <p><strong>Tipo de corte:</strong> {event.appointment.tipoCorte}</p>}{event.appointment && <button type="button" className="studio-button-secondary" aria-expanded={reference?.id === event.appointment.id} aria-disabled={loadingReference} onClick={() => { if (loadingReference) return; if (reference?.id === event.appointment.id) setReference(null); else void openReference(event.appointment); }}>{reference?.id === event.appointment.id ? 'Ocultar referencia' : 'Ver referencia privada de esta visita'}</button>}
      {reference && event.appointment && reference.id === event.appointment.id && <div className="client-history-reference"><p>{reference.type || 'Sin tipo de corte registrado.'}</p>{reference.photo ? <img src={reference.photo} alt={`Referencia privada de corte para ${client.nombre}`} /> : <p>Sin fotografía de referencia en esta visita.</p>}</div>}
    </article>)}{loadingReference && <p role="status">Consultando referencia privada…</p>}{referenceError && <p role="alert">{referenceError}</p>}
  </section>;
}
