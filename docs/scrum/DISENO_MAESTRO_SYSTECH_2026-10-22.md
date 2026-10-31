# Diseño maestro de SYSTECH Studio

Fecha: 22 de octubre de 2026. Alcance: definir las pantallas, opciones y recorridos del rediseño antes de extender su implementación. Este documento organiza diseño; no certifica funcionalidades ni sustituye los criterios financieros y de permisos originales.

## Decisión de producto

Un barbero debe poder reconocer su próxima cita y cobrar desde el celular. Un dueño debe entender qué está pasando y dónde está su dinero. Un cliente debe reservar sin aprender a utilizar un sistema administrativo.

La personalidad del panel parte de Caja: carbón, blanco porcelana y naranja cuero, con una textura muy discreta en el área de dinero. La página pública pertenece visualmente a cada barbería y tendrá su propio sistema de personalización.

Estado real: Caja tiene una implementación parcial de esta dirección y evidencias. Cobrar tiene composición aprobada e [implementación comprobada de sus pantallas principales](../../output/cobrar-implementacion-20261022/REVISION.md); sus estados y roles restantes siguen pendientes. Las demás áreas siguientes son especificaciones pendientes de diseño visual y comprobación. No son 29 historias terminadas ni un porcentaje de avance.

- [Evidencia de Caja](../../output/caja-carbon-20261022/REVISION.md).
- [Recorrido completo de Cobrar](DISENO_COBRAR_2026-10-22.md).
- [Plan funcional y de rediseño previo](PLAN_REDISENO_UI_UX_INTEGRAL_2026-10-19.md).

## Sistema compartido propuesto

### Identidad y jerarquía

- Carbón `#242424`: navegación y superficie del ticket. Porcelana `#FAFAF7`: área de trabajo. Blanco `#FFFFFF`: formularios y listas. Naranja cuero `#BE6435`: selección y acentos. Tinta `#202322`: texto. Gris `#646B68`: información secundaria. Son tokens propuestos, sujetos a comprobar contraste; no describen una migración ya realizada del CSS.
- Un botón principal por paso. Su color y contraste deben permitir leerlo sin depender de la textura. El naranja no distinguirá éxito de error: esos estados llevan icono, texto y color semántico.
- Conservar los archivos locales de Source Sans para lectura; reservar Barlow Condensed para títulos breves si resulta legible. Texto de trabajo 16 px, títulos 24–32 px, importes con cifras alineadas. Nada de encabezados gigantes en operaciones.
- Espaciado de 8/12/16/24/32 px. Botones de al menos 44 px de alto. Formularios con etiquetas visibles. Radios de 8 px en controles y 16 px en paneles principales.
- La textura se limita a una superficie protagonista. Listas, formularios, reportes y calendarios permanecen tranquilos. Evitar tarjetas dentro de tarjetas, párrafos de bienvenida, medidores decorativos y sombras repetidas.
- Iconos acompañan acciones claras. Las acciones frecuentes conservan nombre visible; las secundarias viven en «Más». No esconder el motivo de un bloqueo financiero para reducir texto.

### Estructura y navegación

En escritorio: navegación estable a la izquierda, contexto de sucursal/cuenta arriba y espacio de trabajo. Búsqueda accesible desde cualquier sección autorizada. El menú agrupa Operación, Negocio y Administración; no duplica Configuración y Personalización como centros separados sin relación.

En celular: hasta cuatro destinos frecuentes más «Más», definidos por el rol. Las acciones y barras inferiores respetan teclado y área segura; nunca tapan el último campo. Al volver desde un detalle se conservan fecha, búsqueda y filtros.

Dueño/gerente ve las áreas permitidas por la autorización existente. Barbero ve su jornada, sus cobros y sus datos autorizados; no se le convierte en administrador por rediseñar el menú. Cliente público ve la barbería y su reserva; los accesos al panel requieren una sesión interna válida. Toda restricción debe seguir aplicándose en la API.

### Componentes que se diseñarán una sola vez

Navegación; selector de sucursal; búsqueda; lista con filtros; ficha de persona; ficha de servicio; importe; estado; menú «Más»; formulario; selector de fecha/hora; panel lateral; diálogo de confirmación; aviso de error; vacío con acción; carga; paginación; resumen de operación; comprobante.

Los paneles laterales serán para editar o consultar algo conservando contexto. Los diálogos pequeños serán para decisiones breves. En móvil, los formularios largos usarán una vista completa; no se apilarán tres ventanas para completar una operación.

## Catálogo de pantallas y opciones

Cada apartado debe producir una vista principal, sus opciones, versión móvil y estados antes de considerarse diseñado. La lista expresa destino del diseño, no confirma que todo exista hoy. Los controles nuevos deberán contrastarse con el alcance funcional antes de programarlos.

### Operación diaria

**01. Navegación y búsqueda.** Accesos por rol, sucursal activa, cuenta, avisos y resultados agrupados. Cada resultado indica persona, cita o producto y abre su contexto. Sin resultados, permiso insuficiente y cambio de sucursal tienen salida clara.

**02. Hoy.** Próxima acción al frente: siguiente cita, personas esperando y accesos a agendar/cobrar. Dueño ve un resumen breve del día con acceso a detalles; barbero ve su jornada. Evitar el muro de indicadores y la pantalla vacía sin orientación.

**03. Agenda.** Escritorio prioriza calendario por profesional; móvil prioriza lista cronológica. Fecha, «Hoy», vista y filtro de barbero siempre localizables. Mostrar bloqueos, duración y estados con texto. Conservar filtros al abrir y cerrar una cita. Diseñar solapamiento, ausencia y agenda vacía.

**04. Cita.** Panel con cliente, servicio, profesional, horario, notas y referencia del corte. Acciones según estado: confirmar, iniciar, reprogramar, cancelar o preparar cobro. Reprogramar explica la nueva hora antes de guardar; cancelar pide el motivo cuando corresponda. Foto opcional con controles de privacidad, error y eliminación.

**05. Sin cita / espera.** Lista breve con orden, profesional y tiempo estimado cuando exista información suficiente. Añadir, asignar, iniciar y retirar. No presentar tiempos inventados como disponibilidad confirmada. Confirmar primero qué parte de este flujo existe.

**06. Horarios y ausencias.** Semana habitual más excepciones por fecha. Edición por profesional/sucursal, descansos y días especiales. Antes de aplicar un cambio, mostrar las citas afectadas y resolver conflictos sin borrarlas silenciosamente.

**07. Cobrar.** Catálogo compacto, búsqueda, servicios/productos y ticket de trabajo. Cliente y profesional seleccionables según permisos. Las citas preparan el ticket sin registrar una venta. En móvil, total y acción permanecen visibles; los detalles se despliegan. Es el siguiente bloque a diseñar visualmente.

**08. Pago y ajustes.** Descuento, motivo/autorización, propina, método, recibido y cambio. Dividido conserva las combinaciones existentes. Antes de confirmar se ve cuánto se registrará y con qué método. [Especificación detallada](DISENO_COBRAR_2026-10-22.md).

**09. Después del cobro.** Confirmación breve con importe y folio real. «Nueva venta», ver/imprimir comprobante y próxima visita cuando esté disponible. Impresión fallida conserva la venta y permite reimprimir; nunca ofrece cobrar de nuevo como recuperación.

**10. Ventas y devoluciones.** Historial por fecha, profesional y método; detalle con artículos, ajustes y comprobante. Devolución muestra cantidades, propina, origen del efectivo y motivo. Importe permitido y resultado deben ser verificables. No convertir «eliminar» en una anulación financiera implícita.

**11. Caja.** Turno al frente, saldo esperado autorizado, entregas y cierre; historial separado. Apertura, recibir/entregar efectivo, movimientos, conteo ciego, diferencia, confirmación y comprobante mantienen sus reglas. La referencia aprobada guía la apariencia; falta cerrar su cobertura completa por rol y recuperación.

### Gestión del negocio

**12. Clientes.** Buscar, alta breve y ficha con visitas, servicios y preferencias. Separar contacto de datos privados. Acciones: editar, preparar cita y consultar historial autorizado. Duplicados y clientes sin historial tienen tratamiento explícito.

**13. Equipo.** Lista de profesionales con fotografía, disponibilidad y visibilidad pública. Ficha con datos, servicios y horarios; accesos de usuario se gestionan desde permisos enlazados. Desactivar explica qué ocurre con futuras citas y no elimina registros históricos.

**14. Comisiones y propinas.** Periodo, profesional, cálculo y estado de liquidación. Desglose antes de confirmar pagos. Barbero consulta únicamente lo permitido. Reversas y devoluciones deben reflejarse sin maquillar saldos. Verificar soporte funcional de cada acción propuesta.

**15. Servicios y productos.** Catálogo con búsqueda y edición de nombre, foto, duración, precio y disponibilidad. Distinguir servicio, artículo vendible e insumo. El formulario muestra campos pertinentes al tipo; cambios de precio no reescriben ventas históricas.

**16. Inventario e insumos.** Existencias y mínimos, entradas, ajustes, mermas y conteos con motivos. Recetas/consumo por servicio donde esté soportado. Diferenciar existencia teórica de conteo físico. Avisos sobre baja rotación o fugas necesitan datos suficientes y una explicación del cálculo.

**17. Reportes.** Empezar por preguntas: cuánto vendí, cómo se cobró, qué se vende y dónde hay diferencias. Elegir periodo y abrir desglose. Distinguir ventas, cobros, propinas, devoluciones y utilidad cuando haya costos confiables. Cero datos y costos incompletos no se presentan como conclusiones.

**18. Mensajes y avisos.** Lista con destinatario, motivo, estado y detalle. Mostrar borrador, pendiente, enviado y fallo solo cuando el proveedor los confirme. Los conectores reales se dejan para otro plan; ninguna maqueta debe afirmar que un mensaje se envió.

### Configuración y experiencia pública

**19. Mi negocio.** Un centro con Negocio, Sucursales, Equipo y horarios, Página de reservas, Accesos y Conexiones. Guardar cerca de lo editado, avisar cambios sin guardar y errores por campo. Evitar dos menús de configuración con opciones repetidas.

**20. Editor de página pública.** Vista previa y controles por sección. Identidad: logo, colores y combinaciones legibles de fuentes. Portada: imagen, recorte y texto. Secciones: servicios, equipo, galería, ubicación, horarios, redes y políticas. Mostrar/ocultar y ordenar donde sea compatible. Proponer estilos completos editables, no solo cambiar un color. Guardar, descartar y recuperación; aclarar si hay publicación inmediata o borrador según soporte real.

**21. Página pública y reserva.** Portada con fotografía e identidad propias, precio/duración claros, equipo con fotos amplias y llamada a reservar. Flujo servicio → profesional → horario → datos → confirmación. Permitir volver sin perder elecciones. Ninguna dependencia obligatoria de cuenta para reservar si las reglas actuales lo permiten. Diseñar falta de horarios, imagen ausente, cupo ocupado durante la confirmación y negocio no disponible.

**22. Mi reserva.** Confirmación consultable, fecha completa y sucursal; reprogramar y cancelar según políticas. Enlaces válidos, vencidos o incorrectos muestran salidas seguras. La información privada de otras personas no se expone por buscar una reserva.

### Cuenta, soporte y administración

**23. Accesos y seguridad.** Invitaciones, rol, permisos, contraseña y sesiones donde existan. Mostrar alcance antes de invitar o cambiar rol. Invitación vencida/revocada y sesión expirada se resuelven sin perder un borrador de forma insegura. Ocultar un botón nunca reemplaza autorización.

**24. Suscripción y conexiones.** Plan actual, límites y estado de licencia; acciones de facturación disponibles. Proveedores con estados conectado, incompleto o desconectado y pasos concretos. No cambiar precios ni activar pagos durante este rediseño. Error/cancelación de checkout no implica acceso comprado; éxito depende de la confirmación del servidor.

**25. Login y primer uso.** Entrada clara al panel, registro y recuperación. Primer uso pide lo esencial para operar: negocio/sucursal, servicios, equipo y horarios; continuar después cuando sea posible. Validar cada paso sin hacer repetir datos. Nunca mezclar registro de dueño con permisos de otra barbería.

**26. Importación, exportación y auditoría.** Plantilla, elegir archivo, previsualizar, resolver errores, confirmar y ver resultado. Diferenciar filas aceptadas/rechazadas y duplicados. Exportación informa alcance. Auditoría muestra quién, cuándo y qué cambió, con datos sensibles restringidos.

**27. Ayuda.** Ayuda contextual y búsqueda de tareas frecuentes. Explicar Caja, cobrar, entregar efectivo y cerrar con ejemplos breves. Contactar soporte solo por medios configurados; los fallos no prometen que se creó un caso inexistente.

**28. Superadministración.** Negocios, licencias y auditoría en contexto claramente separado del panel de una barbería. Acciones sensibles con alcance visible y permisos del servidor. Nunca aparecer en el menú de dueño o barbero por compartir componentes.

**29. Sitio de SYSTECH y páginas legales.** Propuesta comercial, demostración y acceso al panel separados de las páginas de barberías. Precios actuales sin cambios; privacidad/términos con contenido revisable. El cliente que reserva no debe salir accidentalmente al embudo de compra del software.

## Estados obligatorios y entrega por pantalla

Cada ficha de diseño indicará: usuario/permiso, tarea, datos visibles, acción principal, secundarios, transiciones y origen de los datos. Se diseñan estado normal, vacío, carga, validación, fallo de red, éxito, permiso insuficiente y límite de licencia cuando apliquen.

Para formularios: edición, cambios pendientes, descarte y recuperación. Para dinero: operación en curso, resultado incierto, duplicado y recuperación del resultado. No se sustituye incertidumbre por un mensaje de éxito ni se habilita una segunda operación a ciegas.

La revisión cubre escritorio 1440 px y móvil 390 px, además de reflujo a 320 px, zoom 200 %, teclado, foco visible, nombres largos, importes grandes e imágenes ausentes. El foco vuelve al control de origen al cerrar un diálogo. Las tablas extensas pueden desplazarse dentro de su área identificada; la página no debe desbordarse.

La entrega incluye referencia visual, opciones abiertas y evidencia de uso real después de implementar. Un diseño bonito no acredita persistencia, permisos o integridad.

## Orden de ejecución y puntos de decisión

1. **Cobrar completo:** catálogo/ticket, ajustes, pago, confirmación, comprobante y recuperación. Revisar composición antes de código. Aplicar con un alcance cerrado y verificar el recorrido.
2. **Sistema compartido:** extraer componentes y navegación del diseño seleccionado sin propagar CSS global que rompa reservas o impresión. Cerrar los estados pendientes de Caja.
3. **Jornada:** Hoy, Agenda, detalle de cita, horarios y espera. Comprobar cita → ticket → venta → caja en datos ficticios aislados.
4. **Gestión:** clientes, equipo, catálogo, inventario, comisiones y reportes. Priorizar las acciones existentes antes de añadir funciones nuevas.
5. **Personalidad pública:** editor y página de barbería con dos identidades de ejemplo claramente distintas, móvil y reserva completa. Definir límites de personalización que mantengan legibilidad y conversión.
6. **Resto del sistema:** cuenta, primer uso, importación, suscripción, conexiones sin activar, ayuda, superadmin y sitio SYSTECH. Regresión visual y funcional completa.

En cada bloque: propuesta concreta → revisión visual → implementación → revisión independiente y pruebas pertinentes → evidencia → estado actualizado. Las decisiones rutinarias las resuelve el equipo; Sinhue revisa dirección visual y decisiones de negocio, no todas las pruebas.

## Qué significa terminar

Una pantalla está **definida** cuando están documentados su composición, opciones y estados. Está **implementada** cuando funciona en la app. Está **verificada** únicamente tras evidencia visual y funcional de sus criterios. La aprobación del usuario no sustituye las pruebas.

El documento inicial quedó preparado sin cambios de app. Posteriormente Sinhue aprobó las vistas de Cobrar y se implementó su composición; consultar la evidencia enlazada al inicio. Siguiente entregable: cerrar los estados de autorización/recuperación y revisión del barbero antes de continuar con el sistema compartido. Sin cambios de precios ni conexiones reales.
