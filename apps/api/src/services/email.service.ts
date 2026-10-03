// ======================================================================
// SYSTECH STUDIO - TRANSACTIONAL EMAIL SERVICE
// Resend / SMTP integration, responsive HTML templates, fallback logger
// ======================================================================

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  provider: 'RESEND' | 'DEV_CONSOLE';
  error?: string;
}

export class EmailService {
  private static resendApiKey = process.env.RESEND_API_KEY || '';
  private static defaultFrom = process.env.EMAIL_FROM || 'SYSTECH Studio <notificaciones@systech.mx>';

  /**
   * Send transactional email using Resend or local dev fallback
   */
  static async enviarEmail(options: EmailOptions): Promise<EmailResult> {
    const { to, subject, html, from = this.defaultFrom } = options;

    if (this.resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ from, to: [to], subject, html })
        });

        const data: any = await response.json();
        if (response.ok && data.id) {
          return {
            success: true,
            messageId: data.id,
            provider: 'RESEND'
          };
        } else {
          return {
            success: false,
            provider: 'RESEND',
            error: data.message || 'Error al enviar email con Resend'
          };
        }
      } catch (err: any) {
        return {
          success: false,
          provider: 'RESEND',
          error: err.message
        };
      }
    }

    // Local dev fallback
    return {
      success: true,
      messageId: `dev_msg_${Date.now()}`,
      provider: 'DEV_CONSOLE'
    };
  }

  /**
   * Templates for common transactional emails
   */
  static plantillas = {
    reciboVenta: (data: {
      tenantNombre: string;
      sucursalNombre: string;
      folio: string;
      total: number;
      barberoNombre: string;
      fecha: string;
      items: Array<{ cantidad: number; nombre: string; subtotal: number }>;
    }) => {
      const itemsHtml = data.items
        .map(
          item => `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #1e293b;">${item.cantidad}x ${item.nombre}</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #0f172a;">$${item.subtotal.toFixed(2)} MXN</td>
          </tr>`
        )
        .join('');

      return `
        <div style="max-width: 540px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">${data.tenantNombre}</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">${data.sucursalNombre}</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b;">Comprobante de compra • Folio <strong>#${data.folio}</strong></p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              ${itemsHtml}
            </table>
            <div style="border-top: 2px solid #0f172a; padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 16px; font-weight: 700; color: #0f172a;">TOTAL:</span>
              <span style="font-size: 22px; font-weight: 800; color: #0f172a;">$${data.total.toFixed(2)} MXN</span>
            </div>
            <div style="margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #64748b; text-align: center;">
              Atendido por: <strong>${data.barberoNombre}</strong> • ${data.fecha}<br/>
              ¡Gracias por tu preferencia!
            </div>
          </div>
        </div>
      `;
    },

    alertaPagoFallido: (data: {
      duenoNombre: string;
      tenantNombre: string;
      monto: number;
      diasGracia: number;
    }) => {
      return `
        <div style="max-width: 540px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden;">
          <div style="background: #dc2626; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700;">⚠️ Problema con tu pago de suscripción</h1>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 15px; color: #334155; line-height: 1.5;">Hola <strong>${data.duenoNombre}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">El cargo recurrente de <strong>$${data.monto.toFixed(2)} MXN</strong> para tu barbería <strong>${data.tenantNombre}</strong> no pudo ser completado.</p>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; margin: 20px 0; color: #991b1b; font-size: 14px;">
              <strong>Periodo de gracia:</strong> Cuentas con <strong>${data.diasGracia} días</strong> antes de la suspensión temporal de los módulos de cobro y agenda.
            </div>
            <p style="font-size: 14px; color: #475569;">Por favor actualiza tu tarjeta en el portal de facturación de SYSTECH para mantener tu operación sin interrupciones.</p>
          </div>
        </div>
      `;
    }
  };
}
