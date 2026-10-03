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
      this.tick(prisma).catch(err => console.error('[Scheduler Error Inicial]:', err));
    }, 10000);

    // Periodic execution
    this.timerId = setInterval(() => {
      this.tick(prisma).catch(err => console.error('[Scheduler Error]:', err));
    }, intervalMs);
  }

  static async tick(prisma: PrismaClient) {
    if (this.isRunning) return;
    this.isRunning = true;

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
    } catch (error: any) {
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
