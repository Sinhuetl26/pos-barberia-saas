'use strict';
const fs=require('node:fs');const path=require('node:path');const root=path.resolve(__dirname,'..');
const payload=JSON.parse(fs.readFileSync(path.join(root,'.tools/reorganizacion-documental.json'),'utf8'));
const planPath=path.join(root,'docs/PLAN_AGIL_LANZAMIENTO.md');let plan=fs.readFileSync(planPath,'utf8');
if(!/## 5\. Orden de sprints y entregables[\s\S]*?(?=## 7\.)/.test(plan))throw Error('Secciones del plan no reconocidas');
plan=plan.replace(/## 5\. Orden de sprints y entregables[\s\S]*?(?=## 7\.)/,payload.planSection);
fs.writeFileSync(planPath,plan);
const linksPath=path.join(root,'docs/scrum/NOTION_VINCULOS.json');const links=JSON.parse(fs.readFileSync(linksPath,'utf8'));
for(const p of payload.newPages)links.actividades.push({codigo:p.properties['Código'],id:p.id,url:p.url});
for(const p of links.documentos||[]) {const item=Object.values(payload.mapping).find(m=>p.properties?.title?.startsWith(m.title.split(' · ')[0]+' · '));if(item)p.properties.title=item.title;}
links.reorganizacion='2026-10-09';fs.writeFileSync(linksPath,JSON.stringify(links,null,2)+'\n');
const report='# Reorganización comercial del backlog · 2026-10-09\n\nAutorizada por Sinhue: priorizar demo y primeros pilotos independientes; conservar evidencia, estados y requisitos externos.\n\n'+payload.table+'\n\n## Desgloses nuevos\n\n'+payload.newTitles.join('\n')+'\n\n## Cambios de dependencia\n\n'+payload.depChanges.join('\n')+'\n\nLos seis cierres ST-02 a ST-07 y los bloqueos ST-01/ST-08/ST-09 se conservan. No se modificó aplicación, datos operativos, precios ni Stripe; no hubo contratación o cobro. Backlog de 48 IDs únicos comprobado sin ciclos. Las 42 historias originales mantienen sus IDs y sprint_original.\n\nEl presupuesto pequeño es una hipótesis de capacidad, no cotización. Las funciones de Cadena y add-ons se anuncian únicamente tras sus actas propias.\n';
fs.writeFileSync(path.join(root,'docs/scrum/REORGANIZACION_COMERCIAL_2026-10-09.md'),report);
const bitacora=path.join(root,'docs/scrum/BITACORA.md');fs.appendFileSync(bitacora,'\n\n## 2026-10-09 · Reorganización para primeros compradores\n\n- 42 historias originales conservadas y seis desgloses nuevos ST-43 a ST-48. Sprint 3 demo/demanda; 4 operación; 5 pilotos/renovación; 6 valor/salida independiente; 7 cadenas; 8 conectores; 9 expansión.\n- ST-20 y ST-32/33 dejan de exigir piloto de cadena para oferta independiente: lo reemplaza capacidad ST-45 y go/no-go acotado. ST-19 continúa obligatorio para Cadena/ST-46.\n- ST-26 atiende primeros pilotos; crecimiento a diez mantiene ST-48. Pulido previo ST-43 no cierra ST-31; preparación ST-44 no cierra publicación ST-27.\n- Estados: seis Validadas, tres Bloqueadas, 39 Pendientes; ningún avance funcional inventado por reordenar. Referencia REORGANIZACION_COMERCIAL_2026-10-09.md.\n');
console.log('Plan, acta, vínculos y bitácora actualizados');
