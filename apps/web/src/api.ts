import { UserRole } from './types';

const API_BASE = ((import.meta as any).env?.VITE_API_URL as string) || 'http://localhost:3001/api';

class ApiService {
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

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error en la solicitud al servidor');
    }

    return data as T;
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
  }) {
    return this.request<any>('/tenant/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async printCorteHtml(corteId: string) {
    try {
      const res = await this.request<{ success: boolean; printToken: string }>(`/cortes-caja/${corteId}/print-token`, {
        method: 'POST'
      });
      const url = `${API_BASE}/cortes-caja/${corteId}/comprobante-html?printToken=${encodeURIComponent(res.printToken)}`;
      const win = window.open(url, '_blank');
      if (!win) window.location.href = url;
    } catch (err) {
      console.error('Error al generar token de impresión:', err);
      alert('No se pudo generar el comprobante seguro de impresión');
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
  getPublicAvailability(sucursalId: string, barberoId: string, fecha: string, duracion: number = 30) {
    return this.request<{ fecha: string; slots: { hora: string; disponible: boolean }[] }>(
      `/public/disponibilidad?sucursalId=${sucursalId}&barberoId=${barberoId}&fecha=${fecha}&duracion=${duracion}`
    );
  }
  bookPublicAppointment(data: any) {
    return this.request<any>('/public/reservar', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  getPublicBooking(codigo: string) {
    return this.request<any>(`/public/cita/${codigo}`);
  }
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
  createCita(data: any) {
    return this.request<any>('/citas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
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
    return this.request<any>('/comisiones/pagar', {
      method: 'POST',
      body: JSON.stringify({ comisionIds, metodoPagoComision })
    });
  }

  // --- Cortes de Caja ---
  getCortesCaja(sucursalId?: string) {
    return this.request<any[]>(`/cortes-caja${sucursalId ? `?sucursalId=${sucursalId}` : ''}`);
  }
  abrirCorteCaja(sucursalId: string, fondoInicial: number, notas?: string) {
    return this.request<any>('/cortes-caja/abrir', {
      method: 'POST',
      body: JSON.stringify({ sucursalId, fondoInicial, notas })
    });
  }
  cerrarCorteCaja(corteId: string, conteoEfectivoReal: number, notasCierre?: string) {
    return this.request<any>('/cortes-caja/cerrar', {
      method: 'POST',
      body: JSON.stringify({ corteId, conteoEfectivoReal, notasCierre })
    });
  }

  // --- Inventario ---
  getProductos(params: { tipo?: string; bajoStock?: boolean; sucursalId?: string } = {}) {
    const qs = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/productos${qs ? `?${qs}` : ''}`);
  }
  createProducto(data: any) {
    return this.request<any>('/productos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  updateProducto(id: string, data: any) {
    return this.request<any>(`/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  ajustarInventario(productoId: string, tipoMovimiento: string, cantidad: number, motivo: string) {
    return this.request<any>('/inventario/movimiento', {
      method: 'POST',
      body: JSON.stringify({ productoId, tipoMovimiento, cantidad, motivo })
    });
  }
  getKardex(productoId?: string) {
    return this.request<any[]>(`/inventario/kardex${productoId ? `?productoId=${productoId}` : ''}`);
  }

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
  cambiarPlan(nuevoPlan: 'BASICO' | 'PRO') {
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
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<any[]>(`/clientes${q}`);
  }
  getClienteProfile(id: string) {
    return this.request<any>(`/clientes/${id}`);
  }
  getReactivacionCampana(diasInactividad: number = 30) {
    return this.request<any>(`/clientes/reactivacion?diasInactividad=${diasInactividad}`);
  }
  crearCliente(data: { nombre: string; telefono: string; email?: string; fechaNacimiento?: string; notasEstilo?: string }) {
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
  registrarWalkIn(data: { sucursalId: string; barberoId?: string; servicioId: string; clienteNombre: string; clienteTelefono?: string }) {
    return this.request<any>('/citas/walk-in', {
      method: 'POST',
      body: JSON.stringify(data)
    });
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
    return this.request<any>(`/ventas/${ventaId}/cancelar`, {
      method: 'POST',
      body: JSON.stringify({ motivo })
    });
  }

  // --- Caja & Nómina (Fase 3) ---
  registrarMovimientoCaja(data: { sucursalId: string; tipo: 'INGRESO_EXTRA' | 'RETIRO' | 'GASTO_MENOR'; monto: number; concepto: string; comprobanteUrl?: string }) {
    return this.request<any>('/cortes-caja/movimiento', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  liquidarNomina(data: { barberoId: string; periodoInicio: string; periodoFin: string; deducciones?: number; adelantos?: number }) {
    return this.request<any>('/comisiones/liquidar-nomina', {
      method: 'POST',
      body: JSON.stringify(data)
    });
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
    const headers = this.getAuthHeaders();
    const res = await fetch(`${API_BASE}/ventas/${ventaId}/ticket-html?width=${width}&autoprint=true`, { headers });
    if (!res.ok) throw new Error('Error al obtener el ticket térmico');
    const html = await res.text();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    }
  }

  exportarVentasCsv() {
    return this.downloadFile('/reportes/exportar/ventas-csv', 'ventas_systech.csv');
  }
}

export const api = new ApiService();
