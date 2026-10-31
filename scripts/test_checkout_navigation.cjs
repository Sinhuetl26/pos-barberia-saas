const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const mod={exports:{}};new Function('exports',ts.transpileModule(fs.readFileSync('apps/web/src/utils/checkoutNavigation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod.exports);
const {checkoutNeedsReview,emptyCheckoutNavigation}=mod.exports;
assert.equal(checkoutNeedsReview('/app/pos',emptyCheckoutNavigation),false);
for(let mask=1;mask<8;mask++){
 const state={dirty:Boolean(mask&1),busy:Boolean(mask&2),uncertain:Boolean(mask&4)};
 assert.equal(checkoutNeedsReview('/app/pos',state),true);
 for(const path of['/app/agenda','/app/configuracion','/b/fixture','/login'])assert.equal(checkoutNeedsReview(path,state),false);
}
console.log('PASS guardia POS: siete combinaciones de borrador/envío/resultado incierto, ticket vacío y rutas ajenas.');
