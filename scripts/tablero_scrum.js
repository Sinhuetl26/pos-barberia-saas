'use strict';

// Vistas locales del backlog; no crea páginas externas ni sincroniza Notion.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const backlogPath = path.join(root, 'docs/BACKLOG_LANZAMIENTO.json');
const backlog = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
const states = backlog.reglas.estados;
const names = {pendiente:'Pendiente', lista:'Lista para empezar', en_curso:'En curso', revision:'En revisión', validada:'Validada', bloqueada:'Bloqueada'};
const ids = new Set(backlog.historias.map(h => h.id));
assert.equal(ids.size, backlog.historias.length, 'IDs repetidos');
const complete = new Set();
const visiting = new Set();
function visit(id) {
  if (complete.has(id)) return;
  assert(!visiting.has(id), `Dependencia circular: ${id}`);
  visiting.add(id);
  const item = backlog.historias.find(h => h.id === id);
  assert(item && states.includes(item.estado), `Historia/estado inválido: ${id}`);
  assert(item.aceptacion.length >= 2 && item.evidencia, `Faltan criterios/evidencia: ${id}`);
  for (const dep of item.depende_de) { assert(ids.has(dep), `Dependencia inexistente: ${dep}`); visit(dep); }
  visiting.delete(id); complete.add(id);
}
backlog.historias.forEach(h => visit(h.id));
const directory = path.join(root, 'docs/scrum');
fs.mkdirSync(directory, {recursive:true});
const escapeCell = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const reference = h => `[${escapeCell(h.id)}](ACTIVIDADES.md#${h.id.toLowerCase()})`;
const stats = states.map(state => `${names[state]}: ${backlog.historias.filter(h => h.estado === state).length}`).join(' · ');
const table = items => [
  '| Actividad | Sprint | Prioridad | Estado | Dependencias |',
  '| --- | ---: | --- | --- | --- |',
  ...items.map(h => `| ${reference(h)} · ${escapeCell(h.titulo)} | ${h.sprint > 8 ? 'Posterior' : h.sprint} | ${h.prioridad} | ${names[h.estado]} | ${h.depende_de.join(', ') || '—'} |`)
].join('\n');
const board = `# Tablero de SYSTECH Studio\n\nFuente: [backlog versionado](../BACKLOG_LANZAMIENTO.json). Esta vista se regenera con \`node scripts/tablero_scrum.js\`; editar estados en la fuente, no en esta tabla. No implica conexión ni sincronización con Notion.\n\n${stats}\n\n## Inicio de sesión\n\nLeer [Sprint 1](SPRINT_01.md) y [bitácora](BITACORA.md). Retomar una actividad por implementador, con hasta dos historias separadas en curso; revisar bloqueo, criterio y prueba antes de cambiar su estado. No marcar terminada por construir una pantalla.\n\n## Sprint 1\n\n${table(backlog.historias.filter(h => h.sprint === 1))}\n\n## Tablero por estado\n\n${states.map(state => {const items = backlog.historias.filter(h => h.estado === state); return `### ${names[state]}\n\n${items.length ? table(items) : 'Sin actividades en este estado.'}`;}).join('\n\n')}\n\n## Decisiones y evidencia\n\n- [Sistema de trabajo y configuración Notion](INICIO.md)\n- [Bitácora de sesiones](BITACORA.md)\n- [Decisiones pendientes](DECISIONES.md)\n- [Plan y Definition of Done](../PLAN_AGIL_LANZAMIENTO.md)\n- [Costos y precios](../COSTOS_Y_PRECIOS.md)\n`;
const activities = `# Actividades y criterios de aceptación\n\nVista generada del backlog. No representa implementación concluida. Cada actividad validada requiere evidencia registrada y Definition of Done.\n\n${backlog.historias.map(h => `<a id="${h.id.toLowerCase()}"></a>\n\n## ${h.id}: ${h.titulo}\n\n- Sprint: ${h.sprint > 8 ? 'Después del lanzamiento' : h.sprint}\n- Prioridad: ${h.prioridad}\n- Complejidad: ${h.talla}\n- Estado: ${names[h.estado]}\n- Dependencias: ${h.depende_de.join(', ') || 'Sin dependencias declaradas'}\n\n### Criterios de aceptación\n\n${h.aceptacion.map(c => `- [${h.estado === 'validada' ? 'x' : ' '}] ${c}`).join('\n')}\n\n### Evidencia requerida\n\n${h.evidencia}\n\nResponsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.\n\n[Volver al tablero](TABLERO.md)`).join('\n\n---\n\n')}\n`;
const notionLinksPath = path.join(directory, 'NOTION_VINCULOS.json');
const boardForDisplay = fs.existsSync(notionLinksPath)
  ? board.replace(/Fuente:.*?\n\n/s, `Fuente principal de estados: [Notion](${JSON.parse(fs.readFileSync(notionLinksPath, 'utf8')).inicio.url}). Esta tabla es una vista del respaldo local; actualizar el backlog desde Notion al cierre de sesión antes de regenerar con \`node scripts/tablero_scrum.js\`. No hay sincronización automática bidireccional.\n\n`)
  : board;
fs.writeFileSync(path.join(directory, 'TABLERO.md'), boardForDisplay);
fs.writeFileSync(path.join(directory, 'ACTIVIDADES.md'), activities);
console.log(JSON.stringify({historias:backlog.historias.length, dependencias:'válidas, sin ciclos', estados:Object.fromEntries(states.map(s=>[s,backlog.historias.filter(h=>h.estado===s).length])), vistas:['docs/scrum/TABLERO.md','docs/scrum/ACTIVIDADES.md']},null,2));
