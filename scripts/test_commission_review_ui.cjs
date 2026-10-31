'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript');
const file = fs.readFileSync('apps/web/src/views/BarberosView.tsx', 'utf8');
const source = file.slice(file.indexOf('export function commissionReviewRows'), file.indexOf('interface BarberosViewProps'));
const output = { exports: {} };
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(output.exports);
const { commissionReviewRows, commissionReviewMatches, commissionReviewPending } = output.exports;
const commission = (id, monto, extra = {}) => ({ id, monto, barberoId: 'barber-a', ventaId: 'sale-a', barbero: { nombre: 'Alex ficticio', sucursalId: 'branch-a' }, pagada: false, ...extra });
let count = 0; const check = (name, fn) => { fn(); count++; console.log('PASS ' + name); };
check('Review copies the exact selected IDs, actor and cent amounts without retaining mutable source objects', () => {
  const original = [commission('a', '98.50'), commission('b', -10)]; const ids = ['b', 'a']; const rows = commissionReviewRows(original, ids, 'branch-a');
  assert.deepEqual(rows.map(r => r.id), ids); assert.equal(rows[0].monto, -10); assert.equal(rows[1].monto, 98.5);
  ids.reverse(); original[1].monto = 999; original[0].barbero.nombre = 'Changed source';
  assert.deepEqual(rows.map(r => r.id), ['b', 'a']); assert.equal(rows[0].monto, -10); assert.equal(rows[1].nombre, 'Alex ficticio');
});
check('Missing, duplicate, already paid and foreign-branch rows cannot be reviewed', () => {
  for (const [data, ids, branch] of [[[commission('a', 10)], [], 'branch-a'], [[commission('a', 10)], ['a', 'a'], 'branch-a'], [[commission('a', 10)], ['missing'], 'branch-a'], [[commission('a', 10, { pagada: true })], ['a'], 'branch-a'], [[commission('a', 10)], ['a'], 'branch-b'], [[commission('a', 10)], ['a'], '']]) assert.throws(() => commissionReviewRows(data, ids, branch));
});
check('Malformed amounts never turn missing values into zero; explicit zero and signed return adjustments remain valid', () => {
  for (const amount of [null, undefined, false, true, '', '  ', NaN, Infinity, 'invalid', 10.001]) assert.throws(() => commissionReviewRows([commission('a', amount)], ['a'], 'branch-a'));
  assert.equal(commissionReviewRows([commission('a', 0)], ['a'], 'branch-a')[0].monto, 0);
  assert.equal(commissionReviewRows([commission('a', -98.5)], ['a'], 'branch-a')[0].monto, -98.5);
});
check('Fresh matching rows retain the reviewed selection even if read ordering changes', () => {
  const data = [commission('a', 10), commission('b', 5)], rows = commissionReviewRows(data, ['a', 'b'], 'branch-a');
  assert.equal(commissionReviewMatches(rows, [...data].reverse(), 'branch-a'), true);
});
check('A changed amount, recipient, folio, paid status, absent row or scope requires a new review', () => {
  const data = [commission('a', 98.5)], rows = commissionReviewRows(data, ['a'], 'branch-a');
  for (const changed of [[commission('a', 99)], [commission('a', 98.5, { barberoId: 'barber-b' })], [commission('a', 98.5, { ventaId: 'sale-b' })], [commission('a', 98.5, { pagada: true })], [], [commission('a', 98.5, { barbero: { nombre: 'Otro', sucursalId: 'branch-a' } })]]) assert.equal(commissionReviewMatches(rows, changed, 'branch-a'), false);
  assert.equal(commissionReviewMatches(rows, data, 'branch-b'), false);
});
check('Recovery matches the same frozen IDs and method; another pending financial operation does not trap the review', () => {
  const pending = { path: '/comisiones/pagar', body: { comisionIds: ['a', 'b'], metodoPagoComision: 'EFECTIVO', idempotencyKey: 'stable-key' } };
  assert.equal(commissionReviewPending(pending, ['a', 'b']), true);
  for (const different of [null, {}, { ...pending, path: '/cortes-caja/cerrar' }, { ...pending, body: { ...pending.body, comisionIds: ['b', 'a'] } }, { ...pending, body: { ...pending.body, metodoPagoComision: 'TRANSFERENCIA' } }, { ...pending, body: { ...pending.body, comisionIds: ['c'] } }]) assert.equal(commissionReviewPending(different, ['a', 'b']), false);
});
console.log(`Commission review helpers: ${count}/${count} passed; no API, cash or database writes.`);
