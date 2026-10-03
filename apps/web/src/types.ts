export type UserRole = 'SUPER_ADMIN' | 'DUENO' | 'GERENTE' | 'BARBERO' | 'CLIENTE_FINAL';

export interface Tenant {
  id: string;
  nombre: string;
  slug?: string;
  plan: 'BASICO' | 'PRO';
  estado: 'ACTIVO' | 'EN_RIESGO' | 'SUSPENDIDO' | 'CANCELADO';
  telefono?: string;
  emailContacto?: string;
  direccion?: string;
  logoUrl?: string;
  limiteSucursales: number;
  limiteBarberos: number;
  fechaCreacion?: string;
  sucursales?: Sucursal[];
  suscripcion?: Suscripcion;
  usuarios?: Usuario[];
}

export interface Suscripcion {
  id: string;
  tenantId: string;
  montoMensual: number;
  estadoPago: 'active' | 'past_due' | 'suspended' | 'canceled';
  diasGracia: number;
  fechaProximoCobro?: string;
  fechaUltimoCobro?: string;
  fechaSuspension?: string;
}

export interface Sucursal {
  id: string;
  tenantId: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  horarioApertura?: string;
  horarioCierre?: string;
  diasLaborales?: string;
  barberos?: Barbero[];
}

export interface Usuario {
  id: string;
  tenantId: string;
  email: string;
  rol: UserRole;
  nombre: string;
  telefono?: string;
  sucursalId?: string;
  activo?: boolean;
}

export interface Barbero {
  id: string;
  sucursalId: string;
  nombre: string;
  telefono?: string;
  email?: string;
  avatarUrl?: string;
  comisionServiciosPct: number;
  comisionProductosPct: number;
  diasDescanso: string;
  horarioInicio: string;
  horarioFin: string;
  activo: boolean;
  sucursal?: Sucursal;
  comisionesPendientes?: number;
}

export interface ClienteFinal {
  id: string;
  tenantId: string;
  nombre: string;
  telefono?: string;
  email?: string;
  notas?: string;
  totalVisitas: number;
  fechaUltimaVisita?: string;
}

export interface Producto {
  id: string;
  tenantId: string;
  sucursalId: string;
  nombre: string;
  tipo: 'PRODUCTO' | 'SERVICIO';
  categoria: string;
  duracionMinutos: number;
  sku?: string;
  precioVenta: number;
  costo?: number;
  stockActual: number;
  stockMinimo: number;
  activo: boolean;
  sucursal?: Sucursal;
}

export interface Cita {
  id: string;
  tenantId: string;
  sucursalId: string;
  barberoId: string;
  clienteId: string;
  servicioId?: string;
  nombreServicio?: string;
  fechaHora: string;
  duracionMinutos: number;
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA' | 'NO_SHOW';
  notas?: string;
  precioEstimado?: number;
  codigoReserva?: string;
  cliente?: ClienteFinal;
  barbero?: Barbero;
  sucursal?: Sucursal;
  venta?: Venta;
}

export interface BloqueoHorario {
  id: string;
  tenantId: string;
  sucursalId: string;
  barberoId?: string;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  barbero?: Barbero;
}

export interface VentaItem {
  id: string;
  ventaId: string;
  productoId: string;
  nombreItem: string;
  tipoItem: 'PRODUCTO' | 'SERVICIO';
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Venta {
  id: string;
  tenantId: string;
  sucursalId: string;
  barberoId: string;
  clienteId?: string;
  citaId?: string;
  folio?: string;
  subtotal: number;
  descuento: number;
  propina: number;
  total: number;
  metodoPago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO';
  detallesPago?: string;
  fecha: string;
  items?: VentaItem[];
  barbero?: Barbero;
  sucursal?: Sucursal;
  cliente?: ClienteFinal;
  comisiones?: Comision[];
}

export interface Comision {
  id: string;
  tenantId: string;
  ventaId: string;
  barberoId: string;
  monto: number;
  porcentaje: number;
  pagada: boolean;
  fechaPago?: string;
  metodoPagoComision?: string;
  corteCajaId?: string;
  barbero?: Barbero;
  venta?: Venta;
}

export interface CorteCaja {
  id: string;
  tenantId: string;
  sucursalId: string;
  usuarioId?: string;
  fechaApertura: string;
  fechaCierre?: string;
  fondoInicial: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  totalPropinas: number;
  totalVentas: number;
  conteoEfectivoReal?: number;
  descuadre?: number;
  notas?: string;
  estado: 'ABIERTO' | 'CERRADO';
  sucursal?: Sucursal;
}

export interface KardexMovimiento {
  id: string;
  tenantId: string;
  sucursalId: string;
  productoId: string;
  tipoMovimiento: 'VENTA_POS' | 'ENTRADA_COMPRA' | 'AJUSTE_INVENTARIO' | 'MERMA_DEVOLUCION';
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo?: string;
  fecha: string;
  producto?: Producto;
}

export interface NotificacionLog {
  id: string;
  tenantId: string;
  tipo: string;
  canal: string;
  destinatario: string;
  mensaje: string;
  estado: string;
  fecha: string;
}

export interface AuditoriaLog {
  id: string;
  tenantId?: string;
  usuarioEmail: string;
  accion: string;
  detalles: string;
  fecha: string;
  tenant?: { nombre: string; slug?: string };
}
