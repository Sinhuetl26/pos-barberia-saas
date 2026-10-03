// ======================================================================
// SYSTECH STUDIO - WHATSAPP BUSINESS & MESSAGING SERVICE
// Meta WhatsApp Cloud API, Quiet Hours, Opt-out (BAJA), and Honest Tracking
// ======================================================================

import { PrismaClient } from '@prisma/client';

export interface EnviarMensajeOptions {
  tenantId: string;
  destinatario: string; // Phone number or name
  mensaje: string;
  tipo: string; // CONFIRMACION_CITA, RECORDATORIO_24H, RECORDATORIO_2H, TICKET_DIGITAL, ALERTA_STOCK, etc.
  clienteId?: string;
  forzarHorario?: boolean; // Bypass quiet hours check for critical manual alerts
  sucursalZonaHoraria?: string;
}

export interface EnviarMensajeResultado {
  success: boolean;
  notificacionId?: string;
  estado: 'ENVIADO' | 'PENDIENTE' | 'LINK_GENERADO' | 'BLOQUEADO_HORARIO' | 'BLOQUEADO_OPTOUT' | 'FALLIDO';
  whatsappLink?: string;
  proveedor: 'META_CLOUD_API' | 'MANUAL_LINK';
  mensajeError?: string;
  metaMessageId?: string;
}

export class WhatsAppService {
  private static getApiToken(): string {
    return process.env.META_WA_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN || '';
  }

  private static getPhoneNumberId(): string {
    return process.env.META_WA_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  }

  /**
   * Cleans and normalizes phone number to international E.164 (Mexico 52 default)
   */
  static normalizarTelefono(telefono: string): string {
    const digits = telefono.replace(/[^0-9]/g, '');
    if (digits.length === 10) {
      return `52${digits}`;
    }
    if (digits.length === 12 && digits.startsWith('52')) {
      return digits;
    }
    if (digits.length === 13 && digits.startsWith('521')) {
      // Old Mexican mobile prefix 521 -> standardize to 52
      return `52${digits.substring(3)}`;
    }
    return digits;
  }

  /**
   * Checks quiet hours in the barbershop's timezone (Permitted: 08:00 to 22:00)
   */
  static esHorarioPermitido(fecha: Date = new Date(), zonaHoraria: string = 'America/Mexico_City'): {
    permitido: boolean;
    horaLocal: number;
    mensaje?: string;
  } {
    try {
      const horaStr = new Intl.DateTimeFormat('en-US', {
        timeZone: zonaHoraria,
        hour: 'numeric',
        hour12: false
      }).format(fecha);

      const horaLocal = parseInt(horaStr, 10);

      // Regulación: Permitido entre las 08:00 y las 22:00 hrs
      const dentroDeVentana = horaLocal >= 8 && horaLocal < 22;

      return {
        permitido: dentroDeVentana,
        horaLocal,
        mensaje: dentroDeVentana
          ? undefined
          : `Fuera del horario permitido para mensajería automática (${horaLocal}:00 hrs en ${zonaHoraria}). Ventana activa: 08:00 a 22:00.`
      };
    } catch {
      // Fallback
      const horaUtc = fecha.getUTCHours();
      const horaAproxCdmx = (horaUtc - 6 + 24) % 24;
      const dentroDeVentana = horaAproxCdmx >= 8 && horaAproxCdmx < 22;
      return { permitido: dentroDeVentana, horaLocal: horaAproxCdmx };
    }
  }

  /**
   * Checks client consent and opt-out status (LFPDPPP compliant)
   */
  static async verificarConsentimiento(
    tenantId: string,
    telefono: string,
    prisma: PrismaClient
  ): Promise<{ consent: boolean; motivo?: string }> {
    const telLimpio = this.normalizarTelefono(telefono);

    // Look for client by phone
    const cliente = await prisma.clienteFinal.findFirst({
      where: {
        tenantId,
        telefono: { contains: telLimpio.slice(-10) }
      },
      include: { consentimientos: true }
    });

    if (cliente) {
      const whatsappConsent = cliente.consentimientos.find(c => c.canal === 'WHATSAPP');
      if (whatsappConsent && !whatsappConsent.otorgado) {
        return {
          consent: false,
          motivo: 'El cliente solicitó BAJA o revocó su consentimiento para recibir mensajes por WhatsApp.'
        };
      }
    }

    return { consent: true };
  }

  /**
   * Records client opt-out (BAJA)
   */
  static async registrarOptOut(telefono: string, tenantId: string, prisma: PrismaClient) {
    const telLimpio = this.normalizarTelefono(telefono);
    const cliente = await prisma.clienteFinal.findFirst({
      where: {
        tenantId,
        telefono: { contains: telLimpio.slice(-10) }
      }
    });

    if (cliente) {
      await prisma.consentimientoCliente.upsert({
        where: { id: `consent_${cliente.id}_WHATSAPP` },
        create: {
          id: `consent_${cliente.id}_WHATSAPP`,
          tenantId,
          clienteId: cliente.id,
          canal: 'WHATSAPP',
          otorgado: false
        },
        update: {
          otorgado: false,
          fechaRegistro: new Date()
        }
      });
      return { success: true, message: 'Opt-out registrado exitosamente' };
    }

    return { success: false, message: 'Cliente no encontrado' };
  }

  /**
   * Core message sender with Meta Cloud API and honest manual wa.me fallback
   */
  static async enviarMensaje(
    options: EnviarMensajeOptions,
    prisma: PrismaClient
  ): Promise<EnviarMensajeResultado> {
    const {
      tenantId,
      destinatario,
      mensaje,
      tipo,
      forzarHorario = false,
      sucursalZonaHoraria = 'America/Mexico_City'
    } = options;

    const telNormalizado = this.normalizarTelefono(destinatario);
    const isPhoneNumber = telNormalizado.length >= 10;

    // 1. Check Quiet Hours (unless explicitly forced)
    if (!forzarHorario && isPhoneNumber) {
      const checkHorario = this.esHorarioPermitido(new Date(), sucursalZonaHoraria);
      if (!checkHorario.permitido) {
        // Log blocked notification
        const log = await prisma.notificacionLog.create({
          data: {
            tenantId,
            tipo,
            canal: 'WHATSAPP',
            destinatario: telNormalizado,
            mensaje,
            estado: 'PENDIENTE'
          }
        });

        return {
          success: false,
          notificacionId: log.id,
          estado: 'BLOQUEADO_HORARIO',
          proveedor: 'META_CLOUD_API',
          mensajeError: checkHorario.mensaje
        };
      }
    }

    // 2. Check Opt-Out Consent
    if (isPhoneNumber) {
      const consentCheck = await this.verificarConsentimiento(tenantId, telNormalizado, prisma);
      if (!consentCheck.consent) {
        const log = await prisma.notificacionLog.create({
          data: {
            tenantId,
            tipo,
            canal: 'WHATSAPP',
            destinatario: telNormalizado,
            mensaje: `[BLOQUEADO POR BAJA] ${mensaje}`,
            estado: 'FALLIDO'
          }
        });

        return {
          success: false,
          notificacionId: log.id,
          estado: 'BLOQUEADO_OPTOUT',
          proveedor: 'META_CLOUD_API',
          mensajeError: consentCheck.motivo
        };
      }
    }

    // 3. Generate direct WhatsApp link
    const whatsappLink = isPhoneNumber
      ? `https://wa.me/${telNormalizado}?text=${encodeURIComponent(mensaje)}`
      : undefined;

    // 4. If Meta Cloud API credentials are configured, send via Cloud API
    const apiToken = this.getApiToken();
    const phoneNumberId = this.getPhoneNumberId();
    const hasCloudApi = Boolean(apiToken && phoneNumberId);

    if (hasCloudApi && isPhoneNumber) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: telNormalizado,
              type: 'text',
              text: { preview_url: false, body: mensaje }
            })
          }
        );

        const data: any = await response.json();

        if (response.ok && data.messages?.[0]?.id) {
          const metaMessageId = data.messages[0].id;
          const log = await prisma.notificacionLog.create({
            data: {
              tenantId,
              tipo,
              canal: 'WHATSAPP',
              destinatario: telNormalizado,
              mensaje,
              estado: 'ENVIADO'
            }
          });

          return {
            success: true,
            notificacionId: log.id,
            estado: 'ENVIADO',
            proveedor: 'META_CLOUD_API',
            metaMessageId,
            whatsappLink
          };
        } else {
          // Cloud API returned error
          const errMsg = data.error?.message || 'Error de Meta Cloud API';
          const log = await prisma.notificacionLog.create({
            data: {
              tenantId,
              tipo,
              canal: 'WHATSAPP',
              destinatario: telNormalizado,
              mensaje,
              estado: 'FALLIDO'
            }
          });

          return {
            success: false,
            notificacionId: log.id,
            estado: 'FALLIDO',
            proveedor: 'META_CLOUD_API',
            mensajeError: errMsg,
            whatsappLink
          };
        }
      } catch (err: any) {
        const log = await prisma.notificacionLog.create({
          data: {
            tenantId,
            tipo,
            canal: 'WHATSAPP',
            destinatario: telNormalizado,
            mensaje,
            estado: 'FALLIDO'
          }
        });

        return {
          success: false,
          notificacionId: log.id,
          estado: 'FALLIDO',
          proveedor: 'META_CLOUD_API',
          mensajeError: err.message,
          whatsappLink
        };
      }
    }

    // 5. C9 FIX: Honest state - when Cloud API is not active, save LINK_GENERADO (not fake ENVIADO)
    const log = await prisma.notificacionLog.create({
      data: {
        tenantId,
        tipo,
        canal: 'WHATSAPP',
        destinatario: isPhoneNumber ? telNormalizado : destinatario,
        mensaje,
        estado: 'LINK_GENERADO'
      }
    });

    return {
      success: true,
      notificacionId: log.id,
      estado: 'LINK_GENERADO',
      proveedor: 'MANUAL_LINK',
      whatsappLink
    };
  }

  /**
   * Templates for appointments and receipts
   */
  static plantillas = {
    confirmacionCita: (data: {
      clienteNombre: string;
      barberoNombre: string;
      sucursalNombre: string;
      direccion?: string;
      fechaHora: string;
      codigoReserva: string;
    }) => {
      return [
        `💈 *CONFIRMACIÓN DE CITA - ${data.sucursalNombre.toUpperCase()}*`,
        `¡Hola ${data.clienteNombre}! Tu cita ha sido agendada con éxito.`,
        ``,
        `📅 *Fecha y Hora:* ${data.fechaHora}`,
        `✂️ *Barbero:* ${data.barberoNombre}`,
        `📍 *Ubicación:* ${data.direccion || data.sucursalNombre}`,
        `🔑 *Folio de Reserva:* ${data.codigoReserva}`,
        ``,
        `_Si necesitas reprogramar o cancelar, responde a este mensaje o presenta tu folio._`,
        `Para darte de baja de recordatorios responde BAJA.`
      ].join('\n');
    },

    recordatorio: (data: {
      clienteNombre: string;
      barberoNombre: string;
      sucursalNombre: string;
      fechaHora: string;
      anticipacion: '24h' | '2h';
    }) => {
      const tiempoTexto = data.anticipacion === '24h' ? 'mañana' : 'en 2 horas';
      return [
        `⏰ *RECORDATORIO DE CITA - ${data.sucursalNombre.toUpperCase()}*`,
        `Hola ${data.clienteNombre}, te recordamos que tienes cita ${tiempoTexto}:`,
        ``,
        `📅 *Hora:* ${data.fechaHora}`,
        `✂️ *Barbero:* ${data.barberoNombre}`,
        `📍 *Sucursal:* ${data.sucursalNombre}`,
        ``,
        `¡Te esperamos puntual! Responde este mensaje si requieres cambios.`
      ].join('\n');
    },

    ticketCompra: (data: {
      tenantNombre: string;
      sucursalNombre: string;
      folio: string;
      total: number;
      barberoNombre: string;
      items: Array<{ cantidad: number; nombre: string; subtotal: number }>;
    }) => {
      const lineas = [
        `💈 *${data.tenantNombre.toUpperCase()}*`,
        `📍 ${data.sucursalNombre}`,
        `Folio: ${data.folio}`,
        `Atendido por: ${data.barberoNombre}`,
        `--------------------------------`,
        ...data.items.map(i => `${i.cantidad}x ${i.nombre} - $${i.subtotal.toFixed(2)}`),
        `--------------------------------`,
        `*TOTAL PAGADO: $${data.total.toFixed(2)} MXN*`,
        `¡Gracias por tu visita!`
      ];
      return lineas.join('\n');
    }
  };

  /**
   * Scans and processes automated 24h and 2h reminders for upcoming appointments
   */
  static async procesarRecordatoriosAutomaticos(prisma: PrismaClient) {
    const ahora = new Date();
    const en24hInicio = new Date(ahora.getTime() + 23 * 60 * 60 * 1000);
    const en24hFin = new Date(ahora.getTime() + 25 * 60 * 60 * 1000);

    const en2hInicio = new Date(ahora.getTime() + 1 * 60 * 60 * 1000);
    const en2hFin = new Date(ahora.getTime() + 3 * 60 * 60 * 1000);

    const resultados = {
      recordatorios24hEnviados: 0,
      recordatorios2hEnviados: 0,
      bloqueadosHorario: 0
    };

    // 1. Process 24h reminders
    const citas24h = await prisma.cita.findMany({
      where: {
        fechaHora: { gte: en24hInicio, lte: en24hFin },
        estado: { in: ['CONFIRMADA', 'PENDIENTE'] }
      },
      include: {
        cliente: true,
        barbero: true,
        sucursal: true,
        tenant: true
      }
    });

    for (const cita of citas24h) {
      if (!cita.cliente?.telefono) continue;

      // Check if already reminded for 24h
      const yaRecordada = await prisma.notificacionLog.findFirst({
        where: {
          tenantId: cita.tenantId,
          tipo: 'RECORDATORIO_24H',
          destinatario: { contains: cita.cliente.telefono.slice(-10) },
          fecha: { gte: new Date(ahora.getTime() - 24 * 60 * 60 * 1000) }
        }
      });

      if (!yaRecordada) {
        const msg = this.plantillas.recordatorio({
          clienteNombre: cita.cliente.nombre,
          barberoNombre: cita.barbero.nombre,
          sucursalNombre: cita.sucursal.nombre,
          fechaHora: new Date(cita.fechaHora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          anticipacion: '24h'
        });

        const res = await this.enviarMensaje({
          tenantId: cita.tenantId,
          destinatario: cita.cliente.telefono,
          tipo: 'RECORDATORIO_24H',
          mensaje: msg,
          sucursalZonaHoraria: cita.sucursal.zonaHoraria
        }, prisma);

        if (res.success) {
          resultados.recordatorios24hEnviados++;
        } else if (res.estado === 'BLOQUEADO_HORARIO') {
          resultados.bloqueadosHorario++;
        }
      }
    }

    // 2. Process 2h reminders
    const citas2h = await prisma.cita.findMany({
      where: {
        fechaHora: { gte: en2hInicio, lte: en2hFin },
        estado: { in: ['CONFIRMADA', 'PENDIENTE'] }
      },
      include: {
        cliente: true,
        barbero: true,
        sucursal: true,
        tenant: true
      }
    });

    for (const cita of citas2h) {
      if (!cita.cliente?.telefono) continue;

      const yaRecordada = await prisma.notificacionLog.findFirst({
        where: {
          tenantId: cita.tenantId,
          tipo: 'RECORDATORIO_2H',
          destinatario: { contains: cita.cliente.telefono.slice(-10) },
          fecha: { gte: new Date(ahora.getTime() - 4 * 60 * 60 * 1000) }
        }
      });

      if (!yaRecordada) {
        const msg = this.plantillas.recordatorio({
          clienteNombre: cita.cliente.nombre,
          barberoNombre: cita.barbero.nombre,
          sucursalNombre: cita.sucursal.nombre,
          fechaHora: new Date(cita.fechaHora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          anticipacion: '2h'
        });

        const res = await this.enviarMensaje({
          tenantId: cita.tenantId,
          destinatario: cita.cliente.telefono,
          tipo: 'RECORDATORIO_2H',
          mensaje: msg,
          sucursalZonaHoraria: cita.sucursal.zonaHoraria
        }, prisma);

        if (res.success) {
          resultados.recordatorios2hEnviados++;
        } else if (res.estado === 'BLOQUEADO_HORARIO') {
          resultados.bloqueadosHorario++;
        }
      }
    }

    return resultados;
  }
}
