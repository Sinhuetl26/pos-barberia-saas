// ==========================================
// SYSTECH STUDIO - ZOD VALIDATION SCHEMAS
// Strict input validation for API endpoints
// ==========================================

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { isLicensePlan } from '../services/license-catalog.service';
import { optionalSafeWebUrl } from '../services/booking-personalization.service';

// Login schema
export const loginSchema = z.object({
  email: z.string().trim().email('Formato de correo inválido'),
  password: z.string().min(1, 'La contraseña es requerida').max(256)
});

// Self-service register schema
export const registerSchema = z.object({
  nombreBarberia: z.string().trim().min(2, 'Nombre de barbería requerido'),
  nombreDueno: z.string().trim().min(2, 'Nombre del dueño requerido'),
  email: z.string().trim().email('Correo electrónico inválido'),
  password: z.string().min(12, 'La contraseña debe tener al menos 12 caracteres').refine(v => Buffer.byteLength(v, 'utf8') <= 72, 'La contraseña supera los 72 bytes permitidos'),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  plan: z.string().refine(isLicensePlan, 'Plan inválido').default('PRO')
});

// Public booking schema
export const publicBookingSchema = z.object({
  tenantId: z.string().min(1, 'tenantId requerido'),
  sucursalId: z.string().min(1, 'sucursalId requerido'),
  barberoId: z.string().min(1, 'barberoId requerido'),
  servicioId: z.string().optional().nullable(),
  fechaHora: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Fecha u hora inválida' }),
  duracionMinutos: z.coerce.number().min(15).max(240).default(30),
  clienteNombre: z.string().trim().min(2, 'Nombre del cliente requerido'),
  clienteTelefono: z.string().trim().min(8, 'Teléfono del cliente requerido'),
  clienteEmail: z.string().trim().email().optional().nullable().or(z.literal('')),
  notas: z.string().optional().nullable()
});

// POS Fast Sale schema
const saleMoney = z.coerce.number<string | number>().finite().min(0).max(1_000_000_000)
  .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, 'Usa importes con hasta dos decimales');
export const createSaleSchema = z.object({
  sucursalId: z.string().min(1, 'sucursalId requerido'),
  barberoId: z.string().min(1, 'barberoId requerido'),
  clienteId: z.string().optional().nullable(),
  citaId: z.string().optional().nullable(),
  metodoPago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO']),
  detallesPago: z.object({ montoEfectivo: saleMoney.optional().nullable(), montoTarjeta: saleMoney.optional().nullable(), efectivoRecibido: saleMoney.optional().nullable() }).optional().nullable(),
  montoEfectivo: saleMoney.optional().nullable(),
  montoTarjeta: saleMoney.optional().nullable(),
  efectivoRecibido: saleMoney.optional().nullable(),
  idempotencyKey: z.string().regex(/^[a-zA-Z0-9._:-]{1,128}$/, 'Clave de cobro inválida').optional().nullable(),
  descuento: saleMoney.default(0),
  motivoDescuento: z.string().trim().max(500).optional().nullable(),
  aprobacionDescuentoId: z.string().optional().nullable(),
  totalConfirmado: saleMoney.optional().nullable(),
  propina: saleMoney.default(0),
  items: z.array(
    z.object({
      productoId: z.string().min(1, 'productoId requerido'),
      cantidad: z.coerce.number().int().min(1).max(99)
    })
  ).min(1, 'Debe incluir al menos un producto o servicio').max(100)
    .refine(items => new Set(items.map(i => i.productoId)).size === items.length, 'Agrupa la cantidad de cada producto en un solo renglón')
});

// Barber creation schema
export const createBarberoSchema = z.object({
  sucursalId: z.string().min(1, 'sucursalId requerido'),
  nombre: z.string().trim().min(2, 'Nombre del barbero requerido'),
  telefono: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  avatarUrl: optionalSafeWebUrl,
  especialidad: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  visibleEnWeb: z.boolean().optional().default(true),
  comisionServiciosPct: z.coerce.number().min(0).max(100).default(50),
  comisionProductosPct: z.coerce.number().min(0).max(100).default(10),
  diasDescanso: z.string().default('Domingo'),
  horarioInicio: z.string().default('09:00'),
  horarioFin: z.string().default('20:00'),
  password: z.string().min(6).optional().nullable(),
  crearAcceso: z.boolean().optional().default(false)
});

// Barber update schema
export const updateBarberoSchema = z.object({
  nombre: z.string().trim().min(2).optional(),
  telefono: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  avatarUrl: optionalSafeWebUrl,
  especialidad: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  visibleEnWeb: z.boolean().optional(),
  comisionServiciosPct: z.coerce.number().min(0).max(100).optional(),
  comisionProductosPct: z.coerce.number().min(0).max(100).optional(),
  diasDescanso: z.string().optional(),
  horarioInicio: z.string().optional(),
  horarioFin: z.string().optional(),
  activo: z.boolean().optional()
});

// Product or service creation schema
export const createProductSchema = z.object({
  sucursalId: z.string().optional().nullable(),
  nombre: z.string().trim().min(2, 'Nombre de producto requerido'),
  imagen: z.string().max(70000).regex(/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/, 'La foto debe ser un JPG preparado por SYSTECH').optional().nullable(),
  tipo: z.enum(['PRODUCTO', 'SERVICIO']).default('PRODUCTO'),
  categoria: z.string().default('General'),
  duracionMinutos: z.coerce.number().min(5).max(480).default(30),
  sku: z.string().optional().nullable(),
  precioVenta: saleMoney,
  tasaImpuesto: z.coerce.number().finite().min(0).max(100).default(0),
  costo: z.coerce.number().min(0).default(0),
  stockActual: z.coerce.number().min(0, 'El stock inicial no puede ser negativo').default(0),
  stockMinimo: z.coerce.number().min(0, 'El stock mínimo no puede ser negativo').default(0),
  naturaleza: z.enum(['REVENTA', 'INSUMO']).default('REVENTA'),
  unidad: z.enum(['PIEZA','ML','G']).default('PIEZA'),
  presentacionNombre: z.string().max(100).optional().nullable(),
  presentacionCantidad: z.coerce.number().positive().default(1)
});

// Cash drawer open/close schemas
export const openCashShiftSchema = z.object({
  idempotencyKey: z.string().optional(),
  sucursalId: z.string().min(1, 'sucursalId requerido'),
  fondoInicial: z.coerce.number().min(0).default(0),
  notas: z.string().optional().nullable()
});

export const closeCashShiftSchema = z.object({
  corteId: z.string().min(1, 'corteId requerido'),
  conteoEfectivoReal: z.union([z.number(), z.string().trim().min(1, 'Declara el conteo físico')]).pipe(saleMoney),
  notasCierre: z.string().optional().nullable(),
  previsualizacionToken: z.string().max(4096).optional().nullable(),
  desglose: z.any().optional().nullable()
});

/**
 * Express middleware helper to validate request body with a Zod schema.
 */
export function validateBody(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = (result.error as any).issues || (result.error as any).errors || [];
      const errorMsg = issues.length > 0
        ? issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
        : 'Datos de entrada inválidos';
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        error: errorMsg,
        details: issues
      });
    }
    req.body = result.data;
    next();
  };
}
