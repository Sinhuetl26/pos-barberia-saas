import { useEffect, useRef, useState } from 'react';
import { BookOpen, HelpCircle, Search, X } from 'lucide-react';
import { OperationDialog } from '../components/OperationDialog';

interface CentroAyudaModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantSlug?: string;
  tenantName?: string;
}

const guides = [
  { title: 'Preparar servicios y equipo', steps: [
    'En Servicios captura el nombre, precio y duración de cada atención.',
    'En Equipo registra a los barberos, sus comisiones y su disponibilidad.',
    'Revisa la sucursal activa antes de operar: sus servicios y horarios determinan la disponibilidad de reservas.'
  ] },
  { title: 'Registrar una reserva', steps: [
    'Comparte el enlace de reservas de tu propia barbería desde Configuración.',
    'El cliente elige servicio, profesional y un horario disponible. Confirma el folio que aparece al terminar.',
    'Consulta la nueva cita en Agenda. Un enlace de WhatsApp preparado requiere que la persona envíe el mensaje; no equivale a entrega automática.'
  ] },
  { title: 'Atender y cobrar', steps: [
    'Abre la atención desde Agenda o la jornada del barbero y revisa los servicios reservados.',
    'En Punto de venta agrega únicamente los productos o servicios adicionales y revisa el total.',
    'Elige el método de pago y confirma una vez. Si la respuesta se interrumpe, usa la recuperación de la operación pendiente antes de intentar otra venta.'
  ] },
  { title: 'Contar inventario y registrar mermas', steps: [
    'En Inventario revisa la sucursal y el producto; registra las entradas con cantidad, costo y referencia.',
    'Registra una merma con motivo cuando un producto ya no esté disponible para venta o uso.',
    'Para un conteo captura solo los productos contados. Una casilla vacía queda sin contar; cero significa que no hay existencias.',
    'Revisa las diferencias antes de confirmar. El historial conserva los movimientos y sus motivos.'
  ] },
  { title: 'Configurar consumo de insumos', steps: [
    'Da de alta los insumos con su unidad y cantidad real disponible.',
    'En Recetas asigna cuánto se usa por servicio. La receta debe estar configurada antes de atender.',
    'Revisa el consumo de la atención y registra cualquier corrección con motivo. Terminar y cobrar la misma atención no debe descontar dos veces.'
  ] },
  { title: 'Cerrar un turno de caja', steps: [
    'Revisa las atenciones pendientes y el efectivo que conserva cada persona. La custodia pendiente no se recibe automáticamente al cerrar.',
    'Cuenta el efectivo por denominación antes de comparar con el sistema.',
    'Revisa la comparación, explica cualquier diferencia y confirma el cierre.',
    'Si aparece una operación pendiente, recupera su resultado antes de volver a cerrar.'
  ] },
  { title: 'Imprimir un comprobante', steps: [
    'Abre el comprobante de la venta o del cierre y elige imprimir.',
    'En el diálogo del navegador selecciona la impresora instalada y revisa papel, márgenes y vista previa.',
    'La compatibilidad depende del modelo, controlador y conexión. La demo aún requiere una prueba con una impresora física; no garantiza corte de papel ni impresión Bluetooth directa.'
  ] },
  { title: 'Proteger tu cuenta', steps: [
    'En Seguridad puedes solicitar verificación de correo, actualizar tu contraseña o cerrar tus sesiones.',
    'Los enlaces de recuperación requieren un proveedor de correo configurado. Consulta su estado de entrega en Conexiones.',
    'No compartas contraseñas, enlaces privados de citas ni fotografías de referencia al reportar un problema.'
  ] }
];

export function CentroAyudaModal({ isOpen, onClose, tenantName = 'Tu barbería' }: CentroAyudaModalProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<'guides' | 'support'>('guides');
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (isOpen) headingRef.current?.focus();
  }, [isOpen, selected]);
  const visible = guides.map((guide, index) => ({ ...guide, index })).filter(guide =>
    `${guide.title} ${guide.steps.join(' ')}`.toLocaleLowerCase('es-MX').includes(search.trim().toLocaleLowerCase('es-MX'))
  );
  return <OperationDialog open={isOpen} busy={false} titleId="help-center-title" onClose={onClose} className="max-w-3xl">
    <section className="studio-panel flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden">
      <header className="p-5 sm:p-6 border-b flex items-start justify-between gap-4">
        <div className="min-w-0"><div className="flex items-center gap-2"><HelpCircle aria-hidden="true" className="w-5 h-5 shrink-0" /><h2 ref={headingRef} id="help-center-title" tabIndex={-1} className="text-xl font-semibold">Ayuda para operar</h2></div><p className="text-sm text-stone-600 mt-2 break-words">{tenantName}</p></div>
        <button type="button" className="studio-icon-button shrink-0" aria-label="Cerrar ayuda" onClick={onClose}><X aria-hidden="true" className="w-5 h-5" /></button>
      </header>
      <div className="flex flex-wrap gap-2 border-b px-5 py-3" aria-label="Secciones de ayuda">
        <button type="button" aria-pressed={tab === 'guides'} className="studio-button-secondary" onClick={() => { setTab('guides'); setSelected(null); }}><BookOpen aria-hidden="true" className="w-4 h-4" />Guías operativas</button>
        <button type="button" aria-pressed={tab === 'support'} className="studio-button-secondary" onClick={() => setTab('support')}>Reportar un problema</button>
      </div>
      <div className="overflow-y-auto p-5 sm:p-6">
        {tab === 'guides' && (selected !== null ? <article>
          <button type="button" className="studio-button-secondary mb-5" onClick={() => setSelected(null)}>Volver a las guías</button>
          <h3 className="text-lg font-semibold">{guides[selected].title}</h3>
          <ol className="list-decimal pl-5 space-y-4 mt-4 text-sm leading-6 text-stone-700">{guides[selected].steps.map(step => <li key={step}>{step}</li>)}</ol>
        </article> : <div>
          <label htmlFor="help-search" className="block text-sm font-medium mb-2">Buscar una guía</label>
          <div className="flex items-center gap-2"><Search aria-hidden="true" className="w-4 h-4 shrink-0" /><input id="help-search" type="search" className="studio-input w-full min-w-0" value={search} onChange={event => setSearch(event.target.value)} placeholder="Caja, reservas, inventario…" /></div>
          <p role="status" className="text-sm text-stone-600 mt-3">{visible.length ? `${visible.length} guías disponibles` : 'No hay guías con esa búsqueda. Prueba con caja, reservas o inventario.'}</p>
          <div className="divide-y mt-4">{visible.map(guide => <button type="button" key={guide.title} className="w-full py-4 text-left text-sm font-semibold hover:underline" onClick={() => setSelected(guide.index)}>{guide.title}</button>)}</div>
        </div>)}
        {tab === 'support' && <div className="space-y-5 text-sm leading-6">
          <h3 className="text-lg font-semibold">Información útil para resolver un problema</h3>
          <p>El canal de soporte comercial está pendiente de configuración. Esta demo no envía reportes ni encuestas al equipo de soporte.</p>
          <ul className="list-disc pl-5 space-y-3"><li>Anota la pantalla, sucursal, hora y los pasos que produjeron el problema.</li><li>Copia el texto del error y, si existe, el folio de la operación.</li><li>En una venta o cierre interrumpido, conserva la operación pendiente y usa su recuperación. No repitas el cobro para comprobarlo.</li><li>Comparte una captura con datos personales ocultos cuando el canal esté habilitado.</li></ul>
          <p>Los estados de proveedores se consultan en Conexiones. Configurado, enviado al proveedor y entregado son estados distintos.</p>
        </div>}
      </div>
    </section>
  </OperationDialog>;
}
