'use strict';
// Reorganización documental autorizada; no modifica aplicación, proveedores ni datos operativos.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'docs/BACKLOG_LANZAMIENTO.json');
const before = JSON.parse(fs.readFileSync(file, 'utf8'));
if (before.historias.some(h => h.id === 'ST-43')) throw new Error('Reorganización ya aplicada; no sobrescribir ajustes posteriores.');
fs.writeFileSync(path.join(root, '.tools/backlog-antes-reorganizacion-20261009.json'), JSON.stringify(before, null, 2) + '\n');
const b = structuredClone(before);
const get = id => b.historias.find(h => h.id === id);
b.fecha = '2026-10-09';
b.objetivo = 'Validar 1–3 pilotos independientes y su primera renovación; después llegar a diez negocios pagando y habilitar cadenas por separado';
b.reglas.sprint = 'Secuencia reorganizada 9/oct: Sprint 3 demo/demanda; 4 operación; 5 piloto/renovación; 6 diferenciación y salida independiente; 7 cadenas; 8 conectores; 9 expansión. Bloques sin fecha garantizada.';
b.reorganizacion = {fecha:'2026-10-09',motivo:'Autorización de Sinhue: priorizar primeros compradores y gasto esencial',historia_original_maxima:42,conservar_estados:true,alcance:'Oferta independiente y cadena con autorizaciones separadas; ninguna contratación o cobro habilitado por reorganizar'};
b.sprints = [
  {numero:1,titulo:'Seguridad y modelo comercial',objetivo:'Conservar evidencia; resolver pendiente fiscal ST-01 antes de live'},
  {numero:2,titulo:'Operación de mostrador',objetivo:'Conservar cierres y resolver correo/hardware ST-08/09 antes del piloto real'},
  {numero:3,titulo:'Demo profesional y validación de demanda',objetivo:'Pulido previo, entrevistas, demo y cola durable; sin contratar servicios'},
  {numero:4,titulo:'Operación segura y cobranza lista',objetivo:'Licencia, despliegue, restauración, privacidad, pago live y capacidad independiente'},
  {numero:5,titulo:'Pilotos independientes y primera renovación',objetivo:'Actas, oferta acotada, onboarding, soporte y métricas con negocios reales'},
  {numero:6,titulo:'Valor agregado y salida independiente',objetivo:'Inventario/insumos, resumen, pulido completo, regresión y expansión hacia diez clientes'},
  {numero:7,titulo:'Cadenas con autorización propia',objetivo:'Permisos por ubicación, piloto concurrente y go/no-go de Cadena'},
  {numero:8,titulo:'Conectores opcionales sostenibles',objetivo:'WhatsApp y CFDI por barbería con costo, consentimiento y pruebas reales'},
  {numero:9,titulo:'Expansión posterior según evidencia',objetivo:'Priorizar anticipos, membresías, offline, Calendar, referidos e IA por demanda y costo'}
];
for (const h of b.historias) {
  h.sprint_original = h.sprint;
  if (['ST-10','ST-11','ST-13','ST-14','ST-15','ST-16'].includes(h.id)) h.sprint=4;
  if (['ST-17','ST-20','ST-26','ST-27','ST-28'].includes(h.id)) h.sprint=5;
  if (['ST-29','ST-30','ST-31','ST-32','ST-33','ST-41','ST-42'].includes(h.id)) h.sprint=6;
  if (['ST-18','ST-19'].includes(h.id)) h.sprint=7;
  if (['ST-21','ST-22','ST-23','ST-24','ST-25'].includes(h.id)) h.sprint=8;
  if (h.sprint !== h.sprint_original) h.ultima_repriorizacion='2026-10-09';
}
get('ST-12').siguiente_paso='Siguiente implementación técnica: refinar tarea durable y reinicios en dos procesos aislados; medir necesidad/costo de worker antes de contratar.';
get('ST-20').titulo='Puerta de piloto pagado independiente y oferta inicial';
get('ST-20').depende_de=['ST-17','ST-45','ST-16','ST-15','ST-01'];
get('ST-20').aceptacion=[
  'P0 del núcleo, fiscalidad, correo, dispositivos, licencia live, respaldo/restauración y actas de ST-17/ST-45 aprobados; cero defectos críticos o de alto impacto en venta/cierre abiertos',
  'Oferta para una sucursal dentro de capacidad medida; límites, total fiscal, renovación, cancelación y soporte explícitos. Cadena no se autoriza con esta acta',
  'Ofertar solo núcleo y funciones habilitadas, sin cobrar add-ons no disponibles; alta y cancelación verificadas',
  'Tablero comercial con diez candidatos reales y responsables; no contar pruebas gratis como MRR'
];
get('ST-20').siguiente_paso='Preparar acta para independientes tras ST-17 y carga ST-45; la autorización de Cadena se conserva en ST-46.';
get('ST-26').titulo='Altas de los primeros pilotos y mesa de ayuda';
get('ST-26').aceptacion.push('Aplicar onboarding a los primeros 1–3 comercios autorizados, registrar primera caja y tiempo real. Llegar a diez clientes de pago se conserva como ST-48, no como requisito para instrumentar soporte.');
get('ST-26').siguiente_paso='Preparar guía y canal antes del piloto; aceptación con altas reales después de ST-20.';
get('ST-27').depende_de.push('ST-44');
get('ST-27').aceptacion[0]='Esencial y Pro de una sucursal muestran límites, impuestos, cuotas, cancelación y funciones comprobadas; Cadena figura pendiente o fuera de contratación hasta ST-46. Cada add-on requiere su validación propia';
get('ST-27').siguiente_paso='Guion/entrevistas se adelantan en ST-44; publicación comercial mantiene ST-20/ST-15 y alcance autorizado.';
get('ST-28').siguiente_paso='Preparar definiciones/instrumentación antes de abrir piloto; validar conciliación con datos reales desde el primer cliente, sin exigir diez cuentas.';
get('ST-30').depende_de=['ST-02','ST-06','ST-08','ST-41','ST-42'];
get('ST-30').siguiente_paso='Resumen independiente sin esperar cadenas: análisis conciliado y señales de stock/insumos tras ST-41/42. Comparación central de ubicaciones mantiene ST-18/46.';
get('ST-31').depende_de=['ST-43','ST-26'];
get('ST-31').siguiente_paso='Pulido previo de cuatro flujos en ST-43; aquí conservar revisión completa, accesibilidad y rendimiento en dispositivos reales con feedback del piloto.';
get('ST-32').titulo='Regresión e incidente para salida independiente';
get('ST-32').depende_de=['ST-45','ST-26','ST-28','ST-31'];
get('ST-32').aceptacion.push('Informe explícito del alcance independiente; capacidades de cadena se revisan en ST-19/ST-46 y no se certifican mediante este cierre');
get('ST-33').titulo='Decisión de venta general independiente y versión comercial';
get('ST-33').depende_de.push('ST-20','ST-47');
get('ST-33').aceptacion[1]='Add-on sin aprobación externa queda deshabilitado y fuera de oferta; Cadena requiere ST-19 y autorización ST-46. Esta acta habilita exclusivamente oferta independiente dentro de capacidad probada';
get('ST-33').siguiente_paso='Cerrar go/no-go independiente con evidencia de operación, recuperación y primera renovación; no esperar integraciones opcionales ni certificar Cadena.';
get('ST-41').siguiente_paso='Inventario diferenciador tras piloto inicial: refinar entradas/trazabilidad y conteos concurrentes; el núcleo actual no se anuncia como conteo certificado.';
get('ST-42').siguiente_paso='Refinar unidades/recetas/consumo y diferencias con conteos válidos; medir con comercios piloto. No atribuir una diferencia automáticamente a robo.';
function add(id,sprint,titulo,depende_de,aceptacion,evidencia,prioridad='P1',talla='M',responsable='Codex') {
  b.historias.push({id,sprint,prioridad,talla,estado:'pendiente',titulo,depende_de,aceptacion,evidencia,responsable,creada:'2026-10-09',ultima_sesion:'2026-10-09',siguiente_paso:'Refinar tarea y método de evidencia antes de iniciar; no declarada implementada.'});
}
add('ST-43',3,'Pulido previo de inicio, cobro móvil, caja y reservas',['ST-02','ST-06','ST-07'],[
  'Definir dirección visual consistente, jerarquía y componentes compartidos para cuatro flujos; usar cifras reales del entorno, estados vacíos y errores accionables',
  'Verificar escritorio y móvil emulado, teclado/foco, contraste y tamaños táctiles; reservar certificación de dispositivos físicos para ST-09/ST-31',
  'Repetir reserva → cobro → entrega → comisión → corte con datos ficticios y conciliación persistente; cero regresiones de dinero o permisos',
  'Capturas antes/después y demo recuperable, sin presentar esta entrega como aceptación del pulido completo ST-31'
],'Capturas, recorrido con datos ficticios y persistencia conciliada');
add('ST-44',3,'Demo de diez minutos y validación de compradores',['ST-06','ST-07'],[
  'Guion y ficha de alcance basados en funciones comprobadas; mostrar problema, cobro/custodia/comisión y cierre sin prometer integraciones, SLA o ahorro no medido',
  'Registro de candidatos, diez conversaciones y cinco demostraciones como objetivos de aprendizaje; documentar actividad alcanzada, objeciones y razones de rechazo sin inventar entrevistas',
  'Registrar al menos tres conversaciones reales y decidir si continuar, ajustar o detener oferta; no asumir disposición a pagar por una felicitación. Identificar candidatos compatibles y próximo paso',
  'Contacto realizado por Sinhue o con instrucción explícita; minimizar datos personales y distinguir preparación local de evidencia de mercado'
],'Guion, ficha de alcance y registro real de entrevistas/demos con conclusión', 'P1','M','Compartido');
add('ST-45',4,'Capacidad y concurrencia para piloto independiente',['ST-05','ST-06','ST-07','ST-13','ST-14'],[
  'Ensayo reproducible con tres negocios, hasta ocho barberos por sucursal y dataset publicado; objetivo inicial doce sesiones y seis escrituras concurrentes durante quince minutos, p95 API menor a un segundo',
  'Cero doble venta/reserva, stock inconsistente o fuga entre negocios; comprobar reinicios, conexiones y memoria con tamaño candidato para piloto',
  'Registrar latencia, errores, hardware y costo; si falla, corregir y repetir o reducir capacidad explícita antes de ofrecer. No extrapolar a cadenas/cien clientes'
],'Reporte de carga, integridad y costo/capacidad acotados','P0');
add('ST-46',7,'Puerta comercial de cadenas y alcance por sucursal',['ST-18','ST-19','ST-20','ST-32','ST-33'],[
  'Acta de Cadena con piloto multisucursal, permisos, catálogo, comparación, concurrencia y conciliación aprobados; cero defectos críticos o de alto impacto en su alcance',
  'Oferta y límites por sucursal coinciden con catálogo, fiscalidad, infraestructura medida, soporte y proceso de expansión/downgrade',
  'Habilitar publicidad/contratación de Cadena solo tras acta; un cierre independiente no autoriza este plan. Add-ons mantienen controles propios'
],'Acta go/no-go de Cadena y matriz de promesas','P0','S','Compartido');
add('ST-47',5,'Primera renovación y uso sostenido de pilotos',['ST-26','ST-11','ST-28'],[
  'Registrar días abiertos frente a días con actividad, cierres, incidentes, minutos de soporte y motivos de abandono durante el primer periodo',
  'Conciliar al menos una renovación mensual real de un piloto con Stripe/licencia; separar IVA, trials, descuentos y devoluciones. Registrar muestra y observación, sin proyectar retención anual',
  'Si nadie renueva, conservar historia pendiente con evidencia y revisar oferta/onboarding/costo antes de ampliar; obtener testimonios solo con autorización'
],'Informe de primer periodo, renovación conciliada y decisión de continuidad','P1','M','Compartido');
add('ST-48',6,'Crecimiento hacia diez negocios de pago',['ST-20','ST-26','ST-47'],[
  'Diez negocios con licencia pagada verificable y onboarding registrado; excluir trials y activaciones manuales de clientes de pago',
  'Medir ingreso sin IVA, mora, soporte y costo observado; ajustar capacidad y oferta antes de exceder límites medidos',
  'Documentar origen, rechazo y bajas; no usar publicidad pagada ni descuentos indefinidos sin presupuesto y alcance concretos'
],'Diez altas conciliadas y reporte económico real','P1','M','Compartido');
// Reordenar conserva IDs, estados y evidencia histórica; no se inicia trabajo por planificar.
for (const h of before.historias) assert.equal(get(h.id).estado,h.estado,'Estado histórico alterado');
assert.equal(b.historias.length,48);
fs.writeFileSync(file, JSON.stringify(b,null,2)+'\n');
console.log(JSON.stringify({historias:b.historias.length,sprints:b.sprints,estado:'Reorganización documental; validaciones y bloqueos conservados'},null,2));
