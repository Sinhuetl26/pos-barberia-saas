# Rediseño integral de UI/UX — SYSTECH Studio

Fecha: 19 de octubre de 2026. Estado: **plan preparado; implementación no iniciada**.

Petición de Sinhue: cambiar toda la UI/UX del POS. Este documento define el alcance, la dirección visual, los flujos, el orden de trabajo y la evidencia necesaria. No sustituye los criterios funcionales de las historias anteriores ni declara aprobado ningún pendiente de producción.

## 1. Resultado que buscamos

Un producto que se sienta diseñado como una sola aplicación, con carácter de barbería y uso sencillo durante la atención. El dueño debe entender cómo va su negocio; el barbero debe encontrar su siguiente cita y registrar un cobro desde el celular; el cliente debe reservar sin conocer la estructura interna del software.

El cambio será de jerarquía, navegación, composición, lenguaje y comportamiento, además de estilo. Cambiar colores y tarjetas sobre la misma distribución no cumple este plan.

Tres pruebas prácticas guían el resultado:

1. **Trabajar:** localizar una cita, atenderla, cobrarla y consultar el comprobante sin volver a capturar información disponible.
2. **Controlar:** distinguir ventas, efectivo, propinas, comisiones y diferencias; pasar de una cifra a sus movimientos.
3. **Presentar:** enseñar una demo con identidad coherente, datos ficticios reconocibles y recorridos que no dependan de explicar dónde está cada función.

## 2. Punto de partida y evidencia

Se revisaron en el navegador Inicio, Agenda, Cobro, Inventario y Reportes. Capturas en [evidencias del estado actual](../evidencias/plan-ui-ux-20261019/). También se leyó la navegación, el editor de reservas y fuentes de equipo/caja, importación y configuración. Las demás vistas requieren inventario visual completo al comenzar; no se declara una auditoría exhaustiva de todos sus estados.

Hallazgos que condicionan el diseño:

- `Navbar.tsx` tiene una navegación especial para POS y otra para las demás vistas. Al entrar a cobrar desaparece el menú lateral y cambian identidad, ubicación de accesos y nomenclatura.
- La agenda de escritorio dedica mucho espacio al título, acciones, fecha y cuatro cifras antes de mostrar las horas. La herramienta principal queda desplazada hacia abajo.
- Cobro ya tiene una dirección con personalidad, pero el titular y las fotos grandes consumen espacio de trabajo. Con pocos servicios, parte del catálogo requiere desplazamiento.
- Inventario mezcla catálogo comercial, existencias e insumos y acumula pestañas/filtros. Necesita vistas por tarea y lenguaje comprensible para un dueño sin formación administrativa.
- Equipo contiene también caja, cierres y comisiones. Los accesos no corresponden bien a la pregunta «¿dónde reviso el dinero?».
- El panel conserva verde/dorado mientras el nuevo cobro usa azul, blanco y fotografía monocromática. Hay varias capas de estilos que pueden anularse entre sí.
- Los reportes ofrecen exportar todas las ventas mientras el usuario ve filtros de periodo/profesional. El alcance debe estar claro en la acción y su confirmación.
- Hay capacidades ya implementadas que deben hacerse encontrables: fila, recetas de consumo, conteos, historial, recuperación de operaciones y personalización pública.

Referencias internas que se conservan:

- [Continuación del producto](CONTINUACION_PRODUCTO_COMPLETO.md) y [plan funcional anterior](PLAN_PRODUCTO_COMPLETO_2026-10-11_1815.md).
- [Revisión de reservas Silla](../../output/reservas-silla-20261019/REVISION.md).
- [Nueva identidad y personalización de landing](../../output/landing-identidad-20261019/REVISION.md).
- [Revisión de configuración](UX_CONFIGURACION_2026-10-10.md).

PC-12 conserva su pendiente documentado de impresión. Un rediseño de comprobantes no equivale a verificar diálogo, PDF o impresora física.

## 3. Alcance y límites

Incluye el panel completo: navegación, inicio, agenda, fila, cobro, caja, equipo, comisiones, clientes, catálogo/inventario, reportes, mensajes, configuración, accesos, seguridad, suscripción, conexiones, importación, historial, ayuda, autenticación, primer uso y administración de plataforma según rol. Incluye coherencia con reservas, gestión privada de citas y editor de la página pública.

Se conserva el motor existente: permisos, sucursal, zona horaria, tarifas por profesional, disponibilidad, idempotencia, descuentos autorizados, devolución, caja y trazabilidad. Si falta un contrato para mejorar una interacción, se documenta por separado antes de modificar reglas financieras.

No incluye contratar infraestructura, desplegar, activar Stripe/WhatsApp/facturación, cambiar precios o condiciones comerciales, enviar mensajes, ni introducir funciones de IA para llenar huecos del diseño. Tampoco una reescritura del backend o una migración de base de datos por motivos estéticos.

La carga directa de fotografías es una necesidad de UX identificada. Se diseñará su flujo, pero su almacenamiento público, límites, permisos y persistencia deben resolverse explícitamente; mientras se usen enlaces, la interfaz lo dirá. No se presentará un selector de archivo que solo funcione durante una sesión como una carga terminada.

## 4. Dirección visual propuesta

**Continuar la dirección azul seleccionada por Sinhue y llevarla a todo el espacio de trabajo**, ajustando su escala para operar. La personalidad viene de la tipografía, las fotografías pertinentes y la composición; las tablas, calendarios y cifras necesitan claridad y densidad suficiente.

### Dos identidades con funciones distintas

- **SYSTECH, panel interno:** sistema estable y reconocible. Los controles no cambian de posición ni de significado al pasar de Agenda a Cobrar.
- **Marca de la barbería, página pública:** fotografía, titulares, colores, tipografía y secciones personalizables. Se conserva el editor reciente; no se vuelve a imponer una landing idéntica a todos.

Compartirán calidad, accesibilidad y componentes de reserva cuando corresponda. La personalización pública no cambiará colores de estados financieros ni legibilidad del panel.

### Base visual

- Lienzo: `#F8F8F5`; superficies de trabajo: `#FFFFFF`.
- Texto y navegación: `#17191C`; texto secundario: `#5A606A`.
- Acción principal: `#064FF4`; divisiones: `#DFE3E9`.
- Estados separados de la marca: verde para resultado correcto, ámbar para atención y rojo para error/destrucción; siempre con texto o icono, sin depender solo del color.
- Anton local como acento de títulos y algunas cifras protagonistas; fuente de lectura local existente para formularios, agenda y tablas. No usar Anton en todos los textos ni gigantes en cada pantalla.
- Título de pantalla entre 28–40 px en escritorio y 24–30 px en móvil. Cuerpo preferente 16 px; etiquetas 14 px; tablas densas al menos 13 px con contraste y opción de ampliar el detalle.
- Escala de espacios 4/8/12/16/24/32. Botones y campos principales de 44–48 px de alto. Esquinas consistentes y sombras reservadas para superficies superpuestas.
- Una acción principal por contexto. Fotografía en servicio/perfil cuando ayuda a reconocerlo; alternativas claras cuando no existe o falla.
- Animación breve para abrir, guardar y cambiar estado; respetar movimiento reducido. Sin animaciones decorativas que demoren cobrar.

No añadir modo oscuro, paquetes de animación, gráficos 3D o varias librerías de componentes para aparentar acabado. Se valoran después si aparece una necesidad real.

## 5. Arquitectura de navegación

### Dueño y gerente

Navegación principal propuesta:

```text
Hoy
Agenda
Cobrar
Clientes

Caja
Equipo
Catálogo e inventario
Reportes

Mi negocio
```

«Mi negocio» agrupa página pública, datos del local, accesos, conexiones, licencia, importación e historial. Mensajes y avisos deben seguir siendo encontrables desde el contexto de cliente y un acceso de comunicaciones; su ubicación definitiva se valida con el inventario del primer bloque.

La barra superior mantiene sucursal, búsqueda y cuenta. Los avisos se concentran en un control; no se convierten en varias franjas permanentes sobre la tarea.

Se diferencia **Cobrar** (registrar una venta) de **Caja** (turnos, efectivo, entregas y cierres). Se separa Equipo de Caja sin eliminar comisiones ni cambiar su significado. Las rutas antiguas, especialmente `/app/barberos?tab=cortes`, conservan un destino válido mediante compatibilidad/redirects probados.

### Barbero y cajero

- Barbero: Mi día/Agenda, Cobrar, Mi caja y comisiones, Mi perfil. Ve el alcance que ya permitan sus permisos.
- Cajero: Agenda, Cobrar y Caja según autorización. Es un rol opcional; una barbería pequeña no necesita contratar un cajero para usar el sistema.
- Tener permiso para cobrar no concede permiso para devolver, descontar, cerrar otras cajas o ver resultados globales.
- Superadministrador mantiene un espacio diferenciado, con contexto de plataforma visible y sin confundirlo con una barbería.

### Celular

Barra inferior de un máximo de cuatro destinos frecuentes. Para el dueño: Hoy, Agenda, Cobrar y Más. Para el barbero: Agenda, Cobrar, Mi caja y Perfil. Los accesos no deben quedar detrás de un menú largo para cada corte.

El nombre de sucursal y la identidad del profesional permanecen visibles en acciones sensibles. Cambiar sucursal con un borrador requiere resolver ese borrador; nunca reutilizar una tarifa o ticket de otra sucursal silenciosamente.

## 6. Diseños de trabajo que se deben conseguir

### Agenda

```text
Agenda           Sucursal       Buscar       Cuenta
Hoy / Fecha      Profesionales  Día / Lista  + Nueva cita
Pendientes 2 · En atención 1 · Completadas 8
-------------------------------------------------------
Hora | Alex             | Mateo            | Luis
     | citas y bloqueos | citas y bloqueos | citas...
-------------------------------------------------------
Detalle lateral solo al elegir una cita
```

El calendario comienza en la primera pantalla útil de una laptop de 1366×768. Se reemplaza la gran tarjeta decorativa de fecha por una fila compacta. La fila sin cita y disponibilidad son accesos claros, no otro nivel de encabezados. En celular se prioriza una lista por horario/profesional, con acceso al calendario cuando sea útil.

### Cobrar

```text
Navegación estable / Sucursal
Cobrar                  Buscar servicio o producto
Servicios / Productos   | Ticket
Catálogo reconocible    | Profesional · Cliente opcional
con fotos acotadas      | Líneas · cantidades · precio
                       | Pago · Total · Cobrar
```

Servicio y profesional seleccionados, precio y método deben ser evidentes. Se conserva la personalidad del diseño Silla, pero se reduce el tamaño de portada de las tarjetas y títulos. En móvil, catálogo y ticket tienen transiciones explícitas y resumen fijo que no tape campos ni teclado.

### Hoy

Tres preguntas: **¿qué sigue?, ¿cómo va la venta?, ¿qué requiere atención?** Próximas citas y acciones primero; cifras relevantes después. Un pendiente debe abrir su objeto o lista filtrada, no una pantalla genérica que obligue a buscarlo otra vez. Distinguir «sin próximas citas» de «no hubo citas hoy».

## 7. Backlog ejecutable: 20 bloques

Todos comienzan **pendientes**. Los entregables de esta sección son futuros, no evidencia de implementación.

### UI-01 — Inventario completo y línea base

Recorrer cada ruta y subpestaña por rol. Registrar formularios, diálogos, vacíos, errores, carga y restricciones de licencia. Completar las vistas no inspeccionadas en esta planificación. Fotografiar laptop y celular con datos ficticios aislados; registrar contratos y operaciones sensibles que cada pantalla utiliza.

**Entrega:** mapa de pantallas, matriz rol/tarea, capturas antes y lista de fricciones priorizada. Una capacidad existente no desaparece del alcance por estar escondida. Dependencias: ninguna.

### UI-02 — Referencia visual y prototipo de los tres flujos principales

Prototipar Agenda, Cobrar y Hoy en escritorio y barbero móvil. Usar como punto de partida la dirección Jornada de un vistazo (propuesta3 elegida por Sinhue el27/oct; sustituye la referencia azul anterior). Comparar el prototipo con las capturas actuales: debe cambiar composición y jerarquía, no limitarse a recolorear. Revisar también una cita con detalle abierto y un ticket lleno.

**Entrega:** referencia visual común y recorrido navegable o maqueta suficiente para contrastar implementación. Criterio: calendario accesible arriba, ticket legible y navegación estable. Depende de UI-01. No migrar todas las pantallas sin esta referencia.

### UI-03 — Sistema de componentes y estilos

Definir tokens, encabezados, botones, campos, pestañas, chips de estado, filas, tablas, tarjetas, diálogos, paneles laterales y estados de operación. Reutilizar `OperationDialog` y `OperationState` y sus garantías de foco. Evitar una nueva clase global de CSS por parche.

**Entrega:** catálogo interno de componentes con estados normal/foco/deshabilitado/carga/error. No requiere un servicio pagado. Nuevos componentes comparten tamaño, contraste y nombres accesibles. Depende de UI-02.

### UI-04 — Estructura común, navegación y permisos

Unificar `Navbar.tsx` y el contenedor de aplicación; eliminar el salto de identidad entre POS y resto. Implementar arquitectura por rol, navegación móvil y compatibilidad de enlaces. Mantener Ctrl+K y contexto de sucursal.

**Entrega:** ninguna pantalla parece otra aplicación. Funciones sensibles permanecen protegidas en API, no solo escondidas. La búsqueda y los accesos no cruzan sucursales/tenants. Depende de UI-03.

### UI-05 — Hoy y Mi día

Rehacer `InicioView` y la entrada del barbero alrededor de próximas atenciones, venta/caja y pendientes accionables. Reducir frases y cifras duplicadas. Ocultar bloques no aplicables sin presentar datos desconocidos como cero.

**Entrega:** dueño encuentra la siguiente tarea; barbero no recibe estadísticas privadas del negocio. Enlaces conservan fecha/objeto/filtro cuando el contrato lo permite. Depende de UI-04.

### UI-06 — Agenda, disponibilidad y fila

Compactar encabezado; mejorar calendario/lista, filtros de profesional, bloqueos, estados y detalle de cita. Integrar atención sin cita y fila sin duplicar registros. Proveer alternativas con botones a cualquier futura interacción de arrastrar; mover una cita siempre respeta disponibilidad y cotización.

**Entrega:** localizar → revisar → atender → abrir cobro es un recorrido continuo. El contexto se conserva al regresar. Probar horario ocupado, sin cupo y respuestas antiguas al cambiar fecha/profesional. Depende de UI-04; primer módulo operativo que se migra.

### UI-07 — Cobro completo

Recomponer catálogo y ticket; búsqueda visible, selección reconocible, fotos acotadas y totales claros. Revisar efectivo/cambio, tarjeta registrada, transferencia y pago dividido, descuento, propina, aprobación y resultado incierto. «Registrar pago con tarjeta» no debe afirmar que se procesó una terminal conectada si no existe tal integración.

**Entrega:** continuidad cita→ticket; profesional correcto; importe verificado; doble clic/reintento no duplica venta; recuperación visible. Ticket sin cliente continúa siendo una opción cuando la operación actual lo permita. Depende de UI-06 y componentes UI-03.

### UI-08 — Caja, turnos y comprobantes

Dar a caja una entrada propia. Mostrar saldo inicial, movimientos, entregas, gastos, cierre y diferencia sin confundir venta con efectivo. Guiar el conteo y la revisión de diferencias antes de confirmar. Mejorar consulta de recibos, devoluciones y enlaces a movimientos.

**Entrega:** ubicación clara de cada operación; cancelación de un diálogo no altera dinero; el cierre confirmado no puede repetirse como si estuviera abierto. Reutilizar los casos financieros existentes y pruebas aisladas, sin repetir movimientos históricos de la demo. El pendiente físico/PDF de PC-12 sigue separado hasta tener evidencia. Depende de UI-07.

### UI-09 — Clientes e historial

Simplificar lista, búsqueda por nombre/teléfono y ficha. Presentar próxima visita, atenciones, preferencias de corte y fotos de referencia con permisos y propósito claros. Facilitar reagendar con servicios/profesionales todavía válidos; si ya no existen, solicitar selección explícita.

**Entrega:** encontrar y abrir al cliente sin formularios superpuestos; no duplicar identidades ni exponer referencias privadas en la landing. Validar coincidencias ambiguas y campos vacíos. Depende de UI-04/06.

### UI-10 — Equipo y comisiones

Separar perfiles/horarios de turnos de caja. Presentar profesionales y sus acciones con una ficha clara. Comisiones y propinas deben distinguir generado, pagado y pendiente, con la venta de origen. Perfil público y datos privados se editan en contextos identificados.

**Entrega:** el barbero ve su información autorizada; el dueño entiende el coste y estado de pago; liquidar comisiones no se confunde con una entrega de efectivo. Depende de UI-08.

### UI-11 — Catálogo e inventario

Entradas claras a Servicios, Productos de venta e Insumos. Para servicios: precio/duración/profesionales y foto; para productos: unidades, stock y mínimo; para insumos: unidad operativa y consumo. Dar nombres comprensibles a movimientos («Historial de existencias») manteniendo Kardex como término secundario. Mantener conteos y recetas encontrables.

**Entrega:** alta y edición por tipo sin campos irrelevantes; historial con motivo/unidad; alertas de reposición accionables; no modificar stock por cambiar una foto o etiqueta. Vista móvil con detalle expandible y sin ocultar información crítica. Depende de UI-03/04.

### UI-12 — Reportes e inteligencia del dueño

Ordenar por preguntas: cuánto vendí, qué deja margen, qué producto no rota, qué insumo presenta diferencia y qué cliente dejó de venir. Mostrar periodo, sucursal, cobertura y origen de cada cifra. Separar ingresos, utilidad estimada, costes incompletos y comisiones.

**Entrega:** filtros y alcance de exportación explícitos. Una diferencia de consumo es una señal para revisar, no una acusación de robo. Los datos ausentes no generan supuestas predicciones. Verificar conciliación con ventas/gastos de la muestra, no solo apariencia del gráfico. Depende de UI-08/10/11.

### UI-13 — Mensajes, avisos y estados de conexión

Concentrar avisos y priorizar los que requieren acción. Diferenciar borrador, listo para revisar, enviado, fallido y proveedor sin configurar. Desde un aviso de venta se abre el movimiento correcto. No solicitar acceso a proveedores para terminar esta UI.

**Entrega:** ninguna acción de demostración envía WhatsApp/correo real; estados pendientes no se presentan como éxito. Permisos y alcance del destinatario visibles. Depende de UI-04/09.

### UI-14 — Mi negocio y editor de página pública

Reordenar identidad, sucursales, horarios, contactos y página pública. Conservar las composiciones Inmersiva/Cartel/Editorial/Directa y sus controles. Mejorar el editor como espacio de diseño con herramientas agrupadas y vista previa, evitando una lista interminable de campos. Crear flujo de recursos multimedia con decisiones de almacenamiento explícitas.

**Entrega:** borrador/guardado/publicado diferenciados; cambiar sección no pierde cambios; restaurar no borra contenido anterior; los controles editables afectan el destino declarado. Fotografías vacías/fallidas y textos largos siguen siendo usables. Depende de UI-03/04; aprovecha el trabajo del 19/oct, no lo reinicia.

### UI-15 — Reservas y gestión privada de cita

Cerrar coherencia del recorrido público: servicio, profesional, horario, datos, confirmación y recuperación. Mantener personalidad en la landing y concentrar el formulario en reservar. Revisar consulta por folio, cambio de horario, cancelación y comprobante. Marca del negocio y mensajes de error coherentes en todas esas superficies.

**Entrega:** varios servicios y cotización real conservados, enlace privado no publicado, resultado incierto recuperable sin duplicar. Comprobar móvil con teclado abierto y selección persistente al regresar de privacidad. Depende de UI-14 y reutiliza UI-06/07 cuando corresponda.

### UI-16 — Accesos, cuenta, licencia y conexiones

Aplicar patrones comunes a invitaciones/roles, sesiones, contraseña, estado de suscripción e integraciones. Hacer claras acciones delicadas y la diferencia entre demo y proveedor conectado. Diseñar planes con sus límites actuales, sin cambiar precios ni activar servicios.

**Entrega:** confirmaciones proporcionales al impacto, errores recuperables y permisos reales. Las tarjetas premium no bloquean tareas ya incluidas ni anuncian funciones inexistentes. Depende de UI-04/13.

### UI-17 — Login, alta, primer uso y ayuda

Unificar autenticación y recuperación; reemplazar mensajes técnicos como «Failed to fetch» por una explicación y siguiente paso. Primer uso con servicios, equipo y horario esenciales; preparación avanzada después. Ayuda contextual corta y búsqueda de soluciones. Revisar landing comercial de SYSTECH como superficie de venta, separada del sitio de cada barbería.

**Entrega:** entrar al panel, entender qué falta y realizar una primera operación sin una explicación oral completa. No anunciar correo enviado, cuenta verificada o infraestructura disponible sin respuesta real. Textos legales y precios vigentes se conservan. Depende de UI-04/14/16.

### UI-18 — Importación, historial y administración de plataforma

Aplicar el diseño a importar/exportar, vista previa de CSV, resultados por fila, recuperación, auditoría y SuperAdmin. Paginación/filtros/detalles con contexto. La administración de plataforma permanece restringida y visualmente identificada.

**Entrega:** acciones de importación no duplican lotes; usuario entiende qué cambió y qué falló; los registros históricos conservan identidad y fecha. No revelar tenants ajenos por búsqueda o enlaces directos. Depende de UI-04/11/16.

### UI-19 — Accesibilidad, móvil y rendimiento transversal

Recorrer teclado, foco de diálogos, Escape, avisos y validación de campos. Revisar 320/390 px, tablet, 1366×768 y escritorio amplio; zoom 200%, teclado móvil y movimiento reducido. Medir carga inicial de login, reservas y panel; el bundle actual grande merece evaluación de separación por rutas, basada en mediciones.

**Entrega:** sin controles críticos tapados ni desbordamiento global; desplazamiento horizontal solo donde un calendario/tabla realmente lo requiera y con alternativa. Registrar contraste medido; no atribuir WCAG completa a una captura. No añadir dependencias pesadas sin justificar. Depende de cada módulo migrado; no se pospone todo el trabajo a esta fase.

### UI-20 — Regresión, consistencia y demo final

Revisión independiente de los recorridos y del parecido con la referencia. Comprobar permisos, persistencia, totales y recuperación antes/después de migrar componentes. Revisar todas las rutas originales y nuevas, estados de licencia y ausencia de datos. Retirar CSS antiguo únicamente donde se demuestre que el reemplazo ya cubre sus consumidores.

**Entrega:** capturas comparables, resultados reproducibles, pendientes explícitos, guía de demo breve y evidencia por bloque. Ningún criterio anterior se declara resuelto solo por completar su rediseño. Depende de todos los anteriores.

## 8. Orden de ejecución

**Oleada 1 — Fundamentos:** UI-01 → UI-02 → UI-03 → UI-04. Resultado: referencia común y navegación estable.

**Oleada 2 — Día de trabajo:** UI-05, UI-06 → UI-07 → UI-08. Resultado: demo coherente desde agenda hasta cierre. La agenda y el cobro son el primer control visual antes de extender la migración.

**Oleada 3 — Gestión:** UI-09, UI-10, UI-11 → UI-12; UI-13 cuando estén claros clientes y avisos. Resultado: administración y valor añadido con la misma interfaz.

**Oleada 4 — Negocio y experiencia pública:** UI-14 → UI-15; UI-16 → UI-17/UI-18 respetando dependencias. Resultado: configuración, alta y superficies secundarias al mismo nivel.

**Oleada 5 — Cierre:** UI-19 y UI-20. Sus comprobaciones empiezan en cada oleada; aquí se verifica el producto integrado.

No se asigna una fecha de entrega sin cerrar UI-01 y el prototipo. Se informará avance por bloques aceptados de 20 y defectos pendientes; 10 bloques no equivalen automáticamente al 50% del esfuerzo.

## 9. Trabajo en equipo al ejecutar

Si se usa el equipo ya solicitado por Sinhue, máximo tres agentes además del coordinador y por oleadas, con archivos exclusivos:

- Coordinación/diseño: referencia, estructura, tokens y decisiones compartidas.
- Implementación operativa: agenda/cobro/caja, después de fijar componentes y contratos.
- Implementación de gestión: clientes/catálogo/equipo, sin editar los archivos asignados al otro agente.
- Calidad: revisión independiente y escenarios por rol; un único controlador de navegador para evitar interferencias.

No asignar dos agentes a `Navbar`, `App`, estilos globales o un mismo componente. La calidad revisa una versión integrada identificable, no una mezcla de archivos cambiando durante la prueba. Los agentes no necesitan cuentas nuevas ni proveedores pagados.

## 10. Estrategia técnica de migración

1. Registrar estado del repositorio y conservar cambios actuales; no resetear ni reemplazar el proyecto.
2. Fijar tokens/componentes y después migrar por módulo. Preferir los patrones y dependencias instalados.
3. Mantener contratos API y rutas existentes; desacoplar presentación y reglas sin reescribir el motor financiero.
4. Reemplazar estilos antiguos por alcance comprobado. No seguir acumulando sobrescrituras al final del CSS.
5. Compilar en una salida local separada y conservar un punto anterior que pueda restaurarse antes de actualizar la demo servida.
6. Probar escrituras en una copia ficticia aislada. La demo Docker actual usa un volumen persistente; no ejecutar reseed, `down -v` ni usar como base actual la antigua copia SQLite de archivos.
7. Datos históricos de demo no son instrucciones para repetir cobros/cierres. Las nuevas pruebas tendrán identificadores y manifiesto propios.

## 11. Definición de terminado por bloque

- Hay evidencia del antes y después y una diferencia de UX descrita en una frase.
- La tarea principal funciona con teclado y pantalla táctil; errores y estados vacíos tienen siguiente paso.
- Se comprueban permisos y respuesta del servidor en operaciones sensibles.
- Los datos persisten tras recargar; no se pierde información al abrir/cerrar un detalle ni se duplica una operación al recuperarla.
- Precio, duración, impuestos ya aplicables, propinas, descuentos y comisiones conservan sus reglas y significado.
- La revisión visual cubre el contenido real y límites de texto/fotos, no solo una maqueta feliz con tres elementos.
- Se ejecutan compilación y pruebas pertinentes. Una captura demuestra presentación; no prueba integridad financiera o carga.
- Quedan anotados alcance, pruebas, limitaciones y punto de continuación. Estado pasa a revisión antes de verificado.

## 12. Entregables y seguimiento

Durante la ejecución se crearán `ESTADO_REDISENO_UI_UX.md` y `CONTINUACION_REDISENO_UI_UX.md`, con versión revisada, archivos, pruebas, capturas y pendientes. El primero distinguirá pendiente, en curso, en revisión y verificado. Se actualizará Notion cuando se trabaje ese tablero, sin duplicar ni cerrar automáticamente las historias originales.

El reporte al usuario será corto: qué cambió, qué tarea ahora es más fácil, qué se verificó y qué sigue. Las pruebas rutinarias las realiza el equipo; las preferencias estéticas de Sinhue se incorporan en los puntos visuales de revisión.

**Estado al entregar este documento:** 20 bloques definidos, 0 ejecutados de este nuevo plan. Solo se revisó el estado actual y se guardaron sus capturas; no se modificó código, configuración del negocio, reservas, dinero ni servicios externos en esta tarea de planificación.
