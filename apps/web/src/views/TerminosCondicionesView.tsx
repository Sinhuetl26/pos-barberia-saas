import React from 'react';
import { Link } from 'react-router-dom';
import { Scissors, FileText, ArrowLeft } from 'lucide-react';

export const TerminosCondicionesView: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-stone-900 font-sans selection:bg-stone-900 selection:text-white">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-stone-900 hover:text-stone-700 font-bold text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a SYSTECH</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-600">
            <FileText className="w-4 h-4 text-stone-800" />
            <span>Términos y Condiciones</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-2xl border border-stone-200/90 p-8 sm:p-12 shadow-sm space-y-8 text-stone-800 text-xs sm:text-sm leading-relaxed">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-950 tracking-tight">
              Términos y Condiciones del Servicio
            </h1>
            <p className="text-stone-500 text-xs mt-1">
              Vigentes para la República Mexicana y usuarios del software SYSTECH Studio.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">1. Aceptación del Servicio</h2>
            <p>
              Al registrarse, activar una prueba gratuita o contratar cualquier suscripción en la plataforma <strong>SYSTECH Studio</strong>, usted acepta quedar vinculado a estos Términos y Condiciones, los cuales rigen el acceso y uso del software en la nube para puntos de venta, agenda y administración de barberías.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">2. Periodo de Prueba Gratuita (14 Días)</h2>
            <p>
              Ofrecemos a los nuevos clientes un periodo de prueba gratuita de 14 (catorce) días naturales con acceso total a las características del Plan Pro. Al término de la prueba, el cliente podrá optar por activar una suscripción mensual o anual. En ningún caso se realiza un cargo automático sin la debida autorización y captura de método de pago por parte del usuario.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">3. Modelo de Suscripción, Pagos y Facturación</h2>
            <p>
              Los precios de los planes (Básico $499 MXN/mes y Pro $999 MXN/mes) se cobran en Moneda Nacional (MXN) de forma recurrente. Las transacciones se procesan a través de Stripe Payments México con encriptación bancaria de 256 bits.
            </p>
            <p>
              El usuario puede cancelar su suscripción en cualquier momento desde su panel de control; la cancelación surtirá efectos al concluir el ciclo de facturación pagado en curso.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">4. Responsabilidades de las Partes</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-700">
              <li><strong>El Dueño/Administrador de la Barbería</strong> funge como Responsable directo del tratamiento de los datos de sus clientes finales y del cumplimiento de las citas y cobros acordados con ellos.</li>
              <li><strong>SYSTECH Studio</strong> funge exclusivamente como Encargado tecnológico de la infraestructura y almacenamiento de la información, garantizando la disponibilidad del sistema con un objetivo de servicio (SLA) del 99.5% de tiempo de actividad.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">5. Propiedad de los Datos y Exportación</h2>
            <p>
              Toda la información ingresada (catálogo de productos, barberos, historial de ventas, cortes de caja y expedientes de clientes) es propiedad exclusiva de la barbería contratante. El cliente puede descargar y exportar sus datos en formato CSV en cualquier momento.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-stone-900">6. Jurisdicción y Contacto</h2>
            <p>
              Para cualquier controversia derivada del presente contrato, las partes se someten a la jurisdicción de los tribunales competentes en México y a las leyes federales aplicables.
            </p>
            <p>
              Para dudas o aclaraciones legales, contáctenos en: <strong>legal@systech.mx</strong> o al teléfono de atención a clientes.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
        SYSTECH Studio Platform • Términos del Servicio • Todos los derechos reservados.
      </footer>
    </div>
  );
};
