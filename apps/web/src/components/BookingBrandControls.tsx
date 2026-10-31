import { BookingAppearance, bookingSections, bookingTheme } from '../utils/bookingAppearance';

interface Props {
  value: BookingAppearance;
  onChange: <K extends keyof BookingAppearance>(key: K, value: BookingAppearance[K]) => void;
}
export function BookingBrandControls({ value, onChange }: Props) {
  const theme = bookingTheme(value.tema);
  const move = (index: number, offset: number) => {
    const order = [...value.ordenSecciones];
    [order[index], order[index + offset]] = [order[index + offset], order[index]];
    onChange('ordenSecciones', order);
  };
  return <div className="settings-brand-editor">
    <div><h3>La primera impresión</h3><p>Elige una composición. Después hazla tuya con tus fotos y tus palabras.</p></div>
    <div className="settings-template-options">
      {([['inmersiva', 'Inmersiva', 'Tu fotografía ocupa el escenario.'], ['cartel', 'Cartel', 'Tu frase es la protagonista.'], ['editorial', 'Editorial', 'Foto y texto lado a lado.'], ['compacta', 'Directa', 'Portada breve, servicios a la vista.']] as const).map(([key, title, description]) => <button key={key} type="button" aria-pressed={value.portada === key} onClick={() => onChange('portada', key)}>
        <span aria-hidden="true" className={`settings-template-sketch sketch-${key}`}><i /><b>Aa</b></span><strong>{title}</strong><small>{description}</small>
      </button>)}
    </div>
    <label className="settings-field"><span>Titular de la portada</span><textarea rows={2} maxLength={100} value={value.tituloPortada} placeholder="Un corte que hable de ti." onChange={e => onChange('tituloPortada', e.target.value)} /><small>Si lo dejas vacío, se muestra el nombre del negocio.</small></label>
    <label className="settings-field"><span>Texto bajo el titular</span><textarea rows={2} maxLength={240} value={value.textoPortada} placeholder="Tu estilo, en buenas manos. Elige tu corte y encuentra tu momento." onChange={e => onChange('textoPortada', e.target.value)} /><small>Vacío usa la frase de tu barbería.</small></label>
    <details className="settings-option-group"><summary>Colores, letras y acabados</summary><div className="settings-brand-fields">
      <div className="settings-field-pair">{([['colorMarca', 'Color de botones', theme.primary], ['colorFondo', 'Fondo de la página', theme.canvas]] as const).map(([key, label, fallback]) => <div className="settings-field" key={key}><span>{label}</span><div className="settings-color-control"><input type="color" aria-label={label} value={/^#[\da-f]{6}$/i.test(value[key]) ? value[key] : fallback} onInput={e => onChange(key, e.currentTarget.value)} onChange={e => onChange(key, e.target.value)} /><input type="text" aria-label={`${label} (HEX)`} required pattern="#[0-9a-fA-F]{6}" maxLength={7} value={value[key] || fallback} onChange={e => onChange(key, e.target.value)} /><button type="button" disabled={!value[key]} onClick={() => onChange(key, '')}>Usar paleta</button></div></div>)}</div>
      <p className="settings-help">El texto sobre fondos y botones cambia entre blanco y negro para mantener contraste.</p>
      <label className="settings-field"><span>Tipografía de títulos</span><select value={value.tipografia} onChange={e => onChange('tipografia', e.target.value as BookingAppearance['tipografia'])}><option value="condensada">Condensada · carácter de barbería</option><option value="elegante">Serif · estudio clásico</option><option value="moderna">Sans · estudio contemporáneo</option></select></label>
      <label className="settings-field"><span>Tratamiento de fotografías</span><select value={value.tratamientoFoto} onChange={e => onChange('tratamientoFoto', e.target.value as BookingAppearance['tratamientoFoto'])}><option value="mono">Blanco y negro</option><option value="color">Color original</option></select></label>
      <label className="settings-field"><span>Forma de botones</span><select value={value.formaBotones} onChange={e => onChange('formaBotones', e.target.value as BookingAppearance['formaBotones'])}><option value="suave">Esquinas suaves</option><option value="recta">Rectos</option><option value="redonda">Redondos</option></select></label>
      <label className="settings-field"><span>Presentación de servicios</span><select value={value.estiloServicios} onChange={e => onChange('estiloServicios', e.target.value as BookingAppearance['estiloServicios'])}><option value="tarjetas">Tarjetas con fotografía</option><option value="lista">Carta de servicios</option></select></label>
    </div></details>
    <details className="settings-option-group"><summary>Orden y títulos de las secciones</summary><p>La portada permanece primero. Cambia el orden de las secciones; las ocultas conservan su posición al volver a mostrarlas.</p>
      <ol className="settings-section-order">{value.ordenSecciones.map((key, index) => <li key={key}><span>{bookingSections[key]}</span><button type="button" aria-label={`Subir ${bookingSections[key]}`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button><button type="button" aria-label={`Bajar ${bookingSections[key]}`} disabled={index === value.ordenSecciones.length - 1} onClick={() => move(index, 1)}>↓</button></li>)}</ol>
      <div className="settings-brand-fields">{([['tituloServicios', 'Título de servicios', 'Elige tu servicio'], ['tituloEquipo', 'Título del equipo', '¿Con quién te atiendes?'], ['tituloHistoria', 'Título de historia', 'Conoce nuestra barbería'], ['tituloContacto', 'Título de contacto', 'Nos vemos en la barbería.']] as const).map(([key, label, fallback]) => <label className="settings-field" key={key}><span>{label}</span><input maxLength={100} placeholder={fallback} value={value[key]} onChange={e => onChange(key, e.target.value)} /></label>)}</div>
    </details>
  </div>;
}
