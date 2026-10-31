const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function compile(file,loader){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(m,m.exports,loader);return m.exports;}
const {OperationState}=compile('apps/web/src/components/OperationState.tsx',require);
function render({barber=false,loadError='',rows=[{usuarioId:'u',nombre:'Alex ficticio',saldo:700}],loaded=true}={}){
 const states=[{saldos:rows,movimientos:[]},'',loadError,false,false,{},loaded,false,'u',null];let index=0;
 const loader=id=>id==='react'?{useEffect(){},useRef:v=>({current:v}),useState:()=>[states[index++],()=>{}]}:id==='../api'?{api:{getTenantId:()=> 't',getUserId:()=> 'u'}}:id==='./OperationState'?{OperationState}:id==='./OperationDialog'?{OperationDialog:()=>null}:id.endsWith('.css')?{}:require(id);
 const {CashCustody}=compile('apps/web/src/components/CashCustody.tsx',loader);
 return renderToStaticMarkup(CashCustody({branchId:'b',barber,cashOpen:true}));
}
const barber=render({barber:true});assert(barber.includes('$700.00'));assert(barber.includes('La caja confirma'));assert(!barber.includes('Revisar entrega'));assert(!barber.includes('Efectivo recibido de'));
const failure=render({loadError:'offline'});assert(failure.includes('El saldo mostrado puede haber cambiado'));assert(failure.includes('Reintentar consulta'));assert.match(failure,/<input[^>]*disabled/);assert.match(failure,/<button[^>]*disabled[^>]*>Revisar entrega/);
assert(!render({loadError:'offline',rows:[],loaded:false}).includes('Sin efectivo pendiente'));assert(render({rows:[]}).includes('Sin efectivo pendiente'));assert(!render().includes('Reintentar consulta'));
console.log('PASS custodia: barbero solo consulta; saldo obsoleto bloquea recepción; consulta fallida no aparenta saldo cero; recuperación y vacío diferenciados.');
