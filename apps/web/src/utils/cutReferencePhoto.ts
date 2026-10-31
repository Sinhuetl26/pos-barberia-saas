export const MAX_REFERENCE_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_REFERENCE_JPEG_BYTES = 48 * 1024;
const JPEG_PREFIX = 'data:image/jpeg;base64,';

/** Canvas may add an ICC APP2 profile; keep image data and minimal JFIF, never metadata. */
export function stripCutReferenceJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('No pudimos preparar la foto como JPG.');
  const chunks: Uint8Array[] = [bytes.slice(0, 2)];
  let index = 2;
  while (index < bytes.length - 1) {
    const start = index;
    if (bytes[index++] !== 0xff) throw new Error('No pudimos verificar la foto preparada.');
    while (bytes[index] === 0xff) index++;
    const marker = bytes[index++];
    if (marker === 0xda || marker === 0xd9) { chunks.push(bytes.slice(start)); break; }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { chunks.push(bytes.slice(start, index)); continue; }
    if (index + 2 > bytes.length) throw new Error('La foto preparada quedó incompleta.');
    const length = (bytes[index] << 8) | bytes[index + 1];
    if (length < 2 || index + length > bytes.length) throw new Error('La foto preparada quedó incompleta.');
    const end = index + length;
    if (!(marker >= 0xe1 && marker <= 0xef) && marker !== 0xfe) chunks.push(bytes.slice(start, end));
    index = end;
  }
  const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

export function isCutReferenceDataUrl(value: unknown): value is string {
  return typeof value === 'string' && value.length <= JPEG_PREFIX.length + Math.ceil(MAX_REFERENCE_JPEG_BYTES / 3) * 4
    && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value);
}

function bounded<T>(work: Promise<T>, signal: AbortSignal, timeout: number, releaseLate?: (value: T) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = () => { settled = true; clearTimeout(timer); signal.removeEventListener('abort', cancel); };
    const cancel = () => { if (!settled) { finish(); reject(signal.reason instanceof Error ? signal.reason : new Error('Preparación de foto cancelada.')); } };
    const timer = setTimeout(() => { if (!settled) { finish(); reject(new Error('La foto tardó demasiado en prepararse. Elige otra imagen o continúa sin foto.')); } }, timeout);
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    work.then(value => { if (settled) releaseLate?.(value); else { finish(); resolve(value); } }, error => { if (!settled) { finish(); reject(error); } });
  });
}

export function cutReferenceDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) {
    return String.fromCharCode(...bytes.slice(12, 16)) === 'IHDR' ? { width: view.getUint32(16), height: view.getUint32(20) } : null;
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let index = 2;
    while (index < bytes.length - 1) {
      if (bytes[index++] !== 0xff) return null;
      while (bytes[index] === 0xff) index++;
      const marker = bytes[index++];
      if (marker === 0xd9 || marker === 0xda) return null;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (index + 2 > bytes.length) return null;
      const length = view.getUint16(index);
      if (length < 2 || index + length > bytes.length) return null;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return length >= 7 ? { width: view.getUint16(index + 5), height: view.getUint16(index + 3) } : null;
      }
      index += length;
    }
  }
  if (bytes.length >= 20 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') {
    const u24 = (index: number) => bytes[index] | (bytes[index + 1] << 8) | (bytes[index + 2] << 16);
    for (let index = 12; index + 8 <= bytes.length;) {
      const kind = String.fromCharCode(...bytes.slice(index, index + 4));
      const size = view.getUint32(index + 4, true), start = index + 8;
      if (start + size > bytes.length) return null;
      if (kind === 'VP8X' && size >= 10) return { width: u24(start + 4) + 1, height: u24(start + 7) + 1 };
      if (kind === 'VP8L' && size >= 5 && bytes[start] === 0x2f) return { width: (bytes[start + 1] | ((bytes[start + 2] & 63) << 8)) + 1, height: ((bytes[start + 2] >> 6) | (bytes[start + 3] << 2) | ((bytes[start + 4] & 15) << 10)) + 1 };
      if (kind === 'VP8 ' && size >= 10 && bytes[start + 3] === 0x9d && bytes[start + 4] === 0x01 && bytes[start + 5] === 0x2a) return { width: view.getUint16(start + 6, true) & 0x3fff, height: view.getUint16(start + 8, true) & 0x3fff };
      index = start + size + (size % 2);
    }
  }
  return null;
}

function checkDimensions(dimensions: { width: number; height: number } | null) {
  if (!dimensions) throw new Error('No pudimos verificar la foto. Elige otra imagen JPG, PNG o WebP.');
  if (!dimensions.width || !dimensions.height || dimensions.width > 16000 || dimensions.height > 16000 || dimensions.width * dimensions.height > 60_000_000) throw new Error('La imagen es demasiado grande para prepararla. Elige una versión más pequeña.');
}

async function encodeJpeg(canvas: HTMLCanvasElement, quality: number, signal: AbortSignal): Promise<Blob> {
  return bounded(new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No pudimos preparar la foto. Prueba con otra imagen.')), 'image/jpeg', quality)), signal, 2500);
}

async function decodeImage(file: File, signal: AbortSignal): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await bounded(createImageBitmap(file, { imageOrientation: 'from-image' }), signal, 8000, late => late.close());
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await bounded(image.decode(), signal, 8000);
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}

/** Local-only conversion: respect camera orientation, flatten transparency and omit source metadata. */
export async function compressCutReference(file: File, externalSignal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const cancel = () => controller.abort(externalSignal?.reason);
  externalSignal?.addEventListener('abort', cancel, { once: true });
  if (externalSignal?.aborted) cancel();
  const deadline = setTimeout(() => controller.abort(new Error('La foto tardó demasiado en prepararse. Elige otra imagen o continúa sin foto.')), 12000);
  let decoded: Awaited<ReturnType<typeof decodeImage>> | undefined;
  try {
  if (controller.signal.aborted) throw new Error('Preparación de foto cancelada.');
  if (file.size > MAX_REFERENCE_FILE_BYTES) throw new Error('La foto supera 8 MB. Elige una imagen más pequeña.');
  if (!file.size) throw new Error('La imagen está vacía. Elige otra foto.');
  const bytes = new Uint8Array(await bounded(file.arrayBuffer(), controller.signal, 2500));
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  const mime = jpeg ? 'image/jpeg' : png ? 'image/png' : webp ? 'image/webp' : '';
  if (!mime || (file.type && file.type !== mime)) throw new Error('Elige una foto JPG, PNG o WebP. No se admiten otros formatos.');
  checkDimensions(cutReferenceDimensions(bytes));
  decoded = await decodeImage(file, controller.signal);
  checkDimensions(decoded);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Tu navegador no pudo preparar la foto. Puedes continuar sin ella.');
    let side = Math.min(1024, Math.max(decoded.width, decoded.height));
    for (let resize = 0; resize < 7; resize++) {
      if (controller.signal.aborted) throw controller.signal.reason;
      const scale = Math.min(1, side / Math.max(decoded.width, decoded.height));
      canvas.width = Math.max(1, Math.round(decoded.width * scale));
      canvas.height = Math.max(1, Math.round(decoded.height * scale));
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.86, 0.74, 0.62, 0.5, 0.4]) {
        const blob = await encodeJpeg(canvas, quality, controller.signal);
        if (blob.size <= MAX_REFERENCE_JPEG_BYTES) {
          const output = stripCutReferenceJpegMetadata(new Uint8Array(await bounded(blob.arrayBuffer(), controller.signal, 2000)));
          let binary = '';
          for (const value of output) binary += String.fromCharCode(value);
          return `${JPEG_PREFIX}${btoa(binary)}`;
        }
      }
      side = Math.max(160, Math.floor(side * 0.75));
    }
    throw new Error('No pudimos reducir esta foto. Elige otra imagen o continúa sin ella.');
  } finally { decoded?.close(); clearTimeout(deadline); externalSignal?.removeEventListener('abort', cancel); }
}
