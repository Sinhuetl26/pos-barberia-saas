'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  const root = path.resolve(__dirname, '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.tools/product-complete-demo.json'), 'utf8'));
  assert.match(manifest.credentials.owner, /@fixture\.invalid$/);
  const base = 'http://127.0.0.1:3103/api';
  async function request(route, options = {}) {
    const response = await fetch(base + route, { ...options, signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200, route);
    return response.json();
  }
  assert.equal((await request('/health')).database, 'connected');
  const publicProfile = await request('/public/barberia/cierre-demo');
  assert(publicProfile.tenant);
  assert(publicProfile.servicios.length >= 3);
  for (const role of ['owner', 'barber']) {
    const auth = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: manifest.credentials[role], password: manifest.credentials.password }) });
    assert(auth.token);
    if (role === 'owner') {
      const headers = { Authorization: 'Bearer ' + auth.token };
      const sales = await request('/ventas', { headers });
      assert.equal(Number(sales.find(s => s.folio === 'A-000003').total), 600);
      const cuts = await request('/cortes-caja', { headers });
      assert(cuts.some(c => c.estado === 'CERRADO' && Number(c.conteoEfectivoReal) === 675 && Number(c.descuadre) === 0));
    }
  }
  const page = await fetch('http://127.0.0.1:5197/b/cierre-demo');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert(html.includes('index-CsF_Gq8U.js'));
  assert(html.includes('index-KvKj7dxY.css'));
  for (const asset of ['/assets/index-CsF_Gq8U.js', '/assets/index-KvKj7dxY.css']) {
    assert.equal((await fetch('http://127.0.0.1:5197' + asset)).status, 200);
  }
  console.log('PASS: API + database, public profile/services, owner/barber login, A3=600, closed cash=675/difference0, SPA fallback and verified assets. No financial writes.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
