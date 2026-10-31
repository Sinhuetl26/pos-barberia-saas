# QA independiente PC-07 / PC-08 — fila y disponibilidad

11 de octubre de 2026. Estado: contratos API y persistencia verificados después del build final PC-07/08; aceptación UI pendiente del navegador del coordinador.

`scripts/qa_product_queue_absences.cjs` utiliza dos API temporales y fixture propio. Sucursal UTC, horario00:00…23:59 y servicios5min para no depender del horario comercial actual de una barbería real. Fechas de ausencias futuras. No modifica demo ni envía mensajes externos.

## Casos preparados

1. Persona presencial puede omitir nombre/teléfono; reintento conserva una fila y no crea cita anticipadamente.
2. Dos operadores reclaman misma fila: un200 y un409; replay de ganador recupera misma cita. Reasignar conserva cita única.
3. Retiro antes de atención mantiene fila/cita CANCELADA, motivo y auditoría; no crea venta ni mensajes externos.
4. Dos filas diferentes no ocupan simultáneamente mismo profesional/intervalo; un éxito y un conflicto.
5. Atender no permite retirar; cobrar enlaza visita correcta, finaliza fila y replay no duplica.
6. Preview de ausencia identifica citas; nueva cita invalida hash anterior; confirmar sin reconocer citas afectadas falla; reconocer conserva citas y bloquea disponibilidad solo del profesional afectado.
7. Turno especial por fecha detecta conflicto y conserva cita existente; disponibilidad pública sigue horario especial.
8. Negocio ajeno, barbero de otro perfil y anónimo no manipulan fila; barbero no administra ausencia del equipo.

Prueba de compilación sintáctica Node del script: PASS. Ejecución completa después de aviso build final backend: **8/8 PASS SQLite y8/8 PASS PostgreSQL,16comprobaciones independientes aprobadas**. Cliente PostgreSQL regenerado separado para modelos nuevos FilaPresencial/OperacionAgenda/TurnoEspecial; todos los fixtures y API temporales limpiados.

Se probaron tanto dos operadores sobre misma fila como dos filas distintas solicitando mismo intervalo/profesional. No se sumaron esos casos por revisión de código: API devuelve un éxito y un conflicto en ambas carreras. El retiro conserva historial, y la reasignación mantiene ID de cita. Confirmación de ausencia repetida4veces produce un bloqueo, sin cancelar citas ni registrar mensajes externos nuevos. El hash de impacto se invalida cuando otra cita aparece entre preview y confirmación.

## Revisión visual independiente de evidencias existentes

- `mensajes-mobile.png` muestra mensajes JSON crudos/UUID, mientras fuente nueva `readableMessage` ya tiene resumen legible. Es evidencia anterior o snapshot desactualizado; se requiere recaptura del código final, no se atribuye por inferencia a un fallo actual.
- `conteo-confirmado-mobile.png` solo muestra columnas artículo/saldo de referencia; físico/diferencia requieren desplazamiento horizontal. P2: indicar explícitamente desplazamiento o adaptar ficha móvil para que la cantidad confirmada y diferencia sean visibles. No se comprobó gesto desde screenshot.
- El enlace «Saltar al contenido» visible superpuesto al encabezado en screenshot de conteo corresponde al foco capturado. No se interpreta como defecto permanente sin reproducción.

Coordinador avisado, sin tomar control del navegador ni editar producto.

También se inspeccionaron `seguridad-mobile.png` y `kardex-trazabilidad-desktop.png`: etiquetas de contraseña, ayuda de12caracteres, efecto de cerrar sesiones y foco visible son legibles; Kardex muestra responsable ficticio, referencia, saldo previo/nuevo y corrección compensatoria. Esta evidencia visual apoya las correcciones de metadata PC-02. No sustituye prueba de teclado, lector de pantalla o proveedor físico.

## Revisión de código UI —12octubre

Sin adquirir navegador. Se extrajeron exports reales arrivalActionAllowed/schedulePreviewMatches, transpilaron y ejecutaron: **12/12PASS**. Cubren transiciones permitidas/prohibidas y preview que deja de coincidir tras modificar draft. Esto no certifica clicks reales.

P2 concreto: ScheduleChanges inicializa start/end/day desde prop date solo al montar; al cambiar selectedDate de Agenda, los formularios siguen usando fecha inicial mientras el listado de turnos dice la nueva fecha. Es fácil preparar cambio para otro día sin haber editado el borrador. Recomendar sincronizar cuando no hay cambios pendientes, o aviso claro de fecha del borrador; nunca descartar silenciosamente borrador editado/intención pendiente.

P2 estados: ArrivalQueue load falla y vacía rows; al terminar loading, también muestra «No hay llegadas pendientes» junto al error. Diferenciar consulta fallida de fila vacía, sin presentar cero como dato confirmado.

P2 densidad/carga: ArrivalQueue permanece montado dentro de contenedor hidden al cambiar pestaña de Agenda, y su intervalo15s sigue consultando mientras document.hidden esfalse. Puede limitar consulta a pestaña activa; no se afirma problema de rendimiento medido.

Satisfactorio por código: branch/user/tenant aíslan claves durables; serial cancela resultados tardíos; cambio de draft invalida preview; confirmación exige reconocer citas afectadas; retiro exige motivo y modal conserva recovery ante error incierto; API mantiene permisos aunque UI falle. Toda la aceptación móvil del usuario todavía necesita recorrido independiente.
