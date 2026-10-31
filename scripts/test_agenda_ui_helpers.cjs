const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript');
function load(file) { const module = {exports:{}}; new Function('exports','module',ts.transpileModule(fs.readFileSync('apps/web/src/utils/'+file+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(module.exports,module); return module.exports; }
const {appointmentLanes,localMinutes} = load('agendaLayout');
const {findNextBookingSlot,addBookingDays} = load('nextBookingSlot');
let count=0; async function check(name,fn){await fn();count++;console.log('PASS '+name);}
(async()=>{
 await check('Branch timezone positions are independent of browser/server zone',()=>{assert.equal(localMinutes('2026-10-12T16:00:00Z','America/Mexico_City'),600);assert.equal(localMinutes('2026-10-12T16:00:00Z','America/Cancun'),660);});
 await check('Touching appointments share a lane; overlapping legacy appointments do not',()=>{const result=appointmentLanes([{id:'a',start:600,end:630},{id:'b',start:630,end:660},{id:'c',start:640,end:670},{id:'d',start:670,end:700}]);assert.equal(result[0].lanes,1);assert.equal(result[1].lanes,2);assert.notEqual(result[1].lane,result[2].lane);assert.equal(result[3].lanes,1);});
 await check('Date iteration crosses month/year boundaries without daylight offset drift',()=>{assert.equal(addBookingDays('2026-12-31',1),'2027-01-01');assert.equal(addBookingDays('2028-02-28',1),'2028-02-29');});
 await check('First available search skips full days and sorts actual slots',async()=>{const days=[];const result=await findNextBookingSlot('2026-10-11','2026-11-01',async date=>{days.push(date);return {slots:date==='2026-10-13'?[{hora:'11:00',disponible:true},{hora:'09:00',disponible:false},{hora:'10:00',disponible:true}]:[]};},()=>false);assert.deepEqual(result,{date:'2026-10-13',hora:'10:00'});assert.equal(days.length,3);});
 await check('Search stops at errors instead of claiming a later slot is first',async()=>{let calls=0;await assert.rejects(()=>findNextBookingSlot('2026-10-11','2026-11-20',async()=>{calls++;throw Error('network');},()=>false),/network/);assert.equal(calls,1);});
 await check('Cancellation prevents stale results and further network calls',async()=>{let cancel=false,calls=0;const result=await findNextBookingSlot('2026-10-11','2026-11-20',async()=>{calls++;cancel=true;return {slots:[{hora:'10:00',disponible:true}]};},()=>cancel);assert.equal(result,null);assert.equal(calls,1);});
 await check('Search respects 30-day and booking horizon limits',async()=>{let calls=0;await findNextBookingSlot('2026-10-11','2027-01-01',async()=>{calls++;return {slots:[]};},()=>false);assert.equal(calls,30);calls=0;await findNextBookingSlot('2026-10-11','2026-10-12',async()=>{calls++;return {slots:[]};},()=>false);assert.equal(calls,2);});
 console.log(`UI schedule regressions: ${count}/${count} passed`);
})().catch(error=>{console.error(error);process.exitCode=1;});
