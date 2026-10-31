const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(name){const m={exports:{}};const source=ts.transpileModule(fs.readFileSync(`apps/web/src/components/${name}.tsx`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function('exports','module','require',source)(m.exports,m,id=>id.endsWith('.css')?{}:id==='./OperationState'?load('OperationState'):require(id));return m.exports;}
const {SalesHistory}=load('SalesHistory');const sale={id:'fixture',folio:'A-000001',fecha:'2026-10-27T15:00:00Z',total:200,totalDevuelto:100,estado:'PARCIAL_DEVUELTA',clienteNombre:'Cliente ficticio',barbero:{nombre:'Barbero ficticio'}};
const props={sales:[sale],loading:false,error:'',printError:'',printing:false,canRefund:true,branchName:'Sucursal ficticia',zone:'America/Mexico_City',onClose(){},onRetry(){},onPrint(){},onRefund(){}};
const render=changes=>renderToStaticMarkup(React.createElement(SalesHistory,{...props,...changes}));
const owner=render({});assert(owner.includes('Devolución parcial'));assert(owner.includes('Devuelto $'));assert(owner.includes('Devolver unidades de A-000001'));assert(owner.includes('Cliente ficticio'));assert(owner.includes('Total original $200.00 MXN'));assert(!owner.includes('<table'));
assert(!render({canRefund:false}).includes('Devolver unidades'));
assert(!render({sales:[{...sale,estado:'CANCELADA'}]}).includes('Devolver unidades'));
const failed=render({error:'Reintenta la consulta'});assert(failed.includes('Reintentar'));assert(!failed.includes('Cliente ficticio'));
assert(!render({loading:true}).includes('Cliente ficticio'));assert(render({sales:[]}).includes('Sin ventas disponibles'));
assert(render({printing:true}).includes('disabled=""'));assert(render({sales:[{...sale,clienteNombre:'<script>alert(1)</script>'}]}).includes('&lt;script&gt;'));
console.log('PASS historial: permisos de devolución, parcial/cancelada, importe original, error sin datos antiguos, carga, vacío, bloqueo de impresión y escape de contenido.');
