// Local unit checks; no browser, network calls, bookings or database writes.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const moduleResult = { exports: {} };
new Function('exports', 'module', ts.transpileModule(fs.readFileSync(path.join(root, 'apps/web/src/utils/cutReferencePhoto.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(moduleResult.exports, moduleResult);
const utility = moduleResult.exports;
const fixture = JSON.parse(fs.readFileSync(path.join(root, '.tools/cut-reference-fixture.json'), 'utf8'));
const photo = Buffer.from(fixture.fotoReferencia.split(',')[1], 'base64');
const clean = utility.stripCutReferenceJpegMetadata(photo);
const cases = [];
function same(name, actual, expected) { assert.deepEqual(actual, expected); cases.push(name); }

async function main() {
  const altered = Buffer.concat([Buffer.from([255,216,255,225,0,4,65,66,255,226,0,4,67,68,255,254,0,4,69,70]), Buffer.from(clean.slice(2))]);
  same('Strip APP1/APP2/COM preserves exact JPEG image bytes', Buffer.from(utility.stripCutReferenceJpegMetadata(altered)), Buffer.from(clean));
  same('JPEG dimensions survive metadata removal', utility.cutReferenceDimensions(altered), utility.cutReferenceDimensions(clean));
  same('SVG cannot render as a reference', utility.isCutReferenceDataUrl('data:image/svg+xml;base64,PHN2Zz4='), false);
  same('External URL cannot render as a reference', utility.isCutReferenceDataUrl('https://example.com/ref.jpg'), false);
  same('Clean bounded JPEG can render', utility.isCutReferenceDataUrl('data:image/jpeg;base64,' + Buffer.from(clean).toString('base64')), true);
  const png = new Uint8Array(24);
  png.set([137,80,78,71,13,10,26,10], 0); png.set([73,72,68,82], 12);
  new DataView(png.buffer).setUint32(16, 24000); new DataView(png.buffer).setUint32(20, 24000);
  same('PNG header dimensions are read before decode', utility.cutReferenceDimensions(png), { width: 24000, height: 24000 });
  const webp = new Uint8Array(30);
  webp.set(Buffer.from('RIFF'), 0); webp.set(Buffer.from('WEBPVP8X'), 8);
  new DataView(webp.buffer).setUint32(16, 10, true); webp.set([31,3,0], 24); webp.set([87,2,0], 27);
  same('WebP VP8X header dimensions are read', utility.cutReferenceDimensions(webp), { width: 800, height: 600 });
  const previousBitmap = global.createImageBitmap;
  try {
    let decodes = 0;
    global.createImageBitmap = () => { decodes++; throw Error('Unexpected decode'); };
    await assert.rejects(utility.compressCutReference({ size: png.length, type: 'image/png', arrayBuffer: async () => png.buffer }), /demasiado grande/);
    cases.push('Oversized PNG rejects before decoding');
    same('Oversized PNG never calls decoder', decodes, 0);
    let lateClose = 0, resolveBitmap;
    global.createImageBitmap = () => new Promise(resolve => { resolveBitmap = resolve; });
    const controller = new AbortController();
    const reading = utility.compressCutReference({ size: photo.length, type: 'image/jpeg', arrayBuffer: async () => Uint8Array.from(photo).buffer }, controller.signal);
    await new Promise(resolve => setImmediate(resolve)); controller.abort();
    await assert.rejects(reading); cases.push('Cancellation settles an unfinished decode');
    resolveBitmap({ width: 900, height: 1000, close: () => lateClose++ });
    await new Promise(resolve => setImmediate(resolve));
    same('A late bitmap closes after cancellation', lateClose, 1);
  } finally { global.createImageBitmap = previousBitmap; }
  const report = { checkedAt: new Date().toISOString(), result: 'passed', checks: cases.length, cases, jpegBytes: clean.length, dimensions: utility.cutReferenceDimensions(clean), scope: 'Local unit checks with decoder mock; actual PNG upload, browser rendering and mobile flow are separately verified by root.' };
  const output = path.join(root, 'docs/scrum/evidencia/ux-20261011/referencia-frontend-helpers.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ result: report.result, checks: report.checks, evidence: output, jpegBytes: report.jpegBytes }) + '\n');
}
main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
