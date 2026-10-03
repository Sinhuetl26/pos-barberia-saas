// ==========================================
// SYSTECH STUDIO - ZOD VALIDATION SCHEMAS
// Strict input validation for API endpoints
// ==========================================

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Login schema
export const loginSchema = z.object({
  email: z.string().trim().email('Formato de correo inválido'),
  password: z.string().min(1, 'La contraseña es requerida')
});

// Self-service register schema
export const registerSchema = z.object({
  nombreBarberia: z.string().trim().min(2, 'Nombre de barbería requerido'),
  nombreDueno: z.string().trim().min(2, 'Nombre del dueño requerido'),
  email: z.string().trim().email('Correo electrónico inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  plan: z.enum(['BASICO', 'PRO']).default('PRO')
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
export const createSaleSchema = z.object({
  sucursalId: z.string().min(1, 'sucursalId requerido'),
  barberoId: z.string().min(1, 'barberoId requerido'),
  clienteId: z.string().optional().nullable(),
  citaId: z.string().optional().nullable(),
  metodoPago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO']),
  detallesPago: z.any().optional(),
  descuento: z.coerce.number().min(0).default(0),
  propina: z.coerce.number().min(0).default(0),
  items: z.array(
    z.object({
      productoId: z.string().min(1, 'productoId requerido'),
      cantidad: z.coerce.number().int().min(1).max(99)
    })
  ).min(1, 'Debe incluir al menos un producto o servicio')
});

// Barber creation schema
export const createBarberoSchema = z.object({
  sucursalId: z.string().min(1, 'sucursalId requerido'),
  nombre: z.string().trim().min(2, 'Nombre del barbero requerido'),
  telefono: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  comisionServiciosPct: z.coerce.number().min(0).max(100).default(50),
  comisionProductosPct: z.coerce.number().min(0).max(100).default(10),
  diasDescanso: z.string().default('Domingo'),
  horarioInicio: z.string().default('09:00'),
  horarioFin: z.string().default('20:00')
});

// Product or service creation schema
export const createProductSchema = z.object({
  sucursalId: z.string().optional().nullable(),
  nombre: z.string().trim().min(2, 'Nombre de producto requerido'),
  tipo: z.enum(['PRODUCTO', 'SERVICIO']).default('PRODUCTO'),
  categoria: z.string().default('General'),
  duracionMinutos: z.coerce.number().min(5).max(480).default(30),
  sku: z.string().optional().nullable(),
  precioVenta: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  costo: z.coerce.number().min(0).default(0),
  stockActual: z.coerce.number().int().default(0),
  stockMinimo: z.coerce.number().int().default(0)
});

// Cash drawer open/close schemas
export const openCashShiftSchema = z.object({
  sucursalId: z.string().min(1, 'sucursalId requerido'),
  fondoInicial: z.coerce.number().min(0).default(0),
  notas: z.string().optional().nullable()
});

export const closeCashShiftSchema = z.object({
  corteId: z.string().min(1, 'corteId requerido'),
  conteoEfectivoReal: z.coerce.number().min(0, 'El conteo debe ser mayor o igual a 0'),
  notasCierre: z.string().optional().nullable()
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
