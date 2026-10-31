import { prisma } from '@systech/database';
import { commercialBranch, commercialOperation } from './commercial-operation.service';
import { digest } from './cash-ledger.service';
import { createProductSchema } from '../validators/schemas';
import { stockQuantity, inventoryUnitCost } from './inventory-quantity.service';
import { WhatsAppService } from './whatsapp.service';
import { sanitizeCsvCell } from '../utils/security';
import { SaleError } from './financial-error';

const headers={catalogo:['nombre','tipo','sku','categoria','precioVenta','costo','stockActual','stockMinimo','naturaleza','unidad','duracionMinutos','tasaImpuesto'],clientes:['nombre','telefono','email']};
type Kind=keyof typeof headers;
const fail=(code:string,message:string,status=400):never=>{throw new SaleError(status,code,message);};
function kind(value:any):Kind{if(value!=='catalogo'&&value!=='clientes')fail('INVALID_IMPORT_KIND','Selecciona catálogo o clientes.');return value;}
export function parseImportCsv(raw:any):string[][]{
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>150*1024||raw.includes('\u0000'))fail('IMPORT_SIZE','CSV UTF-8 máximo 150 KB, sin datos binarios.');
 const csv=raw.replace(/^\uFEFF/,''),rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 for(let i=0;i<csv.length;i++){
  const ch=csv[i];
  if(quoted){if(ch==='"'){if(csv[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=ch;continue;}
  if(ch==='"'){if(cell||closed)fail('INVALID_CSV','Comillas fuera de posición.');quoted=true;continue;}
  if(ch===','||ch==='\n'||ch==='\r'){
   row.push(cell);cell='';closed=false;
   if(ch!==','){if(ch==='\r'&&csv[i+1]==='\n')i++;rows.push(row);row=[];if(rows.length>201)fail('IMPORT_ROWS','Máximo 200 filas por importación.');}
  }else{if(closed)fail('INVALID_CSV','Hay texto después de cerrar una celda entre comillas.');cell+=ch;}
 }
 if(quoted)fail('INVALID_CSV','Falta cerrar las comillas del CSV.');
 if(cell||row.length||closed){row.push(cell);rows.push(row);}if(rows.length>201)fail('IMPORT_ROWS','Máximo 200 filas por importación.');
 return rows;
}
function numeric(value:string,field:string){if(!/^\d+(?:\.\d+)?$/.test(value))fail('INVALID_IMPORT_ROW',`${field}: usa un número decimal sin separador de miles.`);return Number(value);}
function normalize(type:Kind,row:string[],branch:string){
 const source:any=Object.fromEntries(headers[type].map((key,i)=>[key,row[i].trim()]));
 if(source.nombre.length<2||source.nombre.length>300)fail('INVALID_IMPORT_ROW','Nombre de 2 a 300 caracteres requerido.');
 if(type==='clientes'){
  if(!source.telefono||!/^[+\d\s().-]+$/.test(source.telefono))fail('INVALID_IMPORT_ROW','Teléfono válido requerido.');
  source.telefono=WhatsAppService.normalizarTelefono(source.telefono);if(!/^\d{8,15}$/.test(source.telefono))fail('INVALID_IMPORT_ROW','Revisa la longitud del teléfono.');
  if(source.email&&(source.email.length>254||!/^\S+@\S+\.\S+$/.test(source.email)))fail('INVALID_IMPORT_ROW','Correo inválido.');
  return {nombre:source.nombre,telefono:source.telefono,email:source.email||null};
 }
 if(!source.sku||source.sku.length>100||source.categoria.length>100)fail('INVALID_IMPORT_ROW','SKU obligatorio (máximo100) y categoría máximo100.');
 for(const field of ['precioVenta','costo','stockActual','stockMinimo','duracionMinutos','tasaImpuesto'])source[field]=numeric(source[field],field);
 const result=createProductSchema.safeParse({...source,sucursalId:branch});if(!result.success)throw new SaleError(400,'INVALID_IMPORT_ROW',result.error.issues.map(i=>i.message).join('; '));
 const value=result.data;
 if(!Number.isInteger(value.duracionMinutos))fail('INVALID_IMPORT_ROW','La duración debe ser entera.');
 stockQuantity(value.stockActual,value.unidad,true);stockQuantity(value.stockMinimo,value.unidad,true);inventoryUnitCost(value.costo);
 if(value.naturaleza==='REVENTA'&&value.unidad!=='PIEZA'||value.tipo==='SERVICIO'&&(value.naturaleza!=='REVENTA'||value.stockActual||value.stockMinimo))fail('INVALID_IMPORT_ROW','Reventa en piezas; servicios sin stock; ML/G sólo insumos.');
 return value;
}
async function preview(tx:any,access:any,input:any){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('INVALID_IMPORT','Revisa el archivo y la sucursal.');
 commercialBranch(access,input.sucursalId,true);const type=kind(input.tipo),csv=parseImportCsv(input.csv);
 if(!await tx.sucursal.findFirst({where:{id:input.sucursalId,tenantId:access.tenantId,eliminadoEn:null}}))fail('INVALID_BRANCH','Sucursal no disponible.',404);
 if(!csv.length||JSON.stringify(csv[0])!==JSON.stringify(headers[type]))fail('IMPORT_HEADERS','Usa exactamente los encabezados y orden de la plantilla.');
 // Narrow tenant-wide identity lookup detects hidden-branch duplicates without returning their records.
 const existing:any[]=type==='catalogo'?await tx.$queryRaw`SELECT "sku" FROM "Producto" WHERE "tenantId"=${access.tenantId} AND "eliminadoEn" IS NULL`:await tx.$queryRaw`SELECT "telefono" FROM "ClienteFinal" WHERE "tenantId"=${access.tenantId}`;
 const keys=new Set(existing.map(r=>type==='catalogo'?r.sku?.trim().toLowerCase():r.telefono?WhatsAppService.normalizarTelefono(r.telefono):null).filter(Boolean)),seen=new Set<string>(),rows:any[]=[],errors:any[]=[];
 for(let i=1;i<csv.length;i++){
  try{if(csv[i].length!==headers[type].length)fail('INVALID_IMPORT_ROW','La fila no coincide con los encabezados.');const data:any=normalize(type,csv[i],input.sucursalId),key=type==='catalogo'?data.sku.toLowerCase():data.telefono;
   if(seen.has(key))fail('INVALID_IMPORT_ROW','Identificador repetido en el archivo.');seen.add(key);if(keys.has(key))fail('INVALID_IMPORT_ROW','El identificador ya existe en el negocio; no se sobrescribirá.');rows.push({row:i+1,data});
  }catch(error:any){errors.push({row:i+1,message:error instanceof SaleError?error.message:'Fila inválida.'});}
 }
 const previewHash=digest({tenant:access.tenantId,actor:access.userId,branch:input.sucursalId,type,csv:input.csv,keys:[...keys].sort()});
 return {rows,errors,previewHash,canConfirm:rows.length>0&&errors.length===0,summary:{valid:rows.length,total:csv.length-1},policy:'Lote completo o ninguno. No sobrescribe registros; no inventa visitas, compras, consentimiento ni historial.'};
}
export async function previewDataImport(access:any,input:any){return preview(prisma,access,input);}
export async function confirmDataImport(access:any,input:any){return commercialOperation(access,{...input,operacion:'IMPORTAR_DATOS'},async tx=>{
 await tx.$executeRaw`UPDATE "Tenant" SET "id"="id" WHERE "id"=${access.tenantId}`;
 const result=await preview(tx,access,input);if(result.previewHash!==input.previewHash)fail('IMPORT_PREVIEW_CHANGED','El archivo o catálogo cambió. Revisa nuevamente.',409);if(!result.canConfirm)fail('IMPORT_ERRORS','Corrige todas las filas antes de confirmar.');
 for(const row of result.rows){
  if(input.tipo==='clientes')await tx.clienteFinal.create({data:{tenantId:access.tenantId,sucursalOrigenId:input.sucursalId,...row.data}});
  else{const product=await tx.producto.create({data:{tenantId:access.tenantId,...row.data}});
   if(Number(product.stockActual)>0)await tx.kardexMovimiento.create({data:{tenantId:access.tenantId,sucursalId:input.sucursalId,productoId:product.id,tipoMovimiento:'ENTRADA_COMPRA',cantidad:product.stockActual,stockAnterior:0,stockNuevo:product.stockActual,usuarioId:access.userId,motivo:'Inventario inicial por importación',metadataJson:JSON.stringify({version:1,origen:'IMPORTACION_INICIAL',unidad:product.unidad,costoUnitario:product.costo?.toString(),usuarioNombre:access.email})}});
  }
 }
 await tx.auditoriaLog.create({data:{tenantId:access.tenantId,usuarioEmail:access.email,accion:'DATOS_IMPORTADOS',detalles:JSON.stringify({sucursalId:input.sucursalId,tipo:input.tipo,filas:result.rows.length})}});
 return {imported:result.rows.length,kind:input.tipo};
},true);}
export function importTemplate(type:any){return headers[kind(type)].map(sanitizeCsvCell).join(',')+'\r\n';}
export async function exportImportData(access:any,input:any){
 commercialBranch(access,input.sucursalId,true);const type=kind(input.tipo),where=type==='catalogo'?{tenantId:access.tenantId,eliminadoEn:null,OR:[{sucursalId:input.sucursalId},{sucursalId:null}]}:{tenantId:access.tenantId,eliminadoEn:null,OR:[{sucursalOrigenId:input.sucursalId},{citas:{some:{sucursalId:input.sucursalId,tenantId:access.tenantId}}},{ventas:{some:{sucursalId:input.sucursalId,tenantId:access.tenantId}}}]};
 const model:any=type==='catalogo'?prisma.producto:prisma.clienteFinal;
 if(await model.count({where})>5000)fail('EXPORT_LIMIT','Más de5000 registros: selecciona otro alcance; no se exporta un archivo parcial.',413);
 const records=await model.findMany({where,orderBy:{id:'asc'}});
 if(records.length>5000)fail('EXPORT_LIMIT','Más de5000 registros: no se exporta un archivo parcial.',413);
 return importTemplate(type)+records.map((r:any)=>headers[type].map(h=>sanitizeCsvCell(typeof r[h]==='string'&&/^\s+[=+\-@]/.test(r[h])?"'"+r[h]:r[h])).join(',')).join('\r\n')+'\r\n';
}
