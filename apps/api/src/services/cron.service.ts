import { PrismaClient } from '@prisma/client';
import { WhatsAppService } from './whatsapp.service';
import { StripeBillingService } from './stripe.service';

/**
 * SYSTECH Studio - Background Task Scheduler (Cron Service)
 * Resolves findings A7 & A8:
 * - Automates 24h & 2h WhatsApp appointment reminders
 * - Automates trial expiration checks and grace period suspensions (Dunning)
 */
export class CronService {
  private static timerId: NodeJS.Timeout | null = null;
  private static isRunning = false;

  // P2.5 & P3.8: Observability and scheduler execution metrics
  public static metrics = {
    lastTick: null as Date | null,
    lastDurationMs: 0,
    lastStatus: 'IDLE' as 'IDLE' | 'RUNNING' | 'SUCCESS' | 'ERROR',
    lastError: null as string | null,
    totalTicks: 0,
    lastSummary: {} as any
  };

  static init(prisma: PrismaClient, intervalMs = 10 * 60 * 1000) {
    if (process.env.NODE_ENV === 'test') {
      // In test mode, don't auto-schedule to keep test assertions isolated
      return;
    }

    if (this.timerId) {
      clearInterval(this.timerId);
    }

    console.log(`⏱️ [Scheduler] Iniciando servicio de tareas programadas (cada ${Math.round(intervalMs / 60000)} min)...`);

    // Run first tick after 10 seconds of startup
    setTimeout(() => {
      this.tick(prisma, intervalMs).catch(err => console.error('[Scheduler Error Inicial]:', err));
    }, 10000);

    // Periodic execution
    this.timerId = setInterval(() => {
      this.tick(prisma, intervalMs).catch(err => console.error('[Scheduler Error]:', err));
    }, intervalMs);
  }

  static async tick(prisma: PrismaClient, intervalMs = 10 * 60 * 1000) {
    if (this.isRunning) return;

    // P2.5 FIX: Multi-instance distributed coordination check via Database
    // Prevents multiple replicas from executing identical cron tasks concurrently
    try {
      const lockThreshold = new Date(Date.now() - Math.min(intervalMs - 30000, 60000));
      const recentRun = await prisma.auditoriaLog.findFirst({
        where: {
          accion: 'CRON_SCHEDULER_TICK',
          fecha: { gte: lockThreshold }
        }
      });

      if (recentRun) {
        // Another replica or worker already ran recently
        return;
      }

      // Claim execution lock for this replica
      await prisma.auditoriaLog.create({
        data: {
          usuarioEmail: 'system@systech.local',
          accion: 'CRON_SCHEDULER_TICK',
          detalles: JSON.stringify({ pid: process.pid, timestamp: new Date().toISOString() })
        }
      });
    } catch (e) {
      // If DB error during lock claim, continue gracefully
    }

    this.isRunning = true;
    this.metrics.lastStatus = 'RUNNING';
    const startTime = Date.now();

    try {
      // 1. Process 24h and 2h WhatsApp appointment reminders
      const reminderResults = await WhatsAppService.procesarRecordatoriosAutomaticos(prisma);
      if (reminderResults.recordatorios24hEnviados > 0 || reminderResults.recordatorios2hEnviados > 0) {
        console.log(`🔔 [Scheduler] Recordatorios enviados: 24h=${reminderResults.recordatorios24hEnviados}, 2h=${reminderResults.recordatorios2hEnviados}`);
      }

      // 2. Process Trial expirations and Dunning grace period suspensions
      const dunningResults = await StripeBillingService.ejecutarDunning(prisma);
      if (dunningResults.trialsVencidos > 0 || dunningResults.suspendidos > 0) {
        console.log(`💳 [Scheduler] Dunning ejecutado: Vencidos=${dunningResults.trialsVencidos}, Suspendidos=${dunningResults.suspendidos}`);
      }

      this.metrics.lastTick = new Date();
      this.metrics.lastDurationMs = Date.now() - startTime;
      this.metrics.lastStatus = 'SUCCESS';
      this.metrics.lastError = null;
      this.metrics.totalTicks++;
      this.metrics.lastSummary = { reminderResults, dunningResults };
    } catch (error: any) {
      this.metrics.lastTick = new Date();
      this.metrics.lastDurationMs = Date.now() - startTime;
      this.metrics.lastStatus = 'ERROR';
      this.metrics.lastError = error?.message || String(error);
      console.error('❌ [Scheduler Exception]:', error?.message || error);
    } finally {
      this.isRunning = false;
    }
  }

  static stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      console.log('🛑 [Scheduler] Servicio detenido.');
    }
  }
}
