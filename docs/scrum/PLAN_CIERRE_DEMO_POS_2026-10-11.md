# Plan de cierre de la demo de SYSTECH Studio

Fecha: 11 de octubre de 2026. Inicio solicitado: 13:10, America/Mexico_City. Alcance autorizado: preparar ahora el plan; iniciar su ejecución en el horario programado. Conexiones externas en un plan posterior.

## Resultado esperado

Una demo completa, coherente y reproducible del POS para una barbería independiente: el cliente reserva; el barbero consulta su agenda desde el celular, atiende y registra el cobro cuando tiene permiso; el dueño revisa ventas, caja, comisiones e inventario y puede personalizar su página pública. Debe poder presentarse de principio a fin sin improvisar cuentas, reiniciar servidores durante la presentación ni ocultar errores.

“Demo completa” no significa producto certificado para producción. No certifica pagos live, correo entregado, WhatsApp automatizado, CFDI, hardware, contratos, disponibilidad del alojamiento ni aceptación comercial. No habrá servicios contratados ni cambios de precios durante este plan.

## Investigación y límites de la evidencia

Se revisaron páginas oficiales de Fresha, SQUIRE, Booksy y AgendaPro, además de capturas de interfaces publicadas ya conservadas en `docs/evidencias/benchmark-ui-20261011`. No se accedió a cuentas comerciales privadas ni se hizo una prueba comparativa de tiempos con usuarios. Lo documentado por los proveedores es evidencia de funciones anunciadas; explicar por qué una decisión puede ayudar es una hipótesis de diseño, no una demostración de éxito de mercado.

| Referencia | Qué se observa o documenta | Hipótesis de utilidad | Aplicación a SYSTECH |
|---|---|---|---|
| Fresha | Agenda con horas/columnas; cobro que combina servicios y productos; propinas, comisiones y reportes. | La escala temporal permite leer ocupación; un carrito único evita recapturas y mantiene visible el total. | Conservar el calendario ya agregado, el detalle de cita y el total persistente; probar coherencia entre pantallas. |
| SQUIRE | Registro enfocado en barberías, ticket preparado desde cita y atribución de ingresos/propinas al profesional. La imagen publicada muestra transacciones compactas. | La cita sirve como contexto y el cobro produce datos operativos útiles sin otra captura administrativa. | Un recorrido cita→venta→comisión→caja; acciones móviles del barbero según permiso, con aviso al dueño. |
| Booksy | Calendario personalizable, ficha del cliente con notas/fotos, márgenes entre citas y operación móvil. | Recuperar contexto en el momento de atender reduce navegación y preguntas repetidas. | Preferencias privadas del corte, ficha vinculada a cita y venta, agenda personal y controles móviles legibles. |
| AgendaPro México | Oferta de reservas, punto de venta y gestión para barberías. | El dueño puede entender una propuesta de administración integrada en términos de su trabajo cotidiano. | Lenguaje en español, resultados comprobables y recorrido integrado; no asumir que las integraciones anunciadas están habilitadas en México. |

Fuentes consultadas el 11/oct/2026:

- [Fresha — punto de venta](https://www.fresha.com/for-business/features/point-of-sale)
- [Fresha — agenda](https://www.fresha.com/for-business/features/scheduling)
- [SQUIRE — POS para barberías](https://www.getsquire.com/features/pos-payments)
- [Booksy — funciones](https://biz.booksy.com/features)
- [AgendaPro — barberías en México](https://agendapro.com/mx/sistema-pos-terminal-punto-venta/barberias)
- [Comparativa visual previa](../evidencias/benchmark-ui-20261011/COMPARATIVA.md)

### Qué adoptar y qué evitar

Adoptar continuidad entre agenda y cobro, jerarquía de acciones, contexto del cliente, lectura temporal, atribución financiera y facilidad móvil. Conservar identidad propia. No copiar marcas, fotos o diseños de los competidores.

No convertir el sistema en un catálogo de funciones. Marketplace, membresías, anticipos, campañas, recepcionista IA, lista de espera automatizada, app nativa, drag-and-drop de citas y POS offline quedan fuera. Su complejidad no aporta evidencia suficiente para esta demo. No prometer que cualquier integración o licencia da automáticamente todas las capacidades.

## Punto de partida comprobado

El respaldo local del tablero registra ST-02/03/04/05/06/07/12/43 como validadas y ST-01/08/09 con bloqueos externos. Ese registro no reemplaza una revisión de la versión actual. Hay cambios posteriores y el repositorio conserva trabajo sin commit.

Ya se agregó: agenda temporal/lista móvil, detalle con acción principal, cobro persistente, búsqueda de próximo cupo, descripciones de servicios, apertura de próxima visita tras venta y una portada editorial con perfiles más presentes. Son entregas parciales útiles, no cierre automático de ST-29/30/31. Revisar sus reportes antes de cambiar código.

- [Mejoras de operación verificadas](../evidencias/mejoras-operacion-20261011/REPORTE.md)
- [Personalidad de reservas](../evidencias/mejoras-operacion-20261011/PERSONALIDAD_RESERVAS.md)
- [Tablero existente](TABLERO.md)
- [Inventario operativo ST-41](ST41_INVENTARIO_OPERATIVO.md)
- [Consumo de insumos ST-42](ST42_CONSUMO_INSUMOS.md)

## Diseño común del producto

La administración debe comunicar control y permitir operar rápido; la página pública debe comunicar la identidad de la barbería. Comparten claridad y accesibilidad, con distinta densidad visual.

- Base administrativa: verde #183b32, texto #182220, blanco #ffffff, fondo #f7f9f8, bordes #dce2dd. El acento #ad7652 se limita a detalles. Error, advertencia y éxito también llevan texto/icono; nunca solo color.
- Tipografía: mantener las fuentes actuales para evitar dependencias. Source Sans para lectura; Barlow Condensed en títulos públicos y nombres, sin imponer títulos decorativos a tablas financieras.
- Escala y ritmo: espaciado 4/8/12/16/24/32; campos y acciones táctiles mínimo 44 px; encabezados consistentes; una acción principal por tarea; precio/total legibles y alineados.
- Móvil: lista de citas personal, tarjeta compacta de atención y cobro accesible. Tablas grandes con alternativa comprensible o desplazamiento acotado, nunca toda la pantalla desbordada.
- Estados: carga, vacío, error, guardando, éxito y permiso insuficiente. Si hay incertidumbre de una venta, mostrar recuperación, no invitar a cobrar otra vez.
- Configuración: un único centro con grupos claros; las rutas antiguas deben conducir al grupo correcto sin perder datos. Guardado y cambios pendientes visibles.
- Personalización pública: temas, portada/foco, slogan, perfiles, fotos y descripciones existentes. Respetar portada compacta, negocio sin imágenes y secciones ocultas. No inventar contenido para maquillar ausencia de datos.

## Ejecución ágil: orden, entregables y aceptación

Cada bloque produce una entrega pequeña y verificable. Primero comprobar lo existente; implementar solo brechas confirmadas. Trabajar una tarea por implementador, evitar ediciones simultáneas de archivos compartidos y no aumentar consumo con equipos que repitan la misma revisión. Las tareas CD siguientes son unidades de este plan, no nuevas historias comerciales.

### Bloque A — estado reproducible y brechas

**CD-01. Recuperar el entorno y congelar el alcance.** Leer instrucciones vigentes, cambios, tablero, pruebas y reportes. Inventariar rutas, funciones reales, pendientes y dependencias. Identificar la demo activa por ID, no asumir que dv-r01 y Estudio Norte son la misma cuenta. Conservar datos y archivos existentes.

Entrega: matriz pantalla→problema→prioridad→historia→prueba, con P0 integridad/privacidad, P1 recorrido o legibilidad y P2 mejoras posteriores. Ninguna función inexistente se presenta como implementada.

**CD-02. Preparar dataset ficticio separado.** Tres profesionales con capacidades claras; servicios y productos; clientes ficticios; citas pasadas/futuras y estados; stock bajo y movimientos explicables. Fixtures para ventas históricas, conteos e insumos separados del recorrido en vivo. Rótulo de demo y datos ficticios. Reinicio reproducible sin borrar la base de trabajo ni datos ajenos.

Aceptación: abrir demo, autenticarse con dueño y barbero de prueba, reservar y recuperar estado después de recargar. Cuentas de otro negocio comprueban aislamiento. Servidores estables y procedimiento de inicio documentado.

### Bloque B — navegación y lenguaje

**CD-03. Sistema visual compartido.** Revisar encabezados, botones, filtros, tablas, formularios, confirmaciones y estados. Extraer piezas compartidas cuando resuelva inconsistencias reales; evitar una reescritura masiva.

**CD-04. Menú por rol.** Dueño: resumen, agenda, cobro, clientes, equipo, inventario, reportes y configuración. Barbero: su agenda, atención, cobro autorizado y sus ingresos visibles según política. El cliente público permanece en reserva/gestión de su cita. Ocultar un botón no sustituye el control de API.

Aceptación: todas las rutas del menú funcionan, el título coincide, la sucursal activa es visible, regreso no expulsa del negocio, acciones no autorizadas también se rechazan desde el servidor.

### Bloque C — atender y cobrar

**CD-05. Agenda final.** Comprobar fechas/zona horaria, profesionales, duración, bloqueos, márgenes, días cerrados, citas simultáneas y estados. Calendario escritorio, lista móvil y detalle con siguiente acción. No hacer pasar huecos visuales por disponibilidad confirmada.

**CD-06. Atención desde celular.** Barbero abre su cita, ve servicio, preferencia de corte y foto privada autorizada; inicia atención y pasa al cobro permitido. Clientes sin cita también tienen un recorrido sencillo. Aviso al dueño procede de venta confirmada, no del intento de cobrar.

**CD-07. Caja/POS final.** Comprobar servicio+producto, cliente/barbero, cantidades, descuento, propina y métodos registrados. Total accesible a 1280×720 y en móvil. Reutilizar intención de venta y recuperación; no duplicar registro ante doble clic, caída o respuesta perdida. Acción posterior de ticket y próxima visita comprensible.

**CD-08. Cierre, devoluciones y comisiones.** Conciliar fondo, efectivo recibido/cambio, entregas y custodia; distinguir métodos no efectivos. Detalle de comisión y propina por venta. Devolución con permiso, motivo e impacto visible; devolución de dinero no implica reposición física automática de cualquier artículo.

Aceptación conjunta: una venta desde cita actualiza una vez agenda, historial, ingresos, stock del producto, comisión y caja correspondiente; sus cifras concilian. Los totales de pantallas distintas usan la misma definición. Un error no deja media venta ni autoriza otra doble.

### Bloque D — equipo y cliente

**CD-09. Equipo y comisiones.** Tarjetas útiles: nombre/foto, estado, servicios habilitados, horarios y acceso a ingresos cuando corresponde. La edición separa perfil público de permisos y reglas financieras. Hacer comprensible quién puede cobrar y quién ve caja/comisiones. No alterar retrospectivamente comisiones históricas por cambiar la regla actual.

**CD-10. Ficha del cliente y retorno.** Historial con citas y ventas vinculadas, próxima cita, preferencias y referencia privada. Búsqueda por información permitida, sin fusionar automáticamente personas ambiguas. Reagendar precarga datos correctos, permite revisar horario y nunca copia la foto privada al catálogo público.

Aceptación: la reserva nueva puede seguirse hasta la ficha correcta; fotografías privadas no aparecen en respuesta pública ni en otro negocio. La acción de siguiente visita no duplica citas.

### Bloque E — inventario y valor agregado

**CD-11. Inventario inicial, entradas y trazabilidad (ST-41A).** Separar servicio, producto de reventa e insumo. Captura inicial/entrada con cantidad, costo, referencia, responsable y sucursal. Saldo y movimiento se guardan juntos; reintentar no duplica. Edición de nombre/precio no modifica stock silenciosamente. Catálogo e inventario se distinguen en la UI.

**CD-12. Conteos y ajustes (ST-41B).** Conteo parcial con fecha/saldo de referencia, cantidades físicas y diferencia. Lo no contado no es cero. Ajuste requiere motivo y permiso; conciliar ventas/entradas ocurridas durante el conteo. Dejar evidencia del antes/después.

**CD-13. Insumos por servicio (ST-42A/B, alcance local).** Unidades pieza/ml/g compatibles y precisión definida; receta versionada, consumo aplicado una sola vez a servicio realizado. Servicio cancelado no consume; devolver dinero de servicio realizado no devuelve material. Comparación de saldo esperado con conteo, tolerancia y evidencia. Dataset de ejemplo separado.

Aceptación: stock concilia con sus movimientos, conteo concurrente no pisa ventas, receta editada no reescribe consumo histórico. Una diferencia se llama diferencia por investigar, no robo ni acusación a un barbero. La demo enseña cálculo real local, claramente ficticio; ensayo físico del piloto queda pendiente. Si hay migración, respaldo y pruebas por los motores soportados antes de integrar.

**CD-14. Reportes con decisiones.** Ingresos por periodo/barbero/sucursal, servicios/productos más vendidos, productos sin ventas en un periodo, stock bajo, comisiones y diferencias de inventario. Cada tarjeta enlaza a evidencia/filtro. Incluir fecha, sucursal, unidades y definiciones. No llamar utilidad a ingresos: margen estimado solo con costos suficientes; historial de costos o datos insuficientes deben ser explícitos.

Aceptación: un producto sin ventas no se diagnostica “malo” sin periodo y existencias; devolución cambia ventas netas según criterio visible; métricas no tienen números inventados; diferencia de insumos no implica fuga confirmada. Los cálculos se prueban con un dataset conocido y concilian con las ventas del recorrido.

### Bloque F — dueño, ajustes y página pública

**CD-15. Resumen del dueño (ST-30).** Priorizar próximas citas, atención/cobros pendientes, ventas del día, caja pendiente de cierre, stock bajo y diferencias por revisar. Separar hecho, tendencia y alerta. Cada aviso tiene una acción útil. Un dato no disponible se muestra como tal, no como cero.

**CD-16. Configuración unificada.** Negocio/sucursal, agenda, servicios, equipo/permisos, página pública y preferencias operativas. El dueño encuentra portada, logo, slogan, tema, descripción del servicio, perfiles y reglas de reserva en una ruta clara. Validaciones accionables, guardado persistente y confirmación de salida con cambios pendientes. Conexiones en sección separada con estado honesto, sin “Conectado” ficticio.

**CD-17. Reservas final.** Revisar portada editorial/compacta, fotos ausentes/rotas, nombres largos, tres profesionales y catálogo real. Verificar selección, resumen, primer cupo, días cerrados/llenos, preferencias opcionales, confirmación, gestión/cancelación y privacidad. Probar teclado/foco, regreso entre pasos y doble envío.

Aceptación: el cliente reserva sin crear cuenta; precio/duración/profesional coinciden con la confirmación y agenda; no ve panel ni compra del software; se recupera de error conservando lo necesario y sin crear duplicados. Los ajustes públicos persisten y solo cambian el negocio propio.

### Bloque G — calidad y demostración

**CD-18. Accesibilidad y rendimiento.** Pantallas de 360/390 px, tablet 768 px y escritorio 1280×720/1440 px; zoom 200%, teclado, foco de modal y contraste. Total visible, objetivos táctiles adecuados y ausencia de desbordamiento horizontal accidental. Optimizar el paquete grande con división por pantalla si la medición lo justifica; fotos dimensionadas y carga diferida fuera de portada. Sin agregar librerías o efectos pesados por apariencia.

**CD-19. Regresión de recorrido y recuperación.** Suites pertinentes de permisos, reservas, POS, caja, personalización, inventario y reportes. Doble clic, concurrencia, pérdida de respuesta, API caída, sesión expirada, recarga y aislamiento. Pruebas visuales de estados vacíos/errores. Las pruebas ya aprobadas son base histórica, no resultado nuevo de esta ejecución.

**CD-20. Empaquetar la demo.** Guion de 5–10 minutos, credenciales exclusivamente ficticias, instrucciones de inicio/reset, capturas y vídeo solo si aporta valor. Caso principal de independiente y caso secundario de sucursales como vista de alcance, sin declarar cadenas certificadas. Informe de entrega con brechas externas y lista para el siguiente plan.

## Guion de aceptación comercial

1. Cliente abre la página, reconoce la barbería y reserva servicio/profesional/hora.
2. Barbero ve la cita desde su celular, consulta preferencia e inicia atención.
3. Cobra corte y un producto; registra método, recibido/cambio cuando corresponde.
4. Dueño recibe el aviso interno y ve venta, caja, comisión y reducción de stock.
5. Abrir el historial del cliente y proponer siguiente visita.
6. Mostrar producto con baja rotación y stock bajo con periodos/datos claros.
7. Mostrar un conteo y consumo de insumos explicable sin acusar a personas.
8. Cerrar caja y conciliar. Señalar qué conexiones y pruebas reales faltan.

No demostrar “cinco minutos ahorrados” como hecho universal: medir el recorrido y contrastarlo con compradores en ST-44. No confundir una presentación técnica satisfactoria con aceptación del mercado.

## Puertas para considerar lista la demo

- [ ] Todas las pantallas principales tienen estados útiles y controles consistentes.
- [ ] Recorrido completo termina sin ajustes manuales de datos para hacerlo funcionar.
- [ ] Reserva/venta/movimientos/comisiones se registran una sola vez y concilian.
- [ ] Propietario y barbero pueden completar sus tareas sin acceso indebido.
- [ ] Inventario y métricas muestran cálculo verificable, no simulación disfrazada.
- [ ] Configuración persiste; portada y contenido públicos corresponden al negocio correcto.
- [ ] No se filtran preferencias/fotos, contactos privados ni datos de otra barbería.
- [ ] Teclado, móvil, pantallas bajas y recuperación están verificados.
- [ ] No hay defectos P0/P1 abiertos del recorrido. Los P2 se documentan.
- [ ] Demo se inicia/reinicia de manera reproducible con datos aislados.
- [ ] Reporte contiene pruebas realmente ejecutadas y capturas actuales.
- [ ] Guion, alcance y pendientes externos quedan explícitos.

Estas puertas aceptan la DEMO. No permiten cerrar ST-08/09, piloto real, legal, cadena o salida comercial sin su evidencia correspondiente. No cambiar estados de Notion solo por terminar esta lista; cotejar los criterios originales.

## Continuidad, prioridades y uso de recursos

Orden obligatorio A→B→C→D→E→F→G; ajustes públicos existentes se conservan y se revisan en F, no se rediseñan desde cero. P0 descubierto interrumpe el pulido. Cada bloque guarda cambios y reporte de continuidad: tarea terminada, archivos, pruebas, defectos y próxima acción exacta. Inicio en CD-01; no intentar completar veinte tareas en una sola ventana de uso.

La ejecución programada inicia el trabajo, no garantiza cerrar todo el plan ese día. Si el entorno o el límite de uso impiden continuar, guardar `CONTINUACION_CIERRE_DEMO.md` junto a este archivo y entregar el punto exacto. No repetir tareas aprobadas sin cambios que justifiquen volver a probarlas.

El equipo se encarga de revisión técnica y dueño virtual con datos ficticios. Sinhue recibe reportes por entrega; no requiere probar cada pantalla. Solo quedan a cargo humano decisiones de negocio, material real autorizado, entrevistas y acciones externas que no pueda sustituir una prueba local.

## Plan siguiente: conexiones y piloto

### Complemento visual aprobado para evaluar durante el cierre

Referencias revisadas de los TikToks de diseño: `../evidencias/referencias-tiktok-20261011/REPORTE.md`. Aplicar sus criterios en CD-03/05/07/14–18: jerarquía de indicadores, color con significado, sombras para capas flotantes, textos concretos e identidad de barbería en reservas. No prohibir componentes útiles por parecer genéricos. Verificar cada cambio con datos reales del fixture, recuperación, móvil y teclado. Este complemento no cambia el orden del plan ni marca tareas implementadas.

Preparar después: dominio y hosting, producción PostgreSQL y respaldos, Stripe live/licencias, correo/DNS, WhatsApp/Meta con consentimiento y costos, almacenamiento de imágenes, facturación/CFDI según régimen definido, monitorización y hardware. También contratos/privacidad, capacidad, presupuesto y aceptación del piloto. No modificar ni contratar estas piezas durante el cierre de demo; registrar contratos de API o necesidades que se descubran para evitar rehacer trabajo después.
