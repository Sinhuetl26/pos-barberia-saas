export type JobProvider = 'MAIL' | 'WHATSAPP' | 'LICENSE';
export type DurableJobState = 'QUEUED' | 'RETRY' | 'RUNNING' | 'SUCCEEDED' | 'ACCEPTED' | 'NOT_CONFIGURED' | 'CANCELED' | 'UNCERTAIN' | 'EXPIRED' | 'FAILED';

export interface DurableJob {
  id: string;
  kind: string;
  provider: JobProvider;
  state: DurableJobState;
  attempts: number;
  maxAttempts: number;
  lastCode: string | null;
  availableAt: string;
  expiresAt: string;
  completedAt: string | null;
}

export interface DurableJobsStatus {
  workerAvailable: boolean;
  pendingActions: number;
  providers: { provider: JobProvider; paused: boolean }[];
  deliveryPolicy: string;
}
