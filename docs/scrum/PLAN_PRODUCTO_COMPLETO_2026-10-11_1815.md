# Plan de producto, operación y experiencia — SYSTECH Studio

Fecha: 11 de octubre de 2026. Inicio autorizado: hoy a las 18:15, America/Mexico_City. Coordinación: este chat. Sinhue autoriza ejecución con agentes y recibe reportes; no se le devuelve una lista de pruebas rutinarias.

## Objetivo y alcance

Completar los flujos internos de una demo comercial que una barbería independiente pueda entender: reservar, recibir al cliente, atender, cobrar, entregar efectivo, conciliar caja y comprender ventas e inventario. Incorporar las mejoras pertinentes de esta conversación con reglas explícitas y evidencia. Preparar alcance de sucursales conservando autorización existente.

La ejecución empieza a las 18:15; esa hora no es una promesa de terminar todas las funciones en una sola ventana. Mantener trabajo hasta completar el alcance técnico autorizado por bloques, documentando continuación exacta si el entorno o uso lo interrumpen. No omitir tareas para declarar finalización. No confundir demo terminada con producción, aprobación legal o validación por compradores reales.

Este plan complementa PLAN_CIERRE_DEMO_POS_2026-10-11.md y las historias existentes. Los identificadores PC siguientes son tareas de ejecución, no nuevas historias de Notion ni renumeraciones. No reemplazar criterios originales de ST-41/42/30 ni marcar historias completas por estética.

## Estado que se debe conservar

- Rediseño aplicado: navegación, Inicio, Agenda, POS, Equipo, Configuración, reservas, Inventario, Clientes, Reportes, Accesos y licencia. Evidencia: ../evidencias/identidad-studio-20261011/REPORTE.md. Evitar otra reescritura total.
- Demo ficticia cierre-demo: frontend5190/API3102, manifiesto .tools/closure-demo.json. Verificar procesos actuales; los IDs de sesión de documentos antiguos pueden haber vencido. No detener5179/3101 ni modificar dev.db para ejecutar pruebas.
- Venta de navegador A-000001: servicio clásico200 y pomada180, total380, Alex, comisión98, pomada stock7. Reserva ficticia del12/oct a12:30 con Mateo, folio RES-03E78E665C0018B6. No volver a insertar esos registros ni restaurar la demo sin necesidad.
- Nueve comprobaciones verify_closure_demo aprobadas. No representan todas las regresiones requeridas para funciones nuevas.
- Inventario básico tiene riesgos pendientes: alta y Kardex separados, movimiento sin clave de reintento y ajuste absoluto. Confirmar con pruebas antes de habilitar conteos.
- Ya existen reserva/gestión, caja/devoluciones/comisiones, bloqueos, preferencias y próxima visita parciales. Investigar lo existente antes de crear una segunda implementación.
- Repositorio con muchos cambios previos: conservarlos; sin reset, limpieza destructiva o migración sobre base operativa.

## Orden de entrega

1. **Base confiable:** reproducir y corregir riesgos de inventario; contratos compartidos y migraciones ensayadas.
2. **Operación diaria:** experiencia móvil del barbero, llegada sin cita, ausencias y cierre guiado.
3. **Inventario completo:** entradas, importación, conteos, unidades y consumo por servicio.
4. **Gestión útil:** servicios combinados, políticas de descuentos y precio opcional por profesional, gastos y análisis verificable.
5. **Experiencia completa:** primer uso, historial, búsqueda, ayuda y personalización.
6. **Integración y aceptación:** casos con roles, concurrencia, errores, escritorio/móvil, datos conciliados y guion comercial.

Ningún bloque financiero pasa la puerta de aceptación con un defecto crítico abierto. Se puede preparar UI en paralelo con contratos ya acordados, pero no mostrar datos simulados como operación real.

## Trabajo definido

### PC-01. Integridad de inventario — ST-41 / CD-11

Reproducir alta de producto con fallo de Kardex, pérdida de respuesta y dos movimientos simultáneos. Alta y movimiento inicial en una transacción. Identificador de intención para movimientos, vinculado a negocio/sucursal/usuario/tipo y contenido; misma intención retorna resultado, contenido distinto devuelve conflicto. Validar cantidades, unidades, stock no negativo, SKU y prohibir stock de servicios. No borrar movimientos; corregir con compensación y motivo.

Aceptación: fallo deja saldo y Kardex intactos; reintento no duplica; otro negocio no puede recuperar una intención; operaciones simultáneas conservan saldo conciliado. SQLite y PostgreSQL con fixtures independientes. Determinar política de stock por sucursal desde modelo existente antes de migrar.

### PC-02. Entradas, mermas y trazabilidad — ST-41A

Formulario por producto/sucursal: cantidad, costo aplicado, proveedor opcional, referencia, fecha, responsable y motivo. Separar compra, merma, uso interno y corrección. El catálogo no modifica stock silenciosamente. Mostrar saldos previos/nuevos, usuario y origen (venta/devolución/entrada/conteo). Mantener costos históricos; editar costo actual no reescribe la historia.

Aceptación: compra aumenta saldo una vez y conserva costo/documento; merma no crea venta; permisos y aislamiento aplican en API; servicio no admite entrada física. UI explica lo que sucederá antes de confirmar.

### PC-03. Conteos físicos seguros — ST-41B

Conteo borrador con fecha y saldo de referencia por artículo. Permitir conteo parcial; no contado no equivale a cero. Guardar avance, comparar cantidades y exigir motivo/permiso para conciliar. Resolver ventas/entradas ocurridas entre referencia y confirmación; si no puede reconciliar con certeza, impedir ajuste y explicar cómo recontar. Confirmar una sola vez, con registro compensatorio y resultado recuperable.

Aceptación: dos operadores, conteo parcial, venta durante conteo, respuesta perdida y doble confirmación. Diferencia mostrada corresponde al punto de referencia real. No sustituir por ajuste absoluto inseguro.

### PC-04. Insumos y recetas — ST-42A

Separar reventa de insumo operativo y definir pieza/ml/g, presentación, conversión, precisión y redondeo. Migración ensayada de piezas existentes a decimal compatible, sin truncar ni reinterpretar unidades. Recetas versionadas por servicio. Consumo en evento de servicio completado/venta según contrato único, evitando descontar dos veces cuando la cita y el POS registran la misma atención. Guardar versión, cantidad y costo usados.

Aceptación: receta5ml ×12 servicios consume60ml; cambio de receta solo afecta nuevos eventos; cancelación previa no consume; devolver dinero por servicio realizado no devuelve insumo ficticiamente. Corregir eventos exige motivo y compensación. Sin conversiones incompatibles ni saldos negativos silenciosos.

### PC-05. Diferencias de insumos — ST-42B

Saldo inicial + entradas/devoluciones físicas aptas − ventas/consumo/merma/salidas = saldo esperado. Comparar con conteo con método/tolerancia explícitos, incluidos frascos abiertos. Mostrar evidencia y datos faltantes. No diagnosticar robo ni culpar a un empleado por diferencia compartida.

Aceptación: ejemplo reproducible500ml −60×5ml =200ml; conteo150ml muestra50ml por conciliar, sujeto a tolerancia. Datos incompletos dicen «No hay información suficiente». Medición física y piloto quedan pendientes externos, sin simular su aceptación.

### PC-06. Mi jornada del barbero — ST-02/06/29/31

Siguiente cita propia, cliente, servicio, tiempo, referencia privada y acción según estado. Atender→terminar→cobrar con contexto, importe y profesional conservados; evitar recaptura y acciones duplicadas. Acceso al dinero bajo su custodia y sus comisiones conforme a permisos existentes. No mostrar finanzas generales ni datos ajenos.

UI: controles grandes, texto corto, una acción principal, carga/vacío/error, operación con una mano, regreso conserva fecha y selección. No imponer un cajero a negocios donde cobra el barbero o dueño.

Aceptación: barbero inicia/termina/cobra su visita desde390px; intentos sobre cita ajena rechazados por API; dueño ve venta y quién cobró; reintento no cobra de nuevo. Profesional que no tiene permiso recibe explicación útil.

### PC-07. Llegadas y fila presencial

Expandir la llegada sin cita existente en fila interna con nombre/contacto opcional, servicio, hora de llegada, profesional preferido o cualquiera y estado: esperando/asignado/en atención/retirado. Mantener orden explícito y permitir reasignar sin producir otra cita/venta. Distinguir fila de agenda reservada; no prometer hora exacta si no hay base para estimarla.

Aceptación: dos personas no toman el mismo turno; asignación verifica disponibilidad y márgenes; retirar de fila no borra historial ni envía mensajes; cobro vinculado al servicio correcto. Queda fuera lista de espera automatizada que contacta cancelaciones.

### PC-08. Agenda y disponibilidad del equipo

Revisar bloqueos/descansos existentes. Incorporar ausencias/vacaciones y cambios puntuales de turno con alcance de fecha, sucursal y profesional. Disponibilidad pública y agenda usan la misma regla. Mostrar citas afectadas antes de confirmar un cambio de horario; no cancelarlas/reagendarlas silenciosamente. Retraso puede registrarse como aviso interno, sin mover citas automáticamente.

Aceptación: profesional ausente no ofrece cupos; reserva existente conserva datos y muestra conflicto por resolver; no se solapan servicio, margen y bloqueo; zona horaria y límites de día correctos. Calendario compacto y lista móvil, con nombre/estado en texto además de color.

### PC-09. Servicios combinados

Seleccionar varios servicios en una visita; suma de precio/duración por contrato claro, mismo profesional inicialmente. Resumen por línea y snapshot de nombre/precio/duración/costo. Disponibilidad contempla todo el bloque; evitar citas fragmentadas independientes que permitan ocupar parte del horario.

Aceptación: corte30min200 +barba20min100 bloquea50min y estima300; cambio de catálogo no altera reserva histórica; cancelar/reagendar trata la visita como unidad; POS recibe las líneas sin duplicarlas. Migrar compatibilidad de reservas antiguas de un servicio. No habilitar promociones o precios nuevos sobre negocio existente sin elección del dueño.

### PC-10. Precio opcional por profesional

Preparar configuración opcional por servicio/profesional con vigencia e historial. En blanco hereda catálogo; capacidad existente y planes conservados. Reserva y POS muestran precio elegido antes de confirmar. No aplicar tarifa nueva a reservas ya confirmadas ni modificar valores actuales durante implementación.

Aceptación: profesional sin regla mantiene precio; regla explícita solo afecta nuevas elecciones; snapshots históricos conservados; persona pública no puede mandar precio arbitrario. Esta función queda desactivada/sin reglas por defecto.

### PC-11. Descuentos con control

Revisar descuento existente y permisos. Proponer política opcional: límite por rol, motivo y aprobación identificada del dueño/gerente autorizado para excederlo. Conservar comportamiento actual hasta que exista una política explícita; no introducir códigos compartidos que suplanten la cuenta del aprobador. Totales/cambio/comisiones aplican la regla documentada y monto no negativo.

Aceptación: manipular payload no evade límite; aprobación expiró/cambió carrito y debe renovarse; registro quién solicitó/aprobó; reintento devuelve una venta. Nuevas políticas no se activan con valores inventados.

### PC-12. Cierre diario guiado — ST-06/09

Reusar caja/custodia/cierre ciego existente. Paso1 pendientes de venta/entregas, paso2 conteo físico, paso3 comparación, paso4 confirmación/comprobante. Distinguir caja central de efectivo bajo custodia del equipo. Comisiones no se marcan pagadas por cerrar caja. Diferencias necesitan explicación sin bloquear por un monto arbitrario no acordado.

Aceptación: ventas mixtas, gastos/movimientos, entregas parciales, devolución y dos intentos de cierre; esperado concilia; no se revela esperado antes del conteo cuando política actual es ciega; cerrado no reabre ni cambia por reintento. Impresión navegador se verifica; impresora real pendiente.

### PC-13. Gastos operativos

Registro de gasto por negocio/sucursal: concepto, categoría, fecha, importe, método, responsable, comprobante opcional y relación con caja si salió efectivo del turno. No restar dos veces una compra que ya tiene salida de caja. Separar gasto/costo de inventario, comisiones devengadas y pago de comisión. Correcciones con evidencia; permisos existentes.

Aceptación: gasto efectivo reduce esperado una vez; gasto bancario no reduce caja física; devoluciones/correcciones conservan historial; reporte explica base del cálculo. No presentar utilidad fiscal ni declarar impuestos automáticamente. Definir tratamiento del inventario comprado frente al costo de lo vendido antes de mostrar ganancia.

### PC-14. Inteligencia del dueño — ST-30

Indicadores con periodo, sucursal, fuente y desglose: ventas netas, comisiones, costo histórico de artículos/insumos usados y gastos según contrato; utilidad operativa estimada solo con datos suficientes. Productos más vendidos por unidades separado de mayores ingresos. Sin ventas/no movimiento, días desde última salida, stock bajo y cobertura con ventana de consumo explícita. Ocupación: minutos de servicios programados/completados sobre minutos realmente disponibles; ausencias y bloqueos no cuentan como capacidad disponible.

Acciones: abrir artículos a reponer, revisar conteo/diferencia, ver horario vacío o clientes con historial suficiente para seguimiento. No enviar campañas ni comprar desde una recomendación. Datos insuficientes se explican. Umbrales editables sin imponer conclusiones universales.

Aceptación: conciliar cada número con fixture; costo mutable no reescribe margen histórico; periodo/zona horaria y descuentos/devoluciones aplican; cero ventas no genera porcentaje infinito; productos nuevos no se etiquetan fracaso; propietario ve negocio correcto y barbero no recibe finanzas generales.

### PC-15. Historial y próxima visita — ST-29

Unir cita, venta, profesional, notas, tipo de corte y foto privada existente. Acceso rápido durante atención; guardar fecha relevante y último servicio completado, sin confundir citas reservadas con visitas realizadas. Próxima cita desde comprobante conserva contexto y exige confirmar cupo. Corregir etiquetas VIP/frecuencia con definición visible y datos adecuados.

Aceptación: nueva reserva no altera historia de servicio completado; foto no aparece en endpoints públicos/contactos de terceros; cambiar/cancelar cita no borra historial financiero; próxima visita no duplica cliente por teléfono equivalente. No introducir datos sensibles obligatorios.

### PC-16. Primer uso e importación — ST-26

Reusar checklist: negocio/sucursal→servicios→equipo→stock inicial→primera caja→enlace público. Guardar progreso y explicar qué es opcional. Importación CSV con plantilla de catálogo/clientes, vista previa, errores por fila, normalización, detección de duplicados y resumen antes de aplicar. SKU y precios no se sobreescriben silenciosamente. Exportación autorizada con encabezados, periodo/alcance y protección de fórmulas peligrosas en hojas.

Aceptación: archivo con filas inválidas no deja importación oculta parcialmente aplicada; política de lote explícita; reintento no duplica; otro negocio no importa sobre catálogo ajeno; exportación no incluye secretos ni fotos privadas por defecto. Archivo grande tiene límite claro y estado recuperable.

### PC-17. Búsqueda y acciones rápidas

Búsqueda del espacio de trabajo por cliente, cita y artículo según rol/sucursal. Resultados agrupados, atajo opcional documentado, flechas/Enter/Escape y regreso al lugar de origen. Acciones rápidas desde Inicio según rol. No cargar toda la base privada al navegador ni filtrar resultados ajenos solo en frontend.

Aceptación: no revela nombres de otro negocio/sucursal; no dispara atajos al escribir en campo; resultado abre registro correcto; búsqueda vacía/carga/error útiles, navegación por teclado y móvil funcional.

### PC-18. Personalización de reservas

Conservar temas/editorial/compacta, portadas, perfiles y secciones actuales. Agregar galería opcional de trabajos con título/alt, orden y opción de ocultar; usar solo material autorizado de la barbería, no referencias privadas de clientes. Personalizar descripción por servicio, instrucciones de llegada y políticas informativas. Evitar un constructor de páginas ilimitado.

Aceptación: sin foto/galería/descripcion sigue funcionando; todas las variantes legibles en móvil; contenido guardado pertenece al negocio correcto; enlace directo al servicio/equipo conserva navegación; galería no bloquea reservar y carga diferida. No inventar reseñas, calificaciones o ubicación. Subidas/almacenamiento externo permanecen para conexiones; soportar mecanismo local existente con validación segura.

### PC-19. UI/UX transversal — ST-31

Mantener Studio Display/Text locales y paleta ya definida. Afinar densidad útil en caja/agenda; mostrar precios, fecha y selección sin scroll innecesario; evitar títulos de marketing donde dificulten operar. Tablas financieras históricas con desplazamiento acotado, catálogos con fichas móviles, controles44px y foco visible. Jerarquía por tarea, no cuadrícula de tarjetas idénticas.

Estados de cargar/vacío/error/guardando/resultado incierto/éxito/permiso denegado. Acción principal consistente, ayuda contextual en descuentos/caja/ajustes, confirmación proporcional al impacto, cambios pendientes y regreso preservado. Menú móvil accesible, modales con foco y Escape según operación segura, movimiento reducido. Revisar Seguridad, Conexiones, Mensajes y ayuda además de pantallas ya rediseñadas. Eliminar promesas no comprobadas del marketing; legal debe distinguir borrador/demo de documento válido sin inventar identidad/contactos.

Aceptación: teclado,390×844,768px, escritorio y pantalla baja; sin desbordamiento general; contraste de temas y foco; campos asociados a etiquetas; controles en loading no permiten duplicación. Medir rendimiento local y separar rutas si evidencia justifica; no contratar herramientas.

### PC-20. Auditoría comprensible

Reusar auditoría existente y completar eventos de nuevas operaciones: quién/cuándo/sucursal/motivo, referencia y qué cambió. Detalle legible para dueño con filtros, sin exponer secretos o copiar fotos privadas en logs. Historial de precio, descuento aprobado, inventario, gasto, cambio de cita y cierre.

Aceptación: eventos solo del alcance autorizado, operaciones fallidas no se muestran completadas, correcciones preservan evento original, reintento no genera múltiples eventos financieros del mismo hecho.

### PC-21. Regresión y demo final — CD-19/20 / ST-44

Escenarios integrados de dueño que corta, barbero móvil, gerente de sucursal y cliente público, en datos ficticios. Reserva simple/combinada→agenda→referencia privada→atención→venta servicio/producto→stock/receta→comisión→custodia→gasto→cierre→reportes. Segundo escenario: fila presencial, ausencia, conteo parcial y respuesta perdida.

Capturas antes/después y evidencia propia por escenario. Preparar guion comercial corto basado en resultados medidos; no afirmar ahorro universal o ganancias aseguradas. Instrucciones de inicio, credenciales exclusivamente ficticias y continuidad de demo sin improvisar servidores. No borrar fixture de presentación para ejecutar test destructivo.

## Equipo y reparto

Máximo disponible: coordinador +tres agentes simultáneos. Ocho roles se activan por oleadas; no ocho procesos permanentes. Autorización explícita de Sinhue para crear/reutilizar agentes a las 18:15.

| Rol | Responsabilidad | Límite |
|---|---|---|
| Coordinador/integrador | Estado, contratos, orden, integración y reporte | Único responsable de archivos compartidos, servidor común y navegador mientras verifica |
| Producto y reglas | Refinar reglas/cálculos/casos y mapa a historias | No inventar políticas comerciales ni aceptar sus propias propuestas como decisión humana |
| Backend de integridad | PC-01/02/03/04/05, transacciones, modelos | Único escritor de schema/migraciones; API compartida por asignación |
| Operación | PC-06/07/08/09/10/11/12/13 | Escribe módulos asignados después de contrato; no edita schema en paralelo |
| Frontend operativo | UI barbero, agenda, POS, inventario, cierre | Archivos reservados por bloque; no duplica rutas/componentes existentes |
| Frontend experiencia | PC-15/16/17/18/19 | Cliente/público/ajustes; estilos compartidos solo con autorización del coordinador |
| Calidad y seguridad | Regresión, concurrencia, permisos, privacidad, cálculos | Evidencia independiente; no aprueba solo build o tests del implementador |
| Dueño virtual | Tareas desde UI y crítica de uso | No escribe producto ni certifica aceptación real; hallazgos con esperado/observado |

OleadaA: producto +backend +calidad. OleadaB: backend +frontend operativo +experiencia, con contratos y archivos sin cruce. OleadaC: backend/reglas de análisis +frontend +calidad. OleadaD: calidad +dueño virtual +correcciones acotadas. Repetir rotación hasta cerrar tareas; no lanzar todos sobre el mismo código.

Cada asignación especifica archivos exclusivos, entradas, dependencias, pruebas, resultado esperado y prohibiciones. El coordinador registra propiedad en ESTADO_PRODUCTO_COMPLETO_2026-10-11.md. Un único controlador del navegador; los demás solicitan escenarios/capturas o trabajan en fixtures independientes.

## Reglas de implementación y aceptación

1. Leer instrucciones/skills vigentes y estado git. Conservar trabajo. Crear snapshot/diff de partida sin guardar secretos; no confundir cambios previos con entregas nuevas.
2. Confirmar qué función ya existe y cómo integra. Antes de cambiar modelo/API acordar tipos, eventos únicos, snapshots y permisos; mapear compatibilidad de datos antiguos.
3. Migraciones sobre copias/fixtures; respaldo verificado y procedimiento de rollback. No migrar base operativa sin autorización concreta.
4. Tests significativos: reintento, dos usuarios, rollback, sumas/costos/precisión, aislamiento y privacidad. No tests que solo copien JSX. Build/tipos y pruebas pertinentes por bloque, regresión conjunta después de integración.
5. Navegador real sobre fixture: resultado visible, recarga/persistencia, error y recuperación. Evidencia técnica diferenciada de revisión de código y aceptación simulada.
6. DefectoP0: datos ajenos, pérdida/duplicación financiera, saldo incoherente, permiso evadido. No cerrar bloque hasta corregirlo. P1 de recorrido/UX se corrige antes de demo; P2 se registra con criterio e impacto.
7. Una tarea termina con código integrado, criterios satisfechos, pruebas/evidencia y límites escritos. Si un criterio exige proveedor/hardware/piloto real, marcar parte local terminada y validación externa pendiente; no marcar historia Validada completa.

## Entregables y control

- ESTADO_PRODUCTO_COMPLETO_2026-10-11.md: PC-01…21, estado Pendiente/En curso/Implementada/Verificada/Bloqueada, escritor, evidencia y dependencia. Implementada no equivale a Verificada.
- docs/evidencias/producto-completo-20261011/: reporte por bloque, resultados, capturas desktop/móvil y hallazgos del dueño virtual. No guardar claves, tokens, contactos reales ni enlaces privados reales en reportes.
- CONTINUACION_PRODUCTO_COMPLETO.md: última acción, archivos reservados, procesos/puertos, pruebas corridas, fallo exacto y siguiente paso; actualizar antes de cualquier interrupción.
- Reportes a Sinhue: qué cambió, qué probó el equipo, defectos resueltos, pendiente real y siguiente bloque. Actualizaciones breves durante ejecución, sin pedir pruebas rutinarias.
- Notion: cotejar estados con fuente vigente antes de actualizar; no duplicar historias ni declarar cierres sin criterios originales. Localizar historia existente para funcionalidad nueva o dejar refinamiento pendiente, sin inventar ID libre.

## Puerta final del alcance local

- [ ] PC-01…21 tienen evidencia o un bloqueo concreto explicado; no se omiten pendientes.
- [ ] Recorrido dueño/barbero/cliente termina sin edición manual de DB para aparentar éxito.
- [ ] Ventas, stock, recetas, gasto, comisiones, custodia y caja concilian.
- [ ] Reintentos/respuestas perdidas/concurrencia no duplican ni pierden operaciones.
- [ ] Negocios/sucursales/roles y fotografías privadas están aislados en API.
- [ ] Importación/primer uso, ajustes y nuevas opciones persisten y respetan datos previos.
- [ ] Escritorio/móvil/teclado/errores revisados con capturas vigentes.
- [ ] Sin P0/P1 del recorrido; P2 documentados.
- [ ] Dataset ficticio y arranque reproducible; reporte honesto distingue demo/producción.

## Fuera de esta ejecución

Conexiones live, hosting/dominio, contrataciones, pagos/cargos/reembolsos reales, mensajes externos, publicación, cambiar precios/planes actuales y datos reales quedan fuera. Nuevas reglas opcionales sin activar por defecto. WhatsApp automatizado, CFDI, Stripe producción, almacenamiento externo y monitoreo contratado van al plan de conexiones.

POS offline, GoogleCalendar, marketplace, app nativa, IA pagada, membresías recurrentes, anticipos y lista de espera que envía mensajes permanecen en backlog posterior. No prometer lo que dependa de ellas. Pruebas físicas, asesoría fiscal/legal y entrevistas de compradores no se sustituyen por agentes.

## Instrucción de arranque programado

El11/oct/2026 a18:15, leer este plan, estado reciente y evidencia anterior. Activar equipo por oleadas; empezar PC-01 con pruebas de reproducción mientras producto revisa contratos y calidad prepara aceptación. Continuar con todo el alcance, integrar, verificar y reportar. Si se alcanza un límite real, guardar punto exacto y pendiente; no cerrar por falta de presupuesto ni repetir programación. No modificar software ahora: esta entrega prepara y programa el trabajo.

