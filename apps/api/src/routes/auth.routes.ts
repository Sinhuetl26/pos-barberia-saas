// ==========================================
// SYSTECH STUDIO - AUTH & ONBOARDING ROUTES
// ==========================================

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, JWT_SECRET, AuthenticatedRequest } from '../middleware/auth';
import { loginSchema, registerSchema, validateBody } from '../validators/schemas';

export const authRouter = Router();

// Login endpoint
authRouter.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.usuario.findUnique({
      where: { email: cleanEmail },
      include: {
        tenant: {
          include: {
            suscripcion: true,
            sucursales: true
          }
        }
      }
    });

    // A13 FIX: Constant-time comparison to prevent timing enumeration
    if (!user) {
      await bcrypt.compare(password, '$2a$12$e8uqgXhWJn5Qn5W35VqN0OX8rK8xQ1dE3/J1fQn9j1WnK8rK8xQ1d');
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', error: 'Credenciales inválidas' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword || !user.activo || user.eliminadoEn) {
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { sub: user.id, tid: user.tenantId, rol: user.rol, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await prisma.auditoriaLog.create({
      data: {
        tenantId: user.tenantId,
        usuarioEmail: user.email,
        accion: 'INICIO_SESION',
        detalles: `Inicio de sesión exitoso con rol ${user.rol}`
      }
    }).catch(() => {});

    // M2 FIX: Sanitize tenant response to only needed fields
    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        telefono: user.telefono,
        sucursalId: user.sucursalId,
        tenantId: user.tenantId
      },
      tenant: {
        id: user.tenant.id,
        nombre: user.tenant.nombre,
        slug: user.tenant.slug,
        plan: user.tenant.plan,
        estado: user.tenant.estado
      },
      sucursales: user.tenant.sucursales
    });
  } catch (error) {
    console.error('Error en /auth/login:', error);
    res.status(500).json({ code: 'SERVER_ERROR', error: 'Error al procesar inicio de sesión' });
  }
});

// Self-service register endpoint
authRouter.post('/register', validateBody(registerSchema), async (req, res) => {
  try {
    const { nombreBarberia, nombreDueno, email, password, telefono, direccion, plan = 'PRO' } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await prisma.usuario.findUnique({
      where: { email: cleanEmail }
    });

    if (existingUser) {
      return res.status(409).json({ code: 'EMAIL_ALREADY_EXISTS', error: 'Ya existe una cuenta con este correo electrónico.' });
    }

    let baseSlug = nombreBarberia
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!baseSlug) baseSlug = 'barberia';

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await prisma.tenant.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }

    const selectedPlan = plan.toUpperCase() === 'PRO' ? 'PRO' : 'BASICO';
    const monto = selectedPlan === 'PRO' ? 999 : 499;

    const dbPlan = await prisma.plan.findUnique({ where: { codigo: selectedPlan } });
    const passwordHash = await bcrypt.hash(password, 12); // A13 FIX: Async bcrypt with 12 rounds

    // Execute complete onboarding atomically in a single transaction (M7)
    const { tenant, user, sucursal } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          nombre: nombreBarberia.trim(),
          slug: uniqueSlug,
          plan: selectedPlan,
          planId: dbPlan?.id || null,
          estado: 'ACTIVO',
          emailContacto: cleanEmail,
          telefono: telefono || null,
          direccion: direccion || 'Matriz Principal',
          limiteSucursales: selectedPlan === 'PRO' ? 999 : 1,
          limiteBarberos: selectedPlan === 'PRO' ? 999 : 3
        }
      });

      await tx.suscripcion.create({
        data: {
          tenantId: tenant.id,
          montoMensual: monto,
          estadoPago: 'active',
          diasGracia: 3,
          fechaUltimoCobro: new Date(),
          fechaProximoCobro: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        }
      });

      const sucursal = await tx.sucursal.create({
        data: {
          tenantId: tenant.id,
          nombre: 'Matriz Principal',
          direccion: direccion || 'Dirección Comercial',
          telefono: telefono || null,
          horarioApertura: '09:00',
          horarioCierre: '20:00',
          diasLaborales: 'Lunes a Sábado'
        }
      });

      const user = await tx.usuario.create({
        data: {
          tenantId: tenant.id,
          nombre: nombreDueno.trim(),
          email: cleanEmail,
          passwordHash,
          rol: 'DUENO',
          telefono: telefono || null,
          sucursalId: sucursal.id
        }
      });

      await tx.barbero.create({
        data: {
          sucursalId: sucursal.id,
          nombre: nombreDueno.trim(),
          email: cleanEmail,
          telefono: telefono || null,
          comisionServiciosPct: 50.0,
          comisionProductosPct: 10.0,
          diasDescanso: 'Domingo',
          horarioInicio: '09:00',
          horarioFin: '20:00'
        }
      });

      await tx.producto.createMany({
        data: [
          {
            tenantId: tenant.id,
            sucursalId: sucursal.id,
            nombre: 'Corte Clásico Caballero',
            tipo: 'SERVICIO',
            categoria: 'Cortes',
            duracionMinutos: 35,
            precioVenta: 250,
            costo: 0,
            stockActual: 9999,
            stockMinimo: 0,
            sku: 'SRV-001'
          },
          {
            tenantId: tenant.id,
            sucursalId: sucursal.id,
            nombre: 'Perfilado de Barba Ritual',
            tipo: 'SERVICIO',
            categoria: 'Barba',
            duracionMinutos: 25,
            precioVenta: 180,
            costo: 0,
            stockActual: 9999,
            stockMinimo: 0,
            sku: 'SRV-002'
          },
          {
            tenantId: tenant.id,
            sucursalId: sucursal.id,
            nombre: 'Pomada / Cera Capilar Mate 100ml',
            tipo: 'PRODUCTO',
            categoria: 'Styling',
            duracionMinutos: 0,
            precioVenta: 220,
            costo: 110,
            stockActual: 24,
            stockMinimo: 5,
            sku: 'PRD-001'
          }
        ]
      });

      await tx.auditoriaLog.create({
        data: {
          tenantId: tenant.id,
          usuarioEmail: cleanEmail,
          accion: 'REGISTRO_NUEVA_BARBERIA',
          detalles: `Registro de barbería ${tenant.nombre} con plan ${selectedPlan}. Slug: /${tenant.slug}`
        }
      });

      return { tenant, user, sucursal };
    });

    const token = jwt.sign(
      { sub: user.id, tid: tenant.id, rol: user.rol, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        telefono: user.telefono,
        sucursalId: user.sucursalId,
        tenantId: tenant.id
      },
      tenant: {
        id: tenant.id,
        nombre: tenant.nombre,
        slug: tenant.slug,
        plan: tenant.plan,
        estado: tenant.estado
      },
      sucursales: [sucursal]
    });
  } catch (error) {
    console.error('Error en /auth/register:', error);
    res.status(500).json({ code: 'SERVER_ERROR', error: 'Error al registrar la nueva barbería' });
  }
});

// Session validation endpoint
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const tenant = req.ctx?.tenant;
    const userId = req.ctx?.userId;

    let user = null;
    if (userId) {
      user = await prisma.usuario.findUnique({
        where: { id: userId },
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          telefono: true,
          sucursalId: true,
          tenantId: true
        }
      });
    }

    res.json({ user, tenant });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sesión' });
  }
});

// Update Tenant Settings (P1.6 FIX: requireRole DUENO, GERENTE)
authRouter.put('/tenant/settings', requireAuth, requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { nombre, telefono, emailContacto, direccion, logoUrl, slug } = req.body;

    const dataToUpdate: any = {};
    if (nombre) dataToUpdate.nombre = nombre;
    if (telefono !== undefined) dataToUpdate.telefono = telefono;
    if (emailContacto !== undefined) dataToUpdate.emailContacto = emailContacto;
    if (direccion !== undefined) dataToUpdate.direccion = direccion;
    if (logoUrl !== undefined) dataToUpdate.logoUrl = logoUrl;
    if (slug) {
      const existing = await prisma.tenant.findUnique({ where: { slug } });
      if (!existing || existing.id === tenantId) {
        dataToUpdate.slug = slug;
      }
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: dataToUpdate,
      include: { suscripcion: true, sucursales: true }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar configuración de barbería' });
  }
});

// Onboarding templates
authRouter.get('/onboarding/templates', (req, res) => {
  const templates = [
    { nombre: 'Corte de Cabello Clásico', categoria: 'Cortes', duracionMinutos: 35, precioVenta: 250, costo: 0 },
    { nombre: 'Fade & Degradado Moderno', categoria: 'Cortes', duracionMinutos: 45, precioVenta: 300, costo: 0 },
    { nombre: 'Ritual y Arreglo de Barba', categoria: 'Barba', duracionMinutos: 30, precioVenta: 200, costo: 0 },
    { nombre: 'Combo Completo: Corte + Barba', categoria: 'Combos', duracionMinutos: 60, precioVenta: 420, costo: 0 },
    { nombre: 'Camuflaje de Canas / Tinte Barba', categoria: 'Tratamiento', duracionMinutos: 40, precioVenta: 320, costo: 40 },
    { nombre: 'Mascarilla Facial Limpieza Profunda', categoria: 'Tratamiento', duracionMinutos: 25, precioVenta: 180, costo: 25 }
  ];
  res.json(templates);
});

// Setup Wizard endpoint (P0.2 FIX: Strict validation, strong password requirement, async bcrypt, and response sanitization)
authRouter.post('/onboarding/setup', async (req, res) => {
  try {
    const {
      nombreBarberia,
      telefono,
      emailDueno,
      passwordDueno,
      nombreDueno,
      nombreSucursal,
      direccionSucursal,
      horarioApertura = '09:00',
      horarioCierre = '20:00',
      plan = 'BASICO',
      serviciosSeleccionados = [],
      nombreBarbero = 'Barbero Principal',
      comisionServicios = 50,
      comisionProductosPct = 10
    } = req.body;

    if (!nombreBarberia || typeof nombreBarberia !== 'string' || !nombreBarberia.trim()) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'El nombre de la barbería es obligatorio' });
    }

    if (!emailDueno || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDueno.trim())) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Correo electrónico del dueño inválido' });
    }

    if (!passwordDueno || typeof passwordDueno !== 'string' || passwordDueno.length < 8) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'La contraseña es obligatoria y debe tener al menos 8 caracteres' });
    }

    if (!nombreDueno || typeof nombreDueno !== 'string' || !nombreDueno.trim()) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'El nombre del dueño es obligatorio' });
    }

    const cleanEmail = emailDueno.trim().toLowerCase();
    const existing = await prisma.usuario.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return res.status(409).json({ code: 'EMAIL_ALREADY_EXISTS', error: 'Ya existe una cuenta registrada con este correo electrónico' });
    }

    const baseSlug = nombreBarberia
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;

    const dbPlan = await prisma.plan.findUnique({ where: { codigo: plan } });
    const passwordHash = await bcrypt.hash(passwordDueno, 12);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          nombre: nombreBarberia.trim(),
          slug,
          plan,
          planId: dbPlan?.id || null,
          estado: 'ACTIVO',
          telefono: telefono || null,
          emailContacto: cleanEmail,
          direccion: direccionSucursal || null,
          limiteSucursales: plan === 'PRO' ? 999 : 1,
          limiteBarberos: plan === 'PRO' ? 999 : 3
        }
      });

      await tx.suscripcion.create({
        data: {
          tenantId: tenant.id,
          montoMensual: plan === 'PRO' ? 999 : 499,
          estadoPago: 'active',
          fechaProximoCobro: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        }
      });

      const sucursal = await tx.sucursal.create({
        data: {
          tenantId: tenant.id,
          nombre: nombreSucursal ? nombreSucursal.trim() : 'Matriz Principal',
          direccion: direccionSucursal || null,
          telefono: telefono || null,
          horarioApertura,
          horarioCierre
        }
      });

      const dueno = await tx.usuario.create({
        data: {
          tenantId: tenant.id,
          nombre: nombreDueno.trim(),
          email: cleanEmail,
          passwordHash,
          rol: 'DUENO',
          telefono: telefono || null,
          sucursalId: sucursal.id
        }
      });

      const barbero = await tx.barbero.create({
        data: {
          sucursalId: sucursal.id,
          nombre: nombreBarbero ? nombreBarbero.trim() : nombreDueno.trim(),
          comisionServiciosPct: Number(comisionServicios) || 50,
          comisionProductosPct: Number(comisionProductosPct) || 10,
          horarioInicio: horarioApertura,
          horarioFin: horarioCierre
        }
      });

      for (const serv of (Array.isArray(serviciosSeleccionados) ? serviciosSeleccionados : [])) {
        await tx.producto.create({
          data: {
            tenantId: tenant.id,
            sucursalId: sucursal.id,
            nombre: serv.nombre || 'Servicio',
            tipo: 'SERVICIO',
            categoria: serv.categoria || 'Cortes',
            duracionMinutos: Number(serv.duracionMinutos) || 30,
            precioVenta: Number(serv.precioVenta) || 250,
            costo: Number(serv.costo) || 0,
            stockActual: 9999,
            stockMinimo: 0,
            sku: `SRV-${Math.floor(100 + Math.random() * 900)}`
          }
        });
      }

      await tx.auditoriaLog.create({
        data: {
          tenantId: tenant.id,
          usuarioEmail: cleanEmail,
          accion: 'ONBOARDING_COMPLETADO',
          detalles: `Configuración inicial completada. Plan: ${plan}`
        }
      });

      return {
        tenant: {
          id: tenant.id,
          nombre: tenant.nombre,
          slug: tenant.slug,
          plan: tenant.plan
        },
        sucursal: {
          id: sucursal.id,
          nombre: sucursal.nombre
        },
        dueno: {
          id: dueno.id,
          nombre: dueno.nombre,
          email: dueno.email,
          rol: dueno.rol
        },
        barbero: {
          id: barbero.id,
          nombre: barbero.nombre
        }
      };
    });

    res.json({
      success: true,
      message: 'Barbería configurada con éxito',
      ...result,
      publicBookingUrl: `/reservar/${result.tenant.slug}`
    });
  } catch (error) {
    console.error('Error en onboarding:', error);
    res.status(500).json({ error: 'Error al completar la configuración inicial' });
  }
});
