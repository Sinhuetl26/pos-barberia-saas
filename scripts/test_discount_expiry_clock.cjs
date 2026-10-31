const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('apps/web/src/components/DiscountApprovalRequest.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function scenario(expiry){
 let now=100000,hook=0,timer,revoked=0,clockUpdates=[];const effects=[],listeners=new Map(),row={id:'fixture',estado:'APROBADA',expiraEn:expiry};
 const react={useState:initial=>{const index=hook++;return[index===0?row:typeof initial==='function'?initial():initial,value=>{if(index===5)clockUpdates.push(value);}];},useRef:current=>({current}),useEffect:(fn,deps)=>effects.push({fn,deps})};
 const win={setTimeout:(fn,delay)=>{timer={fn,delay};return 1;},clearTimeout:()=>{timer=undefined;},addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
 const doc={addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
 const Clock=class extends Date{static now(){return now;}};
 const mod={exports:{}};new Function('module','exports','require','window','document','Date',source)(mod,mod.exports,id=>id==='react'?react:id==='../api'?{api:{getTenantId:()=> 't',getUserId:()=> 'u'}}:require(id),win,doc,Clock);
 mod.exports.DiscountApprovalRequest({cart:{sucursalId:'b'},reason:'fixture',onApproved:approval=>{assert.equal(approval,null);revoked++;},onLock(){}});
 const cleanup=effects.find(effect=>effect.deps?.[0]===row).fn();
 return{get timer(){return timer;},get revoked(){return revoked;},listeners,clockUpdates,advance:value=>{now=value;},cleanup};
}
const live=scenario(new Date(101000).toISOString());assert.equal(live.revoked,0);assert.equal(live.timer.delay,1001);live.advance(101001);live.timer.fn();assert.equal(live.revoked,1);assert(live.clockUpdates.includes(101001));live.cleanup();assert.equal(live.timer,undefined);assert.equal(live.listeners.size,0);
for(const expiry of[undefined,'invalid',new Date(100000).toISOString()]){const invalid=scenario(expiry);assert.equal(invalid.revoked,1);assert.equal(invalid.timer,undefined);invalid.cleanup();}
const resumed=scenario(new Date(101000).toISOString());resumed.advance(102000);resumed.listeners.get('visibilitychange')();assert.equal(resumed.revoked,1);resumed.cleanup();
console.log('PASS reloj real del componente: retira permiso al vencer, actualiza texto, rechaza vigencia inválida, revalida al volver y limpia temporizador/listeners.');
