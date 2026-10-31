'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const states=[],refs=[],effects=[],jobs=[],quotes=[],operations=[];let si=0,ri=0,ei=0,timer=0;
const timers=new Map(),storage=new Map();
const row={id:'arrival',version:2,estado:'ESPERANDO',clienteNombre:'Fixture arrival',fechaLlegada:'2026-10-14T16:00:00Z',servicios:[{id:'cut',nombre:'Cut',precio:250,duracion:30},{id:'beard',nombre:'Beard',precio:20.5,duracion:15}]};
const react={useState:value=>{const i=si++;if(!(i in states))states[i]=value;return[states[i],next=>states[i]=typeof next==='function'?next(states[i]):next]},useRef:value=>refs[ri++]??(refs[ri-1]={current:value}),useEffect:(fn,deps)=>{const i=ei++,old=effects[i];if(!old||deps.some((value,j)=>value!==old.deps[j])){old?.cleanup?.();effects[i]={deps};jobs.push(()=>effects[i].cleanup=fn())}}};
const api={getTenantId:()=> 'fixture',getUserId:()=> 'owner',getArrivalQueue:async()=>[row],getProfessionalCatalog:(branch,barber,time)=>new Promise(resolve=>quotes.push({branch,barber,time,resolve})),operateArrivalQueue:async(id,kind,payload)=>{operations.push({id,kind,payload});return {}}};
const window={setInterval:()=>++timer,clearInterval:()=>{},setTimeout:(fn,ms)=>{assert.equal(ms,20000);const id=++timer;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id)};
const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
const moduleScope={exports:{}},jsx=(type,props,key)=>({type,props,key});
new Function('exports','module','require','window','localStorage','document',ts.transpileModule(fs.readFileSync('apps/web/src/components/ArrivalQueue.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(moduleScope.exports,moduleScope,name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='../api'?{api}:name==='../utils/financialIntent'?{financialIntentKey:()=> 'fixture'}:{},window,localStorage,{hidden:false});
const catalog=[{id:'cut',tipo:'SERVICIO',nombre:'Cut',precioVenta:280,duracionMinutos:30},{id:'beard',tipo:'SERVICIO',nombre:'Beard',precioVenta:'20.50',duracionMinutos:15},{id:'zero',tipo:'SERVICIO',nombre:'Confirmed zero',precioVenta:0,duracionMinutos:5}];
function render(){si=ri=ei=0;const output=moduleScope.exports.ArrivalQueue({branchId:'branch',role:'DUENO',barbers:[{id:'mateo',nombre:'Mateo'}],services:[],zone:'America/Mexico_City',onChanged:()=>{},onOpenAppointment:()=>{}});while(jobs.length)jobs.shift()();return output}
function nodes(tree){const output=[];function walk(node){if(Array.isArray(node))node.forEach(walk);else if(node&&typeof node==='object'){output.push(node);walk(node.props?.children)}}walk(tree);return output}
const text=node=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):node==null?'':String(node);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function main(){
 const quote=moduleScope.exports.arrivalPriceQuote;
 assert.equal(quote(['cut','beard'],catalog).total,300.5);assert.equal(quote(['cut','beard'],catalog).minutes,45);assert.equal(quote(['zero'],catalog).total,0);
 assert.throws(()=>quote(['cut','missing'],catalog));assert.throws(()=>quote(['cut','cut'],catalog));assert.throws(()=>quote(['cut'],[catalog[0],catalog[0]]));assert.throws(()=>quote(['cut'],[{...catalog[0],activo:false}]));
 for(const price of [null,'',false,-1,Infinity,280.001])assert.throws(()=>quote(['cut'],[{...catalog[0],precioVenta:price}]));
 assert.throws(()=>quote(['cut','beard'],catalog.map(service=>({...service,duracionMinutos:480}))));
 console.log('PASS real quote validates all matched services, exact centavos/duration, genuine zero, missing/duplicates/inactive/invalid money and excessive duration');
 render();await tick();let tree=render();nodes(tree).find(node=>node.type==='select'&&node.props.id==='arrival-professional-arrival').props.onChange({target:{value:'mateo'}});tree=render();nodes(tree).find(node=>node.type==='button'&&text(node)==='Asignar turno').props.onClick();tree=render();
 assert.equal(operations.length,0);assert.equal(quotes.length,1);assert.equal(quotes[0].barber,'mateo');assert.equal(Date.parse(quotes[0].time)%60000,0);
 let confirm=nodes(tree).find(node=>node.type==='button'&&text(node)==='Confirmar precio y asignar turno');assert(confirm.props.disabled);
 console.log('PASS explicit assignment queries ceiled-minute professional prices without issuing an assignment');
 quotes[0].resolve(catalog);await tick();tree=render();confirm=nodes(tree).find(node=>node.type==='button'&&text(node)==='Confirmar precio y asignar turno');assert.equal(confirm.props.disabled,false);assert.equal(operations.length,0);assert(text(tree).includes('Total confirmado: $300.50 MXN'));
 console.log('PASS complete quote is reviewed in the dialog and still does not create a visit');
 confirm.props.onClick();await tick();assert.equal(operations.length,1);assert.equal(operations[0].payload.precioConfirmado,300.5);assert.equal(operations[0].payload.versionEsperada,2);assert.equal(operations[0].payload.barberoId,'mateo');assert(operations[0].payload.idempotencyKey);assert.equal(storage.size,0);
 console.log('PASS confirmed review submits exact total, version and professional with one recoverable UUID');
 console.log('PASS 4 arrival price/review groups using actual transpiled component with controlled hooks/API; no network/database');
}
main().catch(error=>{console.error(error);process.exitCode=1});
