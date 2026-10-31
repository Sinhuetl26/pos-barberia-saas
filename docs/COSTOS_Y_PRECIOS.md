# Costos y rentabilidad de SYSTECH Studio

> Actualización 2026-10-07: para el arranque de 1–2 barberías consultar [presupuesto mínimo del piloto](PRESUPUESTO_MINIMO_PILOTO.md). Las tablas siguientes conservan el escenario histórico de 10/30/100; no son una inversión obligatoria ni una cotización.

Fecha de referencia: 2026-10-04. Generado desde [supuestos](MODELO_ECONOMICO.json) con `node scripts/modelo_economico.js`. Sin conexión a Stripe, sin compras y sin cambios de precios.

Objetivo indicado: **10 barberías en los primeros tres meses**, sin dominio ni alojamiento contratado. Los casos de 30 y 100 son sensibilidades, no metas comprometidas.

## Modelo recomendado: precios más IVA

60% Esencial de $499 y 40% Pro de $999, una sucursal por licencia. Ingreso promedio sin IVA: **$699.00/cliente/mes**. Una cobranza mensual por cliente. Impuestos de 16% son hipótesis de planeación pendientes de revisión contable; se aparta el IVA cobrado al cliente.

| Clientes | Ingreso sin IVA | Stripe* | Soporte | Infraestructura | Mantenimiento | Reserva | Resultado** |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | $6,990.00 | $439.25 | $1,000.00 | $3,500.00 | $7,200.00 | $139.80 | $-5,289.05 |
| 30 | $20,970.00 | $1,317.74 | $3,000.00 | $3,500.00 | $7,200.00 | $419.40 | $5,532.86 |
| 100 | $69,900.00 | $4,392.47 | $10,000.00 | $5,500.00 | $12,000.00 | $1,398.00 | $36,609.53 |

*Payments 3.6% + $3 y Billing 0.7%; se añade un 16% presupuestario sobre las comisiones para reflejar desembolso conservador. No se modela el acreditamiento de IVA.

**Resultado presupuestario tras valorizar mantenimiento y soporte, antes de ISR, publicidad, contabilidad, desarrollo de nuevas funciones y sueldo del fundador. No es utilidad neta ni promesa de ganancias.

Mantenimiento: 12 horas/mes a $600/h para 10–30 clientes; 20 horas para 100. Soporte: 20 minutos/cliente/mes a $300/h. Son supuestos de trabajo, no cotizaciones. Reserva de riesgo: 2% del ingreso sin IVA; no elimina pérdidas por disputas. La infraestructura de 100 clientes se presupuesta en $5,500; la capacidad se certificará con pruebas.

## Lo que implica empezar con diez

Con la mezcla prevista, el saldo después de proveedores y reserva, **antes de pagar o valorizar todo el trabajo humano**, es $2,910.95/mes. El resultado con mantenimiento y soporte valorizados es **$-5,289.05**. El negocio puede cubrir alojamiento y todavía no pagar el trabajo que necesita. Si los diez eligen Esencial, el resultado valorizado baja a **$-7,133.33**.

Con los costos iniciales asumidos, el equilibrio valorizado es **20 clientes** con mezcla 60/40; si todos compran Esencial, **30**. Son puntos de equilibrio de la estructura inicial, no umbrales garantizados cuando cambien costos o consumo.

## Si $499 y $999 incluyen IVA

El código y los precios del sandbox no prueban una política fiscal: hoy Stripe cobra importes de $499 y $999. Adoptar precios más IVA requiere ajustar catálogo, checkout, comprobantes y comunicación antes de publicar. No agregar cargos a suscriptores existentes sin el tratamiento acordado.

| Clientes | Ingreso sin IVA | Stripe* | Soporte | Infraestructura | Mantenimiento | Reserva | Resultado** |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | $6,025.86 | $383.46 | $1,000.00 | $3,500.00 | $7,200.00 | $120.52 | $-6,178.12 |
| 30 | $18,077.59 | $1,150.38 | $3,000.00 | $3,500.00 | $7,200.00 | $361.55 | $2,865.65 |
| 100 | $60,258.62 | $3,834.61 | $10,000.00 | $5,500.00 | $12,000.00 | $1,205.17 | $27,718.84 |

Con IVA incluido, el ingreso promedio disponible antes de gastos cae a $602.59 y el equilibrio inicial sube a **24 clientes**. Validar el cálculo y la configuración fiscal con el contador.

## Sensibilidad: una hora de soporte por cliente

| Clientes | Ingreso sin IVA | Stripe* | Soporte | Infraestructura | Mantenimiento | Reserva | Resultado** |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | $6,990.00 | $439.25 | $3,000.00 | $3,500.00 | $7,200.00 | $139.80 | $-7,289.05 |
| 30 | $20,970.00 | $1,317.74 | $9,000.00 | $3,500.00 | $7,200.00 | $419.40 | $-467.14 |
| 100 | $69,900.00 | $4,392.47 | $30,000.00 | $5,500.00 | $12,000.00 | $1,398.00 | $16,609.53 |

A diez clientes, este cambio consume $2,000 adicionales por mes; a cien, $20,000. Medir tiempo de tickets y mejorar onboarding tiene tanto valor económico como negociar el servidor.

## Presupuesto de proveedores

| Partida | Base mensual | Naturaleza |
| --- | ---: | --- |
| API Render, 1 CPU / 2 GB | USD25 | Tarifa publicada |
| Worker pequeño Render | USD7 | Tarifa publicada; verificar memoria |
| PostgreSQL Render, 1 GB RAM | USD19 | Tarifa publicada; almacenamiento adicional |
| Redis/Key Value Render, 256 MB | USD10 | Tarifa publicada |
| Workspace Pro Render | USD25 | Tarifa publicada; compute se paga aparte |
| Entorno de pruebas | USD13 | Reserva estimada, por dimensionar |
| Resend Pro, 50,000 correos | USD20 | Tarifa publicada; exceso por consumo |
| Almacenamiento, monitoreo y dominio amortizado | USD20 | Reserva estimada, por contratar |
| Facturapi API multi-organización | $299 MXN | Al activar CFDI; más timbres |

USD139 a **$20 MXN/USD presupuestados**, más Facturapi y colchón general de 15%: **$3,540.85/mes**. Por redondeo se usa $3,500 en el escenario inicial. Rango de decisión: **$3,000–4,500/mes de tecnología**. El tipo de cambio no es una cotización actual; confirmar tarifas, impuestos y tamaños antes de contratar. No implica disponibilidad multirregión ni base de datos de alta disponibilidad.

WhatsApp: costo variable por país, categoría y proveedor; confirmar rate card vigente, posibles costos de intermediario y consumo real. No se ha fijado una tarifa por mensaje en este modelo. CFDI: $0.60 por timbre según tarifa de la API, además de su cuota compartida de $299, no $299 por barbería. Ejemplo: 10 barberías × 100 timbres = $600 de consumo, además de la cuota. Los consumos no están incluidos en las tablas; cobrarlos y conciliarlos como add-ons para que no erosionen la licencia. Correos: exceso publicado de USD0.90 por cada 1,000 sobre la cuota de Resend.

## Gastos iniciales y operación humana

Reservas de decisión, pendientes de cotizaciones: dominio $400–1,000/año; revisión legal/contable inicial $4,000–12,000; hardware de prueba $2,000–6,000 si no se tiene; primer mes de plataforma $3,000–4,500; pruebas comerciales $2,000–5,000. Aproximadamente **$12,000–30,000 de arranque**, excluyendo desarrollo inicial y sueldo. El dominio puede costar más por extensión o disponibilidad. No contratar servicios opcionales hasta necesitarlos.

Después del lanzamiento, 12–20 horas de mantenimiento a $500–800/h representarían **$6,000–16,000/mes** si se contrata a alguien. El modelo usa $7,200 al inicio. Con diez clientes, plataforma + ese mantenimiento + soporte ascienden a **$11,700/mes**, más comisiones y reserva. Si tú atiendes y el desarrollo se hace aquí, no aparece automáticamente una factura por ese trabajo; sigue existiendo su costo de tiempo. Tu plan de Codex y cualquier consumo de IA se presupuestan según tu contratación real. Esto no establece un contrato de mantenimiento ni atención permanente.

## Fuentes

- [Stripe México](https://stripe.com/mx/pricing): Tarjeta nacional 3.6% + MXN3; Billing 0.7%; tarifas excluyen IVA.
- [Render](https://render.com/pricing): UI pública consultada: API 1c-2g USD25; worker pequeño USD7; PostgreSQL 0.5c-1g USD19; Key Value 256MB USD10; workspace Pro USD25. Compute adicional al workspace.
- [Resend](https://resend.com/pricing?volume=50000): Pro USD20/mes, 50,000 correos; exceso USD0.90/1,000.
- [Facturapi](https://www.facturapi.io/pricing): API CFDI multi-organización MXN299/mes + MXN0.60/timbre; IVA incluido. Diferente de Facturapi para Stripe por organización.
- [WhatsApp Business](https://whatsappbusiness.com/es-la/products/platform-pricing/): Variable por mercado y categoría. Sin tarifa unitaria fijada en este modelo; verificar rate card y condiciones al contratar.
- [Booksy México](https://booksy.com/biz/es-mx/precios): Base MXN429/mes + MXN100 por empleado adicional, con las condiciones publicadas. No se supone equivalencia fiscal/funcional.
- [Fresha México](https://www.fresha.com/es-MX/pricing): Independiente USD19.95/mes; equipo USD14.95 por miembro reservable/mes. No se supone equivalencia funcional.

Todas las fuentes son páginas oficiales consultadas para esta planeación. Volver a verificar al contratar.
