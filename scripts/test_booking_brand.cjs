const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
function load(file) {
  const full = path.resolve(file), mod = { exports: {} };
  new Function('exports', 'module', 'require', ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports, mod, require('node:module').createRequire(full));
  return mod.exports;
}
const front = load('apps/web/src/utils/bookingAppearance.ts');
const api = load('apps/api/src/services/booking-personalization.service.ts');
let count = 0;
function check(name, fn) { fn(); count++; console.log('PASS ' + name); }
const service = '00000000-0000-4000-8000-000000000001';
const brand = { portada:'inmersiva', tituloPortada:'Tu corte. Tu firma.', textoPortada:'Barbería de barrio, estilo propio.', colorMarca:'#faeb36', colorFondo:'#111111', tipografia:'elegante', tratamientoFoto:'color', formaBotones:'recta', estiloServicios:'lista', ordenSecciones:['galeria','historia','equipo','servicios','contacto'], fotosServicios:{[service]:'https://photos.example/corte.jpg'}, tituloServicios:'La carta', tituloEquipo:'Las manos', tituloHistoria:'Nuestra historia', tituloContacto:'Encuéntranos' };
check('Authored brand round-trips through API normalization and public rendering', () => {
  const patch = api.tenantSettingsSchema.parse({personalizacionWeb:brand}).personalizacionWeb;
  const stored = api.normalizeBookingPersonalization(JSON.stringify(patch));
  const publicView = front.bookingAppearance(JSON.stringify(stored));
  for(const key of Object.keys(brand)) assert.deepEqual(publicView[key],brand[key],key);
});
check('Old rows gain safe brand defaults without replacing existing identity', () => {
  for(const input of [null,'broken',{}, {tema:'oceano',textoBoton:'Apartar visita'}]) {
    const stored=api.normalizeBookingPersonalization(input), publicView=front.bookingAppearance(stored);
    assert.equal(stored.tituloPortada,''); assert.equal(publicView.tituloPortada,'');
    assert.deepEqual(publicView.ordenSecciones,front.defaultSectionOrder);
    if(input?.tema) assert.equal(stored.tema,input.tema);
  }
});
check('Partial palette changes preserve authored order, photos and titles', () => {
  const patch=api.tenantSettingsSchema.parse({personalizacionWeb:{colorMarca:'#abcdef'}}).personalizacionWeb;
  assert.deepEqual(patch,{colorMarca:'#abcdef'});
  const merged=api.normalizeBookingPersonalization({...brand,...patch});
  assert.deepEqual(merged.fotosServicios,brand.fotosServicios); assert.deepEqual(merged.ordenSecciones,brand.ordenSecciones); assert.equal(merged.tituloPortada,brand.tituloPortada);
});
check('Invalid colors, layouts, overlong text, duplicates and unknown fields are rejected', () => {
  for(const value of [{colorMarca:'red'}, {colorFondo:'url(javascript:1)'}, {portada:'custom-code'}, {tituloPortada:'x'.repeat(101)}, {textoPortada:'x'.repeat(241)}, {ordenSecciones:['equipo','equipo','servicios','historia','galeria']}, {html:'<script/>'}]) assert.equal(api.tenantSettingsSchema.safeParse({personalizacionWeb:value}).success,false);
});
check('Service photos reject private references and executable URLs on both boundaries', () => {
  for(const url of ['javascript:alert(1)','https://shop.test/b/demo/cita/private','https://shop.test/api/citas/a/foto','https://photos.test/a?token=secret','https://user:pass@photos.test/a','http://photos.test/a']) {
    assert.equal(api.tenantSettingsSchema.safeParse({personalizacionWeb:{fotosServicios:{[service]:url}}}).success,false,url);
    assert.deepEqual(front.bookingAppearance({fotosServicios:{[service]:url}}).fotosServicios,{});
  }
});
check('Malformed stored order never hides sections or adds prototype keys', () => {
  assert.deepEqual(front.bookingSectionOrder(['contacto','contacto','__proto__','invalid']),['contacto','servicios','equipo','historia','galeria']);
  assert.deepEqual(front.bookingSectionOrder(null),front.defaultSectionOrder);
});
check('Readable black or white text meets 4.5 contrast across custom colors', () => {
  for(let n=0;n<=0xffffff;n+=7919) {
    const hex='#'+n.toString(16).padStart(6,'0'), ink=front.colorInk(hex);
    const channels=hex.slice(1).match(/../g).map(c=>{const v=parseInt(c,16)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
    const lum=.2126*channels[0]+.7152*channels[1]+.0722*channels[2];
    assert.ok((ink==='#ffffff'?1.05/(lum+.05):(lum+.05)/.05)>=4.5,hex);
  }
});
check('A cleared override returns to palette and a removed photo does not reappear', () => {
  const updated=api.normalizeBookingPersonalization({...brand,...api.tenantSettingsSchema.parse({personalizacionWeb:{colorMarca:'',fotosServicios:{}}}).personalizacionWeb});
  assert.equal(updated.colorMarca,''); assert.deepEqual(updated.fotosServicios,{});
});
console.log(`Booking brand: ${count}/${count} passed`);
