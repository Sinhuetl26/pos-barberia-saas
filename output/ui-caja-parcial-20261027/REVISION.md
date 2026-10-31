# UI-08 · Devolución parcial y cierre recuperable

27/oct/2026. Entrega parcial del rediseño. UI-08 continúa En revisión; indicador20 % sin cambio de etapas.

## Recorrido y alcance

La historia verificada es: Cobrar dos productos → API de ventas → existencias8 → devolver una unidad → API de devolución → existencias9 e historial parcial → conteo100 → cierre guardado con respuesta perdida → recuperación del mismo cierre → comprobante y estado cerrado. Todo en la nueva Sucursal UI12 ficticia, dentro de la base aislada UI07. No se conectaron bancos, tarjetas ni proveedores; TARJETA es únicamente un método anotado en la prueba.

## Cambios

- Historial presenta **Devolución parcial** y **Devuelto $100.00** bajo el total original; no confunde la venta original200 con su devolución100. Etiquetas legibles para ventas completadas y devueltas.
- Errores de red del asistente de cierre indican la acción siguiente en español; conserva mensajes específicos de rechazo del servidor.
- Estado incierto dice **Cierre por comprobar**, no afirma que siga abierto. Acción **Comprobar cierre** visible, naranja y de48px; se mantiene bloqueada otra confirmación/conteo.
- Sin cambios en permisos, transacciones, importes, precios ni lógica financiera del servidor.

## Evidencia

- .tools/ui12-prepare.cjs creó una sucursal/producto/barbero ficticios y un fondo inicial100 una sola vez, con manifiesto .tools/ui12-scenario.json. No sembró ventas ni devoluciones.
- Navegador registró UNA venta de dos Cera UI12 ficticia de100 cada una: folio A-000001 de ESA sucursal (los folios se repiten entre sucursales; usar saleId/branchId del manifiesto).
- UNA devolución parcial100, una pieza. SQL y Kardex: stock10→8→9, dos movimientos, una devolución. Historial mantiene200 original y100 devuelto. Inventario muestra9 PIEZA.
- Reabrir devolución mostró una unidad disponible; ingresar2 deshabilita Confirmar devolución. Atrás no registra nada.
- Conteo100 y comparación100 esperado, diferencia0. Proxy perdió respuesta DESPUÉS del200 de API. Diálogo conserva operación y bloquea confirmar otra vez. Recuperar devolvió cierre confirmado. SQL: un turno cerrado, un hash y UNA auditoría CORTE_CAJA del turno; la devolución tiene UNA CajaOperacion. El cierre usa cierreHash y auditoría, no crea otra CajaOperacion.
- Recarga y selección explícita de la sucursal correcta conservan cierre guardado e historial parcial. La sucursal seleccionada se reinicia a la principal al recargar; no confundir estados de sucursales.
- Comprobante HTML auténtico del servidor: HTTP200, fondo100, ventas netas tarjeta100 después de devolver100, efectivo esperado/contado100 y diferencia0. Copia ficticia servida exclusivamente por preview QA y revisada visualmente (comprobante.png). Esto acredita HTML visible, no ventana emergente de impresión ni papel/PDF real.
- La corrección final del texto de incertidumbre y botones se comprobó con renderizado real del componente: comparación abierta, incertidumbre sin afirmar apertura, cierre confirmado sin permitir otra confirmación. Captura de incertidumbre móvil ANTES conserva el problema descubierto; no se presenta como prueba de la copia final.
- TypeScript sin errores.13 pruebas auxiliares Caja/clientes,11 casos recuperación de devolución,5 pruebas de tiempo límite/UUID y3 estados de render del asistente aprobados. Revisión de React: cambios de presentación/helpers puros, sin dependencias ni hooks nuevos.

## Conservación y continuación

Verificador vigente .tools/ui12-verify.cjs --closed; resultados integridad-parcial.json e integridad-final.json. No modifica datos. Escenario final: una venta200 parcialmente devuelta100, stock9, único cierre100/diferencia0. No volver a ejecutar venta, devolución ni cierre. Los manifiestos previos no se resetean. Sucursal original: tres ventas y devolución anterior intactas; custodia550. Sucursal QA alterna anterior sigue independiente.

Build principal .tools/ui-caja-final-20261027 API3103: index-dg6Tk_pX.js / index-C06-3dGw.css, copiado al snapshot Docker preservando assets antiguos. Build QA .tools/ui-caja-qa-20261027 usa3105 y nunca se debe copiar a la demo. Sin operaciones financieras en la demo principal. Docker estaba apagado durante la primera comprobación; se inició su recuperación sin borrar volúmenes.

Siguiente: UI-03, accesos de Más opciones sin texto visible/accesible y consulta de historial móvil, luego resto de Agenda/UI-06. Impresión física/PDF y apertura de ventana de impresión siguen sin acreditarse. No se declara UI-08 completo por esta entrega.

Comprobación final principal: Docker Desktop iniciado; API y web healthy. Lectura directa del volumen conserva7 ventas,0 devoluciones y1 turno abierto. Navegador muestra login por sesión vencida y sirve index-dg6Tk_pX.js. No se inició sesión ni se alteró la pestaña original del usuario. Laboratorio detenido al concluir.
