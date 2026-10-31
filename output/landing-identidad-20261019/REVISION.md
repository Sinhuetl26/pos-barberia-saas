# Landing con identidad propia — 19/oct/2026

## Qué cambió

La página pública ya no depende de una sola composición con distintas paletas. Se añadieron dos composiciones nuevas a las dos existentes:

- **Inmersiva:** fotografía de fondo a todo el ancho, titular independiente del nombre del negocio, contraste oscuro y llamada principal a reservar.
- **Cartel:** titular tipográfico grande con fotografía arqueada, compatible con colores y fuentes propios.
- **Editorial:** foto y texto separados.
- **Directa:** portada compacta.

El editor está en Configuración → Página de reservas. Permite editar titular, texto, títulos de secciones, color de botones y fondo mediante selector o HEX, tres familias de títulos, fotografías en color o monocromo, forma de botones y servicios en tarjetas o carta. Añade foto pública propia por servicio. La visibilidad de secciones, logo, portada, redes, historia, galería y encuadre siguen disponibles.

Se puede cambiar el orden de servicios, historia, equipo, galería y contacto. Se aplica al orden real del documento, no solo al orden visual de CSS. La miniatura del editor refleja composición, tipografía, colores, textos y orden; sigue siendo una vista resumida, no un segundo formulario de reserva.

## Demo que queda guardada

Únicamente tenant ficticio `cierre-demo`: Inmersiva, Silla azul, tipografía condensada, fotos monocromáticas, botones rectos, carta de servicios. Titular «Tu corte. / Tu firma.». Historia antes del equipo. Sin cambios en precios, profesionales o duración. Se mantiene el aviso de fotografías y datos ficticios.

Se guardó y revisó temporalmente Cartel + serif + fondo `#f2eee4` + botones `#e0b45a`. La página pública mostró esos valores tras recargar; texto del botón negro, fondo dorado. Después se restauró y guardó la configuración azul anterior. Así se comprobó personalización real más allá de la miniatura.

## Verificación

**50 casos/comprobaciones automáticas aprobados:**

- Marca y personalización: 8, incluidos round-trip API/página pública, parches que preservan fotos y orden, colores y longitudes inválidos, enlaces privados rechazados, claves desconocidas y contraste de texto negro/blanco con más de 2,000 colores muestreados.
- Galería y compatibilidad: 8.
- Ilustraciones locales: 10.
- Retención de intención de reserva: 11.
- Recuperación del cliente: 8.
- Reagendamiento sin sustituir selecciones: 5.

TypeScript web sin errores; API y web compiladas correctamente. Revisión de componentes React: etiquetas, botones explícitos, claves estables, estado derivado, sin nuevas dependencias ni efectos de red añadidos al reservar.

**Navegador:**

- Guardado y recarga del editor y de la página pública.
- Títulos y orden personalizados presentes en el documento público.
- Carta envía Corte clásico al flujo con selección correcta. Agregar Degradado mantiene 75 minutos / $450 para dos servicios.
- La reserva ficticia previa `RES-62ADA0188AABF35B` sigue consultándose: Corte clásico, Alex, 20/oct/2026 11:30, $200. No se creó otra reserva ni venta en esta revisión.
- Sin desbordamiento horizontal en anchos de contenido 315, 385 y 1435 px. Fotografías y portada revisadas mediante capturas móvil/escritorio. Consola consultada sin errores.
- Corregidos fondo y contraste heredados en Cartel, distribución vertical móvil y margen heredado de foto en la miniatura.

## Evidencia

- `portada-escritorio.jpg`: demo inmersiva azul.
- `portada-movil.jpg`: misma composición a 390 px nominales.
- `cartel-escritorio.jpg`: composición alternativa con serif y colores guardados.
- `servicios-escritorio.jpg`, `servicios-movil.jpg`: carta de servicios. La captura de escritorio es anterior al último ajuste de centrado de la historia inferior.
- `reserva-conservada.jpg`: consulta de reserva existente.
- `editor.jpg`: controles y vista previa; anterior al último ajuste de encuadre de la miniatura.

## Implementación y límites

Nuevos componentes/estilos `BookingBrandControls.tsx`, `booking-brand.css`, `booking-brand-editor.css`; ampliados `bookingAppearance.ts`, `booking-personalization.service.ts`, `ConfiguracionView.tsx` y `PublicBookingView.tsx`. Nuevas pruebas `test_booking_brand.cjs`.

API Docker local reconstruida sin borrar el volumen. Web compilada en `.tools/landing-brand-build-20261019` y copiada a la vista local servida existente. Se conserva el trabajo previo del repositorio. Sin despliegue, contratación, cargos o mensajes externos.

Es personalización guiada de la landing: no permite HTML/CSS arbitrario ni arrastrar elementos libremente. Las fotos propias se agregan por enlace público; la carga directa de archivos aún no está implementada. No se probó impresión física, infraestructura externa ni carga concurrente. Sigue la advertencia existente del paquete JavaScript grande (~918 kB sin comprimir); no se presenta esta revisión como auditoría completa de rendimiento o accesibilidad.
