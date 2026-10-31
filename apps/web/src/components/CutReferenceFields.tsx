import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { compressCutReference, isCutReferenceDataUrl } from '../utils/cutReferencePhoto';
import '../styles/cut-reference.css';

export interface CutReferenceInput { tipoCorte: string; fotoReferencia: string | null }
interface CutReferenceFieldsProps {
  value: CutReferenceInput;
  onChange: (value: CutReferenceInput) => void;
  onBusyChange: (busy: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}
const suggestions = ['Fade', 'Taper', 'Clásico', 'Crop', 'Undercut', 'Lo definimos contigo'];

export function CutReferenceFields({ value, onChange, onBusyChange, disabled = false, compact = false }: CutReferenceFieldsProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const operation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const latestValue = useRef(value);
  latestValue.current = value;
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => { operation.current++; controller.current?.abort(); onBusyChange(false); }, [onBusyChange]);
  const cancelPreparation = (removePhoto = false) => {
    operation.current++; controller.current?.abort(); controller.current = null;
    setProcessing(false); onBusyChange(false); setError('');
    if (removePhoto) onChange({ ...latestValue.current, fotoReferencia: null });
  };
  const choosePhoto = async (file?: File) => {
    if (!file || disabled || processing) return;
    const request = ++operation.current;
    controller.current?.abort(); controller.current = new AbortController();
    setError(''); setProcessing(true); onBusyChange(true);
    if (input.current) input.current.value = '';
    try {
      const photo = await compressCutReference(file, controller.current.signal);
      if (request === operation.current) onChange({ ...latestValue.current, fotoReferencia: photo });
    } catch (failure: any) {
      if (request === operation.current) setError(failure.message || 'No pudimos preparar la foto. Prueba con otra imagen.');
    } finally {
      if (request === operation.current) { setProcessing(false); onBusyChange(false); controller.current = null; }
    }
  };
  const locked = disabled || processing;
  return <fieldset className="cut-reference-fields" disabled={disabled} aria-describedby={`${id}-help`}>
    <legend className={compact ? 'sr-only' : undefined}>Preferencia de corte {!compact && <span>Opcional</span>}</legend>
    <p id={`${id}-help`} className="cut-reference-help">Comparte una preferencia o una foto para conversarla con tu barbero. El precio y la duración corresponden al servicio que elegiste.</p>
    <div className="cut-reference-suggestions" aria-label="Ideas de corte">{suggestions.map(style => <button type="button" key={style} aria-pressed={value.tipoCorte.trim().toLowerCase() === style.toLowerCase()} onClick={() => onChange({ ...value, tipoCorte: style })}>{value.tipoCorte.trim().toLowerCase() === style.toLowerCase() && <span aria-hidden="true">✓ </span>}{style}</button>)}</div>
    <label htmlFor={`${id}-style`}>Tipo de corte o preferencia</label>
    <input id={`${id}-style`} type="text" maxLength={80} value={value.tipoCorte} onChange={event => onChange({ ...value, tipoCorte: event.target.value })} placeholder="Ej. Fade bajo, conservar el largo de arriba" />
    <div className="cut-reference-photo-row"><div><label htmlFor={`${id}-photo`}>Foto de referencia</label><p className="cut-reference-help">JPG, PNG o WebP de hasta 8 MB. Se adjunta a tu cita al confirmar.</p></div><label className="cut-reference-file-button" htmlFor={`${id}-photo`}><ImagePlus size={18} aria-hidden="true" />{value.fotoReferencia ? 'Cambiar foto' : 'Elegir foto'}<input ref={input} id={`${id}-photo`} type="file" disabled={locked} accept="image/jpeg,image/png,image/webp" onChange={event => choosePhoto(event.target.files?.[0])} /></label></div>
    {processing && <><p role="status" className="cut-reference-help">Preparando tu foto… Espera antes de confirmar.</p><div className="cut-reference-suggestions"><button type="button" onClick={() => cancelPreparation()}>Cancelar preparación</button><button type="button" onClick={() => cancelPreparation(true)}>Continuar sin foto</button></div></>}
    {error && <p role="alert" className="cut-reference-error">{error}{value.fotoReferencia && ' Conservamos tu foto anterior.'}</p>}
    {isCutReferenceDataUrl(value.fotoReferencia) && <div className="cut-reference-preview"><img src={value.fotoReferencia} alt="Foto que compartirás con tu barbero" /><button type="button" onClick={() => cancelPreparation(true)}><Trash2 size={17} aria-hidden="true" />Quitar foto</button></div>}
  </fieldset>;
}
