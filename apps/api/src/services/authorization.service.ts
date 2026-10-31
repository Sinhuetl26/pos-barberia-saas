import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma, prisma } from '@systech/database';

export const operationalRoles = ['DUENO', 'GERENTE', 'CAJERO', 'BARBERO'];
const managers = ['DUENO', 'GERENTE'];
const cash = ['DUENO', 'GERENTE', 'CAJERO'];
export interface AccessScope {
  tenantId: string; userId: string; email: string; rol: string;
  branchIds: string[] | null; barberoId: string | null; path: string;
  filterBranchId?: string; creationBranchId?: string;
}
export const requestAccess = new AsyncLocalStorage<AccessScope>();
export const andWhere = (where: any, scope: any) => ({ ...where, AND: [...(Array.isArray(where?.AND) ? where.AND : where?.AND ? [where.AND] : []), scope] });

// One inventory drives server authorization and the reviewable route matrix.
export const routePolicy: { method: string; path: string; roles: string[]; note?: string }[] = [];
function grant(method: string, path: string, roles: string[], note?: string) {
  routePolicy.push({ method, path, roles, note });
}
for (const prefix of ['auth', 'tenant', 'onboarding']) {
  grant('GET', '/' + prefix + '/security', [...operationalRoles, 'SUPER_ADMIN']);
  for (const action of ['password', 'logout-all']) grant('POST', '/' + prefix + '/security/' + action, [...operationalRoles, 'SUPER_ADMIN']);
}
grant('POST', '/usuarios/:id/invitacion', ['DUENO']);
grant('DELETE', '/usuarios/:id/invitacion', ['DUENO']);
grant('GET', '/auth/me', [...operationalRoles, 'SUPER_ADMIN']);
grant('PUT', '/auth/tenant/settings', ['DUENO']);
grant('PUT', '/tenant/tenant/settings', ['DUENO']);
grant('GET', '/tenant/me', [...operationalRoles, 'SUPER_ADMIN']);
grant('GET', '/onboarding/me', [...operationalRoles, 'SUPER_ADMIN']);
grant('PUT', '/onboarding/tenant/settings', ['DUENO']);
for (const path of ['/admin/metrics', '/admin/tenants', '/admin/auditorias']) grant('GET', path, ['SUPER_ADMIN'], 'Excepción de plataforma auditada');
for (const path of ['/admin/tenants/:id/status', '/admin/tenants/:id/plan']) grant('PUT', path, ['SUPER_ADMIN'], 'Excepción de plataforma auditada');
grant('GET', '/sucursales', [...operationalRoles, 'SUPER_ADMIN']);
grant('POST', '/sucursales', ['DUENO']);
grant('PUT', '/sucursales/:id', managers);
grant('POST', '/sucursales/:id/restaurar', ['DUENO']);
grant('GET', '/barberos', operationalRoles);
grant('POST', '/barberos', managers);
grant('PUT', '/barberos/:id', [...managers, 'BARBERO']);
grant('POST', '/barberos/:id/restaurar', managers);
for (const path of ['/citas', '/citas/lista-espera', '/bloqueos', '/ventas', '/ventas/:id/ticket']) grant('GET', path, operationalRoles);
grant('GET', '/ventas/intenciones/:clave', operationalRoles, 'Resultado de un cobro pendiente, restringido a la venta autorizada');
grant('GET', '/productos/precios', operationalRoles);
grant('GET', '/operacion/auditoria', ['DUENO']);
grant('GET', '/reportes/gastos', managers);
grant('GET', '/reportes/gastos/salidas', managers);
grant('GET', '/reportes/inteligencia', managers);
for(const action of ['previsualizar','confirmar'])grant('POST','/operacion/importacion/'+action,managers);
for(const action of ['exportar','plantilla'])grant('GET','/operacion/importacion/'+action,managers);
grant('POST', '/reportes/gastos', managers);
grant('POST', '/reportes/gastos/:id/corregir', managers);
grant('POST', '/cortes-caja/previsualizar', ['DUENO','GERENTE','CAJERO']);
grant('GET', '/inventario/tarifas', managers);
grant('POST', '/inventario/tarifas', managers);
grant('GET', '/inventario/politica-descuentos', operationalRoles);
grant('POST', '/inventario/politica-descuentos', managers);
grant('GET', '/ventas/aprobaciones', operationalRoles);
grant('POST', '/ventas/aprobaciones', operationalRoles);
grant('POST', '/ventas/aprobaciones/:id/aprobar', managers);
for (const path of ['/citas', '/citas/walk-in', '/ventas']) grant('POST', path, operationalRoles);
for (const method of ['GET','POST']) grant(method, '/citas/fila', operationalRoles);
for (const action of ['asignar','reasignar','atender','retirar']) grant('POST', '/citas/fila/:id/'+action, operationalRoles);
for (const action of ['impacto','ausencias','horarios']) grant('POST', '/bloqueos/'+action, managers);
grant('GET', '/bloqueos/horarios', operationalRoles);
grant('POST', '/bloqueos', [...managers, 'BARBERO']);
grant('DELETE', '/bloqueos/:id', [...managers, 'BARBERO']);
grant('PUT', '/citas/:id/status', operationalRoles);
grant('PUT', '/citas/:id/reprogramar', operationalRoles);
grant('GET', '/citas/:id/referencia', operationalRoles);
grant('POST', '/ventas/:id/cancelar', managers);
grant('POST', '/ventas/:id/devolver', managers);
grant('GET', '/cortes-caja/custodia', operationalRoles);
grant('POST', '/cortes-caja/entrega', cash);
grant('GET', '/notificaciones/ventas', ['DUENO']);
grant('POST', '/ventas/:id/print-token', operationalRoles);
grant('GET', '/ventas/:id/ticket-html', operationalRoles, 'Bearer vivo o capacidad de impresión de 120 segundos');
grant('GET', '/cortes-caja', cash);
for (const path of ['/cortes-caja/abrir', '/cortes-caja/cerrar', '/cortes-caja/movimiento', '/cortes-caja/:id/print-token']) grant('POST', path, cash);
grant('GET', '/cortes-caja/:id/comprobante-html', cash, 'Bearer vivo o capacidad de impresión de 120 segundos');
grant('GET', '/productos', operationalRoles, 'Catálogo común de lectura; editarlo requiere dueño');
grant('POST', '/productos', managers);
grant('PUT', '/productos/:id', managers);
grant('GET', '/inventario/kardex', managers);
grant('POST', '/inventario/movimiento', managers);
grant('GET', '/inventario/recetas/:servicioId', managers);
grant('GET', '/inventario/insumos/conciliacion', managers);
grant('GET', '/inventario/consumos', managers);
grant('POST', '/inventario/consumos/:id/corregir', managers);
grant('POST', '/inventario/recetas/:servicioId', managers);
grant('GET', '/inventario/conteos', managers);
grant('POST', '/inventario/conteos', managers);
grant('PUT', '/inventario/conteos/:id', managers);
grant('POST', '/inventario/conteos/:id/confirmar', managers);
for (const path of ['/comisiones', '/comisiones/nominas']) grant('GET', path, [...managers, 'BARBERO']);
for (const path of ['/comisiones/pagar', '/comisiones/liquidar-nomina']) grant('POST', path, managers);
for (const path of ['/reportes/dashboard', '/reportes/exportar/ventas-csv', '/operacion/resumen']) grant('GET', path, managers);
grant('POST', '/reportes/resumen-semanal', ['DUENO']);
grant('GET', '/operacion/buscar', operationalRoles);
grant('GET', '/clientes', operationalRoles);
grant('GET', '/clientes/:id', cash);
grant('GET', '/clientes/reactivacion', ['DUENO']);
grant('POST', '/clientes', cash);
grant('PUT', '/clientes/:id', ['DUENO']);
grant('DELETE', '/clientes/:id', ['DUENO']);
grant('POST', '/clientes/:id/membresia', ['DUENO']);
grant('GET', '/proveedores', managers, 'Directorio común de lectura');
for (const [method, path] of [['POST', '/proveedores'], ['PUT', '/proveedores/:id'], ['DELETE', '/proveedores/:id']]) grant(method, path, ['DUENO']);
grant('GET', '/ordenes-compra', managers);
for (const path of ['/ordenes-compra', '/ordenes-compra/:id/recibir', '/ordenes-compra/:id/cancelar']) grant('POST', path, managers);
grant('GET', '/notificaciones', ['DUENO']);
for (const path of ['/notificaciones/enviar', '/notificaciones/simular-envio', '/notificaciones/opt-out']) grant('POST', path, ['DUENO']);
grant('POST', '/notificaciones/procesar-recordatorios', ['SUPER_ADMIN'], 'Trabajo global auditado');
grant('GET', '/suscripcion', ['DUENO']);
for (const path of ['/suscripcion/validar-cupon', '/suscripcion/crear-checkout-session', '/suscripcion/portal-cliente', '/suscripcion/cambiar-plan', '/suscripcion/simular-pago']) grant('POST', path, ['DUENO']);
grant('POST', '/suscripcion/ejecutar-dunning', ['SUPER_ADMIN'], 'Trabajo global auditado');
grant('GET', '/integraciones', ['DUENO', 'SUPER_ADMIN']);
grant('GET', '/integraciones/correo', ['DUENO','SUPER_ADMIN']);
grant('GET', '/operacion/preparacion', ['DUENO']);
grant('PUT', '/operacion/preparacion', ['DUENO']);
grant('GET', '/usuarios', ['DUENO']);
grant('POST', '/usuarios', ['DUENO']);
grant('PUT', '/usuarios/:id/acceso', ['DUENO']);
grant('GET', '/jobs', ['DUENO']);
grant('GET', '/jobs/status', ['DUENO']);
grant('POST', '/jobs/:id/retry', ['DUENO']);
grant('PUT', '/jobs/providers/:provider', ['DUENO']);

export function matchPolicy(method: string, path: string) {
  const segments = path.replace(/\/$/, '').split('/');
  return [...routePolicy].sort((a, b) => a.path.includes(':') === b.path.includes(':') ? 0 : a.path.includes(':') ? 1 : -1).find(p => p.method === method && p.path.split('/').length === segments.length &&
    p.path.split('/').every((s, i) => s.startsWith(':') || s === segments[i]));
}

export async function resolveScope(user: any, path = ''): Promise<AccessScope> {
  let branchIds: string[] | null = null;
  let barberoId: string | null = null;
  if (!['DUENO', 'SUPER_ADMIN'].includes(user.rol)) {
    let assigned: string[] = [];
    try { assigned = JSON.parse(user.sucursalesAsignadasJson || '[]'); } catch { /* invalid assignment fails closed */ }
    if (!Array.isArray(assigned) || assigned.some(id => typeof id !== 'string')) assigned = [];
    // Explicit assignments replace the legacy single-branch assignment.
    if (user.sucursalesAsignadasJson === null && user.sucursalId) assigned = [user.sucursalId];
    if (user.rol === 'BARBERO') {
      // Never infer identity from matching names or email addresses.
      const barber = user.barberoId ? await prisma.barbero.findFirst({ where: { id: user.barberoId, activo: true, eliminadoEn: null, sucursal: { tenantId: user.tenantId, eliminadoEn: null } } }) : null;
      if (barber) { barberoId = barber.id; assigned = [barber.sucursalId]; }
      else assigned = [];
    }
    const branches = await prisma.sucursal.findMany({ where: { id: { in: assigned }, tenantId: user.tenantId, eliminadoEn: null }, select: { id: true } });
    branchIds = branches.map(b => b.id);
  }
  return { tenantId: user.tenantId, userId: user.id, email: user.email, rol: user.rol, branchIds, barberoId, path };
}

const branchModels = ['Cita', 'Venta', 'CorteCaja', 'BloqueoHorario', 'KardexMovimiento', 'OrdenCompra', 'ListaEspera', 'MovimientoCaja', 'RegistroCaja', 'CajaOperacion', 'DevolucionVenta', 'ConteoInventario', 'ConsumoServicio', 'FilaPresencial', 'TurnoEspecial','TarifaProfesional','PoliticaDescuento','AprobacionDescuento','GastoOperativo','CorreccionGasto'];
const barberModels = ['Cita', 'Venta', 'BloqueoHorario', 'ListaEspera', 'Comision', 'PagoNomina', 'Resena', 'TurnoEspecial','TarifaProfesional'];
const models = new Map(Prisma.dmmf.datamodel.models.map(m => [m.name, m]));
export function modelScope(model: string, access: AccessScope): any {
  if (access.rol === 'SUPER_ADMIN') return {};
  let where: any = model === 'Tenant' ? { id: access.tenantId } :
    models.get(model)?.fields.some(f => f.name === 'tenantId') ? { tenantId: access.tenantId } : {};
  if (model === 'Barbero') where = { sucursal: { tenantId: access.tenantId } };
  if (model === 'VentaItem') where = { venta: modelScope('Venta', access) };
  if (model === 'CitaReferencia') where = { cita: modelScope('Cita', access) };
  if (model === 'DevolucionVenta') where.venta = modelScope('Venta', access);
  if (model === 'RegistroCaja' && access.rol === 'BARBERO') where.custodiaUsuarioId = access.userId;
  if (access.filterBranchId) {
    if (branchModels.includes(model) || model === 'Barbero') where.sucursalId = access.filterBranchId;
    if (model === 'Producto') where.OR = [{ sucursalId: access.filterBranchId }, { sucursalId: null }];
    if (['Comision', 'PagoNomina', 'Resena'].includes(model)) where.barbero = { sucursalId: access.filterBranchId, sucursal: { tenantId: access.tenantId } };
  }
  if (access.branchIds !== null) {
    const branch = { in: access.branchIds };
    if (model === 'Sucursal') where.id = branch;
    if (branchModels.includes(model)) where.sucursalId = branch;
    if (model === 'Barbero') where.sucursalId = branch;
    if (model === 'Producto') where.OR = [{ sucursalId: branch }, { sucursalId: null }];
    if (['Comision', 'PagoNomina', 'Resena'].includes(model)) where.barbero = { sucursalId: branch, sucursal: { tenantId: access.tenantId } };
    if (model === 'ClienteFinal') where.OR = [
      ...(access.rol === 'BARBERO' ? [] : [{ sucursalOrigenId: branch }]),
      { citas: { some: modelScope('Cita', access) } },
      { ventas: { some: modelScope('Venta', access) } }
    ];
    if (['ClienteMembresia', 'ConsentimientoCliente'].includes(model)) where.cliente = modelScope('ClienteFinal', access);
    if (model === 'Usuario') where.id = access.userId;
    if (model === 'AuthAction') where.userId = access.userId;
  }
  if (model === 'Comision') where.venta = modelScope('Venta', access);
  if (access.filterBranchId) {
    const filter = branchModels.includes(model) || model === 'Barbero' ? { sucursalId: access.filterBranchId } :
      model === 'Producto' ? { OR: [{ sucursalId: access.filterBranchId }, { sucursalId: null }] } :
      ['Comision', 'PagoNomina', 'Resena'].includes(model) ? { barbero: { sucursalId: access.filterBranchId } } : {};
    where = andWhere(where, filter);
  }
  if (access.rol === 'BARBERO') {
    if (model === 'Barbero') where.id = access.barberoId || '__unlinked__';
    if (barberModels.includes(model)) {
      if (model === 'BloqueoHorario') where.OR = [{ barberoId: access.barberoId || '__unlinked__' }, { barberoId: null }];
      else where.barberoId = access.barberoId || '__unlinked__';
    }
  }
  return where;
}

function scopeSelection(model: string, args: any, access: AccessScope) {
  for (const selector of [args.include, args.select]) {
    if (!selector) continue;
    for (const field of models.get(model)?.fields || []) {
      if (field.kind !== 'object' || !selector[field.name]) continue;
      const nested = selector[field.name] === true ? {} : selector[field.name];
      if (field.isList) nested.where = andWhere(nested.where, modelScope(field.type, access));
      scopeSelection(field.type, nested, access);
      if (Object.keys(nested).length) selector[field.name] = nested;
    }
    // Counts of relations must obey the same scope as list reads.
    if (selector._count === true) selector._count = { select: Object.fromEntries((models.get(model)?.fields || []).filter(f => f.isList && f.kind === 'object').map(f => [f.name, { where: modelScope(f.type, access) }])) };
    else if (selector._count?.select) for (const [name, value] of Object.entries(selector._count.select)) {
      const relation = models.get(model)?.fields.find(f => f.name === name);
      if (relation && value) selector._count.select[name] = { ...(typeof value === 'object' ? value : {}), where: andWhere((value as any)?.where, modelScope(relation.type, access)) };
    }
  }
}

// Defense in depth for every Prisma read/aggregate/write, including transactions.
// Public capabilities, login and schedulers have no request scope and are reviewed separately.
prisma.$use(async (params, next) => {
  const access = requestAccess.getStore();
  if (!access || access.rol === 'SUPER_ADMIN' || !params.model) return next(params);
  params.args ||= {};
  const action = params.action;
  if (/^(find|count|aggregate|groupBy|update|delete|upsert)/.test(action)) {
    params.args.where = andWhere(params.args.where, modelScope(params.model, access));
  }
  scopeSelection(params.model, params.args, access);
  if (params.model === 'ClienteFinal' && action === 'create' && (access.creationBranchId || access.branchIds !== null)) {
    params.args.data.sucursalOrigenId = access.creationBranchId || access.branchIds![0];
  }
  return next(params);
});

export function projectResponse(data: any, access: AccessScope) {
  const financial = access.rol === 'CAJERO';
  return JSON.parse(JSON.stringify(data, function (key, value) {
    if (['stockActual', 'stockMinimo', 'stockAnterior', 'stockNuevo', 'cantidad', 'presentacionCantidad'].includes(key) && value !== null && value !== undefined && Number.isFinite(Number(value))) return Number(value);
    if (['passwordHash', 'sucursalesAsignadasJson', 'sessionVersion', 'tokenHash', 'encryptedToken', 'requestHash', 'respuesta', 'operacionPOS'].includes(key)) return undefined;
    if (financial && ['comision', 'comisiones', 'comisionesPendientes', 'comisionGenerada', 'comisionServiciosPct', 'comisionProductosPct', 'costo'].includes(key)) return undefined;
    if (access.branchIds !== null && ['gastoTotal', 'totalVisitas', 'visitasTotales', 'fechaUltimaVisita', 'precioMensual'].includes(key)) return undefined;
    if (access.branchIds !== null && key === 'noShows' && ('gastoTotal' in this || 'totalVisitas' in this || 'barberoFavorito' in this)) return undefined;
    if (key === 'suscripcion' && !['DUENO', 'SUPER_ADMIN'].includes(access.rol)) return undefined;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (access.rol !== 'SUPER_ADMIN' && value.tenantId && value.tenantId !== access.tenantId) return undefined;
      if (access.branchIds !== null && value.sucursalId && !access.branchIds.includes(value.sucursalId)) return undefined;
      if (access.rol === 'BARBERO' && value.barberoId && value.barberoId !== access.barberoId) return undefined;
    }
    return value;
  }));
}

export async function auditAccess(access: AccessScope, action: string, route: string) {
  // Only route templates are logged; no query tokens, request bodies or credentials.
  await prisma.auditoriaLog.create({ data: { tenantId: access.tenantId, usuarioEmail: access.email, accion: action, detalles: JSON.stringify({ userId: access.userId, rol: access.rol, route }) } });
}

