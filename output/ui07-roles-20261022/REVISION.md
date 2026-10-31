# UI-07 — Autorizaciones, recuperación y barbero

22/oct/2026. Resultado: **En revisión**, sin declarar completo el bloque ni el producto. [Estado fuente](../../docs/scrum/ESTADO_REDISENO_UI_UX.md).

## Cambios entregados

- Autorización de descuentos legible dentro del pago carbón: solicitud, pendiente, rechazo, aprobación, renovación y errores conservan su lógica existente. El estado usa etiquetas claras y evita mostrar una fecha inválida.
- Pantalla de recuperación con total, método, artículos y una única acción para consultar la intención conservada. No ofrece empezar otra venta mientras el resultado sea incierto.
- Sin cambios de precios, proveedores, reglas financieras ni autorización del servidor. Sin dependencias nuevas.

## Recorrido real aislado

Cuenta de barbero de un tenant ficticio nuevo, con origen web5198 / API3104 / proxy3105; totalmente separado de Docker5197/API3103. Manifest y base conservados solo como fixture local. No publicar sus credenciales.

1. El barbero accede a Mi agenda, Cobrar y Mi caja; el ticket se asigna a su profesional.
2. Servicio $350, descuento $70 y motivo: registro bloqueado hasta revisión administrativa. Captura [pendiente](pendiente-escritorio.png).
3. Otra cuenta rechaza por API de laboratorio: Comprobar muestra Rechazada y mantiene bloqueado Registrar. [Captura](rechazada-escritorio.png).
4. Nueva solicitud aprobada por otra cuenta: Comprobar habilita el registro. Cambiar a Tarjeta invalida esa aprobación y vuelve a bloquear el cobro. No se cobró ese ticket descontado. [Aprobada](autorizada-escritorio.png).
5. Venta ficticia A-000001: $350, recibido $500, cambio $150; barbero y cobrador correctos. La primera simulación cortó la conexión tras responder la API; el navegador obtuvo después el resultado exitoso. No se usa ese caso como evidencia de pantalla incierta. [Confirmación](confirmacion-barbero.png).
6. Segunda venta ficticia A-000002: el proxy esperó el commit exitoso y sustituyó la respuesta por HTTP502. Se mostró resultado incierto, sin permitir modificar el pago. [Captura](resultado-incierto.png).
7. Recarga real del navegador: referencia conservada y pantalla Comprobar cobro. Consultar recuperó A-000002. Tres GET posteriores conservaron el mismo ID y folio, con **dos ventas y dos operaciones únicas en total**, $700 ficticios. [Integridad SQL/API](integridad.json).
8. Intentar cobrar como otro profesional devuelve 404 RECURSO_NO_DISPONIBLE, sin venta; aprobar como barbero devuelve403. Recuento final intacto.
9. Móvil390×844: recuperación, confirmación, detalle y solicitud de autorización recorridos. Los diálogos permiten desplazarse hasta sus acciones. Ticket ficticio final vaciado, sin tercera venta.

## Evidencia visual

- [Recuperación escritorio](recuperacion-escritorio.png), [móvil](recuperacion-movil.png).
- [Venta recuperada móvil](recuperada-movil.png), [autorización móvil](autorizacion-movil.png).
- [Demo principal con build nuevo](demo-principal.png). Siete avisos previos, turno y efectivo existentes conservados; no se realizaron cobros ni cierres en ese volumen.

Capturas de escritorio1280×720 y móvil solicitado390×844 (contenido385px). Algunas capturas de autorización muestran la zona inferior después de desplazarse al botón; el encabezado permanece accesible desplazándose arriba. Son estados reales de la interfaz, no maquetas SSR.

## Verificaciones

- `scripts/test_checkout_recovery_states.cjs`: etiquetas vigente/vencida/rechazada, límite exacto de vencimiento, recuperación con una sola acción, ocupado y escape de errores.
- `scripts/qa_discount_recovery_helpers.cjs`:26 comprobaciones.
- `scripts/test_financial_timeout_ui.cjs`:5 comprobaciones de intención duradera y respuestas tardías.
- TypeScript web y build Vite correctos. Advertencia previa de bundle de unos924KB conservada.
- Revisión React: componente de recuperación presentacional con props, sin efectos/peticiones nuevos; solicitud mantiene guardas de concurrencia, callbacks y contexto existentes; alertas y botones deshabilitados conservados. No se agregaron librerías ni se cambió el orden de hooks.

## Versión local y límites

Build `.tools/ui07-final-20261022`, API3103 confirmada antes de copiar; JS `index-BjBm-XMh.js`, CSS `index-CrVUdj9_.css`. Copiado al snapshot Docker existente conservando assets/muestras. Respaldo del índice y fuentes previas en `antes/`. La variante QA apunta a3105 y **no** se copió a la demo principal.

Faltan conciliación integral cita→ticket con UI-03/UI-06 y captura de aprobación vencida real. El texto de vencimiento se recalcula al renderizar o comprobar; no se implementó una actualización automática por reloj. El servidor sigue validando vigencia al registrar. Esto queda explícito antes de verificar completo UI-07.

No hubo impresión física, proveedores reales, carga de producción, publicación ni pagos externos. El502 de laboratorio es deliberado; no se afirma una consola libre de errores durante esa simulación. Siguiente bloque: UI-08, Mi caja del barbero móvil y estados restantes.
