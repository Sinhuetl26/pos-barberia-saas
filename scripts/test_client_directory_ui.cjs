'use strict';
// Real component source, controlled hook lifecycle and deferred API responses; no browser or network.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const values=[],refs=[],effects=[],queue=[];let si=0,ri=0,ei=0,tenant='first';const pending=[],campaigns=[];
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const react={
 useState:initial=>{const i=si++;if(!(i in values))values[i]=initial;return[values[i],v=>{values[i]=typeof v==='function'?v(values[i]):v}]},
 useRef:initial=>refs[ri++]??(refs[ri-1]={current:initial}),
 useEffect:(fn,deps)=>{const i=ei++,old=effects[i];if(!old||deps.some((v,j)=>v!==old.deps[j])){old?.cleanup?.();effects[i]={deps};queue.push(()=>{effects[i].cleanup=fn()})}}
};
const api={getTenantId:()=>tenant,getUserId:()=> 'fixture-owner',getUserRole:()=> 'DUENO',getClientes:search=>{const d=deferred();pending.push({...d,search});return d.promise},getReactivacionCampana:days=>{const d=deferred();campaigns.push({...d,days});return d.promise}};
const scope={exports:{}},jsx=(type,props,key)=>({type,props,key});
new Function('exports','module','require',ts.transpileModule(fs.readFileSync('apps/web/src/views/ClientesView.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(scope.exports,scope,name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='react-router-dom'?{useSearchParams:()=>[new URLSearchParams(),()=>{}]}:name==='../api'?{api}:{});
function render(){si=ri=ei=0;const tree=scope.exports.ClientesView({sucursalId:'fixture'});while(queue.length)queue.shift()();return tree}
function nodes(tree){const out=[];function walk(n){if(Array.isArray(n))n.forEach(walk);else if(n&&typeof n==='object'){out.push(n);walk(n.props?.children)}}walk(tree);return out}
const text=n=>Array.isArray(n)?n.map(text).join(''):n&&typeof n==='object'?text(n.props?.children):n==null?'':String(n);
const tick=()=>new Promise(r=>setImmediate(r));
const button=(tree,label)=>{const found=nodes(tree).find(n=>n.type==='button'&&text(n).includes(label));assert(found,'Missing button: '+label);return found};
async function main(){
 render();pending[0].reject(Error('Fixture API unavailable'));await tick();let tree=render();assert(text(tree).includes('Fixture API unavailable'));assert(!text(tree).includes('No se encontraron clientes'));
 console.log('PASS initial failed directory request presents its error rather than an empty catalog');
 button(tree,'Reintentar consulta').props.onClick();pending.at(-1).resolve([{id:'base',nombre:'Current client',totalVisitas:1}]);await tick();tree=render();assert(text(tree).includes('Current client'));
 console.log('PASS directory retry replaces the error with actual client rows');
 const input=()=>nodes(tree).find(n=>n.type==='input'&&n.props.placeholder?.startsWith('Buscar'));
 input().props.onChange({target:{value:'old'}});tree=render();const old=pending.at(-1);input().props.onChange({target:{value:'new'}});tree=render();const next=pending.at(-1);next.resolve([{id:'new',nombre:'Newest match',totalVisitas:3}]);await tick();old.resolve([{id:'old',nombre:'Stale match',totalVisitas:5}]);await tick();tree=render();assert(text(tree).includes('Newest match'));assert(!text(tree).includes('Stale match'));
 console.log('PASS a slower previous search cannot replace the latest result');
 input().props.onChange({target:{value:'owner-old'}});tree=render();const previousScope=pending.at(-1);tenant='second';tree=render();const currentScope=pending.at(-1);previousScope.resolve([{id:'secret',nombre:'OLD TENANT SECRET'}]);await tick();assert(!text(render()).includes('OLD TENANT SECRET'));currentScope.resolve([{id:'current',nombre:'New tenant client',totalVisitas:0}]);await tick();tree=render();assert(text(tree).includes('New tenant client'));
 console.log('PASS response from the previous tenant is ignored after context changes');
 button(tree,'Recuperar clientes').props.onClick();render();campaigns.at(-1).reject(Error('Fixture campaign error'));await tick();tree=render();assert(text(tree).includes('Fixture campaign error'));assert(button(tree,'Reintentar seguimiento'));
 console.log('PASS failed follow-up request presents a visible error and retry');
 button(tree,'Reintentar seguimiento').props.onClick();campaigns.at(-1).resolve({clientes:[{id:'inactive',nombre:'Real contract inactive',diasSinVenir:40,fechaUltimaVisita:'2026-09-01T12:00:00Z',gastoTotal:10,whatsappUrl:null}]});await tick();tree=render();assert(text(tree).includes('Real contract inactive'));assert(text(tree).includes('40 días ausente'));
 console.log('PASS follow-up retry renders real clientes/diasSinVenir fields from the API contract');
 console.log('PASS 6 directory/follow-up flows using real transpiled ClientesView with controlled hooks and promises');
}
main().catch(error=>{console.error(error);process.exitCode=1});
