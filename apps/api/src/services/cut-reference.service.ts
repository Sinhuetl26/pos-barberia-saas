import { SaleError } from './financial-error';

const maxBytes = 48 * 1024;
const fail = (code: string, message: string): never => { throw new SaleError(400, code, message); };

/** Small, metadata-free JPEGs produced by the booking canvas. Never fetch external URLs. */
export function validateCutReference(input: any): { tipoCorte: string | null; fotoReferencia: string | null } {
  let tipoCorte: string | null = null;
  if (input.tipoCorte !== undefined && input.tipoCorte !== null) {
    if (typeof input.tipoCorte !== 'string' || input.tipoCorte.trim().length > 80) fail('INVALID_CUT_TYPE', 'El tipo de corte admite hasta 80 caracteres.');
    tipoCorte = input.tipoCorte.trim() || null;
  }
  const value = input.fotoReferencia;
  if (value === undefined || value === null || value === '') return { tipoCorte, fotoReferencia: null };
  if (typeof value !== 'string' || !value.startsWith('data:image/jpeg;base64,')) fail('INVALID_REFERENCE_IMAGE', 'Usa una foto JPEG preparada desde el selector.');
  const encoded = value.slice(23);
  if (encoded.length > 4 * Math.ceil(maxBytes / 3)) fail('REFERENCE_IMAGE_TOO_LARGE', 'La foto preparada debe ocupar como máximo 48 KB.');
  if (!encoded || encoded.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) fail('INVALID_REFERENCE_IMAGE', 'La foto JPEG no es válida.');
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length > maxBytes) fail('REFERENCE_IMAGE_TOO_LARGE', 'La foto preparada debe ocupar como máximo 48 KB.');
  if (bytes.toString('base64') !== encoded || bytes.length < 20 || bytes.readUInt16BE(0) !== 0xffd8) fail('INVALID_REFERENCE_IMAGE', 'La foto JPEG no es válida.');
  let cursor = 2, frame = false, scan = false, quant = false, huffman = false;
  while (cursor < bytes.length) {
    if (bytes[cursor++] !== 0xff) fail('INVALID_REFERENCE_IMAGE', 'La estructura de la foto JPEG no es válida.');
    while (bytes[cursor] === 0xff) cursor++;
    const marker = bytes[cursor++];
    if (marker === 0xd9) {
      if (cursor !== bytes.length || !frame || !scan || !quant || !huffman) fail('INVALID_REFERENCE_IMAGE', 'La foto JPEG está incompleta.');
      return { tipoCorte, fotoReferencia: value };
    }
    if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) fail('REFERENCE_IMAGE_METADATA', 'Prepara de nuevo la foto para quitar sus metadatos.');
    if (![0xe0, 0xdb, 0xc4, 0xc0, 0xc2, 0xda, 0xdd].includes(marker) || cursor + 2 > bytes.length) fail('INVALID_REFERENCE_IMAGE', 'La estructura de la foto JPEG no es válida.');
    const length = bytes.readUInt16BE(cursor), end = cursor + length;
    if (length < 2 || end > bytes.length) fail('INVALID_REFERENCE_IMAGE', 'La foto JPEG está incompleta.');
    if (marker === 0xe0 && (length !== 16 || bytes.subarray(cursor + 2, cursor + 7).toString('binary') !== 'JFIF\0' || bytes[end - 1] !== 0 || bytes[end - 2] !== 0)) fail('REFERENCE_IMAGE_METADATA', 'Prepara de nuevo la foto para quitar sus metadatos.');
    if ([0xc0, 0xc2].includes(marker)) {
      if (frame || length < 11 || bytes[cursor + 2] !== 8) fail('INVALID_REFERENCE_IMAGE', 'El formato de la foto JPEG no es válido.');
      const height = bytes.readUInt16BE(cursor + 3), width = bytes.readUInt16BE(cursor + 5), components = bytes[cursor + 7];
      if (!width || !height || width > 1280 || height > 1280) fail('REFERENCE_IMAGE_DIMENSIONS', 'La foto preparada debe medir como máximo 1280 píxeles por lado.');
      if (![1, 3].includes(components) || length !== 8 + 3 * components) fail('INVALID_REFERENCE_IMAGE', 'El formato de la foto JPEG no es válido.');
      frame = true;
    }
    if (marker === 0xdb) quant = true;
    if (marker === 0xc4) huffman = true;
    cursor = end;
    if (marker === 0xda) {
      if (!frame || length < 6 || length !== 6 + 2 * bytes[end - length + 2]) fail('INVALID_REFERENCE_IMAGE', 'El formato de la foto JPEG no es válido.');
      scan = true;
      // Entropy-coded bytes may contain stuffed FF00 and restart markers, never unescaped metadata.
      while (cursor < bytes.length) {
        if (bytes[cursor] !== 0xff) { cursor++; continue; }
        const next = bytes[cursor + 1];
        if (next === 0 || (next >= 0xd0 && next <= 0xd7)) { cursor += 2; continue; }
        break;
      }
    }
  }
  return fail('INVALID_REFERENCE_IMAGE', 'La foto JPEG está incompleta.');
}

export function bookingReferenceSummary(cita: any) {
  const { referencia, ...rest } = cita;
  return { ...rest, tipoCorte: cita.tipoCorte ?? null, tieneFotoReferencia: Boolean(referencia || cita.tieneFotoReferencia) };
}
