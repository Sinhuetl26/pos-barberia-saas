const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const compiled = ts.transpileModule(fs.readFileSync('apps/web/src/components/SaleConfirmation.tsx', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
}).outputText;
const component = { exports: {} };
new Function('exports', 'module', 'require', compiled)(component.exports, component, require);
const { receiptCashBreakdown, SaleConfirmation } = component.exports;
assert.deepEqual(receiptCashBreakdown('{"efectivoRecibido":500,"cambio":150}'), { received: 500, change: 150 });
assert.equal(receiptCashBreakdown('{"cambio":0}').change, 0);
for (const invalid of ['broken', 'null', undefined, { efectivoRecibido: '500', cambio: -1 }, { efectivoRecibido: Infinity, cambio: NaN }]) {
  const result = receiptCashBreakdown(invalid);
  assert.equal(result.received, undefined);
  assert.equal(result.change, undefined);
}
function render(method, details, extra = {}) {
  return renderToStaticMarkup(React.createElement(SaleConfirmation, {
    sale: { total: 350, folio: '<script>unsafe</script>', metodoPago: method, detallesPago: details },
    busy: false, error: '', receipt: React.createElement('p', null, 'Comprobante existente'), onNewSale() {}, ...extra
  }));
}
const cash = render('EFECTIVO', '{"efectivoRecibido":500,"cambio":150}');
assert(cash.includes('$350.00') && cash.includes('$500.00') && cash.includes('$150.00'));
assert(cash.includes('<dt>Recibido</dt>') && cash.includes('<dt>Cambio</dt>'));
assert(!cash.includes('<script>') && cash.includes('&lt;script&gt;'));
assert(cash.indexOf('Nueva venta') < cash.indexOf('Ver ticket'));
assert(!cash.includes('<details class="carbon-receipt-detail" open'));
assert(!render('TARJETA', '{"efectivoRecibido":500,"cambio":150}').includes('<dt>Recibido</dt>'));
assert(!render('EFECTIVO', 'legacy-unstructured').includes('<dt>Cambio</dt>'));
assert(render('EFECTIVO', '{}', { busy: true, error: 'Impresora no disponible' }).includes('disabled=""'));
assert(render('EFECTIVO', '{}', { error: 'Impresora no disponible' }).includes('La venta sigue registrada'));
console.log('17 escenarios de confirmación: efectivo y cambio, legados, datos inválidos, escape, prioridad, comprobante cerrado y error de impresión.');
