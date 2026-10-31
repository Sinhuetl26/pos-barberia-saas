const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function compile(file,loader=require){const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function('exports','module','require',code)(m.exports,m,loader);return m.exports;}
const {discountApprovalLabel}=compile('apps/web/src/components/DiscountApprovalRequest.tsx',id=>id==='../api'?{api:{}}:require(id));
const now=Date.UTC(2026,9,22,18);
assert.equal(discountApprovalLabel({id:'qa',estado:'APROBADA',expiraEn:new Date(now+1000).toISOString()},now),'Autorizada');
for(const expiraEn of[undefined,'invalid',new Date(now).toISOString(),new Date(now-1000).toISOString()])assert.equal(discountApprovalLabel({id:'qa',estado:'APROBADA',expiraEn},now),'Autorización vencida');
assert.equal(discountApprovalLabel({id:'qa',estado:'PENDIENTE'},now),'Pendiente de revisión');
assert.equal(discountApprovalLabel({id:'qa',estado:'RECHAZADA'},now),'Rechazada');
const {SaleRecovery}=compile('apps/web/src/components/SaleRecovery.tsx');
const render=extra=>renderToStaticMarkup(React.createElement(SaleRecovery,{total:350,quantity:2,method:'EFECTIVO',busy:false,error:'',onRecover(){},...extra}));
const html=render({});assert(html.includes('$350.00 MXN'));assert(html.includes('Efectivo'));assert(html.includes('Consultar resultado'));assert(!html.includes('Nueva venta'));assert(!html.includes('Registrar cobro'));assert(render({busy:true}).includes('disabled=""'));assert(render({error:'<script>unsafe</script>'}).includes('&lt;script&gt;'));
console.log('PASS aprobación vigente/vencida/rechazada y recuperación visible sin segunda acción de cobro; estado ocupado y escape de errores.');
