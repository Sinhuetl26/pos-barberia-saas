import React from 'react';
import { Link } from 'react-router-dom';
import { Scissors, ShieldCheck, ArrowLeft } from 'lucide-react';

export const AvisoPrivacidadView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-stone-900 font-sans selection:bg-stone-900 selection:text-white">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {onBack ? (
            <button type="button" onClick={onBack} autoFocus className="flex items-center gap-2 text-stone-900 hover:text-stone-700 font-bold text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a mi reserva</span>
            </button>
          ) : <Link to="/" className="flex items-center gap-2 text-stone-900 hover:text-stone-700 font-bold text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a SYSTECH</span>
          </Link>}
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Borrador de privacidad</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <p role="note" className="mb-6 rounded-xl bg-amber-50 p-4 text-amber-900">Documento de demostración pendiente de revisión legal y de completar la identidad y los canales reales del responsable. No acredita cumplimiento ni está listo para recibir datos reales.</p>
        <div className="bg-white rounded-2xl border border-stone-200/90 p-8 sm:p-12 shadow-sm space-y-8 text-stone-800 text-xs sm:text-sm leading-relaxed">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-950 tracking-tight">
              Aviso de Privacidad Integral
            </h1>
            <p className="text-stone-500 text-xs mt-1">
              Versión de demostración: octubre de 2026. El texto necesita revisión antes de publicarse como aviso aplicable.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">1. Identidad y Domicilio del Responsable</h2>
            <p>
              La identidad legal, domicilio y canales de contacto del responsable están pendientes de definir. Esta demo no asigna esos datos a una empresa o barbería real.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">2. Datos Personales Recabados</h2>
            <p>
              Para prestar los servicios de software como servicio (SaaS), punto de venta (POS) y portal de auto-reserva para salones y barberías, recabamos las siguientes categorías de datos:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-700">
              <li><strong>Datos de Identificación del Titular del Negocio:</strong> Nombre completo, correo electrónico, teléfono de contacto y datos fiscales en caso de requerir facturación.</li>
              <li><strong>Datos de Clientes Finales de las Barberías:</strong> Nombre de pila o completo, número de teléfono móvil (para envío de confirmaciones y recordatorios por WhatsApp o SMS) y notas de estilo o alergias capilares proporcionadas voluntariamente.</li>
              <li><strong>Datos Operativos y de Transacción:</strong> Historial de reservaciones, servicios solicitados, monto total de compras y métodos de pago utilizados (efectivo, tarjeta o transferencia). En ningún momento SYSTECH almacena números completos de tarjeta de crédito ni códigos CVV, delegando el procesamiento a pasarelas certificadas PCI-DSS como Stripe.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">3. Finalidades del Tratamiento</h2>
            <p><strong>Finalidades Primarias (necesarias para el servicio):</strong></p>
            <ul className="list-disc pl-5 space-y-1 text-stone-700">
              <li>Creación y administración de la cuenta multitenant de la barbería.</li>
              <li>Gestión de la agenda, sincronización de turnos y emisión de tickets de venta en terminal POS.</li>
              <li>Si eliges adjuntarlos, el tipo de corte y la foto de referencia se vinculan a esa cita para que el personal autorizado de la barbería prepare y converse contigo el servicio. Puedes reservar sin ellos y quitar la foto antes de confirmar. La imagen no se muestra en consultas públicas de reservas ni se reutiliza en publicidad.</li>
              <li>Envío de confirmaciones inmediatas, recordatorios de citas (24 horas y 2 horas antes) y enlaces únicos para reprogramación o cancelación.</li>
              <li>Acreditación y liquidación exacta de comisiones a los barberos prestadores de servicio.</li>
            </ul>
            <p className="mt-2"><strong>Finalidades Secundarias:</strong></p>
            <ul className="list-disc pl-5 space-y-1 text-stone-700">
              <li>Envío de promociones periódicas de fidelización ("te extrañamos"). El cliente puede solicitar la baja voluntaria en cualquier momento enviando la palabra "BAJA" por WhatsApp o solicitándolo en el local.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">4. Ejercicio de Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)</h2>
            <p>
              Todo titular de datos personales tiene derecho a acceder a los datos que conservamos sobre él, solicitar su rectificación cuando sean inexactos, exigir su cancelación/anonimización cuando considere que no se requieren, u oponerse al tratamiento de los mismos para fines específicos.
            </p>
            <p>
              Para ejercer sus derechos ARCO, el titular o su representante legal puede:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-700">
              <li>Solicitar directamente desde el módulo CRM de la barbería su exportación o supresión con 1 clic conforme a la ley.</li>
              <li>El canal real para solicitudes, requisitos de identificación y plazos de respuesta se completarán en la revisión del aviso antes del lanzamiento.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">5. Aislamiento Tecnológico y Transferencia de Datos</h2>
            <p>
              SYSTECH emplea arquitectura multi-inquilino con aislamiento lógico estricto a nivel de base de datos. Ninguna barbería puede consultar, visualizar ni exportar los datos de clientes pertenecientes a otra barbería.
            </p>
            <p>
              No vendemos ni comercializamos bases de datos con terceros bajo ninguna circunstancia. Las únicas transferencias realizadas corresponden a proveedores esenciales de infraestructura bajo estrictos convenios de confidencialidad (Stripe para cobros, Meta WhatsApp Business Platform para mensajería y servidores seguros en la nube).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">6. Modificaciones al Aviso de Privacidad</h2>
            <p>
              El presente aviso de privacidad puede sufrir modificaciones derivadas de nuevos requerimientos legales o de mejoras al software. Cualquier cambio sustancial será publicado en esta misma dirección web y notificado a los administradores de cada barbería.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
        SYSTECH Studio · Borrador de demostración pendiente de revisión.
      </footer>
    </div>
  );
};
