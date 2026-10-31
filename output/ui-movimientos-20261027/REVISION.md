# UI-03/UI-08 · Movimientos de caja revisables y recuperables

27/oct/2026. Entrega parcial; indicador20 % sin cambio de etapas. No se cierra UI-03 ni UI-08.

## Cambio

Nuevo CashMovementDialog sustituye el formulario directo de PosView. Usa OperationDialog/OperationState y la misma dirección visual del historial: blanco, Studio Text, naranja para la acción principal, controles de44/48px y texto breve. Gasto/Retiro/Ingreso → importe y motivo → revisión → confirmación → resultado guardado. No hay importe50 preseleccionado ni guardado en el primer paso.

Importes positivos con hasta dos decimales y límite de la API. No se convierte silenciosamente1.005 en1.01. La consulta exige un turno abierto; se envía corteCajaId con el movimiento para que el servidor rechace cambios de turno. La API existente y el contenedor Docker YA soportaban esta comprobación; solo se amplió el tipo opcional del cliente. No se cambió lógica financiera del servidor, permisos, precios o esquema.

Respuesta perdida: conserva el payload/UUID originales de financialRequest, congela la captura, muestra Comprobar movimiento y recupera sin generar otra operación. Pendiente de otra sucursal/proceso bloquea la captura y remite al aviso general. Reabrir conserva el ingreso original. Respuesta200 incompleta no se presenta como éxito: bloquea nuevos intentos dentro de esa ventana y pide consultar historial antes de otro movimiento; esta condición excepcional no se simula con dinero real.

Foco pasa al título al revisar, guardar, recuperar o mostrar error. Cancelar/modificar conserva el comportamiento esperado sin escribir dinero. El componente se remonta por sucursal; consultas antiguas no cambian el estado después de cerrar. Sin dependencias nuevas.

## Evidencia real

- EscenarioUI14: Sucursal QA alterna existente, antes sin turno; se preparó UNA caja ficticia con fondo100, guardada en .tools/ui14-movement.json. .tools/ui14-prepare.cjs no reabre ni resetea si existe manifiesto.
- Revisar ingreso50 → Modificar mantuvo50 → Cancelar: cero movimientos, ledger y CajaOperacion vacíos (integridad-initial.json).
- Caja cerrada en la sucursal original: bloquea captura.1.005 y0.005 rechazados en interfaz, sin guardar.
- Único ingreso50 en Sucursal QA alterna; proxy perdió la respuesta después del200 de API. UI muestra datos originales y Comprobar movimiento. Al cambiar a Sucursal UI12, bloqueó otra captura sin mostrar su importe/motivo. Regresar/reabrir recuperó ingreso50: UN movimiento, UNA CajaOperacion, UNA auditoría; saldo150 (integridad-income.json).
- Único gasto20: saldo130. Retiro131 fue rechazado por efectivo insuficiente; no hay nuevo registro ni intención pendiente y se conserva saldo130 (integridad-expense.json). Modificar a30 y confirmar guardó UN retiro30.
- Resultado final: fondo100 + ingreso50 − gasto20 − retiro30 =100. TRES movimientos, TRES registros de ledger, TRES CajaOperacion y una auditoría por movimiento. Caja sigue ABIERTA: NO se cerró este turno. Cuatro ventas y dos devoluciones históricas del laboratorio sin cambios (integridad-final.json).
- Ejemplo25 de revisión a320px se canceló sin guardar. Ancho útil315/scroll315, diálogo283/scroll283. Capturas captura-movil.png, revision-gasto-movil.png, pendiente-movil.png, otra-sucursal.png, retiro-rechazado.png y revision-320-sin-guardar.png.
- Teclado: Shift+Tab llega a Revisar movimiento; transición de paso y error dejan foco en cash-movement-title. No se alteró OperationDialog en esta entrega.

## Pruebas y entrega

TypeScript aprobado. test_cash_movement.cjs valida importes, límites, contexto propio/ajeno y resultado vinculado a importe/tipo/turno/motivo. test_cash_movement_render.cjs cubre edición, revisión, pendiente propia/ajena, confirmado/incompleto, caja cerrada y consulta fallida. Cinco pruebas existentes del cliente real de tiempo límite/UUID siguen aprobadas. Lectura SQL .tools/ui14-verify.cjs final confirma integridad; no ejecuta movimientos.

Build principal .tools/ui-movement-final-20261027, API3103: index-Do_Br8KH.js / index-DVHo-mnd.css incorporados al snapshot sin borrar assets anteriores. Navegador principal sirve ese JS; sesión vencida muestra login, no se inició sesión ni se tocó la pestaña del usuario. Dockerhealthy y conserva7 ventas,0 devoluciones,1 turno abierto. Ningún movimiento principal ejecutado.

QA .tools/ui-movement-qa-20261027 usa3105; no copiar al principal. ServiciosQA detenidos y sesión ficticia de dueño conservada, sin borradores ni operaciones pendientes. Base/manifiestos preservados. NO repetir ingreso50, gasto20 o retiro30 ni cerrar el turnoUI14 para recrear capturas. Verificador vigente de movimientos: .tools/ui14-verify.cjs final. UI12 sigue aplicando solo a su sucursal; verificadores anteriores esperan recuentos históricos.

Sigue UI-03: autorizaciones/errores y componentes pendientes, después Agenda/UI-06. La lista detallada de ingresos/retiros del turno no se rediseñó aquí: esta entrega cubre captura/revisión/recuperación y verificación del ledger. Papel/PDF y proveedores reales siguen fuera de esta entrega.
