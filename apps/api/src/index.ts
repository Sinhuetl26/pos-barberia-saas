// ======================================================================
// SYSTECH STUDIO - API SERVER (MODULAR PRODUCTION ARCHITECTURE)
// Multi-Tenant SaaS Platform for Barbershops
// ======================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from '@systech/database';

// Modular Route Handlers
import { authRouter } from './routes/auth.routes';
import { adminRouter } from './routes/admin.routes';
import { citasRouter } from './routes/citas.routes';
import { publicRouter } from './routes/public.routes';
import { posRouter } from './routes/pos.routes';
import { barberosRouter } from './routes/barberos.routes';
import { comisionesRouter } from './routes/comisiones.routes';
import { bloqueosRouter } from './routes/bloqueos.routes';
import { cortesRouter } from './routes/cortes.routes';
import { inventarioRouter } from './routes/inventario.routes';
import { notificacionesRouter } from './routes/notificaciones.routes';
import { reportesRouter } from './routes/reportes.routes';
import { suscripcionRouter } from './routes/suscripcion.routes';
import { sucursalesRouter } from './routes/sucursales.routes';
import { clientesRouter } from './routes/clientes.routes';
import { CronService } from './services/cron.service';

const app = express();
const port = process.env.PORT || 3001;
const CORS_ORIGINS = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:5173'];

// Security & Parsing Middlewares
app.use(helmet());
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json({
  limit: '100kb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// --- HEALTH CHECK ---
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      service: 'SYSTECH API Multi-Tenant',
      version: '1.2.0',
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date()
    });
  } catch (err) {
    res.status(503).json({ status: 'error', error: 'Base de datos no disponible' });
  }
});

// --- MOUNT MODULAR API ROUTERS ---
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/citas', citasRouter);
app.use('/api/public', publicRouter);
app.use('/api/ventas', posRouter);
app.use('/api/barberos', barberosRouter);
app.use('/api/comisiones', comisionesRouter);
app.use('/api/bloqueos', bloqueosRouter);
app.use('/api/cortes-caja', cortesRouter);
app.use('/api', inventarioRouter); // /api/productos & /api/inventario/*
app.use('/api/notificaciones', notificacionesRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/suscripcion', suscripcionRouter);
app.use('/api/sucursales', sucursalesRouter);
app.use('/api/clientes', clientesRouter);

// Backwards compatibility mappings
app.use('/api/onboarding', authRouter); // /api/onboarding/templates & /api/onboarding/setup
app.use('/api/tenant', authRouter);     // /api/tenant/settings

// 404 Route Not Found Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    code: 'ROUTE_NOT_FOUND',
    error: `Ruta ${req.method} ${req.baseUrl} no encontrada en la API de SYSTECH`
  });
});

// Centralized Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  res.status(status).json({
    code: err.code || 'SERVER_ERROR',
    error: isProd ? 'Ocurrió un error inesperado en el servidor' : (err.message || 'Error interno')
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`SYSTECH API Multi-Tenant (Modular Architecture) listening on port ${port}`);
    // A7 & A8: Start Background Scheduler for reminders and dunning
    CronService.init(prisma);
  });
}

export default app;
