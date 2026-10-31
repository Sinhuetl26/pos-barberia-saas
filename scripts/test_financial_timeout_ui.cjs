'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),{randomUUID}=require('node:crypto');
function compile(file,requireFn,...extra){
 const module={exports:{}};
 const source=fs.readFileSync(file,'utf8').replace(/const API_BASE =[^\n]+/,"const API_BASE = 'http://fixture.invalid/api';");
 const javascript=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('exports','module','require','localStorage','window','fetch','crypto','Event','CustomEvent',javascript)(module.exports,module,requireFn,...extra);
 return module.exports;
}
async function main(){
 const items=new Map(),removals=[],events=[],timers=new Map();let timerId=0,mode='abort-fetch',writes=0;
 const localStorage={getItem:key=>items.get(key)??null,setItem:(key,value)=>items.set(key,value),removeItem:key=>{removals.push(key);items.delete(key)}};
 const window={setTimeout:(callback,ms)=>{assert.equal(ms,20000);const id=++timerId;timers.set(id,callback);return id},clearTimeout:id=>timers.delete(id),dispatchEvent:event=>{events.push(event);return true}};
 const requests=[],committed=new Map();
 const awaitAbort=signal=>new Promise((_,reject)=>{if(signal.aborted)reject(new DOMException('Aborted','AbortError'));else signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})});
 const fetch=async(url,options)=>{
  requests.push({url,body:options.body,signal:options.signal,headers:options.headers});const body=JSON.parse(options.body);assert(options.signal instanceof AbortSignal);
  if(!committed.has(body.idempotencyKey)){writes++;committed.set(body.idempotencyKey,{id:'confirmed-'+writes,replayed:false})}
  if(mode==='abort-fetch')return awaitAbort(options.signal);
  if(mode==='abort-body')return {ok:true,status:200,json:()=>awaitAbort(options.signal)};
  return {ok:true,status:200,json:async()=>({...committed.get(body.idempotencyKey),replayed:true})};
 };
 const intent=compile('apps/web/src/utils/financialIntent.ts',()=>({}));
 class FixtureCustomEvent extends Event{constructor(name,options){super(name);this.detail=options?.detail}}
 const {api,ApiError}=compile('apps/web/src/api.ts',name=>name==='./utils/financialIntent'?intent:{},localStorage,window,fetch,{randomUUID},Event,FixtureCustomEvent);
 api.setContext('fixture-tenant','DUENO','fixture-owner');api.setAuthToken('fixture-test-token');
 const key=intent.financialIntentKey('fixture-tenant','fixture-owner');
 const begin=api.abrirCorteCaja('fixture-branch',100,'Fixture cash timeout');
 assert.equal(timers.size,1);assert.equal(writes,1);const saved=localStorage.getItem(key),firstBody=requests[0].body;
 [...timers.values()][0]();
 await assert.rejects(begin,error=>error instanceof ApiError&&error.status===0&&error.code==='FINANCIAL_RESULT_UNCERTAIN');
 assert.equal(timers.size,0);assert.equal(localStorage.getItem(key),saved);assert.equal(api.pendingFinancial().body.idempotencyKey,JSON.parse(firstBody).idempotencyKey);assert.equal(removals.filter(v=>v===key).length,0);
 console.log('PASS aborted fetch exits at bounded deadline and preserves the durable UUID after simulated server commit');
 const before=requests.length;
 await assert.rejects(api.abrirCorteCaja('fixture-branch',101,'Fixture cash timeout'),error=>error.code==='PENDING_FINANCIAL');
 assert.equal(requests.length,before);assert.equal(localStorage.getItem(key),saved);
 console.log('PASS changed amount cannot replace uncertain operation or issue another request');
 mode='success';const recovered=await api.recoverFinancial();assert.equal(recovered.id,'confirmed-1');assert.equal(recovered.replayed,true);assert.equal(requests[1].body,firstBody);assert.equal(requests[1].url,requests[0].url);assert.equal(requests[1].headers.authorization,'Bearer fixture-test-token');assert.equal(writes,1);assert.equal(localStorage.getItem(key),null);assert.equal(removals.filter(v=>v===key).length,1);assert.equal(timers.size,0);assert.equal(await api.recoverFinancial(),null);assert.equal(requests.length,2);
 console.log('PASS recovery uses exact saved body, path and auth, clears once and never writes a second cash turn');
 assert.equal(events.filter(event=>event.detail?.completed).length,1);assert(events.some(event=>event.type==='systech:financial'&&!event.detail));
 console.log('PASS existing pending/completed financial events still update the interface');
 mode='abort-body';const refund=api.returnSale('fixture-sale',{motivo:'Fixture refund',items:[{itemId:'fixture-item',cantidad:1}]});await Promise.resolve();await Promise.resolve();const refundSaved=localStorage.getItem(key);assert.equal(timers.size,1);[...timers.values()][0]();await assert.rejects(refund,error=>error.code==='FINANCIAL_RESULT_UNCERTAIN');assert.equal(localStorage.getItem(key),refundSaved);assert.equal(timers.size,0);
 mode='success';const result=await api.recoverFinancial();assert.equal(result.id,'confirmed-2');assert.equal(requests.at(-1).body,requests.at(-2).body);assert.equal(writes,2);assert.equal(localStorage.getItem(key),null);assert.equal(timers.size,0);
 console.log('PASS deadline also covers stalled response-body parsing; refund recovery reuses the original UUID');
 console.log('PASS 5 financial timeout/recovery checks with the real transpiled API client, fake timers and no network/database');
}
main().catch(error=>{console.error(error);process.exitCode=1});
