'use strict';

// Modelo de planeación independiente: no consulta cuentas, credenciales ni bases.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const model = JSON.parse(fs.readFileSync(path.join(root, 'docs/MODELO_ECONOMICO.json'), 'utf8'));
const s = model.supuestos;
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
const money = n => `$${round(n).toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
assert(Math.abs(s.mezcla.reduce((a, p) => a + p.proporcion, 0) - 1) < 1e-9, 'La mezcla debe sumar 100%');
assert(s.mezcla.every(p => p.proporcion >= 0 && p.precio_neto_mxn > 0));
const listPrice = s.mezcla.reduce((a, p) => a + p.proporcion * p.precio_neto_mxn, 0);
const supportUnit = s.soporte_minutos_por_cliente_mes / 60 * s.soporte_costo_hora_mxn;
function unit(vatIncluded, supportMinutes = s.soporte_minutos_por_cliente_mes) {
  const revenue = vatIncluded ? listPrice / (1 + s.iva_modelado) : listPrice;
  const collected = vatIncluded ? listPrice : listPrice * (1 + s.iva_modelado);
  const fees = (collected * (s.stripe_payments_porcentaje + s.stripe_billing_porcentaje) + s.stripe_fijo_por_cobro_mxn * s.cobros_por_cliente_mes) * (1 + s.iva_sobre_comisiones_modelado);
  const risk = revenue * s.reserva_riesgo_porcentaje_ingresos_netos;
  const support = supportMinutes / 60 * s.soporte_costo_hora_mxn;
  return { revenue, collected, fees, risk, support, contribution: revenue - fees - risk - support };
}
function scenario(input, vatIncluded = false, supportMinutes = s.soporte_minutos_por_cliente_mes) {
  const u = unit(vatIncluded, supportMinutes);
  const n = input.clientes;
  const maintenance = input.mantenimiento_horas_mes * s.mantenimiento_costo_hora_mxn;
  const fixed = input.infraestructura_mxn_mes + maintenance;
  const operatingResult = n * u.contribution - fixed;
  // Incluye una reserva de riesgo como salida presupuestaria conservadora.
  // Excluye todo trabajo humano: este saldo no es utilidad ni sueldo disponible.
  const founderCashBeforeLabor = n * (u.revenue - u.fees - u.risk) - input.infraestructura_mxn_mes;
  assert(Math.abs(operatingResult - (n * u.revenue - n * u.fees - n * u.risk - n * u.support - fixed)) < 1e-7);
  return {
    clientes: n, ingreso_sin_iva: round(n * u.revenue), cobrado_con_iva: round(n * u.collected),
    comisiones_presupuestadas: round(n * u.fees), reserva_riesgo: round(n * u.risk),
    soporte_valorizado: round(n * u.support), infraestructura: input.infraestructura_mxn_mes,
    mantenimiento_valorizado: maintenance, resultado_operativo_estimado: round(operatingResult),
    saldo_antes_de_trabajo_humano: round(founderCashBeforeLabor),
    clientes_equilibrio_con_estructura_del_escenario: u.contribution > 0 ? Math.ceil(fixed / u.contribution) : null
  };
}
const normal = model.escenarios.map(x => scenario(x));
const included = model.escenarios.map(x => scenario(x, true));
const stressed = model.escenarios.map(x => scenario(x, false, 60));
// Validaciones económicas de referencia que evitan mezclar IVA con ingreso.
assert(Number.isFinite(listPrice) && listPrice > 0);
assert(Number.isFinite(supportUnit) && supportUnit >= 0);
assert(unit(true).revenue < unit(false).revenue);
assert(stressed.every((r, i) => r.resultado_operativo_estimado < normal[i].resultado_operativo_estimado));
// Sensibilidad se calcula aparte porque listPrice es deliberadamente inmutable.
const essentialPrice = s.mezcla.find(p => p.plan === 'Esencial').precio_neto_mxn;
const initial = model.escenarios.find(x => x.clientes === model.objetivo_clientes_90_dias) || model.escenarios[0];
const essentialCollected = essentialPrice * (1 + s.iva_modelado);
const essentialFee = (essentialCollected * (s.stripe_payments_porcentaje + s.stripe_billing_porcentaje) + s.stripe_fijo_por_cobro_mxn) * (1 + s.iva_sobre_comisiones_modelado);
const essentialContribution = essentialPrice - essentialFee - essentialPrice * s.reserva_riesgo_porcentaje_ingresos_netos - supportUnit;
const essentialFixed = initial.infraestructura_mxn_mes + initial.mantenimiento_horas_mes * s.mantenimiento_costo_hora_mxn;
const essential10 = round(initial.clientes * essentialContribution - essentialFixed);
const essentialBreakEven = essentialContribution > 0 ? Math.ceil(essentialFixed / essentialContribution) : null;
const infra = model.infraestructura_referencia;
const usd = Object.entries(infra).filter(([k]) => k.endsWith('_usd_mes')).reduce((a, [,v]) => a + v, 0);
const infraBudget = round((usd * s.mxn_por_usd_presupuestado + infra.facturapi_api_multi_organizacion_mxn_mes) * (1 + infra.colchon_porcentaje));
assert(Number.isFinite(infraBudget) && infraBudget > 0);
const report = {
  fecha: model.fecha, moneda: model.moneda, tipo_de_resultado: 'Escenario presupuestario, antes de ISR, adquisición y sueldo del fundador',
  precio_promedio_sin_iva_recomendado: round(listPrice), infraestructura_calculada_referencia: infraBudget,
  recomendado_precios_mas_iva: normal, alternativa_precios_iva_incluido: included,
  sensibilidad_soporte_60_minutos: stressed,
  sensibilidad_diez_esencial: {resultado_operativo_estimado: essential10, clientes_equilibrio: essentialBreakEven},
  fuentes: model.fuentes, advertencias: s.advertencias
};
fs.writeFileSync(path.join(root, 'docs/RESULTADOS_ECONOMICOS.json'), JSON.stringify(report, null, 2) + '\n');
const table = rows => [
  '| Clientes | Ingreso sin IVA | Stripe* | Soporte | Infraestructura | Mantenimiento | Reserva | Resultado** |',
  '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...rows.map(r => `| ${r.clientes} | ${money(r.ingreso_sin_iva)} | ${money(r.comisiones_presupuestadas)} | ${money(r.soporte_valorizado)} | ${money(r.infraestructura)} | ${money(r.mantenimiento_valorizado)} | ${money(r.reserva_riesgo)} | ${money(r.resultado_operativo_estimado)} |`)
].join('\n');
const md = `# Costos y rentabilidad de SYSTECH Studio\n\nFecha de referencia: ${model.fecha}. Generado desde [supuestos](MODELO_ECONOMICO.json) con \`node scripts/modelo_economico.js\`. Sin conexión a Stripe, sin compras y sin cambios de precios.\n\nObjetivo indicado: **10 barberías en los primeros tres meses**, sin dominio ni alojamiento contratado. Los casos de 30 y 100 son sensibilidades, no metas comprometidas.\n\n## Modelo recomendado: precios más IVA\n\n60% Esencial de $499 y 40% Pro de $999, una sucursal por licencia. Ingreso promedio sin IVA: **${money(listPrice)}/cliente/mes**. Una cobranza mensual por cliente. Impuestos de 16% son hipótesis de planeación pendientes de revisión contable; se aparta el IVA cobrado al cliente.\n\n${table(normal)}\n\n*Payments 3.6% + $3 y Billing 0.7%; se añade un 16% presupuestario sobre las comisiones para reflejar desembolso conservador. No se modela el acreditamiento de IVA.\n\n**Resultado presupuestario tras valorizar mantenimiento y soporte, antes de ISR, publicidad, contabilidad, desarrollo de nuevas funciones y sueldo del fundador. No es utilidad neta ni promesa de ganancias.\n\nMantenimiento: 12 horas/mes a $600/h para 10–30 clientes; 20 horas para 100. Soporte: 20 minutos/cliente/mes a $300/h. Son supuestos de trabajo, no cotizaciones. Reserva de riesgo: 2% del ingreso sin IVA; no elimina pérdidas por disputas. La infraestructura de 100 clientes se presupuesta en $5,500; la capacidad se certificará con pruebas.\n\n## Lo que implica empezar con diez\n\nCon la mezcla prevista, el saldo después de proveedores y reserva, **antes de pagar o valorizar todo el trabajo humano**, es ${money(normal[0].saldo_antes_de_trabajo_humano)}/mes. El resultado con mantenimiento y soporte valorizados es **${money(normal[0].resultado_operativo_estimado)}**. El negocio puede cubrir alojamiento y todavía no pagar el trabajo que necesita. Si los diez eligen Esencial, el resultado valorizado baja a **${money(essential10)}**.\n\nCon los costos iniciales asumidos, el equilibrio valorizado es **${normal[0].clientes_equilibrio_con_estructura_del_escenario} clientes** con mezcla 60/40; si todos compran Esencial, **${essentialBreakEven}**. Son puntos de equilibrio de la estructura inicial, no umbrales garantizados cuando cambien costos o consumo.\n\n## Si $499 y $999 incluyen IVA\n\nEl código y los precios del sandbox no prueban una política fiscal: hoy Stripe cobra importes de $499 y $999. Adoptar precios más IVA requiere ajustar catálogo, checkout, comprobantes y comunicación antes de publicar. No agregar cargos a suscriptores existentes sin el tratamiento acordado.\n\n${table(included)}\n\nCon IVA incluido, el ingreso promedio disponible antes de gastos cae a ${money(unit(true).revenue)} y el equilibrio inicial sube a **${included[0].clientes_equilibrio_con_estructura_del_escenario} clientes**. Validar el cálculo y la configuración fiscal con el contador.\n\n## Sensibilidad: una hora de soporte por cliente\n\n${table(stressed)}\n\nA diez clientes, este cambio consume $2,000 adicionales por mes; a cien, $20,000. Medir tiempo de tickets y mejorar onboarding tiene tanto valor económico como negociar el servidor.\n\n## Presupuesto de proveedores\n\n| Partida | Base mensual | Naturaleza |\n| --- | ---: | --- |\n| API Render, 1 CPU / 2 GB | USD25 | Tarifa publicada |\n| Worker pequeño Render | USD7 | Tarifa publicada; verificar memoria |\n| PostgreSQL Render, 1 GB RAM | USD19 | Tarifa publicada; almacenamiento adicional |\n| Redis/Key Value Render, 256 MB | USD10 | Tarifa publicada |\n| Workspace Pro Render | USD25 | Tarifa publicada; compute se paga aparte |\n| Entorno de pruebas | USD13 | Reserva estimada, por dimensionar |\n| Resend Pro, 50,000 correos | USD20 | Tarifa publicada; exceso por consumo |\n| Almacenamiento, monitoreo y dominio amortizado | USD20 | Reserva estimada, por contratar |\n| Facturapi API multi-organización | $299 MXN | Al activar CFDI; más timbres |\n\nUSD${usd} a **$20 MXN/USD presupuestados**, más Facturapi y colchón general de 15%: **${money(infraBudget)}/mes**. Por redondeo se usa $3,500 en el escenario inicial. Rango de decisión: **$3,000–4,500/mes de tecnología**. El tipo de cambio no es una cotización actual; confirmar tarifas, impuestos y tamaños antes de contratar. No implica disponibilidad multirregión ni base de datos de alta disponibilidad.\n\nWhatsApp: costo variable por país, categoría y proveedor; confirmar rate card vigente, posibles costos de intermediario y consumo real. No se ha fijado una tarifa por mensaje en este modelo. CFDI: $0.60 por timbre según tarifa de la API, además de su cuota compartida de $299, no $299 por barbería. Ejemplo: 10 barberías × 100 timbres = $600 de consumo, además de la cuota. Los consumos no están incluidos en las tablas; cobrarlos y conciliarlos como add-ons para que no erosionen la licencia. Correos: exceso publicado de USD0.90 por cada 1,000 sobre la cuota de Resend.\n\n## Gastos iniciales y operación humana\n\nReservas de decisión, pendientes de cotizaciones: dominio $400–1,000/año; revisión legal/contable inicial $4,000–12,000; hardware de prueba $2,000–6,000 si no se tiene; primer mes de plataforma $3,000–4,500; pruebas comerciales $2,000–5,000. Aproximadamente **$12,000–30,000 de arranque**, excluyendo desarrollo inicial y sueldo. El dominio puede costar más por extensión o disponibilidad. No contratar servicios opcionales hasta necesitarlos.\n\nDespués del lanzamiento, 12–20 horas de mantenimiento a $500–800/h representarían **$6,000–16,000/mes** si se contrata a alguien. El modelo usa $7,200 al inicio. Con diez clientes, plataforma + ese mantenimiento + soporte ascienden a **$11,700/mes**, más comisiones y reserva. Si tú atiendes y el desarrollo se hace aquí, no aparece automáticamente una factura por ese trabajo; sigue existiendo su costo de tiempo. Tu plan de Codex y cualquier consumo de IA se presupuestan según tu contratación real. Esto no establece un contrato de mantenimiento ni atención permanente.\n\n## Fuentes\n\n${model.fuentes.map(f => `- [${f.proveedor}](${f.url}): ${f.dato}`).join('\n')}\n\nTodas las fuentes son páginas oficiales consultadas para esta planeación. Volver a verificar al contratar.\n`;
const historyNotice = '\n> Actualización 2026-10-07: para el arranque de 1–2 barberías consultar [presupuesto mínimo del piloto](PRESUPUESTO_MINIMO_PILOTO.md). Las tablas siguientes conservan el escenario histórico de 10/30/100; no son una inversión obligatoria ni una cotización.\n';
fs.writeFileSync(path.join(root, 'docs/COSTOS_Y_PRECIOS.md'), md.replace('# Costos y rentabilidad de SYSTECH Studio\n', '# Costos y rentabilidad de SYSTECH Studio\n' + historyNotice));
console.log(JSON.stringify({validacion: 'correcta', infraestructura_referencia: infraBudget, clientes_equilibrio: normal[0].clientes_equilibrio_con_estructura_del_escenario, resultados: normal.map(r => ({clientes:r.clientes, resultado:r.resultado_operativo_estimado})), sensibilidad_esencial:essential10}, null, 2));
