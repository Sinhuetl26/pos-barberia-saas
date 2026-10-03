// ======================================================================
// SYSTECH STUDIO - BOOKING & AGENDA SERVICE (FASE 3 PRODUCT SUITE)
// Multi-service duration/pricing, Buffer Times, Secure Token Cancellation,
// Authoritative Availability & Waitlist Processing
// ======================================================================

import crypto from 'crypto';

export interface AppointmentSlotItem {
  fechaHora: Date | string;
  duracionMinutos: number;
  bufferMinutos?: number;
  estado?: string;
}

export interface ScheduleBlockItem {
  fechaInicio: Date | string;
  fechaFin: Date | string;
}

export interface TimeSlot {
  hora: string;
  disponible: boolean;
  motivo?: string;
}

export interface ServiceItemInput {
  id: string;
  nombre: string;
  duracionMinutos: number;
  precioVenta: number | string;
}

/**
 * Checks if a time interval [slotStart, slotEnd] collides with existing appointments (including buffer) or blocks.
 */
export function hasTimeConflict(
  slotStart: Date,
  slotEnd: Date,
  citas: AppointmentSlotItem[],
  bloqueos: ScheduleBlockItem[],
  defaultBufferMinutos: number = 10
): boolean {
  // Check active appointment collisions
  const hasCitaConflict = citas.some(c => {
    // Cancelled or no-show appointments do not block the slot
    if (c.estado === 'CANCELADA' || c.estado === 'NO_SHOW') return false;

    const cStart = new Date(c.fechaHora);
    const buffer = typeof c.bufferMinutos === 'number' ? c.bufferMinutos : defaultBufferMinutos;
    const cEnd = new Date(cStart.getTime() + (c.duracionMinutos + buffer) * 60000);

    return slotStart < cEnd && slotEnd > cStart;
  });

  if (hasCitaConflict) return true;

  // Check schedule blocks collisions
  const hasBloqueoConflict = bloqueos.some(b => {
    const bStart = new Date(b.fechaInicio);
    const bEnd = new Date(b.fechaFin);
    return slotStart < bEnd && slotEnd > bStart;
  });

  return hasBloqueoConflict;
}

/**
 * Pure slot generator with branch hours, buffer times, and minimum lead time
 */
export function generateDayTimeSlots(
  targetDate: Date,
  horarioApertura: string = '09:00',
  horarioCierre: string = '20:00',
  duracionMinutos: number = 30,
  stepMinutes: number = 30,
  citas: AppointmentSlotItem[] = [],
  bloqueos: ScheduleBlockItem[] = [],
  defaultBufferMinutos: number = 10,
  minLeadMinutes: number = 30
): TimeSlot[] {
  const [openH, openM] = (horarioApertura || '09:00').split(':').map(Number);
  const [closeH, closeM] = (horarioCierre || '20:00').split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const slots: TimeSlot[] = [];
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDate();

  const now = new Date();
  const minBookingTime = new Date(now.getTime() + minLeadMinutes * 60000);

  for (let m = openMinutes; m + duracionMinutos <= closeMinutes; m += stepMinutes) {
    const slotHour = Math.floor(m / 60);
    const slotMinute = m % 60;
    const timeStr = `${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`;

    const slotStart = new Date(year, month, day, slotHour, slotMinute);
    const slotEnd = new Date(slotStart.getTime() + duracionMinutos * 60000);

    // Check if slot is in the past or within minimum lead time
    if (slotStart < minBookingTime) {
      slots.push({
        hora: timeStr,
        disponible: false,
        motivo: 'HORARIO_PASADO'
      });
      continue;
    }

    const isOccupied = hasTimeConflict(slotStart, slotEnd, citas, bloqueos, defaultBufferMinutos);

    slots.push({
      hora: timeStr,
      disponible: !isOccupied,
      motivo: isOccupied ? 'OCUPADO' : undefined
    });
  }

  return slots;
}

/**
 * Calculates sum of durations and prices for multi-service appointments
 */
export function calculateMultiServiceTotals(services: ServiceItemInput[]): {
  totalMinutos: number;
  totalPrecio: number;
  serviciosResumen: Array<{ id: string; nombre: string; duracion: number; precio: number }>;
} {
  let totalMinutos = 0;
  let totalPrecio = 0;

  const serviciosResumen = services.map(s => {
    const dur = s.duracionMinutos || 30;
    const prec = Number(s.precioVenta) || 0;
    totalMinutos += dur;
    totalPrecio += prec;
    return {
      id: s.id,
      nombre: s.nombre,
      duracion: dur,
      precio: prec
    };
  });

  return {
    totalMinutos: Math.max(15, totalMinutos),
    totalPrecio: Math.max(0, totalPrecio),
    serviciosResumen
  };
}

/**
 * Validates cancellation policy (e.g. at least 2 hours before appointment)
 */
export function canCancelAppointment(
  fechaHoraCita: Date | string,
  minHoursNotice: number = 2
): { allowed: boolean; reason?: string } {
  const appointmentTime = new Date(fechaHoraCita).getTime();
  const now = Date.now();
  const diffHours = (appointmentTime - now) / (1000 * 60 * 60);

  if (diffHours < 0) {
    return {
      allowed: false,
      reason: 'No se puede cancelar una cita que ya ha pasado.'
    };
  }

  if (diffHours < minHoursNotice) {
    return {
      allowed: false,
      reason: `La política de la barbería requiere al menos ${minHoursNotice} horas de anticipación para cancelaciones en línea.`
    };
  }

  return { allowed: true };
}

/**
 * Generates cryptographically secure high-entropy folio (RES-XXXXXXXXXXXXXXXX, 64-bit random)
 */
export function generateBookingFolio(): string {
  const hex = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `RES-${hex}`;
}

/**
 * Generates cryptographically secure long cancellation token (64 hex characters)
 */
export function generateSecureCancellationKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
