# UI-08 · Devolución recuperable y cierre confirmado

23/oct/2026. Entrega parcial del rediseño; UI-08 permanece En revisión y el indicador conserva 20 %.

## Cambio integrado

La devolución distingue preparación, resultado pendiente propio y otra operación pendiente. Después de una respuesta perdida ofrece **Comprobar devolución**, oculta el formulario editable y recupera la referencia original. Reabrir el diálogo conserva ese estado. Al confirmar la recuperación, el historial y catálogo se consultan de nuevo, incluso si se recupera desde el aviso general. Errores de red en español y texto del formulario reducido. No se modificaron reglas de devolución, permisos, importes, precios ni persistencia financiera.

Fuente: apps/web/src/views/PosView.tsx y utils/refundRecovery.ts. Se mantiene la protección de ticket anterior. Revisión de hooks: suscripción financiera con limpieza al desmontar/cambiar venta, sin dependencia nueva ni segundo bloqueo de rutas.

## Evidencia comprobada

- Laboratorio UI07 existente, sin reseed: tres ventas previas, dos entregas previas. ÚNICAMENTE una nueva devolución del folio ficticio A-000003 por350 desde COBRADOR y un único cierre del turno ya abierto.
- Proxy perdió la respuesta después de que API confirmó200. Se mostró Comprobar devolución; Atrás/reabrir conserva recuperación, sin pedir seleccionar unidades otra vez. Recuperar actualizó A-000003 a CANCELADA.
- Consulta directa: exactamente una devolución350; tres ventas, dos primeras COMPLETADAS; custodia del barbero550 (antes900). No se volvió a vender ni entregar efectivo.
- Cierre guiado: pendientes conserva cita en atención y custodia550 separada; conteo ciego150; vista previa150 esperado/150 contado/diferencia0; confirmación única CERRADO, hash persistido. La interfaz pasa a Caja cerrada y conserva custodia550.
- Comprobante HTML del cierre responde200 y contiene150.00; copia ficticia guardada en comprobante-laboratorio.html. Pulsar Abrir comprobante no produjo una pestaña verificable en IAB: no se acredita revisión visual de la ventana emergente ni impresión física.
- Capturas escritorio y390×844 móvil: devolución, recuperación, historial y cierre confirmado. El formulario móvil se abrió sobre A-000002 y se canceló SIN devolver.
- TypeScript sin errores; 11 aserciones helper; siete combinaciones de guardia POS y cinco pruebas del cliente real de tiempo límite/UUID pasaron.
- Demo principal: nueva compilación index-BmRVHcDt.js / index-CZ0UKYph.css, API3103. Historial principal sigue con siete ventas; formulario abierto solo para lectura y cancelado. Pestaña original del usuario conservada. Sin nuevos movimientos principales.

## Archivos y límites

Compilación .tools/ui-refund-final-20261023 incorporada al snapshot Docker sin borrar assets anteriores. QA .tools/ui-refund-qa-20261023 apunta SOLO al proxy3105; no copiarla a la demo.

Integridad reproducible de este estado: .tools/ui11-verify.cjs y integridad.json. La base ahora tiene UN cierre CERRADO y UNA devolución. NO repetir A-000003, NO cerrar otra vez ni ejecutar los verificadores anteriores como si representaran este estado. Custodia550 y cita EN_CURSO sin venta siguen pendientes ficticios intencionales. Laboratorio detenido al terminar.

Faltan revisión de devolución parcial de productos/stock en navegador, respuesta perdida del cierre y ventana de impresión real. UI-08 no está completamente verificado. Se observó que los accesos de Más opciones pierden su texto visible/accesible; revisar al integrar UI-03, junto al historial móvil ancho.
