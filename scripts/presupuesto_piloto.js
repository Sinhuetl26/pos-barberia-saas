'use strict';
// Planning only: no accounts, API keys, charges, database or live prices changed.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
const assumptions = { mxnPorUsd: 20, colchon: 0.15, ivaHipotetico: 0.16, payments: 0.036, billing: 0.007, fijoMxn: 3, reservaIngresos: 0.02, dominioReservaAnualMxn: 300, respaldoMonitoreoReservaMxn: 100, postgresAlmacenamientoReservaUsd: 1.5 };
const infra = (api, db) => round(((api + db + assumptions.postgresAlmacenamientoReservaUsd) * assumptions.mxnPorUsd + assumptions.respaldoMonitoreoReservaMxn) * (1 + assumptions.colchon));
const monthly = { pequenoCalculado: infra(7, 6), pequenoPresupuesto: 450, ampliadoCalculado: infra(25, 19), ampliadoPresupuesto: 1170 };
function caseFor(clients, fixed, included = false) {
  const base = 499;
  const revenue = included ? base / (1 + assumptions.ivaHipotetico) : base;
  const charged = included ? base : base * (1 + assumptions.ivaHipotetico);
  const fees = (charged * (assumptions.payments + assumptions.billing) + assumptions.fijoMxn) * (1 + assumptions.ivaHipotetico);
  const reserve = revenue * assumptions.reservaIngresos;
  return {clientes:clients, plan:'Esencial', precioPublicado:base, supuestoFiscal:included?'IVA incluido':'Más IVA', ingresoSinIva:round(clients * revenue), comisiones:round(clients * fees), reserva:round(clients * reserve), infraestructura:fixed, saldoAntesDeTrabajoEIsr:round(clients * (revenue - fees - reserve) - fixed)};
}
const result = {fecha:'2026-10-07', estado:'Propuesta, sin contratación; capacidad y fiscalidad pendientes', supuestos:assumptions, mensual:monthly, primerMesTecnologicoPequenoMxn:monthly.pequenoPresupuesto+assumptions.dominioReservaAnualMxn, primerMesTecnologicoAmpliadoMxn:monthly.ampliadoPresupuesto+assumptions.dominioReservaAnualMxn, casos:[caseFor(1,450),caseFor(2,450),caseFor(2,1170),caseFor(2,450,true)], exclusiones:['Suscripción del fundador','Trabajo del fundador y sueldo','ISR y resultado contable','Asesoría legal/contable y emisión de comprobantes propios por cotizar','Equipos no disponibles para certificar','Consumo que exceda reservas','Disputas, devoluciones y ventas no cobradas'], fuentes:['https://render.com/pricing','https://render.com/docs/postgresql-backups','https://resend.com/docs/knowledge-base/account-quotas-and-limits','https://developers.cloudflare.com/pages/platform/limits/','https://porkbun.com/products/domains','https://stripe.com/mx/pricing']};
if(monthly.pequenoCalculado!==448.5 || monthly.ampliadoCalculado!==1161.5) throw new Error('Desglose de infraestructura no concuerda');
fs.writeFileSync(path.join(root,'docs/PRESUPUESTO_PILOTO_RESULTADOS.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
