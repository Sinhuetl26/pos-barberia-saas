import { Request, Response, NextFunction } from 'express';
import { prisma } from '@systech/database';
import { AccessScope, andWhere, auditAccess, matchPolicy, modelScope, projectResponse, requestAccess } from '../services/authorization.service';

const resourceRoots: Record<string, string> = {
  sucursales: 'Sucursal', barberos: 'Barbero', citas: 'Cita', bloqueos: 'BloqueoHorario',
  ventas: 'Venta', 'cortes-caja': 'CorteCaja', productos: 'Producto', clientes: 'ClienteFinal',
  proveedores: 'Proveedor', 'ordenes-compra': 'OrdenCompra', usuarios: 'Usuario'
};
const references: Record<string, string> = { sucursalId: 'Sucursal', barberoId: 'Barbero', clienteId: 'ClienteFinal', citaId: 'Cita', corteId: 'CorteCaja', productoId: 'Producto', servicioId: 'Producto', proveedorId: 'Proveedor' };
const delegate = (model: string) => (prisma as any)[model[0].toLowerCase() + model.slice(1)];

export function canonicalPath(req: Request) {
  return req.originalUrl.split('?')[0].replace(/^\/api/, '').replace(/\/$/, '') || '/';
}

async function verifyReferences(req: Request, access: AccessScope, path: string) {
  const selected: { model: string; id: string; primary?: boolean }[] = [];
  const parts = path.split('/').filter(Boolean);
  const policy = matchPolicy(req.method === 'HEAD' ? 'GET' : req.method, path)!;
  if (resourceRoots[parts[0]] && policy.path.split('/')[2] === ':id') selected.push({ model: resourceRoots[parts[0]], id: decodeURIComponent(parts[1]), primary: true });
  for (const obj of [req.query, req.body, ...(Array.isArray(req.body?.items) ? req.body.items : [])]) {
    if (!obj || typeof obj !== 'object') continue;
    for (const [key, model] of Object.entries(references)) {
      const id = obj[key];
      if (id === undefined || id === null || id === '') continue;
      if (typeof id !== 'string') return 400;
      selected.push({ model, id });
    }
  }
  let saleBranch: string | undefined = req.body?.sucursalId;
  for (const reference of selected) {
    const record = await delegate(reference.model).findFirst({ where: andWhere({ id: reference.id }, modelScope(reference.model, access)) });
    if (!record) return 404;
    if (reference.model === 'Sucursal' && record.eliminadoEn && !(reference.primary && path.endsWith('/restaurar'))) return 404;
    if (reference.model === 'Barbero') {
      if (req.method === 'POST' && ['ventas', 'citas', 'bloqueos'].includes(parts[0]) && saleBranch && record.sucursalId !== saleBranch) return 404;
      if (access.rol === 'BARBERO' && req.method !== 'GET' && record.id !== access.barberoId) return 404;
    }
    if (reference.model === 'Cita' && parts[0] === 'ventas' && (record.sucursalId !== saleBranch || record.barberoId !== req.body.barberoId || (req.body.clienteId && record.clienteId !== req.body.clienteId))) return 404;
    if (reference.model === 'Producto' && req.method !== 'GET') {
      if (record.sucursalId && saleBranch && record.sucursalId !== saleBranch) return 404;
      if (access.rol === 'GERENTE' && !record.sucursalId && ['productos', 'inventario'].includes(parts[0])) return 403;
    }
  }
  if (access.rol === 'GERENTE' && req.method === 'POST' && parts[0] === 'productos' && !req.body.sucursalId) return 403;
  if (req.body?.comisionIds !== undefined) {
    if (!Array.isArray(req.body.comisionIds) || req.body.comisionIds.some((id: any) => typeof id !== 'string')) return 400;
    const ids = [...new Set(req.body.comisionIds)];
    const count = await prisma.comision.count({ where: andWhere({ id: { in: ids as string[] } }, modelScope('Comision', access)) });
    if (count !== ids.length) return 404;
  }
  return null;
}

export async function authorizeRequest(req: Request, res: Response, next: NextFunction, access: AccessScope) {
  const path = canonicalPath(req);
  const method = req.method === 'HEAD' ? 'GET' : req.method;
  const policy = matchPolicy(method, path);
  if (!policy || !policy.roles.includes(access.rol)) {
    await auditAccess(access, 'ACCESO_DENEGADO', policy ? `${method} ${policy.path}` : `${method} RUTA_NO_AUTORIZADA`);
    return res.status(403).json({ code: 'SIN_PERMISO', error: 'Tu cuenta no tiene permiso para esta acción.' });
  }
  if (access.branchIds !== null && !access.branchIds.length && !/^\/(auth|tenant|onboarding)\/(me|security(?:\/.*)?)$/.test(path)) {
    return res.status(403).json({ code: 'SUCURSAL_NO_ASIGNADA', error: 'El propietario debe asignar una sucursal y, para barberos, un perfil activo.' });
  }
  if (access.rol === 'BARBERO' && method === 'PUT' && path.startsWith('/barberos/') && Object.keys(req.body || {}).some(k => !['avatarUrl', 'especialidad', 'descripcion', 'telefono'].includes(k))) {
    await auditAccess(access, 'ACCESO_DENEGADO', `${method} ${policy.path}`);
    return res.status(403).json({ code: 'SIN_PERMISO', error: 'Solo puedes editar tu perfil público; las comisiones y permisos los administra el propietario o gerente.' });
  }
  const denied = await verifyReferences(req, access, path);
  if (denied) {
    await auditAccess(access, 'RECURSO_FUERA_DE_ALCANCE', `${method} ${policy.path}`);
    return res.status(denied).json({ code: denied === 400 ? 'BAD_REQUEST' : 'RECURSO_NO_DISPONIBLE', error: denied === 400 ? 'Referencia de recurso inválida.' : 'Recurso no disponible para esta cuenta.' });
  }
  if (typeof req.query.sucursalId === 'string') access.filterBranchId = req.query.sucursalId;
  if (typeof req.body?.sucursalId === 'string') access.creationBranchId = req.body.sucursalId;
  if (access.rol === 'SUPER_ADMIN' && (path.startsWith('/admin') || method === 'POST')) await auditAccess(access, 'ACCESO_PLATAFORMA', `${method} ${policy.path}`);
  res.setHeader('Cache-Control', 'no-store');
  const json = res.json.bind(res);
  res.json = ((data: any) => json(projectResponse(data, access))) as any;
  // Binding next to this context scopes queries across async handlers and transactions.
  requestAccess.run(access, next);
}
