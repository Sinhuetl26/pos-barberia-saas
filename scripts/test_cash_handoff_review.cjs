const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const moduleUnderTest = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('apps/web/src/components/CashCustody.tsx', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
}).outputText;
new Function('exports', 'module', 'require', source)(moduleUnderTest.exports, moduleUnderTest, () => ({}));
const { cashHandoffAmount, cashReceiptError } = moduleUnderTest.exports;
assert.equal(cashHandoffAmount('20.50', 30), 20.5);
assert.equal(cashHandoffAmount('30', 30), 30);
for (const input of ['', '0', '-1', '1.001', 'NaN', 'Infinity', '31', '1e1']) {
  assert.throws(() => cashHandoffAmount(input, 30));
}
assert.throws(() => cashHandoffAmount('20.50', 20));
assert.throws(() => cashHandoffAmount('20.50', NaN));
console.log('12/12 handoff amount checks passed, including a balance reduced after review.');

assert.match(cashReceiptError(new TypeError("Failed to fetch")), /Consulta el resultado/);
assert.match(cashReceiptError({status:0,message:"network"}), /No se confirmó/);
assert.equal(cashReceiptError({status:409,message:"El saldo cambió"}), "El saldo cambió");
console.log("PASS errores de red en español y mensajes de validación conservados.");
