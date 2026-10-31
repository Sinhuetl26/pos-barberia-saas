const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const m={exports:{}};new Function('exports',ts.transpileModule(fs.readFileSync('apps/web/src/utils/refundRecovery.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m.exports);
const {refundRecoveryState:state,refundFailure:failure}=m.exports;
assert.equal(state(null,'sale'),'ready');assert.equal(state({path:'/ventas/sale/devolver'},'sale'),'recover');
for(const path of ['/ventas/other/devolver','/cortes-caja/cerrar','unknown']) assert.equal(state({path},'sale'),'blocked');
assert.equal(state({path:'/ventas/a%2Fb/devolver'},'a/b'),'recover');
for(const e of [{status:0},{name:'TypeError'},{name:'AbortError'},{message:'Failed to fetch'}]) assert.match(failure(e),/Comprueba esta devolución/);
assert.equal(failure({status:400,message:'Importe inválido'}),'Importe inválido');
console.log('PASS 11 casos de devolución y recuperación.');
