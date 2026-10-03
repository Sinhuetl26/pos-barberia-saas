// ======================================================================
// SYSTECH STUDIO - FACTURACIÓN ELECTRÓNICA CFDI 4.0 (MÉXICO)
// RFC Validation, SAT Catalogs, PAC Timbrado Payload & Tax Structuring
// ======================================================================

export interface DatosFiscalesReceptor {
  rfc: string;
  razonSocial: string;
  codigoPostal: string;
  regimenFiscal: string; // 612, 626 (RESICO), 605, etc.
  usoCfdi: string; // G03, S01, etc.
  email?: string;
}

export interface FacturaItem {
  claveProdServ: string; // Ej: 90121500 (Servicios de peluquería)
  claveUnidad: string;   // E48 (Unidad de servicio) o H87 (Pieza)
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  importe: number;
  tasaIva?: number; // 0.16 por defecto en México
}

export class FacturacionCfdiService {
  private static facturapiApiKey = process.env.FACTURAPI_KEY || '';

  /**
   * Validates official Mexican Tax ID (RFC)
   */
  static validarRfc(rfc: string): boolean {
    const cleanRfc = rfc.trim().toUpperCase();
    if (cleanRfc === 'XAXX010101000' || cleanRfc === 'XEXX010101000') {
      return true; // RFCs genéricos SAT (público general y extranjero)
    }

    // Persona Física (4 letras + 6 números + 3 alfanuméricos)
    const regexFisica = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
    // Persona Moral (3 letras + 6 números + 3 alfanuméricos)
    const regexMoral = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

    return regexFisica.test(cleanRfc) || regexMoral.test(cleanRfc);
  }

  /**
   * Catalog of common SAT tax regimes for barbershops and customers
   */
  static catalogoRegimenes: Record<string, string> = {
    '605': 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
    '606': 'Arrendamiento',
    '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
    '626': 'Régimen Simplificado de Confianza (RESICO)',
    '601': 'General de Ley Personas Morales',
    '616': 'Sin obligaciones fiscales'
  };

  /**
   * Catalog of common SAT CFDI usage
   */
  static catalogoUsoCfdi: Record<string, string> = {
    'G03': 'Gastos en general',
    'S01': 'Sin efectos fiscales',
    'D01': 'Honorarios médicos, dentales y gastos hospitalarios',
    'G01': 'Adquisición de mercancías'
  };

  /**
   * Generates or timbra CFDI 4.0 invoice for a sale
   */
  static async timbrarFactura(venta: any, receptor: DatosFiscalesReceptor) {
    if (!this.validarRfc(receptor.rfc)) {
      throw new Error(`El RFC "${receptor.rfc}" no tiene un formato válido ante el SAT.`);
    }

    if (!receptor.codigoPostal || receptor.codigoPostal.length !== 5) {
      throw new Error('El Código Postal fiscal debe contener exactamente 5 dígitos.');
    }

    // If Facturapi API Key is set, make real call
    if (this.facturapiApiKey) {
      try {
        const response = await fetch('https://www.facturapi.com/v2/invoices', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.facturapiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            customer: {
              legal_name: receptor.razonSocial,
              tax_id: receptor.rfc,
              tax_system: receptor.regimenFiscal,
              zip: receptor.codigoPostal,
              email: receptor.email
            },
            items: venta.items.map((i: any) => ({
              quantity: i.cantidad,
              product: {
                description: i.nombreItem,
                product_key: i.tipoItem === 'SERVICIO' ? '90121500' : '53131600',
                price: Number(i.precioUnitario),
                unit_key: i.tipoItem === 'SERVICIO' ? 'E48' : 'H87'
              }
            })),
            use: receptor.usoCfdi,
            payment_form: venta.metodoPago === 'EFECTIVO' ? '01' : (venta.metodoPago === 'TARJETA' ? '04' : '03')
          })
        });

        const data = await response.json();
        return {
          success: response.ok,
          uuid: data.uuid,
          pdfUrl: data.verification_url,
          data
        };
      } catch (err: any) {
        throw new Error(`Error de timbrado PAC: ${err.message}`);
      }
    }

    // C8 FIX: Never simulate CFDI in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FACTURAPI_KEY ausente: No es posible timbrar comprobantes fiscales digitales (CFDI 4.0) en entorno de producción sin la clave del PAC.');
    }

    // Dev/Sandbox simulation response - clearly flagged as without fiscal validity
    const mockUuid = `4a9b2c1d-8e7f-4123-9abc-${Date.now().toString(16)}`;
    return {
      success: true,
      provider: 'SIMULACION_DEV_SIN_VALIDEZ_FISCAL',
      leyendaFiscal: 'COMPROBANTE SIMULADO EN ENTORNO DE DESARROLLO - SIN VALIDEZ FISCAL ANTE EL SAT',
      uuid: mockUuid,
      rfcEmisor: 'SYS20260101A1',
      rfcReceptor: receptor.rfc.toUpperCase(),
      total: Number(venta.total),
      folio: `FAC-${venta.folio}`,
      fechaTimbrado: new Date().toISOString(),
      selloSat: 'sello_sat_simulado_solo_desarrollo',
      cadenaOriginal: `||4.0|${mockUuid}|${new Date().toISOString()}|01|${venta.total}||`
    };
  }
}
