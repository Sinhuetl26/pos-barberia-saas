// ==========================================
// SYSTECH STUDIO - AUTH & ONBOARDING ROUTES
// ==========================================

import { Router } from 'express';
import { validateInitialSetup } from '../services/onboarding.service';
import { resolveScope } from '../services/authorization.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, JWT_SECRET, AuthenticatedRequest } from '../middleware/auth';
import { loginRateLimiter, registerRateLimiter, onboardingRateLimiter } from '../middleware/rateLimit';
import { loginSchema, registerSchema, validateBody } from '../validators/schemas';
import { getLicensePlan, licenseQuote, licenseTenantFields, isLicensePlan, withLicenseLock } from '../services/license-catalog.service';

import { accountSecurityRouter } from './account-security.routes';
import { tenantSettingsSchema, tenantWithPersonalization, normalizeBookingPersonalization } from '../services/booking-personalization.service';
import { queueAction, passwordValid, passwordMessage } from '../services/account-security.service';
const dummyPasswordHash = bcrypt.hashSync('unused-dummy-password-for-timing', 12);
export const authRouter = Router();
authRouter.use(accountSecurityRouter);

// Login endpoint (P1.6 FIX: Rate limited against brute-force)
authRouter.post('/login', loginRateLimiter, validateBody(loginSchema), async (req, res) => {
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
      await bcrypt.compare(password, dummyPasswordHash);
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', error: 'Credenciales inválidas' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword || !user.activo || user.eliminadoEn || user.invitationPending) {
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { sub: user.id, tid: user.tenantId, rol: user.rol, email: user.email, sv: user.sessionVersion },
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

    const access = await resolveScope(user);
    // M2 FIX: Sanitize tenant response to only needed fields
    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        emailVerifiedAt: user.emailVerifiedAt, verificationRequired: user.verificationRequired || process.env.NODE_ENV === 'production',
        telefono: user.telefono,
        sucursalId: user.sucursalId,
        barberoId: user.barberoId,
        tenantId: user.tenantId
      },
      tenant: {
        id: user.tenant.id,
        nombre: user.tenant.nombre,
        slug: user.tenant.slug,
        plan: user.tenant.plan,
        estado: user.tenant.estado,
        telefono: user.tenant.telefono,
        emailContacto: user.tenant.emailContacto,
        direccion: user.tenant.direccion,
        logoUrl: user.tenant.logoUrl,
        slogan: user.tenant.slogan,
        descripcion: user.tenant.descripcion,
        portadaUrl: user.tenant.portadaUrl,
        instagram: user.tenant.instagram,
        facebook: user.tenant.facebook,
        tiktok: user.tenant.tiktok,
        whatsappPublico: user.tenant.whatsappPublico,
        personalizacionWeb: normalizeBookingPersonalization((user.tenant as any).personalizacionWeb)
      },
      sucursales: user.tenant.sucursales.filter(b => !b.eliminadoEn && (access.branchIds === null || access.branchIds.includes(b.id)))
    });
  } catch (error) {
    console.error('AUTH_OPERATION_FAILED');
    res.status(500).json({ code: 'SERVER_ERROR', error: 'Error al procesar inicio de sesión' });
  }
});

// Self-service register endpoint (P1.6 FIX: Rate limited against registration abuse)
authRouter.post('/register', registerRateLimiter, validateBody(registerSchema), async (req, res) => {
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

    const selectedPlan = getLicensePlan(plan).code;
    const monto = licenseQuote(selectedPlan).totalMxn;

    const dbPlan = await prisma.plan.findUnique({ where: { codigo: selectedPlan } });
    const passwordHash = await bcrypt.hash(password, 12); // A13 FIX: Async bcrypt with 12 rounds

    // Execute complete onboarding atomically in a single transaction (M7)
    const { tenant, user, sucursal } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          nombre: nombreBarberia.trim(),
          slug: uniqueSlug,
          planId: dbPlan?.id || null,
          estado: 'ACTIVO',
          emailContacto: cleanEmail,
          telefono: telefono || null,
          direccion: direccion || '',
          ...licenseTenantFields(selectedPlan)
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
          direccion: direccion || null,
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
          verificationRequired: true,
          rol: 'DUENO',
          telefono: telefono || null,
          sucursalId: sucursal.id
        }
      });

      await tx.auditoriaLog.create({
        data: {
          tenantId: tenant.id,
          usuarioEmail: cleanEmail,
          accion: 'REGISTRO_NUEVA_BARBERIA',
          detalles: `Registro de barbería ${tenant.nombre} con plan ${selectedPlan}. Slug: /${tenant.slug}`
        }
      });

      await queueAction(tx, user.id, 'VERIFY');
      return { tenant, user, sucursal };
    });

    const token = jwt.sign(
      { sub: user.id, tid: tenant.id, rol: user.rol, email: user.email, sv: user.sessionVersion },
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
        emailVerifiedAt: user.emailVerifiedAt, verificationRequired: user.verificationRequired || process.env.NODE_ENV === 'production',
        telefono: user.telefono,
        sucursalId: user.sucursalId,
        tenantId: tenant.id
      },
      tenant: {
        id: tenant.id,
        nombre: tenant.nombre,
        slug: tenant.slug,
        plan: tenant.plan,
        estado: tenant.estado,
        personalizacionWeb: normalizeBookingPersonalization((tenant as any).personalizacionWeb)
      },
      sucursales: [sucursal]
    });
  } catch (error) {
    console.error('AUTH_OPERATION_FAILED');
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
          barberoId: true,
          emailVerifiedAt: true, verificationRequired: true,
          tenantId: true
        }
      });
    }

    res.json({ user: user ? { ...user, verificationRequired: user.verificationRequired || process.env.NODE_ENV === 'production', branchIds: req.ctx!.branchIds, barberoId: req.ctx!.barberoId } : null, tenant: tenant ? tenantWithPersonalization(tenant) : null });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sesión' });
  }
});

// Update Tenant Settings (P1.6 FIX: requireRole DUENO, GERENTE)
authRouter.put('/tenant/settings', requireAuth, requireRole('DUENO'), validateBody(tenantSettingsSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const {
      nombre,
      telefono,
      emailContacto,
      direccion,
      logoUrl,
      slug,
      slogan,
      descripcion,
      portadaUrl,
      instagram,
      facebook,
      tiktok,
      whatsappPublico,
      personalizacionWeb
    } = req.body;

    const dataToUpdate: any = {};
    if (nombre) dataToUpdate.nombre = nombre;
    if (telefono !== undefined) dataToUpdate.telefono = telefono;
    if (emailContacto !== undefined) dataToUpdate.emailContacto = emailContacto;
    if (direccion !== undefined) dataToUpdate.direccion = direccion;
    if (logoUrl !== undefined) dataToUpdate.logoUrl = logoUrl;
    if (slogan !== undefined) dataToUpdate.slogan = slogan;
    if (descripcion !== undefined) dataToUpdate.descripcion = descripcion;
    if (portadaUrl !== undefined) dataToUpdate.portadaUrl = portadaUrl;
    if (instagram !== undefined) dataToUpdate.instagram = instagram;
    if (facebook !== undefined) dataToUpdate.facebook = facebook;
    if (tiktok !== undefined) dataToUpdate.tiktok = tiktok;
    if (whatsappPublico !== undefined) dataToUpdate.whatsappPublico = whatsappPublico;
    if (slug) dataToUpdate.slug = slug;

    // Lock this tenant before reading JSON so simultaneous partial saves do not lose each other's options.
    const updated = await withLicenseLock(tenantId, async tx => {
      const current = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
      if (personalizacionWeb?.descripcionesServicios) {
        const ids = Object.keys(personalizacionWeb.descripcionesServicios);
        const owned = await tx.producto.count({ where: { id: { in: ids }, tenantId, tipo: 'SERVICIO' } });
        if (owned !== ids.length) throw Object.assign(new Error('Las descripciones deben corresponder a servicios de tu barbería.'), { statusCode: 400 });
      }
      if (personalizacionWeb !== undefined) dataToUpdate.personalizacionWeb = JSON.stringify({
        ...normalizeBookingPersonalization((current as any).personalizacionWeb), ...personalizacionWeb
      });
      const tenant = await tx.tenant.update({
        where: { id: tenantId }, data: dataToUpdate,
        include: { suscripcion: true, sucursales: true }
      });
      await tx.auditoriaLog.create({ data: {
        tenantId, usuarioEmail: req.ctx!.email, accion: 'CONFIGURACION_ACTUALIZADA',
        detalles: `Campos actualizados: ${Object.keys(dataToUpdate).sort().join(', ')}`
      } });
      return tenant;
    });

    res.json(tenantWithPersonalization(updated));
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(409).json({ code: 'SLUG_ALREADY_EXISTS', error: 'Este enlace ya pertenece a otra barbería. Elige uno diferente.' });
    if (error?.statusCode === 400) return res.status(400).json({ error: error.message });
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

// Setup Wizard endpoint (P1.6 FIX: Rate limited against automated spam setups)
authRouter.post('/onboarding/setup', onboardingRateLimiter, async (req, res) => {
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
      nombreBarbero,
      comisionServicios = 50,
      comisionProductosPct = req.body.comisionProductos ?? 10
    } = req.body;

    if (!nombreBarberia || typeof nombreBarberia !== 'string' || !nombreBarberia.trim()) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'El nombre de la barbería es obligatorio' });
    }

    if (!emailDueno || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDueno.trim())) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Correo electrónico del dueño inválido' });
    }

    if (!passwordValid(passwordDueno)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', error: passwordMessage });
    }

    if (!nombreDueno || typeof nombreDueno !== 'string' || !nombreDueno.trim()) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'El nombre del dueño es obligatorio' });
    }

    const setup=validateInitialSetup(req.body);
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

    if (!isLicensePlan(plan)) return res.status(400).json({ code: 'INVALID_LICENSE_PLAN', error: 'Plan inválido.' });
    const dbPlan = await prisma.plan.findUnique({ where: { codigo: plan } });
    const passwordHash = await bcrypt.hash(passwordDueno, 12);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          nombre: nombreBarberia.trim(),
          slug,
          planId: dbPlan?.id || null,
          estado: 'ACTIVO',
          telefono: telefono || null,
          emailContacto: cleanEmail,
          direccion: direccionSucursal || null,
          ...licenseTenantFields(plan)
        }
      });

      await tx.suscripcion.create({
        data: {
          tenantId: tenant.id,
          montoMensual: licenseQuote(plan).totalMxn,
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
          horarioApertura:setup.horarioApertura,
          horarioCierre:setup.horarioCierre,
          zonaHoraria:setup.zonaHoraria,
          diasLaborales:setup.diasLaborales,
          configuradaEn:new Date()
        }
      });

      const dueno = await tx.usuario.create({
        data: {
          tenantId: tenant.id,
          nombre: nombreDueno.trim(),
          email: cleanEmail,
          passwordHash,
          verificationRequired: true,
          rol: 'DUENO',
          telefono: telefono || null,
          sucursalId: sucursal.id
        }
      });

      await queueAction(tx, dueno.id, 'VERIFY');
      const barbero = setup.nombreBarbero ? await tx.barbero.create({
        data: {
          sucursalId: sucursal.id,
          nombre: setup.nombreBarbero,
          comisionServiciosPct: setup.comisionServicios,
          comisionProductosPct: setup.comisionProductosPct,
          horarioInicio: horarioApertura,
          horarioFin: horarioCierre,
          diasDescanso:setup.diasDescanso
        }
      }) : null;

      for (const serv of setup.serviciosSeleccionados) {
        await tx.producto.create({
          data: {
            tenantId: tenant.id,
            sucursalId: sucursal.id,
            nombre: serv.nombre || 'Servicio',
            tipo: 'SERVICIO',
            categoria: serv.categoria || 'Cortes',
            duracionMinutos: serv.duracionMinutos,
            precioVenta: serv.precioVenta,
            costo: Number(serv.costo) || 0,
            stockActual: 0,
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
        barbero: barbero ? {id:barbero.id,nombre:barbero.nombre} : null
      };
    });

    res.json({
      success: true,
      message: 'Barbería configurada con éxito',
      ...result,
      publicBookingUrl: `/b/${result.tenant.slug}`
    });
  } catch (error:any) {
    res.status(error.status||500).json({ error: error.status?error.message:'Error al completar la configuración inicial' });
  }
});
