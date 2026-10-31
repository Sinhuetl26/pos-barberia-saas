Entrega vigente28/oct: **40 % ponderado (800/2000),3/20bloques completos**. [Reporte](../../output/day-workspace-20261027/REVISION.md), [continuación exacta](CONTINUACION_TANDA_40.md), [cálculo](progreso-ui.json). UI02/UI04/UI05 cerrados; UI03/06/07/08 en revisión; UI09/UI10 implementados; UI01/11/13/19 en curso. Siguiente: UI06 y revisión Clientes/Equipo, después edición de catálogo. Las notas siguientes son historial y no alteran este estado.

Build principal .tools/day-workspace-final-20261027 API3103, index-CrCFzOXa.js / index-B-JKoL8w.css en snapshotDocker5197. Siete ventas/cero devoluciones/un turno intactos. QA5198/API3104/proxy3105 activo, sesión dueño sin pendientes, fallas{}. Nueva citaUI16 ya COMPLETADA sin venta: NO repetir atención ni cobrar. UI07/UI12/UI14 conservados. Ver CONTINUACION_TANDA_40 antes de mutar cualquier fixture.
Entrega vigente27/oct: Sinhue eligió propuesta3, Jornada de un vistazo. Hoy de dueño/gerente implementado y verificado: [reporte](../../output/hoy-daybook-20261027/REVISION.md). Fuente seleccionada y capturas antes/después conservadas. Columnas por ID de profesional; citas concretas con fecha; resumen inferior; móvil320/390; errores/reintento y estados vacíos. No hay datos ilustrativos incrustados en app. UI-05 sigue En curso (Mi día del barbero pendiente), indicador20% por etapas, sin historias completas nuevas.

Build principal .tools/hoy-daybook-final-20261027, API3103, JS index-CYDVhNT9.js / CSS index-Ximl9AAm.css incorporado al snapshot Docker. Siete ventas, cero devoluciones, un turno abierto intactos. Sesión principal vencida, no cambiar credenciales. QA5198 permanece activo para ver la propuesta, API3104/proxy3105, nueva Jornada UI15 ficticia: tres profesionales/cinco citas del27/oct, SIN operaciones financieras. Manifest .tools/ui15-daybook.json; no repetir ni mover citas al retomar. Historial UI07/UI12/UI14 preservado. Fallas proxy desactivadas. Siguiente: Agenda/UI-06 sobre esta dirección visual y completar Mi día según criterios UI-05. Las notas posteriores son historial: no restaurar builds o recuentos anteriores.
# Continuación del rediseño UI/UX

22/oct/2026. Fuente y estado: [plan](PLAN_REDISENO_UI_UX_INTEGRAL_2026-10-19.md), [estado](ESTADO_REDISENO_UI_UX.md), [Caja carbón](../../output/caja-carbon-20261022/REVISION.md).

## Punto de continuación

PRIORIDAD NUEVA27/oct: Sinhue señaló que el diseño general no se estaba transformando. Se acordó trabajar una pantalla completa de Hoy y mostrar una dirección visual antes de extender al resto. [Propuestas de Hoy](../../output/hoy-direcciones-20261027/REVISION.md), [brief](../../output/hoy-direcciones-20261027/BRIEF.md), [mapeo canónico](../../output/hoy-direcciones-20261027/OPCIONES.json). Tres imágenes ya visibles en el chat; se espera selección. NO se modificó código de app ni build en esta entrega.

Orden REAL mostrado (distinto al solicitado): 1=propuesta-1.png Siguiente cliente, 2=propuesta-2.png Agenda al frente, 3=propuesta-3.png Jornada de un vistazo. Resolver la elección por este mapeo, reconocer imagen y cargar Product Design image-to-code para implementar Hoy en repo existente. Mantener marca carbón/porcelana/naranja, menos texto y cambio de composición real. No volver a priorizar retoques de modales frente a este objetivo. No copiar teléfonos/retratos/duraciones ficticios del mock como datos reales. Capturas actuales de referencia en la misma carpeta; fuente InicioView.tsx y contrato OperationSummary.

Build servido conserva index-Do_Br8KH.js / index-DVHo-mnd.css, API3103. Progreso20 % por estados sin incremento por imágenes. ServiciosQA detenidos. Ninguna nueva cita, venta, devolución, movimiento, cierre o cambio de precio; UI14/UI12 conservan sus checkpoints anteriores.


Entrega vigente27/oct: [movimientos de caja revisables y recuperables](../../output/ui-movimientos-20261027/REVISION.md). UI-03 En curso/UI-08 En revisión;20 % sin cambio de etapas. CashMovementDialog reemplaza formulario directo: Gasto/Retiro/Ingreso, captura, revisión, confirmación, resultado; exige turno abierto, envía corteCajaId que la API ya valida. Respuesta perdida recupera mismo payload/UUID, otra sucursal/proceso bloquea captura. Foco correcto por paso/error y vista320/390 comprobados.

Build principal .tools/ui-movement-final-20261027 API3103: index-Do_Br8KH.js / index-DVHo-mnd.css en snapshot Docker. Principalhealthy y conserva7 ventas/0 devoluciones/1 turno abierto; login por sesión vencida, pestaña del usuario conservada.

Laboratorio UI14 usa Sucursal QA alterna: .tools/ui14-movement.json guarda UN turno nuevo de fondo100, ABIERTO. YA se ejecutaron ingreso50 recuperado, gasto20 y retiro30; saldo100, tres movimientos/ledger/operaciones, una auditoría cada uno. Retiro131 fue rechazado sin escribir; ejemplo25 se canceló. NO repetir ni cerrar/resembrar. HistóricosUI07/UI12 intactos,4 ventas/2 devoluciones totales. .tools/ui14-verify.cjs final es el verificador vigente de movimientos; no ejecutar sus fases initial/income/expense como estado actual. ServiciosQA detenidos, sesión dueño sin pendientes. Tests cash_movement y cash_movement_render más financieros existentes aprobados.

Siguiente UI-03: autorizaciones, errores y componentes aún pendientes; después Agenda/UI-06. No se rediseñó la lista detallada de ingresos/retiros; considerar esa consulta al retomar UI-08. No marcar bloques completos ni acreditar impresión física/proveedores. Las notas siguientes son historial: no restaurar builds o repetir sus movimientos.


Entrega vigente27/oct: [historial adaptable y opciones legibles](../../output/ui-historial-20261027/REVISION.md). Indicador20 %; UI-03 En curso/UI-08 En revisión. Nuevo SalesHistory común para móvil/escritorio, opciones desplegables con tickets58/80 y devolución según permiso. Carga/error/vacío/reintento; consulta fallida oculta ventas antiguas. Más opciones neutral48px con ARIA explícito. Captura inicial sí mostraba texto: el problema confirmado era el fondo azul/contraste y limitación del volcadoAX.

OperationDialog ahora incluye summary en el recorrido de foco y excluye controles dentro de details cerrado salvo su summary. Chromium conserva rectángulos de botones ocultos: no volver a filtrar solo por getClientRects. Shift+Tab/Tab, Enter, Escape y retorno desde devolución cancelada comprobados. Móvil390 y320 sin desbordamiento. Barbero sin devolución ni movimiento de caja; dueño probado sin operaciones nuevas.

Build .tools/ui-history-final-20261027 API3103: index-Bv_90jEw.js / index-B3WuLtOO.css integrado en snapshot principal. Dockerhealthy;7 ventas/0 devoluciones/1 turno abierto intactos. Login principal por sesión vencida, pestaña del usuario conservada. Laboratorio conserva exactamente estadoUI12 anterior; NO volver a vender/devolver/cerrar. SesiónQA dueño restaurada y serviciosQA detenidos. .tools/ui12-verify.cjs --closed sigue siendo el verificador financiero vigente; test_sales_history_render.cjs cubre el componente.

Siguiente UI-03: unificar movimiento de caja, errores y autorizaciones pendientes con componentes compartidos; después resto Agenda/UI-06. No declarar UI-03/UI-08 completos. Impresión física y proveedores reales pendientes. Las notas siguientes son historial, no restaurar builds viejos.


Entrega vigente27/oct: [devolución parcial y cierre recuperable](../../output/ui-caja-parcial-20261027/REVISION.md). UI-08 En revisión;20 % sin cambio de etapas. Build principal .tools/ui-caja-final-20261027 API3103: index-dg6Tk_pX.js / index-C06-3dGw.css incorporado al snapshot. Historial distingue devolución parcial/importe devuelto; cierre incierto no afirma apertura y ofrece Comprobar cierre; errores de red en español.

Laboratorio UI07 suma una NUEVA Sucursal UI12 ficticia (.tools/ui12-scenario.json), UNA venta de dos ceras200, UNA devolución parcial100, stock10→8→9, UN cierre100/diferencia0 recuperado tras perder respuesta. Folio A-000001 corresponde SOLO a esa nueva sucursal: no confundir con A-000001 anterior. Verificador vigente .tools/ui12-verify.cjs --closed. No repetir operaciones. Sucursal original conserva tres ventas, devolución350 y cierre150 previos; barbero550. Manifiestos/base conservados. Pruebas de stock y exceso de unidades, cierre recuperado, historial y HTML comprobante realizados. Impresión física/PDF/ventana emergente sin acreditar.

Siguiente UI-03: accesos Más opciones sin texto visible/accesible e historial móvil ancho, después resto Agenda/UI-06. Ningún bloque declarado completo. Docker principal estaba apagado y se recuperó sin borrar volúmenes: API/web healthy,7 ventas/0 devoluciones/1 turno abierto conservados. Sesión principal vencida: login servido correctamente, sin iniciar sesión ni tocar la pestaña del usuario. Laboratorio detenido. Verificadores UI11 y anteriores son evidencia histórica; UI12 vigente por sucursal. Las notas siguientes son historial: no restaurar builds o recuentos anteriores.


Entrega vigente23/oct: [devolución recuperable y cierre confirmado](../../output/ui-devolucion-20261023/REVISION.md). Indicador20 %; UI-08 sigue En revisión. Build .tools/ui-refund-final-20261023 integrado al snapshot principal API3103: JS index-BmRVHcDt.js / CSS index-CZ0UKYph.css. La devolución pendiente ofrece Comprobar devolución, congela edición y recupera intención original; evento completado refresca historial/catálogo.

Laboratorio UI07 AHORA: tres ventas; A-000003 CANCELADA por UNA devolución350 COBRADOR; A-000001/2 intactas. Dos entregas anteriores. Custodia550. ÚNICO turno cerrado con conteo150, diferencia0; comprobante HTML200. Verificador vigente .tools/ui11-verify.cjs. No repetir devolución, cierre, ventas ni entregas; verificadores anteriores tienen recuentos históricos. Cita EN_CURSO sin venta y sucursal alterna vacía conservadas. QA detenido. Demo principal sin nuevas operaciones, siete ventas y pestaña del usuario preservadas.

Siguiente UI-08: devolución parcial de productos/stock, respuesta perdida del cierre y comprobante/impresión visible real. Después UI-03 (se detectaron accesos de Más opciones sin texto visible/accesible y tabla de historial móvil ancha), resto Agenda/UI-06. No acreditar impresión física ni bloques completos con esta entrega. Las notas siguientes son historial, no restaurar builds viejos.


Entrega vigente23/oct: [ticket protegido al navegar](../../output/ui-ticket-protegido-20261023/REVISION.md). Indicador20 % sin cambio de etapas. Build .tools/ui-ticket-final-20261023, API3103, JS index-Bl4Hxr-R.js / CSS index-CZ0UKYph.css en snapshot Docker. Se conserva el único useBlocker de App, ahora también protege POS; callback estable de estado y remonte por contexto. Retorno explícito a cita evita aviso duplicado. No eliminar la autorización de retorno consumible ni añadir otro blocker independiente. beforeunload avisa, no guarda borradores tras fallo del equipo.

Laboratorio UI07: ahora TRES ventas (A-000001/A-000002 anteriores y A-000003 nueva de350 recuperada), DOS entregas anteriores; custodia barbero900. Cita del recorrido sigue EN_CURSO sin venta. Sucursal QA alterna nueva solo para probar cambio de contexto, sin ventas. .tools/ui10-context.json y ui10-verify.cjs registran el estado nuevo; verificadores UI08/UI09 anteriores esperan recuentos históricos y no deben ejecutarse como si fueran del estado actual. No repetir folios/entregas. No resetear base ni reseed. Sesiones ficticias cambiadas para pruebas; al final no hay borradores o cobros pendientes. Datos principales intactos; pestaña del usuario conservada.

Siguiente: UI-08, estados de devolución/comprobantes/cierre confirmado, en laboratorio sin repetir movimientos previos. Después UI-03 y resto de UI-06/Agenda/fila. Protección de salida del ticket y de cambios de Configuración comprobadas en navegador; falta ampliar comprobación de aviso nativo en distintos navegadores. Ningún bloque UI declarado verificado completo. Las notas siguientes son historial y no deben restaurar builds anteriores.


Entrega vigente: [navegación, cita→ticket y expiración](../../output/ui-navegacion-20261023/REVISION.md),23/oct. UI-04 En revisión;20 % (400/2000),0/20 verificados completos. Build .tools/ui-navigation-final-20261023, API3103, JS index-CKXAPFvO.js / CSS index-VlZswv4l.css, ya en snapshot Docker. Demo principal queda en Caja, sin nuevas operaciones financieras ni cambios de configuración. Los apartados posteriores son historial.

Laboratorio: una cita nueva del cliente ficticio (manifest .tools/ui09-journey.json), EN_CURSO, sin venta y precio350, retorno al mismo detalle/fecha probado. Dos ventas y dos entregas anteriores intactas. Política ficticia de aprobación ahora1min SOLO en esa base; se comprobó expiración real sin pulsar Comprobar y rechazo409 en servidor. No volver a sembrar ni repetir ventas/entregas. Manifest/base conservados, QA detenido al finalizar. Scripts .tools/ui09-prepare.cjs y ui09-verify.cjs son auxiliares del laboratorio; no usar en producción.

Siguiente prioridad: proteger borradores al salir por menú/cambiar sucursal. Actualmente solo el botón explícito Volver a la cita pide descartar y conserva el detalle; no se implementó guardado general al navegar. Coordinar con el único useBlocker existente de configuración (no agregar otro blocker simultáneo sin comprobar compatibilidad). Después completar UI-03, resto de UI-06/fila y estados UI-08 (devoluciones/comprobantes/cierre confirmado). UI-07 ya tiene reloj/recaptura de vencimiento, pero no está completamente verificado. No mezclar planUI con PC/ST.


Entrega vigente del23/oct: [Mi caja del barbero y entregas recuperables](../../output/ui08-barbero-20261023/REVISION.md). UI-08 En revisión, indicador18 % (350/2000=17.5 % redondeado). Build .tools/ui08-final-20261023, API3103; JS index-DdthHVAf.js / CSS index-0wL02K96.css, copiado al snapshot Docker. No restaurar los builds anteriores que siguen como historial.

Laboratorio UI07 reutilizado SIN reseed: dos ventas previas intactas. Dos entregas nuevas ficticias ($100 y $50) ya recuperadas; caja recibió150, barbero conserva550. SQL/API e imágenes en reporte. NO repetir ventas/entregas para recrear capturas. No se cerró turno; solo se revisó/canceló guía previa. Manifest .tools/ui07-lab-20261022.json conserva base local; no publicar credenciales. Runner/proxy local permite failCustody/dropNextHandoff para QA, no es código de producción. .tools/ui08-verify.cjs verifica cantidades finales y permisos; .tools/ui07-verify.cjs es evidencia anterior a estas entregas.

Siguiente: integración UI-03/UI-04 y conciliación de UI-06/UI-07 (vencimiento real y cita→ticket); después completar devolución/comprobantes/cierre confirmado de UI-08 en copia aislada. Ningún bloque UI se declara verificado completo. Datos de la demo principal preservados; conexiones reales y hardware fuera de este alcance.


Entrega más reciente: [UI-07 autorizaciones y recuperación](../../output/ui07-roles-20261022/REVISION.md). UI-07 pasa a En revisión, indicador 15 % (300/2000). Dos ventas ficticias únicas A-000001/A-000002 exclusivamente en laboratorio .tools/ui07-lab-20261022.json; segunda recuperada tras respuesta 502 y recarga. Tres consultas posteriores no agregan ventas. No repetirlas. Manifest y base aislada conservados; nunca usarlos como producción ni copiar sus credenciales a notas.

Build principal nuevo .tools/ui07-final-20261022, API3103, JS index-BjBm-XMh.js / CSS index-CrVUdj9_.css, copiado al snapshot Docker conservando assets y muestras. Backend y volumen principal intactos. Nuevo SaleRecovery y estilos de autorizaciones reutilizan lógica de intención/autorización existente. Pruebas de estados, 26 auxiliares, 5 recuperación financiera, TypeScript y build correctos. Capturas reales escritorio/móvil y comprobación SQL/API enlazadas en reporte.

Siguiente: UI-08, recorrido autenticado de Mi caja del barbero en copia aislada y estados visuales restantes; después integración UI-03/UI-06/UI-07. En UI-07 falta captura de aprobación vencida real y revisar cambio de estado por tiempo sin pulsar Comprobar (actualmente se recalcula al renderizar/consultar; servidor valida vigencia). No declarar completo por estas pruebas. Los apartados siguientes son historial, no restaurar builds anteriores.


Entrega vigente: [Cobrar implementado y comprobado](../../output/cobrar-implementacion-20261022/REVISION.md), tras aprobación de Sinhue. Catálogo compacto, ticket carbón, ajustes con aplicar/cancelar, pago móvil completo y confirmación secundaria del comprobante. TypeScript/build y pruebas de confirmación/recuperación/navegación/búsqueda correctas. Navegador dueño con preparar/cancelar, cuatro métodos y efectivo/cambio; muestras SSR de éxito/error de impresión, sin nuevos cobros. Se corrigieron contraste del mensaje vacío y barra móvil. Ticket dejado vacío, siete avisos existentes conservados.

Build final `.tools/cobrar-carbon-20261022`, copiado al snapshot Docker existente: JS `index-DCgvp0HG.js`, CSS `index-Df2JzdIr.css`. Respaldos `output/cobrar-implementacion-20261022/antes/`. API/volumen intactos. Las notas siguientes son historial; no restaurar sus assets sobre esta entrega.

Siguiente paso UI-07: autorización pendiente/rechazada y recuperación incierta con esta apariencia, en una copia ficticia aislada; recorrido autenticado del barbero. No repetir ventas o cierres del volumen principal para demostrar el resultado. Después continuar componentes/navegación UI-03/UI-04 y pendientes de Caja. No marcar el plan completo por esta composición.

Última entrega del 22/oct: [vistas del recorrido Cobrar](../../output/cobrar-recorrido-20261022/REVISION.md), ajustes escritorio + pago móvil + confirmación móvil. Son estados de un flujo, no opciones independientes de marca. Revisar composición y correcciones anotadas (motivo de texto, Recibido vs Efectivo, textura/proporciones) antes de implementar. Faltan vistas de recuperación, dividido, autorizaciones y móvil compacto. Docker y acceso real a `/app/pos` comprobados; no fue necesario reiniciar. Ticket vacío y datos existentes conservados, sin nuevos cobros o cambios de código.

Actualización de planificación del 22/oct: [diseño maestro](DISENO_MAESTRO_SYSTECH_2026-10-22.md) y [recorrido completo de Cobrar](DISENO_COBRAR_2026-10-22.md). El usuario autorizó definir todas las pantallas/opciones por bloques antes de extender el rediseño. Siguiente entrega: vistas de Cobrar con ajustes, pago, confirmación y recuperación, siguiendo carbón/naranja y ticket móvil compacto; después implementar la composición revisada. Las propuestas iniciales están en `output/diseno-maestro-20261022/`. Solo se documentó; no hay nuevas ventas, cambios de app ni cierres de historias en esta entrega. Los pendientes de Caja que siguen abajo se mantienen.

Versión vigente: output/caja-carbon-20261022/REVISION.md, diseño carbón/naranja aprobado, texto reducido, menú de Caja con accesos secundarios en Más. Turno abierto existente conservado; no ejecutar cierres para reproducir la referencia.

Entrega anterior de estructura simplificada: turno al frente, historial aparte y entregas desplegables. Sin turno abierto no hay formulario de recepción. Versión actual .tools/cash-simple-20261022, JS index-sSPZI2fP.js, copiada al snapshot local.

Entrega 3 anterior de Caja: custodios por nombre, revisión previa de persona/importe e historial adaptable a fichas móviles. Evidencias y límites en el reporte enlazado. Seguir con UI-08: recorrido autenticado del barbero móvil y estados de error/recuperación del diálogo. Después unificar acentos antiguos y completar UI-03/UI-04 (componentes y Mi negocio). Inventario UI-01 restante y revisión por roles siguen pendientes. No cerrar los 20 bloques por estos avances parciales.

No considerar terminadas las historias por un cambio de color global. Mantener las pruebas financieras y de permisos originales. La prueba nueva `scripts/test_workspace_navigation.cjs` cubre solo renderizado/visibilidad, no autorización del servidor.

## Entorno y archivos

- Docker local: web 5197 y API 3103; datos activos en volumen `systech-demo_demo_data`. No reseed ni borrado de volumen.
- Web final compilada en `.tools/cash-carbon-20261022`, copiada sobre `.tools/product-ui-preview-verified-20261014` conservando assets/muestras. JS `index-CqiP32oE.js`. API Docker recompilada; volumen existente conservado y servicios saludables.
- Respaldos y capturas: `output/ui-base-20261020/`.
- Fuentes modificadas: Navbar, App, InicioView, AgendaView, PosView; estilos studio-identity, studio-operation-design y pos-silla.
- API: consulta de custodia resuelve nombres de usuarios en el tenant; sin cambios de saldos, reglas financieras o personalización pública. Prueba de integridad de caja ampliada para verificar nombres.

Entrega 2 añade BarberosView, helper appointmentNavigation y su prueba, estilos agenda-operations/pos-silla. Respaldo parcial de fuentes anteriores y siete capturas en `output/ui-recorrido-20261020/`. La cita ficticia usada es 8024113c-f722-42e3-9dcd-85606713e671, 20/oct 11:30, Alex, $200: sigue pendiente. Se probó preparar/descartar el ticket, sin cobrar. No repetir ventas/cierres para demostrar cambios de interfaz.

## Pruebas de esta entrega

TypeScript web y Vite correctos. Navegación SSR 5/5, búsqueda UI 10/10, auxiliares de agenda 7/7. Navegador con dueño ficticio: navegación, ticket en borrador por $200 retirado después, nueva cita cancelada, búsqueda/Escape/foco y menús móviles. No se creó una venta o reserva nueva.

Las credenciales ficticias siguen en el manifiesto local existente; no copiarlas al reporte público ni confundirlas con producción. No repetir cobros o cierres históricos para demostrar UI. Usar una copia aislada si se necesitan escrituras financieras en la siguiente etapa.
