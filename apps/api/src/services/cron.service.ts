import { PrismaClient } from '@prisma/client';
import { scheduleJobs } from './job-scheduler.service';

// Compatibility facade: materializes durable intentions only. HTTP imports start no timers.
export class CronService {
  static init(_prisma: PrismaClient) { /* Start npm run worker --workspace=@systech/api separately. */ }
  static async tick(_prisma: PrismaClient) { return scheduleJobs(); }
  static stop() { /* No HTTP interval or startup timeout remains. */ }
}
