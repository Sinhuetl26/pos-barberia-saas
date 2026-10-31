# Revisión integral · Mejoras fuera de los sprints

Fecha: 6 de octubre de 2026. Recorrido iniciado la noche del 5 de octubre.

## Resultado y alcance

La página de reservas ahora tiene una portada más corta, selección de sucursal, perfiles grandes, botón persistente para celular y resumen de precio, duración y barbero. Elegir un barbero desde su perfil evita pedirlo otra vez. La vista general conserva los tres integrantes; filtrar Condesa muestra a David y explica que todavía no tiene servicios publicados en esta base de demostración. Se retiraron amenidades que la barbería no había configurado.

La revisión de producto identifica **18 mejoras adicionales**. Son propuestas para valorar, no historias incorporadas al sprint ni funciones implementadas. Se contrastaron contra los criterios de ST-01 a ST-40 en `docs/BACKLOG_LANZAMIENTO.json`. Las correcciones y capacidades que ya tienen historia se registran aparte, con su referencia.

Recorrido realizado sobre la aplicación local y una API de demostración aislada. Se revisaron pantallas, navegación, formularios sin enviar, permisos visibles y código relevante. Se usaron los perfiles de demostración de dueño, barbero, gerente y administrador de SYSTECH. No equivale a certificación de producción: no se realizaron cobros, ventas finales, timbrados, mensajes externos, cambios de contraseña ni altas de usuarios. Impresoras físicas y conectores reales requieren sus pruebas previstas.

## Qué se recorrió

| Área | Comprobación realizada | Límite |
| --- | --- | --- |
| Sitio comercial y registro | Oferta, precios, preguntas, formulario de alta, privacidad y términos | Sin crear cuenta ni aceptar condiciones |
| Reservas públicas | Equipo completo, filtros por sucursal, entradas desde perfil/servicio/botón, horario, resumen y datos del cliente | Sin confirmar reserva; disponibilidad tiene pendientes ST-07 |
| Resumen del dueño | Indicadores y accesos a la operación | Base de demostración, sin conciliación contable completa |
| Agenda | Citas, formulario de nueva cita, formulario sin cita y botones de atención/cobro | Sin cambiar estados ni registrar turnos |
| Punto de venta | Catálogo, carrito de prueba, modal de cobro, medios de pago y cambio | Sin confirmar venta |
| Clientes | Listado, perfil, historial, notas, membresías y acciones de privacidad | Sin modificar, exportar ni anonimizar registros |
| Equipo | Perfiles, comisiones y diferencias de acceso del barbero | Sin liquidaciones ni edición de perfiles |
| Caja | Arqueo, saldo esperado e historial de cortes | Sin cerrar caja ni registrar retiros |
| Inventario | Catálogo, existencias, costos, mínimos y estructura de Kardex | Sin movimientos; compras contrastadas con API y modelo |
| Reportes | Totales, propinas, ventas por medio/barbero y alcance anunciado de exportación | Sin enviar resumen por WhatsApp |
| Mensajes | Estado del proveedor, historial y formulario | Sin envío externo; registros de demostración no prueban entrega |
| Configuración y página pública | Enlace, perfiles visibles, datos del negocio y ubicación | Sin guardar modificaciones del usuario |
| Accesos y seguridad | Restricciones por rol/sucursal, invitaciones, recuperación y estados sin token | Cajero revisado en código; sin crear acceso nuevo ni probarlo con sesión propia |
| Conexiones y licencia | Estado de Stripe, WhatsApp, CFDI, pagos y calendario; catálogo de planes | Sin activar proveedores ni contratar suscripción |
| Ayuda y soporte | Guías, formulario de opinión y promesas de atención | Sin mandar mensajes de soporte |
| Administración SYSTECH | Negocios, indicadores y bitácora de auditoría | Sin cambiar planes, estado ni permisos de negocios |
| Alta guiada | Asistente y conexión con navegación revisados en código | No se pudo completar desde un negocio nuevo sin crear cuenta |

La revisión con barbero mostró únicamente su agenda y sus comisiones; puede entrar a punto de venta con su propio perfil. El gerente de Condesa recibió esa sucursal. El dueño conserva navegación de gestión; la reserva pública de un barbero no muestra el botón del dueño.

## Pendientes encontrados que YA pertenecen a los sprints

Estos puntos **no cuentan dentro de las 18 mejoras nuevas** y deben comprobarse al ejecutar sus historias. No se cambiaron sus estados en Notion.

| Hallazgo | Evidencia y efecto | Historia existente |
| --- | --- | --- |
| Reportes incluyen propinas en “ventas netas” | En la demostración, resumen muestra 1,170 y reportes 1,260; la diferencia es 90 de propinas. La consulta de reportes suma el total del ticket. Debe haber una definición uniforme. | ST-06, ST-30 |
| El arqueo anunciado como ciego muestra efectivo esperado | Caja expone el saldo antes del conteo. Un corte abierto puede aparecer como “Cuadrada” con conteo cero. | ST-06, ST-09 |
| Disponibilidad en descanso y manejo de fechas | Se ofrecieron horarios futuros de domingo para Carlos, cuyo descanso es domingo. La API mezcla fecha ISO con getters locales. La mejora de interfaz no resuelve esas reglas del servidor. | ST-07 |
| Turno sin cita asigna el primer barbero activo | La API no calcula el primer turno libre, pese al texto del formulario. Usa duración fija de 30 minutos y teléfono ficticio compartido cuando falta contacto. | ST-07, ST-29, ST-31 |
| Cambio de sesión conserva sucursal visual anterior | Al pasar del gerente al administrador de SYSTECH, el encabezado mantiene Condesa. No demuestra filtración del servidor, pero la interfaz debe limpiar ese contexto. | ST-02, ST-18 |
| Indicadores del administrador no reflejan la operación observada | El Bigote aparece con una sucursal y cero barberos, frente a dos sucursales y tres perfiles en su operación. Revisar campos y valores de respaldo. | ST-28, ST-31 |
| Configuración conserva enlace antiguo de reservas | El prefijo mostrado usa `/#reservar?barberia=` mientras la ruta pública actual es `/b/slug`. | ST-31 |
| Promesas comerciales y de soporte sin validación | Arqueo ciego, respuesta menor a 15 minutos, soporte siete días y configuración en diez minutos requieren sustento o ajuste de texto. Contactos de ejemplo deben sustituirse. | ST-15, ST-26, ST-27 |
| Opinión confirma envío sin persistirlo | El formulario cambia el estado visual a enviado; su controlador no guarda la respuesta en una API. | ST-26, ST-31 |
| Alcance de exportación y reportes por sucursal | El texto promete todas las ventas del negocio; comprobar que exportación y filtros respeten el contexto y rol. | ST-18, ST-30 |
| “Margen 100%” en servicios | Solo refleja precio menos costo directo configurado, sin comisiones ni gastos. La etiqueta debe aclararlo; la capacidad nueva de utilidad se propone en MEJ-09. | ST-30, ST-31 |
| Fotografías, publicación y catálogo inicial | Cargar fotos reales, horarios y servicios por ubicación; estados vacíos y guardado deben formar parte del alta guiada. | ST-08, ST-26, ST-31 |
| Integraciones y avisos no conectados | WhatsApp, CFDI, pagos de clientes y calendario siguen sujetos a conexión y pruebas; no duplicarlos como ideas nuevas. | ST-12, ST-21 a ST-25, ST-35, ST-37 |
| Rendimiento y accesibilidad general | La compilación emite advertencia de paquete JavaScript de aproximadamente 570 kB; revisar carga por pantalla, foco, contraste y táctil en ST-31. | ST-09, ST-31 |

También se excluyeron de la lista nueva: PostgreSQL, respaldo, venta idempotente, devoluciones, permisos, aviso al dueño cuando cobra un barbero, importación inicial, lista de espera por cancelación, anticipos, membresías recurrentes, reseñas/referidos, operación sin conexión e IA. Ya están en el plan.

## Cómo leer las propuestas

**P1**: validar con las primeras barberías después de asegurar el núcleo de venta, caja y agenda. **P2**: expansión o diferenciación; desarrollar solo con demanda comprobada. **M/L** indica complejidad relativa media/alta, no días ni presupuesto. Cada propuesta exige confirmar uso real antes de convertirla en historia.

### MEJ-01 · Servicios abiertos y comandas compartidas

**P1 · L · Independientes y cadenas.** El carrito actual es estado de una pantalla. Propongo una orden persistente que el barbero abra desde su celular, a la que agregue corte y productos, y que el dueño pueda recuperar en la computadora para cobrar.

**Criterio:** la orden conserva cliente, sucursal y responsable al cambiar de dispositivo; dos operadores no pueden cobrarla dos veces; queda historial de cambios y cierre/cancelación. **Diferencia:** ST-05 asegura la venta final y ST-38 aborda desconexión; aquí se añade el ciclo compartido anterior al cobro. **Dependencias:** ST-02, ST-05, ST-06 y ST-07.

### MEJ-02 · Varios prestadores dentro del mismo ticket

**P1 · L · Ambos segmentos.** La venta tiene un barbero en la cabecera y sus renglones no guardan prestador. Un cliente debería poder pagar un corte de Carlos y una barba de Mateo en un solo ticket.

**Criterio:** cada servicio tiene prestador y regla de comisión propios; las propinas se distribuyen explícitamente y una devolución revierte al destinatario correcto. **Diferencia:** ST-06 distingue quien presta y quien cobra; este modelo permite varios prestadores en una venta. **Dependencias:** ST-05 y ST-06.

### MEJ-03 · Servicios que realiza cada barbero y duración personal

**P1 · M · Ambos segmentos.** Hoy servicio y barbero no tienen una relación de aptitudes. La reserva ofrece el equipo de la sucursal sin comprobar quién realiza coloración u otro servicio especializado.

**Criterio:** el dueño configura servicios habilitados por profesional; la reserva filtra correctamente y usa su duración específica cuando exista, tanto en interfaz como en servidor. **Diferencia:** ST-07 asegura duración y conflictos del catálogo actual; esta propuesta incorpora aptitudes y variaciones por profesional. **Dependencias:** ST-07 y ST-18.

### MEJ-04 · Cola presencial con rotación justa

**P1 · L · Negocios con mucha atención sin cita.** Existe un registro de walk-in, pero no una cola con política visible de reparto. Propongo llegada, espera, llamado, inicio y finalización, con rotación configurable.

**Criterio:** mostrar espera estimada y quién sigue; permitir preferencia de barbero; registrar saltos o reasignaciones y su motivo; no poner automáticamente al cliente en curso antes de atenderlo. **Diferencia:** corregir “primer turno libre” corresponde a ST-07; la rotación y cola presencial completa son nuevas. ST-34 cubre huecos por cancelación, otro flujo. **Dependencias:** ST-07 y MEJ-03.

### MEJ-05 · Insumos y recetas por servicio

**P1 · L · Ambos segmentos.** Inventario descuenta productos vendidos; no existe una receta para los materiales que consume un corte. Las existencias actuales son enteras.

**Criterio:** configurar unidades y cantidades, por ejemplo una navaja y mililitros de producto; descontar al completar la atención y evitar doble descuento al cobrar; registrar merma y costo consumido. **Diferencia:** ST-05 trata mercancía vendida y ST-30 alertas; consumir insumos por servicio requiere un modelo nuevo. **Dependencias:** ST-05, ST-07 y ST-18.

### MEJ-06 · Conteos físicos de inventario

**P1 · M · Ambos segmentos.** El ajuste manual no sustituye una sesión de conteo físico. Propongo conteos parciales por categoría y conteo general con revisión de diferencias.

**Criterio:** capturar lo contado sin alterar stock inmediatamente; conciliar movimientos ocurridos durante el conteo; aprobar diferencias con motivo y movimiento trazable. **Diferencia:** el arqueo de ST-06 es de dinero, y el Kardex de ST-05 no define sesiones de conteo. **Dependencias:** ST-05 y ST-18.

### MEJ-07 · Traspasos entre sucursales

**P1 · L · Cadenas.** Hay catálogo por ubicación, pero no un proceso explícito de mercancía en tránsito entre dos almacenes.

**Criterio:** salida, tránsito y recepción parcial con cantidades y responsables; ninguna recepción incrementa dos veces; diferencias y cancelaciones quedan conciliadas. **Diferencia:** ST-18 controla aislamiento y catálogo compartido, sin definir logística de traspasos. **Dependencias:** ST-05 y ST-18.

### MEJ-08 · Compras y recepción parcial con proveedores

**P1 · L · Ambos segmentos.** Ya existe una API de proveedores y órdenes de compra; no es una capacidad inexistente. Falta completar el flujo visible para el dueño y admitir entregas parciales con partidas estructuradas.

**Criterio:** crear pedido, recibir por renglón y documentar costo, pendientes y devolución al proveedor; recepciones repetidas no duplican stock. **Diferencia:** ST-26 cubre importar el inventario inicial; esta propuesta cubre abastecimiento continuo y recepción parcial. **Dependencias:** ST-05, ST-18 y MEJ-06.

### MEJ-09 · Gastos y utilidad operativa de la barbería

**P1 · L · Ambos segmentos.** Los reportes muestran ingresos y comisiones; no un registro de renta, servicios, compras y otros gastos para entender qué queda al dueño.

**Criterio:** registrar gastos por categoría, período y sucursal; mostrar ingresos, costo de mercancía/insumos, comisiones y gastos por separado; evitar descontar una compra y su consumo dos veces. El resultado es operativo, sin prometer declaración fiscal automática. **Diferencia:** ST-28 calcula costos del SaaS y ST-30 ventas netas del negocio; aquí se añade el registro de gastos y su conciliación. **Dependencias:** ST-06, ST-30 y MEJ-05/08 cuando apliquen.

### MEJ-10 · Unificación de clientes duplicados

**P1 · M · Ambos segmentos.** Un teléfono único no resuelve perfiles repetidos con formatos distintos ni clientes creados sin contacto.

**Criterio:** sugerir posibles duplicados sin unir automáticamente; previsualizar historial y conservar citas, ventas, notas y consentimiento con procedencia; registrar la decisión y ofrecer reversión definida. **Diferencia:** ST-26 valida una importación y ST-29 preferencias; no definen fusión de registros existentes. **Dependencias:** ST-02 y ST-29.

### MEJ-11 · Familias con un contacto compartido

**P2 · M · Barberías familiares.** El modelo actual vincula un teléfono a un cliente por negocio. Padre e hijos necesitan historiales propios aunque usen el mismo contacto.

**Criterio:** separar persona atendida y contacto de reserva; mostrar el nombre correcto en agenda y ticket; consentimiento y preferencias no se copian sin justificación. **Diferencia:** ST-29 se centra en la relación individual y no incorpora hogares. **Dependencias:** ST-29 y MEJ-10.

### MEJ-12 · Reservas de grupo

**P2 · L · Ambos segmentos.** El flujo público reserva una persona y un servicio. Propongo reservar a dos o más personas de una vez, juntas o consecutivas.

**Criterio:** comprobar el conjunto de horarios antes de confirmar; evitar reservas parciales involuntarias; permitir cancelar una persona manteniendo las demás y mostrar un resumen por integrante. **Diferencia:** ST-07 protege la cita individual; una reserva compuesta necesita coordinación adicional. **Dependencias:** ST-07 y MEJ-11.

### MEJ-13 · Capacidad de sillas y recursos compartidos

**P2 · L · Locales con recursos limitados.** La agenda comprueba profesionales; no modela sillas, lavacabezas o estaciones que pueden limitar servicios simultáneos.

**Criterio:** asignar recursos requeridos por servicio; comprobar disponibilidad del barbero y del recurso en una misma operación; bloquear mantenimiento sin inventar ausencia del profesional. **Diferencia:** ST-07 trata conflictos de agenda del barbero; incorpora aquí una segunda dimensión de capacidad. **Dependencias:** ST-07 y MEJ-03.

### MEJ-14 · Tarjetas de regalo con saldo

**P2 · L · Ambos segmentos.** Añadir regalo prepago de una sola compra, con saldo y redención controlada.

**Criterio:** código no predecible; redención parcial sin duplicación; saldo e historial verificables; política explícita de vigencia, devolución y canje antes de venderlo. **Diferencia:** ST-35 es anticipo de una cita y ST-36 membresía recurrente; aquí se crea un saldo de regalo transferible. **Dependencias:** ST-05, ST-06 y ST-35 si se vende en línea.

### MEJ-15 · Lealtad por visitas sin suscripción

**P2 · M · Independientes y cadenas.** Un programa de sellos, por ejemplo una recompensa tras cierto número de visitas pagadas, sin obligar al cliente a contratar mensualidad.

**Criterio:** acumular solamente visitas elegibles; no duplicar sellos; una devolución ajusta el avance; el dueño ve el costo de los premios y sus reglas. **Diferencia:** ST-36 es membresía de cobro recurrente y ST-39 reseñas/referidos; ninguna define premios por recurrencia sin suscripción. **Dependencias:** ST-05 y ST-29.

### MEJ-16 · Renta de silla y operación mixta

**P2 · L · Validar primero el modelo del cliente.** El sistema parte de comisión por porcentaje. Algunos negocios combinan barberos comisionistas con renta fija de espacio.

**Criterio:** configurar el esquema por profesional y período; separar quién recibe el cobro del servicio y qué obligación registra el negocio; emitir un estado de cuenta sin mezclar renta y comisión. **Diferencia:** ST-06 controla comisiones y custodios de dinero, sin definir contratos de renta de silla. **Dependencias:** ST-06 y MEJ-09; reglas acordadas con el negocio antes de implementarlas.

### MEJ-17 · Asistencia y pausas del equipo

**P2 · M · Cadenas y equipos grandes.** El horario publicado no registra la entrada real, descansos o salida del profesional.

**Criterio:** entradas, salidas y correcciones auditables; pausas visibles para recepción; permisos claros para consultar registros. No usar horas como cálculo automático de obligaciones laborales. **Diferencia:** ST-07 configura disponibilidad y descanso, no asistencia realizada. **Dependencias:** ST-02 y ST-07.

### MEJ-18 · Búsqueda global con acciones directas

**P2 · M · Ambos segmentos.** Hay búsquedas dentro de módulos, pero no una búsqueda transversal por nombre, teléfono, folio de venta, reserva o SKU.

**Criterio:** resultados agrupados por entidad, sucursal y permiso; abrir directamente su ficha o acción permitida; no revelar registros de otra sucursal o negocio ni información financiera al barbero. **Diferencia:** ST-31 mejora experiencia de las pantallas existentes; esta capacidad agrega consulta transversal y navegación entre entidades. **Dependencias:** ST-02 y ST-18.

## Orden recomendado

1. Mantener la ruta de lanzamiento existente: PostgreSQL, venta, caja, agenda y validación de dispositivos. Resolver primero los hallazgos vinculados a sus historias.
2. Llevar MEJ-01, MEJ-05 y MEJ-09 a entrevistas del piloto: servicio abierto, consumo real y cuánto queda al dueño. Es el conjunto con mayor relación con la operación observada.
3. Para cadenas, validar MEJ-07 y MEJ-08; para alta afluencia presencial, MEJ-04. No activar todos los frentes a la vez.
4. Para convertir una propuesta en historia: confirmar un caso real, definir alcance mínimo, métricas, dependencia, criterios de aceptación y esfuerzo con el modelo definitivo. Revisar posibles solapamientos al incorporar nuevas historias.

No hay fecha, precio extra ni promesa de entrega asociados a estas propuestas. La prioridad es tener un producto confiable que pueda venderse y después desarrollar las capacidades que el piloto confirme.

## Evidencia de los cambios de reservas

- `apps/web/src/views/PublicBookingView.tsx`: interfaz y estado de la reserva.
- `docs/screenshots/RESERVAS_movil_portada.jpg`: captura móvil durante la revisión.
- `docs/screenshots/RESERVAS_resumen_servicio.jpg`: resumen de servicio y paso a horario.
- `docs/screenshots/RECORRIDO_cobro_demo.jpg`: formulario de cobro, sin venta enviada.
- `docs/screenshots/RECORRIDO_pos_barbero_movil.jpg`: punto de venta del barbero en móvil.
- Verificación: TypeScript sin errores y compilación web correcta. La advertencia de tamaño queda referenciada a ST-31.

La captura móvil se obtuvo durante el recorrido inicial. En la comprobación final, el cambio de viewport no se aplicó a las pestañas de prueba ocultas; se verificó el flujo completo en escritorio y se restauró el tamaño del navegador. Esto no sustituye una prueba en teléfono físico de ST-09.
