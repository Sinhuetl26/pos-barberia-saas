'use strict';
// Uses the real hook source; fake hooks/time/API avoid browser or financial writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const values=[],refs=[],effects=[],queue=[],calls=[],timers=new Map();let si=0,ri=0,ei=0,next=0;
const react={
 useState:value=>{const i=si++;if(!(i in values))values[i]=value;return[values[i],nextValue=>values[i]=typeof nextValue==='function'?nextValue(values[i]):nextValue]},
 useRef:value=>refs[ri++]??(refs[ri-1]={current:value}),
 useEffect:(fn,deps)=>{const i=ei++,old=effects[i];if(!old||deps.some((value,j)=>value!==old.deps[j])){old?.cleanup?.();effects[i]={deps};queue.push(()=>effects[i].cleanup=fn())}}
};
const api={getTenantId:()=> 'fixture',getUserId:()=> 'owner',getProfessionalCatalog:(branch,barber,time)=>new Promise((resolve,reject)=>calls.push({branch,barber,time,resolve,reject}))};
const window={setTimeout:(fn,ms)=>{assert.equal(ms,20000);const id=++next;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id)};
const moduleScope={exports:{}};
const source=fs.readFileSync('apps/web/src/views/AgendaView.tsx','utf8')+'\nexport {useProfessionalBookingQuote};';
new Function('exports','module','require','window',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(moduleScope.exports,moduleScope,name=>name==='react'?react:name==='../api'?{api}:{},window);
let args=['branch','mateo','service','2026-11-01T11:00:00',true,'DUENO'];
function render(){si=ri=ei=0;const output=moduleScope.exports.useProfessionalBookingQuote(...args);while(queue.length)queue.shift()();return output}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const service=price=>({id:'service',tipo:'SERVICIO',activo:true,nombre:'Corte fixture',precioVenta:price,duracionMinutos:30});
async function main(){
 render();assert.equal(calls[0].time,args[3]);calls[0].resolve([service(280)]);await tick();assert.equal(render().service.precioVenta,280);
 console.log('PASS professional tariff uses exact selected local date/time, not base catalog');
 args[1]='luis';assert.equal(render().service,null);const older=calls.at(-1);args[1]='alex';render();const latest=calls.at(-1);latest.resolve([service(250)]);await tick();older.resolve([service(320)]);await tick();assert.equal(render().service.precioVenta,250);
 console.log('PASS immediate selection invalidation and older response cannot replace current quote');
 args[3]='2026-11-01T12:00:00';render();calls.at(-1).resolve([service(null)]);await tick();let output=render();assert.equal(output.service,null);assert(output.error.includes('verificables'));output.retry();render();calls.at(-1).resolve([service(0)]);await tick();assert.equal(render().service.precioVenta,0);
 console.log('PASS missing price is blocked while confirmed genuine zero remains valid');
 args[3]='2026-11-01T13:00:00';render();const late=calls.at(-1);assert.equal(timers.size,1);[...timers.values()][0]();output=render();assert.equal(output.loading,false);assert(output.error.includes('tardó'));late.resolve([service(999)]);await tick();assert.equal(render().service,null);
 console.log('PASS 20s timeout remains recoverable and rejects late response');
 args[4]=false;output=render();assert.equal(output.service,null);assert.equal(timers.size,0);
 console.log('PASS disabled/closed context removes quote and cancels its timer');
 console.log('PASS 5 real quote-hook flows with controlled lifecycle/API/timers; no network or database');
}
main().catch(error=>{console.error(error);process.exitCode=1});
