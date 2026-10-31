const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(name) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(`apps/web/src/components/${name}.tsx`, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('exports', 'module', 'require', source)(module.exports, module, () => ({}));
  return module.exports;
}
const { physicalCashCents, confirmedCashDifference, validCashPreview, cashGuideError } = load('CloseCashGuide');
const { clientHistoryEvents, historicalPreference } = load('ClientHistory');
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
check('Network failure uses the stage instruction and preserves server rejection', () => { for (const error of [{status:0},{name:'TypeError'},{name:'AbortError'},{message:'Failed to fetch'}]) assert.equal(cashGuideError(error, 'Comprueba el mismo cierre'), 'Comprueba el mismo cierre'); assert.equal(cashGuideError({message:'El turno ya est� cerrado',status:409}, 'Reintenta'), 'El turno ya est� cerrado'); });
check('Physical cash includes half-peso coins exactly in integer cents', () => assert.equal(physicalCashCents({ '200': '2', moneda05: '3', moneda1: '2' }), 40350));
check('Blank count is zero; unknown denominations cannot change count', () => { assert.equal(physicalCashCents({ '200': '' }), 0); assert.throws(() => physicalCashCents({ bogus: '2' })); });
check('Fractional, negative and excessive piece counts are rejected', () => { for (const value of ['-1', '1.5', '1000001', 'Infinity']) assert.throws(() => physicalCashCents({ '20': value })); });
check('Expected cash is not accepted before server confirms closed status', () => assert.equal(confirmedCashDifference({ corte: { estado: 'ABIERTO' }, resumen: { efectivoEsperado: 500, conteoReal: 500, descuadre: 0 } }), null));
check('Confirmed zero difference and shortage retain their meaning', () => { for (const value of [0, -5.5]) assert.equal(confirmedCashDifference({ corte: { estado: 'CERRADO' }, resumen: { efectivoEsperado: 100, conteoReal: 100 + value, descuadre: value } }), value); });
check('Malformed or inconsistent server summary is not a comparison', () => { assert.equal(confirmedCashDifference({ corte: { estado: 'CERRADO' }, resumen: { efectivoEsperado: '100', conteoReal: 100, descuadre: 0 } }), null); assert.equal(confirmedCashDifference({ corte: { estado: 'CERRADO' }, resumen: { efectivoEsperado: 100, conteoReal: 80, descuadre: 0 } }), null); });
const appointment = { id: 'a', fechaHora: '2026-10-11T10:00:00Z', estado: 'COMPLETADA', servicioId: 'old', nombreServicio: 'Nombre histórico', precioEstimado: 100, barberoId: 'b', barbero: { nombre: 'Ana' } };
const sale = { id: 's', citaId: 'a', fecha: '2026-10-11T11:00:00Z', estado: 'COMPLETADA', barberoId: 'b', barbero: { nombre: 'Ana' }, items: [{ productoId: 'old', tipoItem: 'SERVICIO', nombreItem: 'Ticket histórico', precioUnitario: 90 }] };
check('Guided comparison accepts an open declared-count preview, never an expired or mismatched review', () => {
  const now = Date.parse('2026-10-13T20:00:00Z');
  const preview = { lectura: true, corteId: 'cut', conteoDeclarado: 100, notasCierre: 'Conteo físico', previsualizacionToken: 'signed-token', expiraEn: '2026-10-13T20:05:00Z', resumen: { efectivoEsperado: 100, conteoReal: 100, descuadre: 0 } };
  assert.equal(validCashPreview(preview, 'cut', 100, 'Conteo físico', now), true);
  for (const changed of [{ corteId: 'other' }, { conteoDeclarado: '100' }, { conteoDeclarado: 101 }, { notasCierre: 'Otro conteo' }, { lectura: false }, { expiraEn: 'invalid' }, { expiraEn: '2026-10-13T20:00:00Z' }, { previsualizacionToken: '' }])
    assert.equal(validCashPreview({ ...preview, ...changed }, 'cut', 100, 'Conteo físico', now), false);
});
check('Linked appointment and ticket form one event using original ticket price', () => { const events = clientHistoryEvents([appointment], [sale]); assert.equal(events.length, 1); assert.equal(events[0].services[0].precio, 90); assert.equal(events[0].services[0].nombre, 'Ticket histórico'); });
check('Reservations and cancelled appointments never inflate performed preference', () => { const events = clientHistoryEvents([{ ...appointment, estado: 'CONFIRMADA' }, { ...appointment, id: 'cancel', estado: 'CANCELADA' }], []); assert.equal(events.filter(e => e.completedService).length, 0); assert.equal(historicalPreference(events, 'professional'), 'Sin atenciones realizadas registradas'); });
check('Product-only ticket is not a hair service visit', () => { const events = clientHistoryEvents([], [{ ...sale, citaId: null, items: [{ tipoItem: 'PRODUCTO', nombreItem: 'Gel' }] }]); assert.equal(events[0].completedService, false); });
check('Missing historical snapshot price remains unknown rather than free', () => { const events = clientHistoryEvents([{ ...appointment, serviciosJson: JSON.stringify([{ id: 'old', nombre: 'Corte', precio: null }]) }], []); assert.equal(events[0].services[0].precio, undefined); });
check('Tied preferences are explicit instead of arbitrarily favoring one barber', () => { const events = clientHistoryEvents([appointment, { ...appointment, id: 'other', barberoId: 'c', barbero: { nombre: 'Luis' } }], []); assert.equal(historicalPreference(events, 'professional'), 'Sin preferencia predominante'); });
console.log(`Cash/client UI helpers: ${passed}/${passed} passed`);
