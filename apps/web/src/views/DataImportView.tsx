import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Sucursal } from '../types';
import '../styles/secondary-workspaces.css';

type Kind = 'catalogo' | 'clientes';
type Preview = { rows: { row: number; data: Record<string, string | number | null> }[]; errors: { row: number; message: string }[]; previewHash: string; canConfirm: boolean; summary: { valid: number; total: number }; policy: string };
type Intent = { tipo: Kind; sucursalId: string; csv: string; previewHash: string; idempotencyKey: string };
const labels: Record<string, string> = { nombre: 'Nombre', tipo: 'Tipo', sku: 'SKU', categoria: 'Categoría', precioVenta: 'Precio', costo: 'Costo unitario', stockActual: 'Existencia inicial', stockMinimo: 'Mínimo', naturaleza: 'Uso', unidad: 'Unidad', duracionMinutos: 'Duración (minutos)', tasaImpuesto: 'Impuesto (%)', telefono: 'Teléfono', email: 'Correo', presentacionCantidad: 'Cantidad por presentación', presentacionNombre: 'Presentación' };
export function importFailureIsDefinitive(error: { status?: number; code?: string }) {
  if (error.code === 'IDEMPOTENCY_CONFLICT') return false;
  return [400, 403, 404].includes(error.status || 0) || error.status === 409 && error.code === 'IMPORT_PREVIEW_CHANGED';
}
export function DataImportView({ branch }: { branch: Sucursal | null }) {
  const [kind, setKind] = useState<Kind>('catalogo'), [csv, setCsv] = useState(''), [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null), [pending, setPending] = useState<Intent | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [storageError, setStorageError] = useState('');
  const key = `systech:data-import:${api.getTenantId()}:${api.getUserId()}:${branch?.id || ''}`;
  const activeKey = useRef(key); activeKey.current = key;
  const sending = useRef(false), serial = useRef(0);
  useEffect(() => {
    serial.current++; sending.current = false; setBusy(false); setPending(null); setPreview(null); setCsv(''); setFileName(''); setError(''); setNotice(''); setStorageError('');
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) { const value = JSON.parse(raw); if (value.sucursalId !== branch?.id || !['catalogo', 'clientes'].includes(value.tipo) || typeof value.csv !== 'string' || typeof value.previewHash !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.idempotencyKey || '')) throw Error(); setPending(value); setKind(value.tipo); setCsv(value.csv); setFileName('Archivo pendiente de recuperación'); }
    } catch { setStorageError('No pudimos leer la importación pendiente. Revisa el catálogo o los clientes antes de iniciar otra.'); }
    return () => { serial.current++; };
  }, [key]);
  const readFile = async (file?: File) => {
    if (!file || pending || busy) return; const current = ++serial.current;
    setError(''); setNotice(''); setPreview(null); setCsv(''); setFileName('');
    try {
      if (file.size > 150 * 1024) throw Error('El archivo supera 150 KB. Divide el catálogo en lotes de hasta 200 filas.');
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      if (current !== serial.current) return;
      setCsv(text); setFileName(file.name);
    } catch (err: any) { if (current === serial.current) setError(err.message || 'Guarda el archivo como CSV UTF-8.'); }
  };
  const review = async () => {
    if (!branch || !csv || sending.current || pending) return;
    sending.current = true; setBusy(true); setError(''); setPreview(null); const current = ++serial.current;
    try { const result = await api.previewDataImport({ tipo: kind, sucursalId: branch.id, csv }); if (current === serial.current) setPreview(result); }
    catch (err: any) { if (current === serial.current) setError(err.message || 'No pudimos revisar el archivo.'); }
    finally { if (current === serial.current) { sending.current = false; setBusy(false); } }
  };
  const confirm = async (intent: Intent) => {
    if (sending.current || storageError) return;
    try { sessionStorage.setItem(key, JSON.stringify(intent)); }
    catch { setStorageError('No pudimos guardar la referencia de recuperación. No se envió la importación.'); return; }
    sending.current = true; setBusy(true); setPending(intent); setError(''); setNotice('');
    const clearOwn = () => { const saved = JSON.parse(sessionStorage.getItem(key) || 'null'); if (saved?.idempotencyKey === intent.idempotencyKey) sessionStorage.removeItem(key); };
    try {
      const result = await api.confirmDataImport(intent); clearOwn();
      if (activeKey.current !== key) return;
      setPending(null); setPreview(null); setCsv(''); setFileName('');
      setNotice(`${result.imported} registros importados${result.replayed ? ' · Resultado recuperado sin duplicados' : ''}.`);
    } catch (err: any) {
      if (importFailureIsDefinitive(err)) { try { clearOwn(); if (activeKey.current === key) { setPending(null); setPreview(null); } } catch { /* Keep the recovery reference when storage fails. */ } }
      if (activeKey.current === key) setError(err.message || 'No se confirmó el resultado. Recupera esta misma importación antes de iniciar otra.');
    } finally { if (activeKey.current === key) { sending.current = false; setBusy(false); } }
  };
  const download = async (template: boolean) => {
    if (!branch || busy) return; setBusy(true); setError(''); const scope = key;
    try {
      const text = await api.downloadDataImportCsv(kind, branch.id, template);
      if (scope !== activeKey.current) return;
      const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${template ? 'plantilla' : 'exportacion'}-${kind}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) { if (scope === activeKey.current) setError(err.message || 'No pudimos preparar el archivo.'); }
    finally { if (scope === activeKey.current) setBusy(false); }
  };
  if (!branch) return <section className="studio-surface p-6"><h1 className="text-2xl font-semibold">Importar datos</h1><p className="mt-3">Selecciona una sucursal para comenzar.</p></section>;
  const locked = busy || Boolean(pending) || Boolean(storageError);
  return <main className="studio-page operation-page secondary-workspace import-workspace space-y-5">
    <header><p className="text-sm text-slate-500">Preparación de {branch.nombre}</p><h1 className="text-3xl font-semibold">Tus datos, listos para trabajar</h1><p className="mt-2 text-slate-600">Carga productos, servicios o clientes desde CSV. Revisar el archivo no modifica tu negocio.</p></header>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>}{storageError && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">{storageError}</p>}{notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
    {pending && <section className="rounded-xl border border-amber-300 bg-amber-50 p-4"><h2 className="font-semibold">Hay una importación pendiente</h2><p className="mt-2 text-sm">Conservamos el archivo y su referencia. Recuperar consulta el resultado o completa la misma operación; no crea un segundo lote. Evita cerrar esta pestaña hasta conocer el resultado.</p><button className="studio-button-primary mt-3" type="button" disabled={busy} onClick={() => void confirm(pending)}>Recuperar importación</button></section>}
    <section className="studio-surface p-5 space-y-4"><h2 className="text-lg font-semibold">1. Prepara el archivo</h2>
      <label className="block">Qué quieres importar<select className="mt-2 block w-full rounded-lg border p-3" value={kind} disabled={locked} onChange={event => { serial.current++; setKind(event.target.value as Kind); setCsv(''); setFileName(''); setPreview(null); setError(''); }}><option value="catalogo">Productos y servicios</option><option value="clientes">Clientes</option></select></label>
      <p className="text-sm text-slate-600">Descarga la plantilla y conserva sus encabezados y orden. CSV UTF-8, hasta 200 filas y 150 KB. Cada {kind === 'catalogo' ? 'SKU' : 'teléfono'} debe ser único. No sobrescribimos registros existentes.</p>
      <details className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">Cómo llenar las columnas</summary>{kind === 'catalogo' ? <div className="mt-3 space-y-2"><p>Tipo: SERVICIO o PRODUCTO. Uso: REVENTA o INSUMO. Unidad: PIEZA, ML o G; REVENTA usa PIEZA.</p><p>Escribe precios, costo y existencias con punto decimal, sin símbolos ni separadores de miles. Las piezas son enteras; servicios llevan existencias y mínimo en 0.</p><p>Completa duración entre 5 y 480 minutos; en productos puedes usar 30 (no determina su venta). Impuesto es el porcentaje que hayas definido, no una recomendación fiscal.</p></div> : <p className="mt-3">Nombre y teléfono son obligatorios; correo es opcional. Usa el código de país, por ejemplo +52 para México. Se importan contactos con historial en cero, sin consentimiento de mensajes ni visitas inventadas.</p>}</details>
      <div className="flex flex-wrap gap-3"><button className="studio-button-secondary" type="button" disabled={busy} onClick={() => void download(true)}>Descargar plantilla</button><button className="studio-button-secondary" type="button" disabled={busy} onClick={() => void download(false)}>Exportar datos actuales</button></div>
      <label className="block">Archivo CSV<input className="mt-2 block w-full text-sm" type="file" accept=".csv,text/csv" disabled={locked} onChange={event => { void readFile(event.target.files?.[0]); event.target.value = ''; }} /></label>{fileName && <p className="break-words text-sm">{fileName}</p>}
      <button className="studio-button-primary" type="button" disabled={locked || !csv} onClick={() => void review()}>{busy ? 'Procesando…' : 'Revisar sin importar'}</button>
    </section>
    {preview && <section className="studio-surface p-5 space-y-4"><h2 className="text-lg font-semibold">2. Revisa y confirma</h2><p>{preview.summary.valid} de {preview.summary.total} filas válidas</p><p className="text-sm text-slate-600">{preview.policy}</p>
      {preview.errors.length > 0 && <div role="alert" className="rounded-lg bg-rose-50 p-3"><p className="font-semibold">Corrige el archivo y vuelve a cargarlo. No se importará ninguna fila mientras existan errores.</p><ul className="mt-2 space-y-1">{preview.errors.map((row, index) => <li key={`${row.row}-${index}`}>Fila {row.row}: {row.message}</li>)}</ul></div>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="text-left mb-2">Vista previa normalizada ({preview.rows.length} registros)</caption><thead><tr><th className="p-2 text-left">Fila</th><th className="p-2 text-left">Datos que se guardarán</th></tr></thead><tbody>{preview.rows.map(row => <tr key={row.row} className="border-t"><td className="p-2 align-top">{row.row}</td><td className="p-2"><dl className="grid gap-1">{Object.entries(row.data).filter(([field]) => field !== 'sucursalId').map(([field, value]) => <div key={field} className="break-words"><dt className="inline font-medium">{labels[field] || field}: </dt><dd className="inline">{String(value ?? '—')}</dd></div>)}</dl></td></tr>)}</tbody></table></div>
      <button className="studio-button-primary" type="button" disabled={locked || !preview.canConfirm} onClick={() => void confirm({ tipo: kind, sucursalId: branch.id, csv, previewHash: preview.previewHash, idempotencyKey: crypto.randomUUID() })}>Importar {preview.summary.valid} registros</button>
    </section>}
  </main>;
}
