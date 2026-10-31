const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', 'module', ts.transpileModule(fs.readFileSync('apps/web/src/utils/serviceIllustration.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports, mod);
const { serviceIllustration } = mod.exports;
for (const [name, file] of [['Corte clásico', 'corte-clasico'], ['CORTE Y BARBA', 'corte-barba'], ['Barba + corte', 'corte-barba'], ['Degradado', 'degradado'], ['Skin Fade', 'degradado'], ['Perfilado de barba', 'barba']]) {
  const image = serviceIllustration(name);
  assert.equal(image, `/pos-studio/${file}.webp`);
  assert.ok(fs.statSync(`apps/web/public${image}`).size > 0, 'Local image must exist');
}
for (const name of ['', 'Masaje', '../../privado', 'https://example.test/photo.jpg']) assert.equal(serviceIllustration(name), null, 'Unknown services must not invent a matching photo');
console.log('PASS 10 service illustration cases, local files exist, unknown services stay without a photo');
