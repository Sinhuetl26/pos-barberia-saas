'use strict';
// Only the named fictitious presentation; exports HTML without auth credentials.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
async function main() {
  const root = path.resolve(__dirname, '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.tools/product-complete-demo.json'), 'utf8'));
  assert.equal(manifest.apiPort, 3103);
  assert.equal(manifest.webPort, 5197);
  assert.equal(manifest.database, 'file:' + path.join(root, '.tools/product-complete-demo/test.db').replaceAll('\\', '/'));
  assert.match(manifest.credentials.owner, /@fixture\.invalid$/);
  const base = 'http://127.0.0.1:3103/api';
  const login = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: manifest.credentials.owner, password: manifest.credentials.password }) });
  assert.equal(login.status, 200);
  const auth = await login.json();
  const get = async route => { const response = await fetch(base + route, { headers: { Authorization: 'Bearer ' + auth.token } }); assert.equal(response.status, 200); return response; };
  const sales = await (await get('/ventas')).json();
  const sale = sales.find(row => row.folio === 'A-000003');
  assert(sale); assert.equal(Number(sale.total), 600);
  const cuts = await (await get('/cortes-caja')).json();
  const cut = cuts.find(row => row.estado === 'CERRADO' && Number(row.conteoEfectivoReal) === 675);
  assert(cut); assert.equal(Number(cut.descuadre), 0);
  const evidence = path.join(root, 'docs/evidencias/producto-completo-20261011');
  const preview = path.join(root, '.tools/product-ui-preview-verified-20261014');
  assert(fs.existsSync(path.join(preview, 'index.html')));
  const outputs = [];
  for (const [filename, route, expected] of [
    ['ticket-58mm-muestra-20261015.html', '/ventas/' + sale.id + '/ticket-html?width=58mm', /No es CFDI/],
    ['ticket-80mm-muestra-20261015.html', '/ventas/' + sale.id + '/ticket-html?width=80mm', /No es CFDI/],
    ['cierre-muestra-20261015.html', '/cortes-caja/' + cut.id + '/comprobante-html', /675\.00/],
  ]) {
    const html = await (await get(route)).text();
    assert.match(html, expected);
    assert(!html.includes(auth.token)); assert(!html.includes(manifest.credentials.password));
    fs.writeFileSync(path.join(evidence, filename), html);
    fs.writeFileSync(path.join(preview, filename), html);
    outputs.push({ filename, url: 'http://127.0.0.1:5197/' + filename });
  }
  console.log(JSON.stringify({ fictionalOnly: true, sale: sale.folio, total: 600, closedCash: 675, outputs }, null, 2));
}
main().catch(error => { console.error('Print preview failed: ' + (error.code || error.name)); process.exitCode = 1; });
