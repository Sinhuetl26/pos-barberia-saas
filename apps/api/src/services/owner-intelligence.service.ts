import { prisma, Prisma } from '@systech/database';
import { commercialBranch } from './commercial-operation.service';
import { appointmentTime, bookingDateBounds, configuredDays, civilParts, validDay } from './booking-time.service';
import { moneyCents } from './pricing.service';
import { expenseView } from './operating-expense.service';
import { SaleError } from './financial-error';

const parse=(raw:string|null)=>{try{return JSON.parse(raw||'null');}catch{return null;}};
const names=['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
type Interval=[number,number];
export function unionIntervals(items:Interval[]):Interval[]{const merged:Interval[]=[];for(const [start,end] of items.filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0])){const last=merged.at(-1);if(last&&start<=last[1])last[1]=Math.max(last[1],end);else merged.push([start,end]);}return merged;}
export function subtractIntervals(base:Interval[],removed:Interval[]):Interval[]{let result=unionIntervals(base);for(const [a,b] of unionIntervals(removed)){result=result.flatMap(([s,e])=>b<=s||a>=e?[[s,e]as Interval]:[[s,Math.min(a,e)],[Math.max(b,s),e]].filter(([x,y])=>y>x)as Interval[]);}return result;}
const minutes=(items:Interval[])=>unionIntervals(items).reduce((n,[a,b])=>n+(b-a)/60000,0);
const intersect=(a:Interval[],b:Interval[])=>a.flatMap(([s,e])=>b.map(([x,y])=>[Math.max(s,x),Math.min(e,y)]as Interval).filter(([x,y])=>y>x));
function threshold(raw:any,fallback:number){if(raw===undefined)return fallback;const value=Number(raw);if(typeof raw!=='string'||!/^\d+$/.test(raw)||!Number.isInteger(value)||value<1||value>366)throw new SaleError(400,'INVALID_THRESHOLD','Usa umbrales de 1 a 366 días.');return value;}
export async function ownerIntelligence(access:any,input:any){
 commercialBranch(access,input.sucursalId,true);validDay(input.fechaInicio);validDay(input.fechaFin);
 const branch=await prisma.sucursal.findFirst({where:{tenantId:access.tenantId,id:input.sucursalId,eliminadoEn:null}});if(!branch)throw new SaleError(404,'INVALID_BRANCH','Sucursal no disponible.');
 const start=bookingDateBounds(input.fechaInicio,branch.zonaHoraria).gte,end=bookingDateBounds(input.fechaFin,branch.zonaHoraria).lt;
 const calendarDays=Math.round((Date.parse(input.fechaFin+'T00:00:00Z')-Date.parse(input.fechaInicio+'T00:00:00Z'))/86400000)+1;
 if(calendarDays<1||calendarDays>93)throw new SaleError(400,'INVALID_PERIOD','Selecciona entre 1 y 93 días para el análisis detallado.');
 const noSaleDays=threshold(input.diasSinSalida,30),coverageWindow=threshold(input.coberturaDias,14),now=new Date(),cut=new Date(Math.min(end.getTime(),now.getTime()));
 const scope={tenantId:access.tenantId,sucursalId:branch.id};
 const sales=await prisma.venta.findMany({where:{...scope,fecha:{gte:start,lt:cut}},include:{items:true,devoluciones:{where:{fecha:{lt:cut}}}}});
 const ledger=await prisma.kardexMovimiento.findMany({where:{...scope,fecha:{lt:cut}},orderBy:{fecha:'asc'}});
 const consumption=await prisma.consumoServicio.findMany({where:{...scope,fecha:{gte:start,lt:end}}});
 const correctionLogs=await prisma.auditoriaLog.findMany({where:{tenantId:access.tenantId,accion:'CORRECCION_CONSUMO',fecha:{lt:cut}},orderBy:{fecha:'asc'}});
 const expenseRows=await prisma.gastoOperativo.findMany({where:scope});
 const historicalExpenses=expenseRows.filter(row=>row.creadoEn<cut);
 const [cashOutflows,cashCorrections]=await Promise.all([
  prisma.registroCaja.findMany({where:{...scope,tipo:'GASTO_MENOR',metodoPago:'EFECTIVO',custodiaUsuarioId:null,monto:{lt:0},fecha:{gte:start,lt:cut}},select:{id:true}}),
  prisma.correccionGasto.findMany({where:{...scope,gastoId:{in:historicalExpenses.map(row=>row.id)},fecha:{lt:cut}},select:{registroCajaId:true}})
 ]);
 // Classification is evidence only when it existed at this report's historical cut.
 const classifiedCash=new Set([...historicalExpenses.map(row=>row.registroCajaId),...cashCorrections.map(row=>row.registroCajaId)]);
 let net=0,tips=0,commissions=0,retailCost=new Prisma.Decimal(0),supplyCost=new Prisma.Decimal(0),expenses=0,purchases=0;
 const missing=new Set<string>(),ranking=new Map<string,any>();
 if(cashOutflows.some(row=>!classifiedCash.has(row.id)))missing.add('Salidas de caja sin clasificación de gasto o compra.');
 for(const sale of sales){
  const returned=sale.devoluciones.flatMap(r=>parse(r.itemsJson)||[]);
  tips+=moneyCents(sale.propina)-sale.devoluciones.reduce((n,r)=>n+moneyCents(r.propina),0);
  if(!sale.items.length)missing.add('Venta histórica sin desglose verificable.');
  for(const item of sale.items){
   if(item.tipoItem==='SERVICIO'&&!consumption.some(e=>e.servicioId===item.productoId&&(e.ventaId===sale.id||sale.citaId&&e.citaId===sale.citaId)))missing.add('Servicios vendidos sin evidencia de consumo en el periodo.');
   const returns=returned.filter((r:any)=>r.itemId===item.id),quantity=item.cantidad-returns.reduce((n:number,r:any)=>n+r.cantidad,0);
   const income=moneyCents(item.subtotal)-moneyCents(item.descuento)-returns.reduce((n:number,r:any)=>n+moneyCents(r.monto),0);
   // Included VAT is removed using the immutable rate on the original line.
   net+=new Prisma.Decimal(income).div(new Prisma.Decimal(1).plus(new Prisma.Decimal(item.tasaImpuesto).div(100))).toDecimalPlaces(0).toNumber();
   commissions+=moneyCents(item.comision)-returns.reduce((n:number,r:any)=>n+moneyCents(r.comision),0);
   const row=ranking.get(item.productoId)||{productoId:item.productoId,nombre:item.nombreItem,tipo:item.tipoItem,unidades:0,ingresos:0};row.unidades+=quantity;row.ingresos+=income;ranking.set(item.productoId,row);
   if(item.tipoItem==='PRODUCTO'&&quantity>0){const movement=ledger.find(k=>k.productoId===item.productoId&&k.tipoMovimiento==='VENTA_POS'&&parse(k.metadataJson)?.folio===sale.folio);const snapshot=parse(movement?.metadataJson||null);if(!snapshot?.costoConocido)missing.add('Artículos vendidos sin costo histórico acreditado.');else retailCost=retailCost.plus(new Prisma.Decimal(snapshot.costoUnitario).times(quantity));}
  }
 }
 for(const event of consumption){
  const corrections=correctionLogs.map(l=>parse(l.detalles)).filter(l=>l?.consumoId===event.id).sort((a,b)=>a.version-b.version);
  const items=corrections.at(-1)?.items||parse(event.itemsJson);
  if(event.recetaVersion===0||!Array.isArray(items))missing.add('Atenciones sin receta histórica acreditada.');
  for(const item of Array.isArray(items)?items:[]){if(!item.costoConocido)missing.add('Insumos utilizados sin costo histórico acreditado.');else supplyCost=supplyCost.plus(item.costoTotal);}
 }
 for(const row of expenseRows){
  const dto=await expenseView(prisma,row);
  // Reconstruct the expense at the period cut, rather than rewriting past periods with later corrections.
  const correction=dto.correcciones.filter((c:any)=>new Date(c.fecha)<cut).at(-1),actual=correction?.actual||dto.original;
  const date=new Date(actual.fecha);if(date<start||date>=end||row.creadoEn>=cut)continue;
  if(actual.categoria==='COMPRA_INVENTARIO')purchases+=moneyCents(actual.importe);else expenses+=moneyCents(actual.importe);
 }
 const products=await prisma.producto.findMany({where:{tenantId:access.tenantId,tipo:'PRODUCTO',eliminadoEn:null,OR:[{sucursalId:branch.id},{sucursalId:null}]}});
 const inventory=products.map(p=>{
  const movements=ledger.filter(k=>k.productoId===p.id),out=movements.filter(k=>Number(k.cantidad)<0&&['VENTA_POS','CONSUMO_SERVICIO'].includes(k.tipoMovimiento)),last=out.at(-1)?.fecha||null;
  const consumed=out.filter(k=>k.fecha.getTime()>=cut.getTime()-coverageWindow*86400000).reduce((n,k)=>n-Math.min(Number(k.cantidad),0),0);
  const days=last?Math.floor((cut.getTime()-last.getTime())/86400000):null;
  return {productoId:p.id,nombre:p.nombre,unidad:p.unidad,stockActual:Number(p.stockActual),stockMinimo:Number(p.stockMinimo),stockBajo:Number(p.stockActual)<=Number(p.stockMinimo),ultimaSalida:last,diasSinSalida:days,coberturaDias:consumed?Number(p.stockActual)/(consumed/coverageWindow):null,estado:!movements.length?'SIN_HISTORIAL':days===null?'SIN_SALIDAS':days>=noSaleDays?'REVISAR_ROTACION':'CON_MOVIMIENTO',stockEsActual:true};
 });
 const occupation=await capacity(branch,start,end);
 const knownCost=moneyCents(retailCost.plus(supplyCost));
 return {periodo:{fechaInicio:input.fechaInicio,fechaFin:input.fechaFin,zonaHoraria:branch.zonaHoraria,sucursalId:branch.id,corte:cut,umbrales:{diasSinSalida:noSaleDays,coberturaDias:coverageWindow},base:'Ventas por fecha original, devoluciones hasta corte; insumos por atención, gastos por fecha declarada. Compras no se restan como consumo. Ventas sin IVA ni propinas; costos y gastos capturados sin desglose fiscal. No utilidad fiscal.'},finanzas:{ventasNetas:net/100,propinas:tips/100,comisionesDevengadas:commissions/100,costoArticulos:moneyCents(retailCost)/100,costoInsumos:moneyCents(supplyCost)/100,gastosOperativos:expenses/100,comprasInventario:purchases/100,utilidadOperativaEstimada:missing.size?null:(net-commissions-knownCost-expenses)/100,datosInsuficientes:[...missing]},productos:{porUnidades:[...ranking.values()].sort((a,b)=>b.unidades-a.unidades).map(r=>({...r,ingresos:r.ingresos/100})),porIngresos:[...ranking.values()].sort((a,b)=>b.ingresos-a.ingresos).map(r=>({...r,ingresos:r.ingresos/100})),inventario:inventory},ocupacion:occupation,acciones:inventory.filter(p=>p.stockBajo||p.estado==='REVISAR_ROTACION').map(p=>({tipo:p.stockBajo?'REVISAR_REPOSICION':'REVISAR_ROTACION',productoId:p.productoId,motivo:p.stockBajo?'Stock actual en el mínimo configurado o por debajo.':'Última salida supera el umbral elegido.'}))};
}
async function capacity(branch:any,start:Date,end:Date){
 const barbers=await prisma.barbero.findMany({where:{sucursalId:branch.id,activo:true,eliminadoEn:null}}),scope={tenantId:branch.tenantId,sucursalId:branch.id};
 const overrides=await prisma.turnoEspecial.findMany({where:scope}),blocks=await prisma.bloqueoHorario.findMany({where:{...scope,fechaInicio:{lt:end},fechaFin:{gt:start}}});
 const appointments=await prisma.cita.findMany({where:{...scope,fechaHora:{lt:end},estado:{notIn:['CANCELADA','NO_SHOW']}}});
 let available=0,scheduled=0,completed=0;
 for(let day=new Date(start);day<end;){
  const date=civilParts(day,branch.zonaHoraria).day,bounds=bookingDateBounds(date,branch.zonaHoraria),weekday=names[new Date(date+'T12:00:00Z').getUTCDay()];
  for(const barber of barbers){const override=overrides.find(o=>o.barberoId===barber.id&&o.fecha===date);if(!configuredDays(branch.diasLaborales).includes(weekday)||!override&&configuredDays(barber.diasDescanso).includes(weekday))continue;
   const from=[branch.horarioApertura,override?.horarioInicio||barber.horarioInicio].sort().at(-1)!,to=[branch.horarioCierre,override?.horarioFin||barber.horarioFin].sort()[0];if(from>=to)continue;
   const open:Interval[]=[[appointmentTime(date+'T'+from+':00',branch.zonaHoraria).getTime(),appointmentTime(date+'T'+to+':00',branch.zonaHoraria).getTime()]];
   const blocked=blocks.filter(b=>!b.barberoId||b.barberoId===barber.id).map(b=>[b.fechaInicio.getTime(),b.fechaFin.getTime()]as Interval),slots=subtractIntervals(open,blocked);
   const visits=appointments.filter(a=>a.barberoId===barber.id),interval=(a:any):Interval=>[a.fechaHora.getTime(),a.fechaHora.getTime()+a.duracionMinutos*60000];
   available+=minutes(slots);scheduled+=minutes(intersect(slots,visits.map(interval)));completed+=minutes(intersect(slots,visits.filter(a=>a.estado==='COMPLETADA').map(interval)));
  }day=bounds.lt;
 }
 return {minutosDisponibles:available,minutosProgramados:scheduled,minutosCompletados:completed,porcentajeProgramado:available?100*scheduled/available:null,porcentajeCompletado:available?100*completed/available:null,base:'Horarios vigentes por profesional y fecha, menos unión de bloqueos/ausencias. Servicios sin buffer; citas superpuestas se cuentan una vez. Historial de capacidad no versionado: horarios actuales aplicados a fechas seleccionadas.'};
}

