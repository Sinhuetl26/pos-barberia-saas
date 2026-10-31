# Ticket protegido al navegar

23/oct/2026. Se cierra el pendiente de protección de salida de UI-04/UI-07. Ambos permanecen En revisión; indicador20 % sin cambiar etapas ni declarar bloques completos.

## Comportamiento

- Un ticket preparado pide confirmación al salir por menú, búsqueda/navegación de ruta, cambiar sucursal o cerrar sesión. Volver al cobro mantiene el ticket; descartar lo elimina de la pantalla sin cancelar la cita ni registrar venta.
- Si el resultado del cobro es incierto o su referencia no puede leerse, no hay acción de descarte: se vuelve a consultar el resultado antes de cambiar contexto. Durante envío se espera su respuesta.
- Al confirmar cambio de sucursal se reinicia el componente por tenant/usuario/sucursal/versión; no arrastra artículos, importes ni referencias de cita del contexto anterior.
- Se reutiliza el único blocker de Configuración. Volver a la cita después de confirmar el descarte no muestra otro aviso. El cierre forzado de sesión por autenticación inválida puede salir, sin eliminar la referencia persistida del cobro.
- Se registra aviso nativo antes de recargar/cerrar una pestaña con borrador, envío o resultado pendiente. Eso **no** guarda el borrador en disco ni garantiza su recuperación tras un cierre forzado. La intención financiera incierta conserva la persistencia previa.

## Recorridos comprobados

Laboratorio UI07 reutilizado sin resetear, web5198/API3104/proxy3105. Se añadió únicamente una sucursal ficticia alterna para probar el cambio de contexto.

1. Barbero: prepara350, intenta ir a Mi agenda; cancelar conserva350. Confirmar descarte abre Agenda sin nueva venta. [Aviso escritorio](salida-ticket.png).
2. Cita previa: detalle→Cobrar→Volver a la cita→descartar abre una sola vez el mismo detalle/fecha, sin aviso duplicado. Cita sigue EN_CURSO sin venta.
3. Caso financiero nuevo y aislado: venta350 **A-000003 del laboratorio**, sin vínculo a la cita. El proxy perdió la respuesta después del commit. Al intentar abrir Agenda o cerrar sesión aparece solo Volver al cobro; no hay descarte. [Bloqueo](salida-incierta.png).
4. Consultar resultado recupera A-000003, habilita navegación y permite cerrar la sesión ficticia. No se repitió esa venta. [Recuperado](recuperado.png).
5. Dueño: prepara350 e intenta cambiar a Sucursal QA alterna. Cancelar mantiene sucursal original y350; confirmar cambia a la alterna con ticket0. Volver con ticket vacío no muestra advertencia.
6. Regresión Configuración: se editó un nombre temporal **sin guardarlo**. Salir muestra su aviso original; Seguir editando conserva el texto. Descartar vuelve a Agenda. SQL confirma nombre original sin modificación persistida.
7. Móvil390×844: mismo aviso desde Agenda en barra inferior. Demo principal comprobada aparte con un borrador200, cancelado y vaciado después; no se registró venta ni se cambió configuración. [Aviso final](salida-ticket-movil-final.png). La pestaña del usuario se conservó en su pantalla; se usó otra pestaña temporal para la comprobación final.

Integridad del laboratorio: tres ventas y tres operaciones POS únicas; dos entregas anteriores intactas; sucursal alterna sin ventas; custodia del barbero900. A-000001/A-000002 previas y la nueva A-000003 pertenecen solo al fixture. No confundir esos folios con los de la demo principal ni volver a cobrarlos. [Resultado SQL](integridad.json).

## Verificación

- `test_checkout_navigation.cjs`: ticket vacío, siete combinaciones de borrador/envío/incertidumbre y rutas ajenas al POS.
- `test_financial_timeout_ui.cjs`:5 casos de intención persistida, reintento y no duplicación.
- `test_appointment_navigation.cjs`:7 casos de retorno por fecha/sucursal e identificadores inválidos.
- TypeScript web y build correctos; advertencia previa de bundle~927KB permanece.
- Revisión React: hooks sin condiciones, callback de estado estable, limpieza de beforeunload y notificación de desmontaje; clave de componente acotada a contexto. Un solo useBlocker. No se cambió la API financiera ni se añadieron dependencias. La autorización explícita de retorno se consume una sola vez.

## Entrega y límites

Build `.tools/ui-ticket-final-20261023`, JS `index-Bl4Hxr-R.js`, CSS `index-CZ0UKYph.css`, API3103 comprobada antes de copiar al snapshot Docker conservando assets/muestras. Navegador confirma ese JS y los siete avisos originales; ticket de prueba final vacío. Fuentes/índice previos en `antes/`. Datos financieros del volumen principal sin operaciones nuevas.

No se validó el cuadro nativo de cierre de pestaña en todos los navegadores ni se implementó guardado general de borradores tras fallo del equipo. La recuperación de intención financiera y su UUID siguen siendo independientes del borrador. Mientras un resultado sea incierto, la salida voluntaria de la app requiere recuperarlo primero; una referencia ilegible requiere revisión, no se sobrescribe.

Sigue completar estados de UI-08 (devoluciones, comprobantes y cierre confirmado), UI-03/componentes y resto de UI-06/Agenda/fila. No hubo proveedores, cargos reales, publicación ni impresión física. Procesos de QA detenidos al finalizar y fixture conservado.
