const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const output = esbuild.buildSync({ entryPoints:['apps/web/src/components/Navbar.tsx'],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.css':'empty'},define:{'import.meta.env':'{}'},external:['react','react-dom','react-dom/*'] }).outputFiles[0].text;
const compiled={exports:{}};
new Function('module','exports','require','localStorage',output)(compiled,compiled.exports,require,{getItem:()=>null});
const {Navbar}=compiled.exports;
const base={tenants:[],currentTenant:{id:'fixture',nombre:'Barbería ficticia',plan:'PRO'},sucursales:[{id:'branch',nombre:'Local ficticio'}],currentSucursal:{id:'branch',nombre:'Local ficticio'},currentUser:{nombre:'Demo'},onSelectTenant(){},onSelectSucursal(){},onSelectRole(){},onSelectView(){},onOpenOnboarding(){},onOpenPublicBooking(){}};
let count=0;
for(const role of ['DUENO','BARBERO','CAJERO','GERENTE','SUPER_ADMIN']) {
  const render=view=>renderToStaticMarkup(React.createElement(Navbar,{...base,currentRole:role,currentView:view}));
  const agenda=render('agenda'), checkout=render('pos');
  assert.ok(agenda.includes('studio-sidebar') && checkout.includes('studio-sidebar'),role+' keeps the same workspace');
  assert.ok(!checkout.includes('silla-topbar'),role+' has no separate checkout navigation');
  if(role==='BARBERO') {assert.ok(checkout.includes('Mi agenda'));assert.ok(!checkout.includes('Inventario'));assert.ok(!checkout.includes('Plan y licencia'));}
  if(role==='CAJERO') {assert.ok(checkout.includes('Caja y cierres'));assert.ok(!checkout.includes('Equipo y comisiones'));assert.ok(!checkout.includes('Reportes'));}
  if(role==='DUENO') {assert.ok(checkout.includes('Cobrar'));assert.ok(checkout.includes('Caja y cierres'));assert.ok(checkout.includes('Equipo y comisiones'));assert.ok(checkout.includes('Configuración'));assert.ok(checkout.includes('Seleccionar sucursal'));}
  if(role==='SUPER_ADMIN') {assert.ok(checkout.includes('Negocios y licencias'));assert.ok(!checkout.includes('Navegación rápida'));}
  console.log('PASS shared navigation and role visibility: '+role);count++;
}
const cash=renderToStaticMarkup(React.createElement(Navbar,{...base,currentRole:'DUENO',currentView:'caja'}));
assert.ok(cash.includes('studio-more-navigation'), 'Business settings grouped consistently');
const quick=cash.split('aria-label="Navegación rápida"')[1];
const selected=quick.match(/<button\b[^>]*aria-current="page"[^>]*>[\s\S]*?<\/button>/g) || [];
assert.equal(selected.length,1);
assert.ok(selected[0].includes('Más'),'More reflects the active cash route; Home is not highlighted');
console.log('PASS focused cash navigation and mobile current-page indicator');count++;
console.log(`${count}/${count} navigation role checks passed. API authorization is verified separately.`);

const ownerNav=view=>renderToStaticMarkup(React.createElement(Navbar,{...base,currentRole:'DUENO',currentView:view}));
const menuIds=html=>[...html.matchAll(/class="studio-nav-item[^>]*>[\s\S]*?<span class="flex-1 text-left">([^<]+)<\/span>/g)].map(m=>m[1]);
assert.deepEqual(menuIds(ownerNav('agenda')),menuIds(ownerNav('caja')));
assert.deepEqual(menuIds(ownerNav('pos')),menuIds(ownerNav('caja')));
assert.match(ownerNav('configuracion'),/<details[^>]*open=""[^>]*><summary>Mi negocio<\/summary>/);
assert(ownerNav('seguridad').includes('workspace-title text-xs font-medium">Seguridad de mi cuenta'));
console.log('PASS same navigation order across Agenda/Cobrar/Caja, active business group open and security title.');
