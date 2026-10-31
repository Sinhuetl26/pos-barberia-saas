# Presupuesto mínimo para el piloto

Fecha: 2026-10-07. Propuesta para 1–2 barberías; sin contrataciones ni cambios a precios, planes o Stripe. Preferencia de Sinhue: pagar solo lo esencial y buscar que los ingresos cubran la operación. No indicó un tope numérico. Se conserva la meta de diez negocios en tres meses; los primeros dos son una etapa del piloto.

El escenario anterior de $12–30 mil y $3,500 mensuales de tecnología no es una inversión obligatoria. Incluía una estructura mayor, reservas de asesoría, compra de equipos y captación comercial. Este documento distingue desembolso de trabajo del fundador. No certifica que la aplicación esté lista para cobrar.

## Desembolso tecnológico pequeño

| Concepto | Base publicada / reserva | Presupuesto MXN |
| --- | --- | ---: |
| API pagada, 512 MB | USD7/mes | $140/mes |
| PostgreSQL pagado, 256 MB | USD6/mes | $120/mes |
| Crecimiento de almacenamiento | Reserva conservadora de USD1.50/mes para 5 GB facturables | $30/mes |
| Copia externa, monitoreo y consumos menores | Reserva propia, proveedor y tarea por definir | $100/mes |
| Margen general, 15% sobre subtotal | No sustituye el cálculo de impuestos | $58.50/mes |
| **Total calculado / presupuesto redondeado** | | **$448.50 / $450 al mes** |

Tarifas de API/base y almacenamiento verificadas en [Render](https://render.com/pricing). Conversión de planeación: $20 MXN/USD; no es tipo de cambio actual. Una instancia por servicio y espacio Hobby de un operador, sin cuota Pro. Los importes de compute se facturan adicionalmente al workspace. Transferencia y compilaciones tienen límites y cargos por exceso; deberán medirse.

El frontend estático puede alojarse en el plan gratuito de [Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/), separado de la API. El correo inicial puede usar [Resend Free](https://resend.com/docs/knowledge-base/account-quotas-and-limits): 3,000 correos al mes y 100 por día, compartidos por toda la plataforma, con remitente verificado. No se prometen correos ilimitados ni cuotas gratuitas indefinidas para consumos superiores.

API y PostgreSQL se presupuestan pagados. La [recuperación de PostgreSQL en Render](https://render.com/docs/postgresql-backups) ofrece tres días en Hobby con base pagada; además se requiere copia externa protegida y ensayo de restauración en ST-14. La reserva de $100 no es una cotización ni demuestra que ese mecanismo esté implementado.

Dominio .com normal: referencia publicada USD11.08/año en [Porkbun](https://porkbun.com/products/domains). Se reservan **$300 al año**, sujeto al nombre, renovación, impuestos y tipo de cambio al comprar. No se verificó ni reservó un nombre disponible. Primer mes tecnológico: **$300 de dominio + $450 de operación = $750**. Meses siguientes: $450 objetivo, sin volver a sumar el dominio anual.

## Condición antes de contratar

Los tamaños pequeños son candidatos para un piloto, no capacidad comprobada. ST-13/ST-19 deben verificar memoria, conexiones, tiempos de respuesta y cobros/reservas simultáneos. El scheduler actual corre dentro de la API y no utiliza Redis; la cola y coordinación durable se resolverán en ST-12. Retirar partidas presupuestarias no sustituye ese trabajo.

Si el tamaño pequeño falla, la alternativa calculada es API 2 GB USD25 + PostgreSQL 1 GB USD19, más las mismas reservas: **$1,161.50, redondeado a $1,170 mensuales**. Primer mes tecnológico: $1,470 con dominio. Se elegirá después de pruebas y antes de pagar; no se contratarán recursos insuficientes para sostener la cifra menor. La capacidad de diez o más barberías se medirá aparte.

Para el piloto no se presupuestan workspace Pro, Redis, worker dedicado, staging pagado permanente o Resend Pro. Los ensayos siguen en entornos aislados. Si ST-12 o la medición exige worker adicional, se recalcula antes de contratar. Se mantienen controles de acceso, respaldo, recuperación y monitoreo necesarios.

## Lo que sigue fuera de los $750

- Suscripción y tiempo de Sinhue: pagados según su contratación real; el 5 de noviembre termina la suscripción indicada. Hay que dejar entrega y guía de operación, y acordar cómo mantener y atender después. Esta herramienta no garantiza atención permanente.
- Revisión fiscal/legal, comprobantes de las licencias SaaS y contabilidad: cotización pendiente según régimen y forma de operar. El presupuesto anterior de $4–12 mil no era una cotización. No se elimina su verificación para aparentar un total bajo.
- Equipos: aprovechar teléfonos/computadoras actuales y conseguir impresoras prestadas para pruebas. El desembolso adicional puede ser cero si están disponibles; la certificación de tickets 58/80 mm sigue pendiente.
- Captación: primeros contactos y demostraciones hechos por Sinhue, sin publicidad pagada presupuestada. Se registra su tiempo, aunque no haya un pago a terceros.
- Comisión de cobranza, devoluciones, disputas y excesos: se pagan o reservan según operación; no están dentro del costo tecnológico fijo.

Por ello **$750 es solo el primer mes tecnológico candidato, no el costo completo garantizado de abrir un negocio**.

## Alcance de planes para el piloto

Conservar como propuesta actual los precios y límites; no se modifican el catálogo ni cuentas existentes:

| Plan | Base mensual propuesta | Capacidad | Oferta cuando pase sus criterios |
| --- | ---: | --- | --- |
| Esencial | $499 | 1 sucursal, 3 barberos | Agenda/reservas, cobro/clientes, caja/tickets/comisiones e inventario/exportación |
| Pro | $999 | 1 sucursal, 8 barberos | Núcleo operativo, mayor capacidad, roles y reportes de operación |
| Cadena | $2,699 | 3 sucursales, 8 barberos por sucursal | Catálogo/operación por ubicación y supervisión; pruebas ST-18/ST-19 antes de ofrecerlo |

No anunciar WhatsApp automático, CFDI de cada barbería, IA, modo sin conexión o pagos de clientes integrados hasta validar esas capacidades y costos. El enlace manual a WhatsApp y el registro manual de un pago por tarjeta no son esas integraciones. Fiscalidad y total final de compra siguen pendientes; “más IVA” es la hipótesis económica, no una publicación aprobada.

## ¿Cuándo cubre el desembolso?

Escenario hipotético: dos clientes Esencial a $499 más IVA, cobro completo mensual con tarjeta nacional. La tarifa de [Stripe México](https://stripe.com/mx/pricing) usada es Payments 3.6% + $3 y Billing 0.7%; se presupuesta 16% sobre comisiones y reserva de riesgo de 2%. El IVA cobrado no se cuenta como ingreso disponible.

| Concepto | Infraestructura pequeña | Alternativa ampliada |
| --- | ---: | ---: |
| Ingreso mensual sin IVA, dos clientes | $998.00 | $998.00 |
| Comisiones presupuestadas | $64.71 | $64.71 |
| Reserva de riesgo | $19.96 | $19.96 |
| Operación tecnológica | $450.00 | $1,170.00 |
| **Saldo antes de trabajo, contabilidad e ISR** | **$463.33** | **−$256.67** |

Con IVA incluido en los $499, dos clientes dejan $336.40 en el tamaño pequeño, antes de los mismos conceptos excluidos. No es utilidad neta, sueldo ni garantía de que “se pague solo”. El dominio inicial también debe recuperarse. Un cliente Esencial en el tamaño pequeño deja aproximadamente $6.67; no es margen suficiente para imprevistos.

Los cálculos exactos están en [PRESUPUESTO_PILOTO_RESULTADOS.json](PRESUPUESTO_PILOTO_RESULTADOS.json), generados por `scripts/presupuesto_piloto.js`. Se mantiene separado el escenario histórico de 10/30/100 clientes. Al conocer presupuesto máximo, asesoría y medidas reales, se actualiza esta propuesta.
