'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
let hooks = [], cursor = 0, effects = [], timers = new Map(), timerId = 0, requests = [], navigations = [];
let props = { sucursalId: 'branch-a', rol: 'DUENO', onNavigate: path => navigations.push(path) };
const react = {
  useState(initial) { const index = cursor++; hooks[index] ??= { value: initial }; return [hooks[index].value, value => { hooks[index].value = typeof value === 'function' ? value(hooks[index].value) : value; }]; },
  useRef(initial) { const index = cursor++; hooks[index] ??= { current: initial }; return hooks[index]; },
  useEffect(callback, deps) { const index = cursor++, previous = hooks[index]; if (!previous || deps.some((value, i) => value !== previous.deps[i])) { hooks[index] = { deps, cleanup: previous?.cleanup }; effects.push(() => { hooks[index].cleanup?.(); hooks[index].cleanup = callback(); }); } }
};
const jsx = (type, properties) => ({ type, props: properties });
const exported = {};
const context = {
  exports: exported, Intl, Date, AbortController, HTMLElement: class {},
  document: { addEventListener() {}, removeEventListener() {}, getElementById() { return null; } },
  window: { setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; }, clearTimeout(id) { timers.delete(id); } },
  require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === '../api') return { api: { searchWorkspace(branch, query, signal) { return new Promise((resolve, reject) => requests.push({ branch, query, signal, resolve, reject })); } } };
    return {};
  }
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/src/components/WorkspaceSearch.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
let view;
function render() { cursor = 0; view = exported.WorkspaceSearch(props); const work = effects; effects = []; work.forEach(effect => effect()); return view; }
function nodes(value) { if (!value || typeof value !== 'object') return []; if (Array.isArray(value)) return value.flatMap(nodes); return [value, ...nodes(value.props?.children)]; }
function find(predicate) { return nodes(view).find(predicate); }
function input() { return find(node => node.props?.role === 'combobox'); }
function text(value) { return Array.isArray(value) ? value.map(text).join(' ') : value && typeof value === 'object' ? text(value.props?.children) : typeof value === 'string' ? value : ''; }
function change(value) { input().props.onChange({ target: { value } }); render(); }
function runTimers() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); }
async function settle() { await new Promise(resolve => setImmediate(resolve)); render(); }
const payload = name => ({ clients: [{ id: name, nombre: name }], appointments: [], products: [], timeZone: 'America/Mexico_City' });
let checks = 0;
async function check(name, fn) { await fn(); checks++; console.log('PASS ' + name); }
async function main() {
  const { workspaceSearchTarget: target, nextSearchSelection: next, searchShortcutAllowed: allowed } = exported;
  await check('Targets encode IDs and choose role-authorized record views', () => {
    assert.equal(target({ kind: 'client', id: 'a&b' }, 'DUENO', 'UTC'), '/app/clientes?clienteId=a%26b');
    assert.equal(target({ kind: 'client', id: 'a' }, 'BARBERO', 'UTC'), null);
    for (const role of ['BARBERO', 'CAJERO']) assert.equal(target({ kind: 'product', id: 'p' }, role, 'UTC'), '/app/pos?productoId=p');
    assert.equal(target({ kind: 'product', id: 'p' }, 'GERENTE', 'UTC'), '/app/inventario?productoId=p');
    assert.equal(target({ kind: 'product', id: '' }, 'DUENO', 'UTC'), null);
  });
  await check('Appointments open their branch-local day and invalid dates/zones stay closed', () => {
    assert.equal(target({ kind: 'appointment', id: 'a', fechaHora: '2026-10-14T02:00:00Z' }, 'DUENO', 'America/Mexico_City'), '/app/agenda?fecha=2026-10-13&citaId=a');
    assert.equal(target({ kind: 'appointment', id: 'a', fechaHora: 'bad' }, 'DUENO', 'UTC'), null);
    assert.equal(target({ kind: 'appointment', id: 'a', fechaHora: '2026-10-14T02:00:00Z' }, 'DUENO', 'bad-zone'), null);
  });
  await check('Arrows select first/last and wrap without invalid empty indexes', () => {
    assert.equal(next(-1, 3, 'ArrowDown'), 0); assert.equal(next(-1, 3, 'ArrowUp'), 2);
    assert.equal(next(2, 3, 'ArrowDown'), 0); assert.equal(next(0, 3, 'ArrowUp'), 2); assert.equal(next(-1, 0, 'ArrowDown'), -1);
  });
  await check('Shortcut never hijacks typing, composition, altered or handled keys', () => {
    const event = { key: 'K', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, defaultPrevented: false, isComposing: false };
    assert.equal(allowed(event, false), true); assert.equal(allowed(event, true), false);
    for (const change of [{ altKey: true }, { shiftKey: true }, { defaultPrevented: true }, { isComposing: true }, { key: 'J' }, { ctrlKey: false }]) assert.equal(allowed({ ...event, ...change }, false), false);
    assert.equal(allowed({ ...event, ctrlKey: false, metaKey: true }, false), true);
  });
  render(); find(node => node.props?.className === 'workspace-search-trigger').props.onClick(); render();
  await check('Empty search provides guidance without querying a private directory', () => { runTimers(); assert.equal(requests.length, 0); assert.match(text(view), /Escribe dos caracteres/); });
  await check('Changed query aborts old request and late response cannot replace current results', async () => {
    change('Al'); runTimers(); const old = requests[0];
    change('Bo'); assert.equal(old.signal.aborted, true); runTimers();
    old.resolve(payload('Alfredo')); await settle(); assert(!text(view).includes('Alfredo'));
    requests[1].resolve(payload('Boris')); await settle(); assert(text(view).includes('Boris'));
  });
  await check('Closing search aborts and returns to origin without navigation', () => {
    change('Ca'); runTimers(); const current = requests[2];
    find(node => node.props?.titleId === 'workspace-search-title').props.onClose(); render();
    assert.equal(current.signal.aborted, true); assert.equal(navigations.length, 0);
    assert.equal(find(node => node.props?.titleId === 'workspace-search-title').props.open, false);
  });
  find(node => node.props?.className === 'workspace-search-trigger').props.onClick(); render();
  await check('Errors offer retry and successful empty responses explain no matches', async () => {
    change('De'); runTimers(); requests[3].reject(new Error('Fallo temporal')); await settle();
    assert.match(text(find(node => node.props?.role === 'alert')), /Fallo temporal/);
    find(node => node.type === 'button' && text(node) === 'Reintentar búsqueda').props.onClick(); render(); runTimers();
    requests[4].resolve({ clients: [], appointments: [], products: [], timeZone: 'UTC' }); await settle(); assert.match(text(view), /No hay coincidencias/);
  });
  await check('Changing branch aborts in-flight search and hides old branch results', () => {
    change('Ef'); runTimers(); const current = requests[5]; props = { ...props, sucursalId: 'branch-b' }; render(); render();
    assert.equal(current.signal.aborted, true); assert.equal(find(node => node.props?.titleId === 'workspace-search-title').props.open, false);
  });
  find(node => node.props?.className === 'workspace-search-trigger').props.onClick(); render();
  await check('Keyboard selection and Enter navigate to the exact returned record, never during composition', async () => {
    change('Gh'); runTimers(); requests[6].resolve({ clients: [{ id: 'first', nombre: 'First' }, { id: 'second', nombre: 'Second' }], appointments: [], products: [], timeZone: 'UTC' }); await settle();
    const field = { focus() {} }; input().props.ref.current = field;
    const event = key => ({ key, target: field, nativeEvent: { isComposing: false }, preventDefault() {} });
    find(node => node.props?.className === 'workspace-search-content').props.onKeyDown(event('ArrowUp')); render();
    assert.equal(input().props['aria-activedescendant'], 'workspace-search-result-1');
    find(node => node.props?.className === 'workspace-search-content').props.onKeyDown({ ...event('Enter'), nativeEvent: { isComposing: true } });
    assert.equal(navigations.length, 0);
    find(node => node.props?.className === 'workspace-search-content').props.onKeyDown(event('Enter')); render();
    assert.deepEqual(navigations, ['/app/clientes?clienteId=second']);
  });
  console.log(`Workspace search UI: ${checks}/${checks} checks passed (logic harness, not browser acceptance).`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
