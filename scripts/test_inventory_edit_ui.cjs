'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const file=fs.readFileSync('apps/web/src/views/InventarioView.tsx','utf8');
const source=file.slice(file.indexOf('type InventoryEditDraft'),file.indexOf('function movementDetails'));
const compiled={exports:{}};
new Function('exports','module','inventoryKind',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText)(compiled.exports,compiled,p=>p.tipo==='SERVICIO'?'SERVICIO':p.naturaleza==='INSUMO'?'INSUMO':'PRODUCTO');
const {inventoryEditDraft,inventoryEditPayload}=compiled.exports;
const product=(extra={})=>({id:'fixture',tipo:'PRODUCTO',naturaleza:'REVENTA',nombre:'Cera mate',categoria:'Styling',sku:'CE-1',duracionMinutos:0,precioVenta:150,tasaImpuesto:16,costo:50,stockActual:3,stockMinimo:5,activo:true,unidad:'PIEZA',...extra});
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name)};
check('service edit sends duration and commercial fields but never stock',()=>{const payload=inventoryEditPayload(inventoryEditDraft(product({tipo:'SERVICIO',nombre:' Corte clásico ',duracionMinutos:45,stockActual:999})));assert.equal(payload.nombre,'Corte clásico');assert.equal(payload.duracionMinutos,45);assert.equal(payload.stockMinimo,undefined);assert.equal('stockActual' in payload,false)});
check('resale edit keeps sale price, SKU and minimum without reclassifying units',()=>{const payload=inventoryEditPayload(inventoryEditDraft(product()));assert.equal(payload.precioVenta,150);assert.equal(payload.sku,'CE-1');assert.equal(payload.stockMinimo,5);assert.equal('unidad' in payload,false);assert.equal('naturaleza' in payload,false)});
check('supply edit cannot accidentally acquire a sale price',()=>{const payload=inventoryEditPayload(inventoryEditDraft(product({naturaleza:'INSUMO',unidad:'ML',precioVenta:900,costo:.2,stockMinimo:100})));assert.equal(payload.precioVenta,0);assert.equal(payload.costo,.2);assert.equal(payload.stockMinimo,100)});
check('blank SKU is normalized without changing the physical balance',()=>{const payload=inventoryEditPayload({...inventoryEditDraft(product()),sku:'   '});assert.equal(payload.sku,null);assert.equal('stockActual' in payload,false)});
console.log(`Inventory edit UI helpers: ${count}/${count} passed; no API or database writes.`);

