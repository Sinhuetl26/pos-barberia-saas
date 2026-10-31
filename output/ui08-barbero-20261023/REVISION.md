# UI-08 — Mi caja del barbero y recuperación de entregas

23/oct/2026. **En revisión**; no se declara completo UI-08 ni el producto.

## Entrega

Mi caja del barbero abre directamente su efectivo pendiente. Perfil y comisiones permanecen separados, con etiquetas visibles también en móvil. El importe tiene prioridad visual y el barbero no dispone de recepción, cierre o movimiento de dinero.

Se separaron fallos de consulta y de operación. Una consulta fallida advierte sobre el saldo anterior, permite reintentar y bloquea una recepción hasta actualizarlo. La actualización exitosa elimina el error de consulta sin ocultar un error financiero. El diálogo de entrega incierta ofrece Consultar resultado, conserva persona/importe y referencia, y no permite confirmar otra recepción. Los errores de red se muestran en español. Recuperar cierra la revisión y contrae el formulario.

## Pruebas reales aisladas

Se reabrió el laboratorio de UI-07, sin reseed: sus dos ventas ficticias previas por $700 permanecen intactas. Origen5198, API3104 y proxy3105; sin proveedores. No se operó sobre los datos de Docker5197/API3103.

1. Barbero autenticado: Mi caja muestra $700. Perfil y comisiones accesibles por separado; no hay acciones de recepción. [Escritorio](barbero-escritorio.png).
2. Fallo deliberado de consulta: saldo conservado con advertencia. Reintentar recupera la consulta y retira el aviso. [Error](consulta-fallida.png). Las pruebas de renderizado comprueban el bloqueo del formulario del dueño y evitan presentar un fallo como saldo cero.
3. Dueño: revisión de entrega de $100, cancelada y abierta nuevamente sin registrar dinero al cancelar. Después se confirmó solo en laboratorio. El proxy perdió la respuesta tras el commit; la intención quedó bloqueada y Recuperar entrega pendiente resolvió la operación original. Saldo $600.
4. Segundo caso distinto de $50 con el diálogo refinado: respuesta perdida, título Comprobar entrega, aviso en español y una acción Consultar resultado. Recuperó la misma entrega; saldo $550. [Incierta](entrega-incierta.png), [recuperada](entrega-recuperada.png). No volver a ejecutar esas entregas para repetir evidencia.
5. SQL/API: exactamente dos operaciones financieras, dos pares compensados de registros de entrega (cuatro filas), neto global cero, $150 recibidos y $550 en custodia. Dos ventas originales conservadas. El barbero consulta únicamente sus saldos y movimientos; POST entrega denegado403. [Resultado](integridad.json).
6. Cierre: revisión previa muestra $550 pendientes del equipo y aclara que no se cuentan como efectivo en gaveta. Se canceló sin cerrar turno. [Captura](pendientes-cierre.png).
7. Barbero volvió a iniciar sesión: $550 y tres pestañas con etiquetas visibles. [Móvil final](barbero-movil-final.png). No se modificó perfil ni se liquidaron comisiones.

## Verificación y revisión

- `test_cash_custody_states.cjs`: permisos visuales de barbero, saldo obsoleto, bloqueo de recepción, fallo frente a vacío y recuperación de consulta.
- `test_cash_handoff_review.cjs`:12 casos de importe y3 comprobaciones de errores de red/validación.
- `test_financial_timeout_ui.cjs`:5 casos de intención duradera y respuesta tardía.
- TypeScript y build Vite correctos. Se conserva la advertencia previa de bundle grande (~925KB).
- Revisión React: hooks sin condiciones nuevas, polling conserva cancelación y limpieza; reintento acotado al contexto tenant/usuario/sucursal, sin petición financiera nueva; guardas de envío y persistencia original intactas. Sin dependencias nuevas. El reintento manual y el polling pueden coincidir; una respuesta fallida tardía puede mantener el bloqueo conservador hasta la próxima consulta exitosa, sin autorizar una recepción con saldo obsoleto.

Capturas reales: escritorio1280×720, móvil solicitado390×844 (contenido385px). `barbero-movil.png` y `entrega-incierta-antes.png` son evidencia anterior a corregir etiquetas y mensaje de red, no la versión final.

## Versión y pendientes

Build principal `.tools/ui08-final-20261023`, JS `index-DdthHVAf.js`, CSS `index-0wL02K96.css`, API3103 comprobada antes de copiar al snapshot Docker conservando assets/muestras. Copia de revisión separada apunta al proxy de QA y no se publicó sobre la demo.

UI-08 pasa a En revisión por los recorridos y correcciones de esta entrega. Falta revisión visual integral de devoluciones, comprobantes y cierre confirmado en todos sus estados; no se afirma una nueva regresión completa de cierre ni impresión física. UI-07 conserva su pendiente de vencimiento e integración con Agenda/componentes. Siguiente: integración UI-03/UI-04 y conciliación UI-06/UI-07; luego estados restantes de Caja.

Los servicios de QA se detienen al terminar, conservando manifest/base para evidencia. No hay cargos, mensajes, servicios contratados ni despliegue externo.

Comprobación final: contenedores de API3103/web5197 saludables. La sesión anterior había vencido; se restauró con el dueño ficticio existente. Caja principal conserva turno abierto, fondo de1000, custodia de1110/200 y siete avisos previos. Navegador confirma el bundle index-DdthHVAf.js; captura demo-principal.png. Procesos de QA detenidos, fixture conservado.

