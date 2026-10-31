import { UserRole } from './types';
import { OperationSummary, IntegrationCatalog } from './types/operations';
import { DurableJob, DurableJobsStatus, JobProvider } from './types/durableJobs';
import { financialIntentKey, readFinancialIntent } from './utils/financialIntent';
import { savePublicBookingIntent, readPublicBookingIntent, clearPublicBookingIntent } from './utils/publicBookingIntent';

const API_BASE = ((import.meta as any).env?.VITE_API_URL as string) || 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public definitive = false) { super(message); }
}

class ApiService {
  requestAccountLink(kind: 'recovery' | 'verification', email: string) { return this.request<any>('/auth/' + kind + '/request', { method: 'POST', body: JSON.stringify({ email }) }); }
  completeAccountAction(path: string, token: string, password?: string) { return this.request<any>('/auth/' + path, { method: 'POST', body: JSON.stringify({ token, password }) }); }
  getAccountSecurity() { return this.request<any>('/auth/security'); }
  changePassword(currentPassword: string, password: string) { return this.request<any>('/auth/security/password', { method: 'POST', body: JSON.stringify({ currentPassword, password }) }); }
  revokeAllSessions() { return this.request<any>('/auth/security/logout-all', { method: 'POST' }); }
  resendInvitation(id: string) { return this.request<any>('/usuarios/' + encodeURIComponent(id) + '/invitacion', { method: 'POST' }); }
  cancelInvitation(id: string) { return this.request<any>('/usuarios/' + encodeURIComponent(id) + '/invitacion', { method: 'DELETE' }); }

  getTeamAccess() { return this.request<any[]>('/usuarios'); }
  createTeamAccess(data: any) { return this.request<any>('/usuarios', { method: 'POST', body: JSON.stringify(data) }); }
  updateTeamAccess(id: string, data: any) { return this.request<any>(`/usuarios/${encodeURIComponent(id)}/acceso`, { method: 'PUT', body: JSON.stringify(data) }); }

  getOperationSummary(sucursalId: string) {
    return this.request<OperationSummary>(`/operacion/resumen?sucursalId=${encodeURIComponent(sucursalId)}`);
  }
  searchWorkspace(sucursalId: string, q: string, signal?: AbortSignal) {
    return this.request<any>(`/operacion/buscar?${new URLSearchParams({sucursalId,q})}`, {signal});
  }
  getOperationAudit(filters: Record<string, string>) {
    return this.request<any>(`/operacion/auditoria?${new URLSearchParams(filters)}`);
  }
  previewDataImport(data: any) { return this.inventoryRequest('/operacion/importacion/previsualizar', data); }
  confirmDataImport(data: any) { return this.inventoryRequest('/operacion/importacion/confirmar', data); }
  async downloadDataImportCsv(tipo: 'catalogo' | 'clientes', sucursalId: string, template: boolean): Promise<string> {
    const response = await fetch(`${API_BASE}/operacion/importacion/${template ? 'plantilla' : 'exportar'}?${new URLSearchParams({tipo, sucursalId})}`, {headers: this.getAuthHeaders()});
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(data.error || 'No fue posible descargar el archivo.', response.status, data.code);
    }
    return response.text();
  }

  getIntegrations() {
    return this.request<IntegrationCatalog>('/integraciones');
  }
  getDurableJobs() { return this.request<DurableJob[]>('/jobs'); }
  getDurableJobsStatus() { return this.request<DurableJobsStatus>('/jobs/status'); }
  retryDurableJob(id: string) { return this.request<{ success: boolean }>(`/jobs/${encodeURIComponent(id)}/retry`, { method: 'POST' }); }
  setJobProviderPaused(provider: JobProvider, paused: boolean) {
    return this.request<{ success: boolean; provider: JobProvider; paused: boolean; activeJobPolicy: string }>(`/jobs/providers/${encodeURIComponent(provider)}`, { method: 'PUT', body: JSON.stringify({ paused }) });
  }
  private tenantId: string = '';
  private userRole: UserRole = 'DUENO';
  private userId: string = '';

  private token: string = localStorage.getItem('systech_token') || '';

  setAuthToken(token: string) {
    this.token = token;
    if (token) {
      localStorage.setItem('systech_token', token);
    } else {
      localStorage.removeItem('systech_token');
    }
  }

  getAuthToken() {
    return this.token;
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  setContext(tenantId: string, role: UserRole = 'DUENO', userId: string = '') {
    this.tenantId = tenantId;
    this.userRole = role;
    this.userId = userId;
  }

  getTenantId() {
    return this.tenantId;
  }

  getUserRole() {
    return this.userRole;
  }
  getUserId() { return this.userId; }
  getSaleIntention(key: string) { return this.request<any>(`/ventas/intenciones/${encodeURIComponent(key)}`); }
  getSaleNotices() { return this.request<any[]>('/notificaciones/ventas'); }
  getCashCustody(branch: string) { return this.request<any>(`/cortes-caja/custodia?sucursalId=${encodeURIComponent(branch)}`); }
  receiveCash(data: { sucursalId: string; usuarioId: string; monto: number }) { return this.financialRequest('/cortes-caja/entrega', data); }
  returnSale(id: string, data: any) { return this.financialRequest(`/ventas/${encodeURIComponent(id)}/devolver`, data); }
  pendingFinancial() { return readFinancialIntent(localStorage, financialIntentKey(this.tenantId, this.userId)); }
  async recoverFinancial() {
    const pending = this.pendingFinancial();
    if (!pending) return null;
    return this.financialRequest(pending.path, pending.body);
  }
  private async financialRequest(path: string, payload: any): Promise<any> {
    const key = financialIntentKey(this.tenantId, this.userId);
    let pending = readFinancialIntent(localStorage, key);
    if (pending) {
      const withoutKey = ({ idempotencyKey, ...body }: any) => JSON.stringify(body);
      if (path !== pending.path || withoutKey(payload) !== withoutKey(pending.body)) throw new ApiError('Hay una operación pendiente. Recupera su resultado desde el aviso superior antes de iniciar otra.', 409, 'PENDING_FINANCIAL');
    } else {
      pending = { path, body: { ...payload, idempotencyKey: crypto.randomUUID() } };
      localStorage.setItem(key, JSON.stringify(pending));
    }
    window.dispatchEvent(new Event('systech:financial'));
    const controller = new AbortController();
    const deadline = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const result = await this.request<any>(path, { method: 'POST', body: JSON.stringify(pending.body), signal: controller.signal });
      localStorage.removeItem(key);
      window.dispatchEvent(new CustomEvent('systech:financial', { detail: { completed: true, path } }));
      return result;
    } catch (error) {
      if (controller.signal.aborted) { window.dispatchEvent(new Event('systech:financial')); throw new ApiError('La respuesta tardó demasiado. Recupera esta misma operación antes de repetir con otros datos.', 0, 'FINANCIAL_RESULT_UNCERTAIN'); }
      if (error instanceof ApiError && ([400, 403, 404].includes(error.status) || ['CASH_ALREADY_OPEN', 'CASH_CLOSED', 'CASH_CHANGED', 'CASH_PREVIEW_CHANGED', 'CASH_PREVIEW_EXPIRED', 'COMMISSIONS_CHANGED', 'LEGACY_CASH_REVIEW'].includes(error.code || ''))) { localStorage.removeItem(key); window.dispatchEvent(new Event('systech:financial')); }
      throw error;
    } finally { window.clearTimeout(deadline); }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    // Authentic JWT authentication
    if (this.token) {
      headers['authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => { throw new ApiError('El servidor no devolvió una respuesta válida.', response.status); });
    if (!response.ok) {
      throw new ApiError(data.error || 'Error en la solicitud al servidor', response.status, data.code, data.definitive === true);
    }

    return data as T;
  }

  private async bookingRequest(endpoint: string, payload: any) {
    const controller = new AbortController();
    const deadline = window.setTimeout(() => controller.abort(), 20_000);
    try {
      return await this.request<any>(endpoint, { method: 'POST', body: JSON.stringify(payload), signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) throw new ApiError('El servidor tardó en responder. Recupera el resultado de la misma reserva antes de crear otra.', 0, 'BOOKING_RESULT_UNCERTAIN');
      throw error;
    } finally { window.clearTimeout(deadline); }
  }

  // --- Auth & Commercial Registration ---
  async login(credentials: { email: string; password: string }) {
    const res = await this.request<{
      token: string;
      user: any;
      tenant: any;
      sucursales: any[];
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (res.token) {
      this.setAuthToken(res.token);
      this.setContext(res.tenant.id, res.user.rol, res.user.id);
    }
    return res;
  }

  async register(data: {
    nombreBarberia: string;
    nombreDueno: string;
    email: string;
    password: string;
    telefono?: string;
    direccion?: string;
    plan?: string;
  }) {
    const res = await this.request<{
      token: string;
      user: any;
      tenant: any;
      sucursales: any[];
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.token) {
      this.setAuthToken(res.token);
      this.setContext(res.tenant.id, res.user.rol, res.user.id);
    }
    return res;
  }

  getCurrentSession() {
    return this.request<{ user: any; tenant: any }>('/auth/me');
  }

  updateTenantSettings(data: {
    nombre?: string;
    telefono?: string;
    emailContacto?: string;
    direccion?: string;
    logoUrl?: string;
    slug?: string;
    slogan?: string;
    descripcion?: string;
    portadaUrl?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    whatsappPublico?: string;
    personalizacionWeb?: Partial<import('./utils/bookingAppearance').BookingAppearance>;
  }) {
    return this.request<any>('/auth/tenant/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async printCorteHtml(corteId: string) {
    const win=window.open('','_blank');
    if(!win)throw new Error('Permite ventanas emergentes para abrir el comprobante. El corte sigue guardado.');
    win.opener=null;win.document.body.textContent='Consultando comprobante…';
    try {
      const response=await fetch(`${API_BASE}/cortes-caja/${encodeURIComponent(corteId)}/comprobante-html`,{headers:this.getAuthHeaders()});
      if(!response.ok)throw new Error('No pudimos cargar el comprobante. El corte sigue guardado.');
      const html=await response.text();if(win.closed)throw new Error('Se cerró el comprobante. Puedes abrirlo otra vez desde el historial.');
      win.document.open();win.document.write(html);win.document.close();
    } catch (err) {
      win.close();throw err instanceof TypeError?new Error('No pudimos consultar el comprobante. Revisa tu conexión; el corte sigue guardado.'):err;
    }
  }

  printCitaCarta(codigo: string) {
    const url = `${API_BASE}/public/cita/${codigo}/imprimir-carta?autoprint=true`;
    const win = window.open(url, '_blank');
    if (!win) window.location.href = url;
  }

  logout() {
    this.setAuthToken('');
    this.tenantId = '';
    this.userId = '';
    this.userRole = 'DUENO';
  }

  // --- Super Admin ---
  getAdminMetrics() {
    return this.request<any>('/admin/metrics');
  }
  getAdminTenants() {
    return this.request<any[]>('/admin/tenants');
  }
  updateTenantStatus(id: string, estado: string, motivo?: string) {
    return this.request<any>(`/admin/tenants/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ estado, motivo })
    });
  }
  updateTenantPlan(id: string, plan: string) {
    return this.request<any>(`/admin/tenants/${id}/plan`, {
      method: 'PUT',
      body: JSON.stringify({ plan })
    });
  }
  getAdminAuditorias() {
    return this.request<any[]>('/admin/auditorias');
  }

  // --- Onboarding ---
  getOnboardingTemplates() {
    return this.request<any[]>('/onboarding/templates');
  }
  submitOnboarding(data: any) {
    return this.request<any>('/onboarding/setup', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Public Booking ---
  getPublicBarberia(slug: string) {
    return this.request<{ tenant: any; servicios: any[] }>(`/public/barberia/${slug}`);
  }
  getPublicAvailability(sucursalId: string, barberoId: string, fecha: string, duracion: number = 30, servicioIds: string[] = []) {
    const query = new URLSearchParams({ sucursalId, barberoId, fecha, duracion: String(duracion), ...(servicioIds.length ? { servicioIds: servicioIds.join(',') } : {}) });
    return this.request<{ fecha: string; reason?: string | null; duracionSolicitada?: number; totalPrecio?: number; serviciosResumen?: { id: string; nombre: string; duracion: number; precio: number }[]; slots: { hora: string; disponible: boolean; barberoId?: string; barberoNombre?: string; precioEstimado?: number; serviciosResumen?: { id: string; nombre: string; precio: number; duracion: number }[] }[] }>(
      `/public/disponibilidad?${query}`
    );
  }
  getMailReadiness(){return this.request<any>('/integraciones/correo');}
  getPreparation(sucursalId:string){return this.request<any>('/operacion/preparacion?sucursalId='+encodeURIComponent(sucursalId));}
  savePreparation(data:any){return this.request<any>('/operacion/preparacion',{method:'PUT',body:JSON.stringify(data)});}
  pendingPublicBooking(tenantId: string) {
    return readPublicBookingIntent(localStorage, sessionStorage, tenantId);
  }
  async bookPublicAppointment(data: any) {
    const old=this.pendingPublicBooking(data.tenantId);
    const clear=()=>clearPublicBookingIntent(localStorage,sessionStorage,data.tenantId);
    if(old){
      const recovery=await this.bookingRequest('/public/reserva-intencion',{tenantId:old.tenantId,idempotencyKey:old.idempotencyKey});
      if(recovery.found){clear();return recovery.result;}
      if(old.__requiresRecovery)throw new ApiError('Aún no encontramos el resultado de tu reserva. Conservamos su referencia para evitar duplicarla. Vuelve a recuperar el resultado o contacta a la barbería antes de reservar otra vez.',409,'BOOKING_RESULT_UNCERTAIN');
    }
    if(old&&JSON.stringify({...old,idempotencyKey:undefined})!==JSON.stringify({...data,idempotencyKey:undefined}))throw new ApiError('Hay una reserva pendiente; recupera su resultado antes de crear otra.',409);
    const payload=old||{...data,idempotencyKey:crypto.randomUUID()};
    if(!old)try{savePublicBookingIntent(localStorage,sessionStorage,payload);}catch{throw new ApiError('El navegador no pudo guardar el intento. Libera espacio o continúa sin foto antes de confirmar.',400,'BOOKING_STORAGE_UNAVAILABLE');}
    try{const result=await this.bookingRequest('/public/reservar',payload);clear();return result;}
    catch(error:any){if(!old&&error.status>=400&&error.status<500&&error.code!=='IDEMPOTENCY_CONFLICT')clear();throw error;}
  }
  getPublicBooking(codigo: string, slug?: string) {return this.request<any>('/public/cita/'+encodeURIComponent(codigo)+(slug?'?slug='+encodeURIComponent(slug):''));}
  managePublicBooking(token: string, action:'cancelar'|'reprogramar', body:any) {return this.request<any>('/public/cita/token/'+encodeURIComponent(token)+'/'+action,{method:'POST',body:JSON.stringify(body)});}
  rescheduleCita(id:string, fechaHora:string) {return this.request<any>('/citas/'+encodeURIComponent(id)+'/reprogramar',{method:'PUT',body:JSON.stringify({fechaHora})});}
  cancelPublicBooking(codigo: string) {
    return this.request<any>(`/public/cita/${codigo}/cancelar`, { method: 'POST' });
  }

  // --- Sucursales ---
  getSucursales() {
    return this.request<any[]>('/sucursales');
  }
  createSucursal(data: any) {
    return this.request<any>('/sucursales', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Agenda & Citas ---
  getCitas(params: { fecha?: string; sucursalId?: string; barberoId?: string; estado?: string } = {}) {
    const qs = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/citas${qs ? `?${qs}` : ''}`);
  }
  getCitaReferencia(id: string) {
    return this.request<{tipoCorte: string | null; fotoReferencia: string | null}>(`/citas/${encodeURIComponent(id)}/referencia`);
  }
  createCita(data: any) {
    return this.bookingRequest('/citas', data);
  }
  updateCitaStatus(id: string, estado: string) {
    return this.request<any>(`/citas/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ estado })
    });
  }
  getBloqueos(sucursalId?: string) {
    return this.request<any[]>(`/bloqueos${sucursalId ? `?sucursalId=${sucursalId}` : ''}`);
  }
  createBloqueo(data: any) {
    return this.request<any>('/bloqueos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  deleteBloqueo(id: string) {
    return this.request<any>(`/bloqueos/${id}`, { method: 'DELETE' });
  }
  private async agendaOperationRequest(path: string, data: any) {
    const controller = new AbortController(); const deadline = window.setTimeout(() => controller.abort(), 20_000);
    try { return await this.request<any>(path, { method: 'POST', body: JSON.stringify(data), signal: controller.signal }); }
    catch (e) { if (controller.signal.aborted) throw new ApiError('No se confirmó el resultado a tiempo. Recupera la misma operación antes de cambiar datos.', 0, 'AGENDA_RESULT_UNCERTAIN'); throw e; }
    finally { window.clearTimeout(deadline); }
  }
  getArrivalQueue(sucursalId: string) { return this.request<any[]>(`/citas/fila?sucursalId=${encodeURIComponent(sucursalId)}`); }
  joinArrivalQueue(data: any) { return this.agendaOperationRequest('/citas/fila', data); }
  operateArrivalQueue(id: string, action: 'asignar' | 'reasignar' | 'atender' | 'retirar', data: any) { return this.agendaOperationRequest(`/citas/fila/${encodeURIComponent(id)}/${action}`, data); }
  previewScheduleChange(data: any) { return this.agendaOperationRequest('/bloqueos/impacto', data); }
  confirmScheduleChange(data: any) { return this.agendaOperationRequest(data.tipo === 'HORARIO_ESPECIAL' ? '/bloqueos/horarios' : '/bloqueos/ausencias', data); }
  getSpecialSchedules(sucursalId: string, fecha?: string) { return this.request<any[]>(`/bloqueos/horarios?${new URLSearchParams({ sucursalId, ...(fecha ? { fecha } : {}) })}`); }

  // --- POS ---
  createVenta(data: any) {
    return this.request<any>('/ventas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  getVentas(params: { sucursalId?: string; barberoId?: string; fechaInicio?: string; fechaFin?: string } = {}) {
    const qs = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/ventas${qs ? `?${qs}` : ''}`);
  }
  getTicket(ventaId: string) {
    return this.request<any>(`/ventas/${ventaId}/ticket`);
  }
  getTicketVenta(ventaId: string) {
    return this.request<any>(`/ventas/${ventaId}/ticket`);
  }

  // --- Barberos & Comisiones ---
  getBarberos(sucursalId?: string) {
    return this.request<any[]>(`/barberos${sucursalId ? `?sucursalId=${sucursalId}` : ''}`);
  }
  createBarbero(data: any) {
    return this.request<any>('/barberos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  updateBarbero(id: string, data: any) {
    return this.request<any>(`/barberos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  getComisiones(params: { barberoId?: string; pagada?: boolean } = {}) {
    const qs = new URLSearchParams(params as any).toString();
    return this.request<{ comisiones: any[]; totalPendiente: number; totalPagado: number }>(`/comisiones${qs ? `?${qs}` : ''}`);
  }
  pagarComisiones(comisionIds: string[], metodoPagoComision: string = 'EFECTIVO') {
    return this.financialRequest('/comisiones/pagar', { comisionIds, metodoPagoComision });
  }

  // --- Cortes de Caja ---
  getCortesCaja(sucursalId?: string) {
    return this.request<any[]>(`/cortes-caja${sucursalId ? `?sucursalId=${sucursalId}` : ''}`);
  }
  abrirCorteCaja(sucursalId: string, fondoInicial: number, notas?: string) {
    return this.financialRequest('/cortes-caja/abrir', { sucursalId, fondoInicial, notas });
  }
  previewCashClose(corteId: string, conteoEfectivoReal: number, notasCierre?: string) {
    return this.request<any>('/cortes-caja/previsualizar', { method: 'POST', body: JSON.stringify({ corteId, conteoEfectivoReal, notasCierre }) });
  }
  cerrarCorteCaja(corteId: string, conteoEfectivoReal: number, notasCierre?: string, previsualizacionToken?: string) {
    return this.financialRequest('/cortes-caja/cerrar', { corteId, conteoEfectivoReal, notasCierre, ...(previsualizacionToken ? { previsualizacionToken } : {}) });
  }

  // --- Inventario ---
  getOperatingExpenses(sucursalId: string) { return this.request<any[]>(`/reportes/gastos?${new URLSearchParams({ sucursalId })}`); }
  getExpenseCashSources(sucursalId: string) { return this.request<any[]>(`/reportes/gastos/salidas?${new URLSearchParams({ sucursalId })}`); }
  registerOperatingExpense(data: any) { return this.inventoryRequest('/reportes/gastos', data); }
  correctOperatingExpense(id: string, data: any) { return this.inventoryRequest(`/reportes/gastos/${encodeURIComponent(id)}/corregir`, data); }
  getOwnerIntelligence(params: { sucursalId: string; fechaInicio: string; fechaFin: string; diasSinSalida: string; coberturaDias: string }) { return this.request<any>(`/reportes/inteligencia?${new URLSearchParams(params)}`); }
  getProfessionalTariffs(sucursalId: string) { return this.request<any[]>(`/inventario/tarifas?${new URLSearchParams({ sucursalId })}`); }
  publishProfessionalTariff(data: any) { return this.inventoryRequest('/inventario/tarifas', data); }
  getDiscountPolicy(sucursalId: string) { return this.request<any>(`/inventario/politica-descuentos?${new URLSearchParams({ sucursalId })}`); }
  publishDiscountPolicy(data: any) { return this.inventoryRequest('/inventario/politica-descuentos', data); }
  getProfessionalCatalog(sucursalId: string, barberoId: string, fechaHora?: string) { return this.request<any[]>(`/productos/precios?${new URLSearchParams({ sucursalId, barberoId, ...(fechaHora ? { fechaHora } : {}) })}`); }
  getDiscountApprovals(sucursalId: string) { return this.request<any[]>(`/ventas/aprobaciones?${new URLSearchParams({ sucursalId })}`); }
  requestDiscountApproval(data: any) { return this.inventoryRequest('/ventas/aprobaciones', data); }
  decideDiscountApproval(id: string, data: any) { return this.inventoryRequest(`/ventas/aprobaciones/${encodeURIComponent(id)}/aprobar`, data); }
  private async inventoryRequest(path: string, data: any, method = 'POST') {
    const controller = new AbortController();
    const deadline = window.setTimeout(() => controller.abort(), 20_000);
    try { return await this.request<any>(path, { method, headers: data.idempotencyKey ? { 'Idempotency-Key': data.idempotencyKey } : {}, body: JSON.stringify(data), signal: controller.signal }); }
    catch (error) { if (controller.signal.aborted) throw new ApiError('La respuesta tardó demasiado. Recupera el resultado antes de repetir con otros datos.', 0, 'INVENTORY_RESULT_UNCERTAIN'); throw error; }
    finally { window.clearTimeout(deadline); }
  }
  getProductos(params: { tipo?: string; bajoStock?: boolean; sucursalId?: string } = {}) {
    const qs = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/productos${qs ? `?${qs}` : ''}`);
  }
  createProducto(data: any) {
    return this.inventoryRequest('/productos', data);
  }
  updateProducto(id: string, data: any) {
    return this.request<any>(`/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  ajustarInventario(productoId: string, tipoMovimiento: string, cantidad: number, motivo: string, metadata: { sucursalId?: string; idempotencyKey?: string; stockEsperado?: number; costoUnitario?: number; proveedorId?: string; referencia?: string; fechaOperacion?: string; cantidadPresentaciones?: number } = {}) {
    return this.inventoryRequest('/inventario/movimiento', { productoId, tipoMovimiento, cantidad, motivo, ...metadata });
  }
  getKardex(productoId?: string, sucursalId?: string) {
    const qs = new URLSearchParams({ ...(productoId ? { productoId } : {}), ...(sucursalId ? { sucursalId } : {}) });
    return this.request<any[]>(`/inventario/kardex${qs.size ? `?${qs}` : ''}`);
  }
  getInventoryProviders() { return this.request<any[]>('/proveedores'); }
  getInventoryCounts(sucursalId: string) { return this.request<any[]>(`/inventario/conteos?sucursalId=${encodeURIComponent(sucursalId)}`); }
  startInventoryCount(data: { sucursalId: string; productoIds?: string[]; idempotencyKey: string }) { return this.inventoryRequest('/inventario/conteos', data); }
  saveInventoryCount(id: string, data: any) { return this.inventoryRequest(`/inventario/conteos/${encodeURIComponent(id)}`, data, 'PUT'); }
  confirmInventoryCount(id: string, data: { motivo: string; idempotencyKey: string; versionEsperada: number }) { return this.inventoryRequest(`/inventario/conteos/${encodeURIComponent(id)}/confirmar`, data); }
  getServiceRecipes(serviceId: string) { return this.request<any[]>(`/inventario/recetas/${encodeURIComponent(serviceId)}`); }
  publishServiceRecipe(serviceId: string, data: { versionEsperada: number; items: { productoId: string; cantidad: number; unidad: string }[]; idempotencyKey: string }) { return this.inventoryRequest(`/inventario/recetas/${encodeURIComponent(serviceId)}`, data); }
  getSupplyReconciliation(sucursalId: string, tolerancia?: number) { return this.request<any>(`/inventario/insumos/conciliacion?${new URLSearchParams({ sucursalId, ...(tolerancia !== undefined ? { tolerancia: String(tolerancia) } : {}) })}`); }
  getSupplyConsumptions(sucursalId: string) { return this.request<any[]>(`/inventario/consumos?sucursalId=${encodeURIComponent(sucursalId)}`); }
  correctSupplyConsumption(id: string, data: { motivo: string; versionEsperada: number; items: { productoId: string; cantidadReal: number }[]; idempotencyKey: string }) { return this.inventoryRequest(`/inventario/consumos/${encodeURIComponent(id)}/corregir`, data); }

  // --- Notificaciones ---
  getNotificaciones() {
    return this.request<any[]>('/notificaciones');
  }
  simularNotificacion(data: { tipo: string; destinatario: string; mensaje: string; canal?: string }) {
    return this.request<any>('/notificaciones/simular-envio', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Reportes ---
  getReportesDashboard(periodo: string = 'mes', sucursalId?: string, barberoId?: string) {
    const params = new URLSearchParams({ periodo, ...(sucursalId ? { sucursalId } : {}), ...(barberoId ? { barberoId } : {}) });
    return this.request<any>(`/reportes/dashboard?${params.toString()}`);
  }

  // --- Suscripción ---
  getSuscripcion() {
    return this.request<any>('/suscripcion');
  }
  getLicenseCatalog() {
    return this.request<import('./utils/licenseCatalog').PublicLicenseCatalog>('/suscripcion/catalogo');
  }
  cambiarPlan(nuevoPlan: import('./utils/licenseCatalog').LicensePlanCode) {
    return this.request<any>('/suscripcion/cambiar-plan', {
      method: 'POST',
      body: JSON.stringify({ nuevoPlan })
    });
  }
  simularPago(accion: 'PAGO_EXITOSO' | 'PAGO_FALLIDO' | 'SUSPENDER') {
    return this.request<any>('/suscripcion/simular-pago', {
      method: 'POST',
      body: JSON.stringify({ accion })
    });
  }
  validarCupon(codigo: string) {
    return this.request<any>('/suscripcion/validar-cupon', {
      method: 'POST',
      body: JSON.stringify({ codigo })
    });
  }
  crearCheckoutSession(plan: string, codigoCupon?: string) {
    return this.request<any>('/suscripcion/crear-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ plan, codigoCupon })
    });
  }
  portalCliente() {
    return this.request<any>('/suscripcion/portal-cliente', { method: 'POST' });
  }
  enviarNotificacion(data: { destinatario: string; mensaje: string; tipo: string; forzarHorario?: boolean }) {
    return this.request<any>('/notificaciones/enviar', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  procesarRecordatorios() {
    return this.request<any>('/notificaciones/procesar-recordatorios', { method: 'POST' });
  }
  registrarOptOut(telefono: string) {
    return this.request<any>('/notificaciones/opt-out', {
      method: 'POST',
      body: JSON.stringify({ telefono })
    });
  }

  // --- CRM & Clientes (Fase 3) ---
  getClientes(search?: string) {
    const q = search ? `?busqueda=${encodeURIComponent(search)}` : '';
    return this.request<any[]>(`/clientes${q}`);
  }
  getClienteProfile(id: string) {
    return this.request<any>(`/clientes/${id}`);
  }
  getReactivacionCampana(diasInactividad: number = 30) {
    return this.request<any>(`/clientes/reactivacion?diasInactividad=${diasInactividad}`);
  }
  crearCliente(data: { sucursalId?: string; nombre: string; telefono: string; email?: string; fechaNacimiento?: string; notasEstilo?: string }) {
    return this.request<any>('/clientes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  actualizarCliente(id: string, data: any) {
    return this.request<any>(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  asignarMembresia(clienteId: string, data: { planNombre: string; precioMensual: number; cortesRestantes?: number }) {
    return this.request<any>(`/clientes/${clienteId}/membresia`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  eliminarClienteArco(clienteId: string) {
    return this.request<any>(`/clientes/${clienteId}/arco`, { method: 'DELETE' });
  }
  exportarClienteArco(clienteId: string) {
    return this.request<any>(`/clientes/${clienteId}/exportar-arco`);
  }

  // --- Citas Avanzadas & Walk-Ins (Fase 3) ---
  registrarWalkIn(data: { sucursalId: string; barberoId?: string; servicioId: string; clienteNombre: string; clienteTelefono?: string; tipoCorte?: string; fotoReferencia?: string | null; idempotencyKey?: string; precioConfirmado?: number }) {
    return this.bookingRequest('/citas/walk-in', data);
  }
  actualizarEstadoCita(citaId: string, estado: string) {
    return this.request<any>(`/citas/${citaId}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado })
    });
  }
  getListaEspera(sucursalId?: string) {
    const q = sucursalId ? `?sucursalId=${sucursalId}` : '';
    return this.request<any[]>(`/citas/lista-espera${q}`);
  }

  // --- Ventas & Devoluciones (Fase 3) ---
  cancelarVenta(ventaId: string, motivo: string) {
    return this.financialRequest(`/ventas/${ventaId}/cancelar`, { motivo });
  }

  // --- Caja & Nómina (Fase 3) ---
  registrarMovimientoCaja(data: { sucursalId: string; tipo: 'INGRESO_EXTRA' | 'RETIRO' | 'GASTO_MENOR'; monto: number; concepto: string; comprobanteUrl?: string }) {
    return this.financialRequest('/cortes-caja/movimiento', data);
  }
  liquidarNomina(data: { barberoId: string; periodoInicio: string; periodoFin: string; deducciones?: number; adelantos?: number }) {
    return this.financialRequest('/comisiones/liquidar-nomina', data);
  }
  getResumenSemanal(canal: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP') {
    return this.request<any>('/reportes/resumen-semanal', {
      method: 'POST',
      body: JSON.stringify({ canal })
    });
  }
  async downloadFile(endpoint: string, filename: string) {
    const headers = this.getAuthHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, { headers });
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.error) errMsg = errJson.error;
      } catch (e) {}
      throw new Error(errMsg);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async printTicketHtml(ventaId: string, width: string = '80mm') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('Permite ventanas emergentes para ver e imprimir el ticket. La venta ya está guardada.');
    printWindow.opener = null;
    printWindow.document.body.textContent = 'Consultando ticket…';
    try {
      const headers = this.getAuthHeaders();
      const params = new URLSearchParams({width: width === '58mm' ? '58mm' : '80mm'});
      const res = await fetch(`${API_BASE}/ventas/${encodeURIComponent(ventaId)}/ticket-html?${params}`, { headers });
      if (!res.ok) throw new Error('No pudimos cargar el ticket. La venta ya está guardada; vuelve a intentar imprimir.');
      const html = await res.text();
      if (printWindow.closed) throw new Error('Se cerró la ventana del ticket. Puedes abrirla otra vez sin repetir el cobro.');
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) { printWindow.close(); throw error instanceof TypeError?new Error('No pudimos consultar el ticket. Revisa tu conexión; la venta sigue guardada.'):error; }
  }

  exportarVentasCsv() {
    return this.downloadFile('/reportes/exportar/ventas-csv', 'ventas_systech.csv');
  }
}

export const api = new ApiService();
