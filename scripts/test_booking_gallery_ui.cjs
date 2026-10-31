const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript');
const mod = { exports: {} };
new Function('exports', 'module', ts.transpileModule(fs.readFileSync('apps/web/src/utils/bookingAppearance.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports, mod);
const { publicGalleryUrl, bookingAppearance, bookingTheme } = mod.exports;
const backendPath = require('node:path').resolve('apps/api/src/services/booking-personalization.service.ts');
const backend = { exports: {} };
new Function('exports', 'module', 'require', ts.transpileModule(fs.readFileSync(backendPath, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText)(backend.exports, backend, require('node:module').createRequire(backendPath));
const { bookingPersonalizationSchema, normalizeBookingPersonalization, tenantSettingsSchema } = backend.exports;
let count = 0; const check = (name, fn) => { fn(); count++; console.log(`PASS ${name}`); };
check('Silla theme survives frontend and backend parsing with its authored palette', () => {
  assert.equal(bookingAppearance(JSON.stringify({ tema: 'silla' })).tema, 'silla');
  assert.equal(normalizeBookingPersonalization(JSON.stringify({ tema: 'silla' })).tema, 'silla');
  assert.equal(tenantSettingsSchema.parse({ personalizacionWeb: { tema: 'silla' } }).personalizacionWeb.tema, 'silla');
  assert.deepEqual(bookingTheme('silla'), { name: 'Silla azul', primary: '#064ff4', accent: '#141619', canvas: '#faf9f6' });
});
check('Legacy themes and safe default remain compatible while invalid writes are rejected', () => {
  for (const tema of ['bosque', 'tinta', 'oceano']) {
    assert.equal(bookingAppearance({ tema }).tema, tema);
    assert.equal(normalizeBookingPersonalization({ tema }).tema, tema);
    assert.equal(bookingPersonalizationSchema.shape.tema.parse(tema), tema);
  }
  for (const value of [null, '{broken', {}, { tema: 'invalid' }]) {
    assert.equal(bookingAppearance(value).tema, 'bosque');
    assert.equal(normalizeBookingPersonalization(value).tema, 'bosque');
  }
  assert.equal(bookingPersonalizationSchema.shape.tema.safeParse('invalid').success, false);
  assert.equal(tenantSettingsSchema.safeParse({ personalizacionWeb: { tema: 'invalid' } }).success, false);
});
check('Old or malformed appearance has no gallery and keeps booking defaults', () => { for (const value of [null, '{broken', {}]) { const appearance = bookingAppearance(value); assert.equal(appearance.mostrarGaleria, false); assert.deepEqual(appearance.galeria, []); assert.equal(appearance.textoBoton, 'Reservar cita'); } });
check('Gallery only accepts public HTTPS photos without credentials or private references', () => { for (const url of ['http://photos.test/cut.jpg', 'data:image/png;base64,abc', 'https://user:pass@photos.test/a.jpg', 'https://shop.test/api/citas/123/referencia', 'https://shop.test/%61pi/citas/123/referencia', 'https://shop.test/b/demo/cita/private', 'https://photos.test/a.jpg?token=private', 'https://photos.test/a.jpg?X-Amz-Credential=private', 'javascript:alert(1)']) assert.equal(publicGalleryUrl(url), null); assert.equal(publicGalleryUrl('https://photos.test/cut.jpg?width=800'), 'https://photos.test/cut.jpg?width=800'); });
const photo = index => ({ id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, url: `https://photos.test/${index}.jpg`, title: `Corte ${index}`, alt: `Descripción ${index}`, visible: true });
check('Gallery keeps authored order and hidden state rather than inventing images', () => { const appearance = bookingAppearance({ mostrarGaleria: true, galeria: [photo(3), { ...photo(1), visible: false }, photo(2)] }); assert.deepEqual(appearance.galeria.map(item => item.title), ['Corte 3', 'Corte 1', 'Corte 2']); assert.equal(appearance.galeria[1].visible, false); });
check('Adding Silla or applying a theme-only patch preserves existing gallery settings', () => {
  const old = { tema: 'tinta', mostrarGaleria: true, galeria: [photo(3), { ...photo(1), visible: false }] };
  const patch = tenantSettingsSchema.parse({ personalizacionWeb: { tema: 'silla' } }).personalizacionWeb;
  assert.deepEqual(patch, { tema: 'silla' });
  const updated = normalizeBookingPersonalization({ ...old, ...patch });
  assert.equal(updated.tema, 'silla');
  assert.equal(updated.mostrarGaleria, true);
  assert.deepEqual(updated.galeria, old.galeria);
  assert.deepEqual(bookingAppearance(updated).galeria, old.galeria);
});
check('Missing alt and private images are removed from stored public rendering', () => { const appearance = bookingAppearance({ galeria: [{ ...photo(1), alt: '' }, { ...photo(2), url: 'https://shop.test/api/reference' }, photo(3)] }); assert.equal(appearance.galeria.length, 1); assert.equal(appearance.galeria[0].title, 'Corte 3'); });
check('Photo and informative text limits remain bounded', () => { const appearance = bookingAppearance({ galeria: Array.from({ length: 20 }, (_, index) => photo(index)), instruccionesLlegada: 'x'.repeat(2000), politicasInformativas: 'y'.repeat(3000) }); assert.equal(appearance.galeria.length, 12); assert.equal(appearance.instruccionesLlegada.length, 1000); assert.equal(appearance.politicasInformativas.length, 1500); });
console.log(`Booking gallery UI: ${count}/${count} passed`);
