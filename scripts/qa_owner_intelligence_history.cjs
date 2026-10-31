'use strict';
const assert=require('node:assert/strict');
const {createTestFixture,cleanTestFixture}=require('./test_fixture');
async function main(){
 if(Boolean(process.env.SYSTECH_TEST_PG_URL)!==Boolean(process.env.SYSTECH_TEST_PRISMA_CLIENT))throw Error('PostgreSQL requires a guarded test URL and separate client.');
 const fixture=createTestFixture();Object.assign(process.env,fixture.env);if(process.env.SYSTECH_TEST_PRISMA_CLIENT)require('./test_prisma_client');
 const {prisma}=require('@systech/database'),{ownerIntelligence}=require('../apps/api/dist/services/owner-intelligence.service');let count=0;
 const check=async(name,fn)=>{await fn();count++;console.log('PASS '+name)};
 try{
  const tenant=await prisma.tenant.create({data:{nombre:'Historical intelligence fixture',slug:'qa-historical-intelligence',plan:'CADENA'}}),branch=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'Historical fixture',zonaHoraria:'America/Mexico_City'}});
  const access={tenantId:tenant.id,userId:'fixture-user',email:'fixture@example.invalid',rol:'DUENO',branchIds:null},scope={tenantId:tenant.id,sucursalId:branch.id};
  const cash=await prisma.registroCaja.create({data:{...scope,tipo:'GASTO_MENOR',metodoPago:'EFECTIVO',monto:-25,usuarioId:access.userId,usuarioNombre:'Fixture owner',concepto:'Historical cash expense',fecha:new Date('2026-10-01T16:00:00Z')}});
  const query={sucursalId:branch.id,fechaInicio:'2026-10-01',fechaFin:'2026-10-02'};let before,expense;
  await check('Unclassified cash outflow prevents a false historical profit estimate',async()=>{
   before=await ownerIntelligence(access,query);assert.equal(before.periodo.corte.toISOString(),'2026-10-03T06:00:00.000Z');assert.equal(before.finanzas.gastosOperativos,0);assert.equal(before.finanzas.utilidadOperativaEstimada,null);assert(before.finanzas.datosInsuficientes.includes('Salidas de caja sin clasificación de gasto o compra.'));
  });
  await check('Classification after the historical cut cannot erase the prior missing-evidence warning',async()=>{
   expense=await prisma.gastoOperativo.create({data:{...scope,concepto:cash.concepto,categoria:'RENTA',fecha:cash.fecha,importe:25,metodoPago:'EFECTIVO',usuarioId:access.userId,usuarioNombre:'Fixture owner',registroCajaId:cash.id,creadoEn:new Date('2026-10-04T16:00:00Z')}});
   const after=await ownerIntelligence(access,query);assert.deepEqual(after.finanzas,before.finanzas);assert.equal(await prisma.registroCaja.count(),1);assert.equal(Number((await prisma.registroCaja.findUniqueOrThrow({where:{id:cash.id}})).monto),-25);
  });
  await check('Classification known before the cut includes the expense exactly once and preserves genuine zero capacity',async()=>{
   await prisma.gastoOperativo.update({where:{id:expense.id},data:{creadoEn:new Date('2026-10-01T17:00:00Z')}});
   const report=await ownerIntelligence(access,query);assert.equal(report.finanzas.gastosOperativos,25);assert.equal(report.finanzas.utilidadOperativaEstimada,-25);assert.deepEqual(report.finanzas.datosInsuficientes,[]);assert.equal(report.ocupacion.minutosDisponibles,0);assert.equal(report.ocupacion.porcentajeProgramado,null);assert.equal(report.ocupacion.porcentajeCompletado,null);
  });
  await check('A later correction and its compensatory cash link affect the later report, not the earlier cut',async()=>{
   const adjustment=await prisma.registroCaja.create({data:{...scope,tipo:'GASTO_MENOR',metodoPago:'EFECTIVO',monto:-5,usuarioId:access.userId,usuarioNombre:'Fixture owner',concepto:'Expense compensation',fecha:new Date('2026-10-04T16:00:00Z')}});
   const original={concepto:expense.concepto,categoria:'RENTA',fecha:expense.fecha.toISOString(),importe:25,metodoPago:'EFECTIVO',comprobanteReferencia:null};
   await prisma.correccionGasto.create({data:{...scope,gastoId:expense.id,version:2,registroCajaId:adjustment.id,anteriorJson:JSON.stringify(original),actualJson:JSON.stringify({...original,importe:30}),motivo:'Fictitious later correction',usuarioId:access.userId,usuarioNombre:'Fixture owner',fecha:new Date('2026-10-04T16:01:00Z')}});
   await prisma.gastoOperativo.update({where:{id:expense.id},data:{version:2}});
   const old=await ownerIntelligence(access,query);assert.equal(old.finanzas.gastosOperativos,25);assert.equal(old.finanzas.utilidadOperativaEstimada,-25);assert.deepEqual(old.finanzas.datosInsuficientes,[]);
   const later=await ownerIntelligence(access,{...query,fechaFin:'2026-10-05'});assert.equal(later.finanzas.gastosOperativos,30);assert.equal(later.finanzas.utilidadOperativaEstimada,-30);assert.deepEqual(later.finanzas.datosInsuficientes,[]);assert.equal(await prisma.registroCaja.count(),2);
  });
  await check('Foreign branch cash does not invalidate this branch; new products are not labeled failed',async()=>{
   const other=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'Other fixture branch'}});
   await prisma.registroCaja.create({data:{...scope,sucursalId:other.id,tipo:'GASTO_MENOR',metodoPago:'EFECTIVO',monto:-100,usuarioId:access.userId,usuarioNombre:'Fixture owner',concepto:'Other scope',fecha:cash.fecha}});
   await prisma.producto.create({data:{...scope,nombre:'New product fixture',tipo:'PRODUCTO',sku:'NEW',precioVenta:20,stockActual:3}});
   const report=await ownerIntelligence(access,query);assert.equal(report.finanzas.gastosOperativos,25);assert.deepEqual(report.finanzas.datosInsuficientes,[]);assert.equal(report.productos.inventario[0].estado,'SIN_HISTORIAL');assert.equal(report.productos.inventario[0].coberturaDias,null);
   await assert.rejects(ownerIntelligence({...access,rol:'BARBERO'},query),error=>error.statusCode===403);
  });
  console.log('PASS '+count+' historical intelligence checks on '+(process.env.SYSTECH_TEST_PG_URL?'isolated PostgreSQL':'disposable SQLite'));
 }finally{await prisma.$disconnect();cleanTestFixture(fixture.directory)}
}
main().catch(error=>{console.error(error);process.exitCode=1});
