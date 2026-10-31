# Bitácora de SYSTECH

## 2026-10-04 · Preparación del control de trabajo

Objetivo: convertir el plan y las cuarenta historias en un tablero revisable y preparar el primer sprint.

Realizado:

- Revisadas condiciones oficiales de Notion/Obsidian y localizada integración Notion para conectar.
- Preparadas vistas locales de las cuarenta historias, Sprint 1 y estructura de registro.
- Investigación inicial de ST-01: identificados precio/límites repetidos, límites Pro de 999 y promesa FUNDADOR sin aumentos.
- Ninguna historia principal se declara validada por esta preparación; no hay un tablero externo creado ni conexión confirmada.

Decisión pendiente: herramienta principal y destino privado si se elige Notion.

Siguiente paso: confirmar herramienta y, si es Notion, configurar su conexión; después crear el tablero con IDs ST-xx y comenzar ST-01.2. La implementación puede continuar con el respaldo local mientras se configura el acceso.

## 2026-10-04 · Notion conectado y tablero creado

- Decisión de Sinhue: Notion gratuito como herramienta principal.
- Conexión verificada con Notion de Sinhue; creado espacio privado SYSTECH · Lanzamiento comercial.
- Cargadas 40 actividades con sus criterios, responsables, dependencias y siguiente paso.
- Creadas seis vistas, tablero Sprint 1 en Inicio, ocho sprints y documentos de costos, decisiones y bitácora.
- Verificación de lectura: total 40, Sprint 1 con cuatro historias, cuarenta pendientes; filtro de sprint y tablas de costos comprobados. Ninguna historia se declaró terminada.
- Evidencia y IDs: `NOTION_VINCULOS.json`; enlace principal en INICIO.md.
- Próximo paso: ST-01.2, catálogo único y compatibilidad. Calendario de sesiones por acordar; implementación puede avanzar en la sesión disponible.

## 2026-10-04 · ST-01 implementado y en revisión

- Objetivo: centralizar planes y aplicar capacidad real en servidor y pantallas.
- Estado: En curso → En revisión, verificado en Notion y copiado al respaldo local.
- Entrega: Esencial/Pro/Cadena en catálogo único; límites 3/8/8 por sucursal; Cadena hasta tres sucursales; registro, reactivación, restauración, downgrade y Stripe coherentes con los códigos.
- Evidencia: [ST01_EVIDENCIA.md](ST01_EVIDENCIA.md), catálogo versionado, suite de 27 casos y capturas de precios/suscripción.
- Pruebas: 149 comprobaciones aprobadas en seis suites; API y web compilan. Suite de catálogo revalidada tras revisión final de planId. Checkout probado con proveedor controlado, sin cargos reales.
- Resultado: una de dos altas simultáneas toma la última plaza; la otra se rechaza. Reducción incompatible devuelve 409 sin borrar datos ni alterar plan.
- Pendientes: PostgreSQL (ST-04), contador y precios Stripe remotos/live (ST-10/ST-16), importación (ST-26) y baja de sucursal (ST-18). El cobro live queda bloqueado con fiscalidad PENDIENTE; promociones live sin validar también se bloquean.
- Decisión: datos antiguos excedentes se conservan y avisan; los límites de 999 no conceden plazas. No se modificaron base de trabajo ni precios de Stripe.
- Próxima actividad: ST-02, matriz por rol y sucursal. Sinhue revisará la matriz concreta y preparará fiscalidad con contador durante el sprint.

## Plantilla para próximos cierres

Copiar una nueva entrada sin alterar el historial anterior:

- Fecha y sprint:
- Objetivo de la sesión:
- Actividad/subtarea:
- Estado anterior → nuevo:
- Qué se entregó:
- Evidencia y pruebas:
- Riesgo o limitación pendiente:
- Bloqueo, responsable y condición para continuar:
- Decisión tomada y motivo:
- Próximo paso concreto:
- Participación necesaria de Sinhue:
- Tiempo observado de implementación/soporte, si se midió:

Una actividad solo pasa a validada con sus criterios y Definition of Done; la bitácora no sustituye la prueba.


## 2026-10-05 · ST-02 implementado y En revisión

- Estado: Pendiente → En curso → En revisión. No se declara Validada para producción.
- Entrega: alcance por negocio, sucursal y barbero; 110 rutas inventariadas; permisos de equipo; impresión ligada a usuario vigente; entradas públicas y firmas Meta comprobadas.
- Evidencia: [ST02_EVIDENCIA.md](ST02_EVIDENCIA.md), [matriz de rutas](ST02_MATRIZ_RUTAS.md), inventario JSON y capturas ST02.
- Pruebas: 168 comprobaciones/7 suites en SQLite aislado; 18 escenarios de autorización revalidados después del ajuste público; tipos y compilación API/web aprobados.
- Recorrido visual: propietario crea cajero ficticio; cajero solo ve Roma Norte y carga agenda, POS y caja. No se modificaron permisos reales ni se contactaron proveedores.
- Base de trabajo: respaldo consistente previo y dos columnas opcionales añadidas sin seed ni reconstrucción; conteos de usuarios/clientes/ventas iguales; API 3001 restaurada y salud con base conectada. Scheduler de desarrollo desactivado durante la revisión.
- Límites: PostgreSQL pendiente de ST-04, invitación/recuperación ST-03, conectores reales en sus historias. Bundle web 537 kB, optimización ST-31.
- Revisión de Sinhue: matriz de devoluciones, caja, clientes y permisos por sucursal.
- Próximo paso: ST-03, recuperar acceso y proteger sesiones. Se aclaró que Stripe live/ST-10/ST-16 no es requisito circular para implementar ST-01.


## 2026-10-05 · Flujo celular/laptop documentado para ST-06 y ST-09

- Solicitud de Sinhue: barbero registra y cobra cada servicio desde celular; dueño supervisa desde laptop/PC y recibe notificación. Dueño y barbero son roles principales; recepción es opcional.
- Criterios añadidos: separar prestador y cobrador, confirmar pagos recibidos, aviso persistente dentro de la aplicación, custodia/entrega de efectivo sin duplicar ventas y recorrido con varios dispositivos/negocios.
- Propuesta operativa: cobro pendiente en mostrador permanece sin confirmar; efectivo recibido por barbero se concilia al entregarlo a caja. El detalle se revisa al implementar ST-06.
- Estado: ST-06 y ST-09 conservan Pendiente. Se actualizó el respaldo local de ambas; ST-09 se guardó y verificó en Notion. El guardado de ST-06 en Notion falló con «Unknown tool» y sigue pendiente de sincronizar; alcance completo respaldado en [FLUJO_COBRO_MOVIL.md](FLUJO_COBRO_MOVIL.md). No se modificó código ni se comenzó ST-03.


## 2026-10-05 · ST-03 implementado y En revisión

- Entrega: recuperación, verificación, invitación con contraseña propia, caducidad y revocación de sesiones/impresión. Enlaces públicos funcionan aunque exista una sesión vencida; login lleva al panel.
- Evidencia: [ST03_EVIDENCIA.md](ST03_EVIDENCIA.md), auditoría de dependencias, registro de pruebas y capturas ST03.
- Pruebas: 182 comprobaciones / 8 suites; 14 escenarios de seguridad revalidados al finalizar. Compilación API/web y validación sintáctica PostgreSQL correctas.
- Base de trabajo: migración aditiva y respaldo consistente previo; mismos conteos de usuarios/clientes/ventas, sin seed ni reconstrucción.
- Seguridad: retirados cabecera de bypass y contraseña fija del asistente. Auditoría de producción sin avisos; seis altos de herramientas de desarrollo derivados de braces quedan mitigados y documentados. Vite/React Router actualizados.
- Límite de alcance: envío real y dominio en ST-08; ejecución/concurrencia PostgreSQL en ST-04. No se enviaron correos externos ni se hicieron cargos.
- Estado de control: Notion y backlog local En revisión; primer criterio conserva pendiente la entrega real, los otros dos tienen pruebas locales.
- Próximo paso: ST-04. Sinhue revisa invitaciones y política de cerrar todas las sesiones.


## 2026-10-05 · Corrección de guardado de configuración

- Error observado por Sinhue: PUT /api/tenant/settings devolvía ruta no encontrada al guardar la página de reservas.
- Causa: el cliente usaba una ruta distinta de /api/auth/tenant/settings, ya autorizada y montada en la API. Corregido el método compartido por personalización y configuración.
- Verificación: 19 escenarios de autorización aprobados, incluido contrato cliente/API, guardado del propio negocio, rechazo de personal e imposibilidad de apuntar al tenant ajeno mediante el cuerpo. TypeScript web correcto.
- Navegador: datos pendientes conservados antes de recargar, restaurados y guardados; formulario vuelve a cargar sin error y perfiles públicos persisten. Captura: docs/screenshots/FIX_guardado_pagina.jpg.

## 2026-10-05 · Equipo completo y retratos en la página pública

- Solicitud de Sinhue: mostrar los tres barberos y destacar sus fotos con un formato cuadrado más grande.
- Causa corregida: la presentación tomaba solo los barberos de la primera sucursal. Ahora reúne el equipo público de todas las sucursales y muestra el nombre de cada sucursal; se conservan los filtros de activo y visible de la API.
- Presentación: retratos cuadrados de 160–176 px con esquinas suaves; selección de cita con retratos de 80 px. Se conservaron las fotos elegidas.
- Reservas: cada perfil abre su propia sucursal; servicios y barberos se filtran por esa sucursal. Al cambiar de sucursal se limpian selecciones incompatibles y se descartan respuestas de horarios anteriores.
- Verificación: TypeScript y compilación web correctos; navegador muestra tres imágenes cargadas y cuadradas. Carlos abre Roma Norte con su catálogo y equipo; David abre Condesa. Captura: docs/screenshots/FIX_equipo_publico.jpg.
- Pendiente de datos: Condesa todavía no tiene servicios configurados en el entorno de demostración; la reserva muestra un aviso claro. No se inventó ni copió su catálogo y no se crearon citas durante la revisión.

## 2026-10-05 · Reservas de clientes separadas del panel comercial

- Error reportado: el botón Panel era público y enviaba al inicio comercial. Ahora Volver a mi panel solo aparece para una sesión de dueño verificada y en la página de su propio negocio; regresa a /app/inicio conservando la sesión.
- Una sesión vencida o una cuenta pendiente de verificación no redirige automáticamente al visitante fuera de /b/ ni de la gestión pública de citas.
- El aviso de privacidad se abre en un diálogo dentro de reservas; al cerrarlo se conservan los datos, el horario y el consentimiento sin abrir otra pestaña. El texto legal existente no fue modificado.
- Los enlaces de gestión de cancelación con sucursal regresan a las reservas del mismo negocio. Los enlaces antiguos sin slug indican que se puede cerrar la página, sin enviar al inicio comercial.
- Verificación: navegador sin sesión, dueño del negocio, dueño en otro negocio, regreso al panel, privacidad sin perder datos y Conservar Cita sin cancelar. TypeScript y compilación web correctos. No se crearon ni cancelaron citas ni se modificaron credenciales.
- Evidencia: docs/screenshots/FIX_reservas_publicas.jpg y docs/screenshots/FIX_reservas_cliente.jpg.

## 2026-10-06 · Reservas mejoradas y recorrido integral

- Autorización de Sinhue: aplicar los cambios de reservas propuestos y recorrer toda la app para listar mejoras fuera de los sprints.
- Entrega: portada más breve, filtro por sucursal manteniendo equipo completo, acceso directo desde perfil sin repetir barbero, botón persistente móvil y resumen de precio/duración/prestador. Estados de carga, consulta fallida, agenda vacía y confirmación en curso; fecha inicial local y controles de selección accesibles por teclado. Retiradas amenidades sin configuración.
- Recorrido: sitio/registro/legal, reservas, resumen, agenda, POS y cobro sin enviar, clientes/perfil, equipo/comisiones/caja, inventario, reportes, mensajes, accesos, configuración, conexiones, licencia, seguridad/recuperación, ayuda/opinión y administración/auditoría. Sesiones ficticias de dueño, barbero, gerente y administrador; cajero y asistente de alta revisados en código.
- Informe: `docs/scrum/REVISION_INTEGRAL_2026-10-06.md`; 18 propuestas adicionales contrastadas con las 40 historias existentes. Cada propuesta conserva prioridad, criterio, dependencias y diferencia respecto al plan. No se agregaron historias ni cambiaron estados de sprint.
- Hallazgos existentes: ventas netas con propinas, arqueo no ciego, horarios de descanso/fecha y turno sin cita, contexto visual al cambiar de sesión, indicadores del administrador, enlace antiguo y opiniones sin persistencia. Referenciados a sus historias; no se declararon corregidos.
- Pruebas: TypeScript web sin errores; compilación web correcta, con advertencia de tamaño vinculada a ST-31; comprobación de entradas por perfil, servicio y botón principal. Capturas en `docs/screenshots/RESERVAS_movil_portada.jpg` y `RESERVAS_resumen_servicio.jpg`. La prueba móvil inicial no sustituye teléfono físico; al final el cambio de viewport no se aplicó a las pestañas ocultas y se verificó el flujo en escritorio.
- Notion: informe creado bajo SYSTECH, verificado y enlazado desde Entradas rápidas. URL: https://app.notion.com/p/3f12035ac0d081a1bc9add4c3b984303?pvs=204
- Operación: sin ventas/citas confirmadas, mensajes externos, cargos, altas, cambios de credenciales ni modificaciones de datos de trabajo. Siguiente paso del plan permanece ST-04; propuestas prioritarias para contrastar con pilotos: comandas compartidas, insumos por servicio y utilidad operativa.

## 2026-10-06 · ST-04 implementada y probada con PostgreSQL

- Solicitud de Sinhue: ejecutar ST-04 y continuar desde el punto interrumpido. Estado: Pendiente → En curso → En revisión.
- Entrega: migraciones versionadas de compatibilidad e integridad, sin reescribir las históricas ni usar db push en PostgreSQL. Conservación de suscripciones, metadatos, fechas y facturas; relaciones e índices ausentes añadidos en una transacción.
- Datos: copia anonimizada de SQLite actualizada sin pérdida de registros/importes; hash de la base de trabajo intacto. Contactos sustituidos, contraseñas inutilizadas y colas de autenticación omitidas. Copias y credenciales exclusivamente en .tools ignorado.
- Recuperación: error provocado después de crear tabla y cambiar un monto; rollback completo comprobado. Historial resuelto como revertido, SQL de ensayo corregido y aplicado. Dump restaurado en una base nueva con registros idénticos.
- Pruebas: 10 comprobaciones PostgreSQL de migración/recuperación; 8/8 suites API contra PostgreSQL y 8/8 contra SQLite después de los cambios. Precisión decimal, fechas UTC, unicidad, relaciones e índices comprobados. Cambio de perfil PostgreSQL/SQLite probado; producción rechaza URL ausente o SQLite.
- Concurrencia: reserva pública bloquea al profesional dentro de la transacción antes de consultar solapamientos. El resto de ST-07 permanece pendiente. Corregido fixture Stripe que reutilizaba identificadores para dos negocios; ningún proveedor real contactado.
- Evidencia: docs/scrum/ST04_EVIDENCIA.md, ST04_RESULTADOS.json y docs/POSTGRES_MIGRACIONES_Y_RECUPERACION.md. Workflow .github/workflows/postgres.yml preparado; snapshot ficticio de CI probado, sin push ni ejecución GitHub todavía.
- Operación local: PostgreSQL 16.15 en loopback y sin servicio Windows; instancia detenida al terminar. Cliente y esquema de desarrollo regresaron a SQLite. No se migró la base operativa ni se contrató alojamiento.
- Próximo paso: revisión de la evidencia y ST-05, venta/stock/folio bajo concurrencia. Despliegue y respaldo cifrado/RPO/RTO siguen en ST-13/ST-14.

## 2026-10-07 · ST-05 implementada y probada

- Solicitud de Sinhue: aplicar por etapas la actualización profesional y tener en cuenta skills/MCP nuevos. Actividad: Pendiente → En curso → En revisión.
- Entrega: intención persistente, recuperación de ticket tras respuesta perdida y recarga; venta/stock/Kardex/folio/comisión/cliente/cita en una transacción. Stock compartido y entrada manual concurrente protegidos; descuentos, propinas, impuesto configurado incluido y pagos mixtos exactos en centavos.
- Pruebas: 17/17 comprobaciones con dos procesos API por motor; regresión completa 9/9 suites en PostgreSQL y 9/9 en SQLite; 10/10 comprobaciones PostgreSQL de migración/recuperación con seis migraciones. API/web compilan. Advertencia de tamaño del paquete sigue en ST-31.
- Navegador: demo ficticia; se guardó una venta de $390 y se cortó su respuesta. Recarga y recuperación obtuvieron el mismo ticket: ventas 3 → 4 y stock 8 → 7; segunda recuperación conserva cuatro ventas. Corregido recorte del ticket móvil mediante montaje fuera del contenedor animado. Cobro visible a 390 × 844 y 1440 × 900; fallo simulado retirado.
- Herramientas: Context7, Playwright, Notion y React Best Practices aplicados; Find Skills/Plugin Management consultados. Sin instalaciones de servicios ni cuentas nuevas.
- Evidencia: docs/scrum/ST05_EVIDENCIA.md, resultados por motor y navegador, capturas móviles. Histórico ST-04 conservado; comprobaciones PostgreSQL futuras escriben POSTGRES_RESULTADOS_ACTUALES.json. Backlog local y Notion actualizados, sin duplicar historias.
- Límites: base de trabajo intacta por hash, migración operativa nueva pendiente; recuperación automática en la misma pestaña, sin operación sin conexión. Fiscalidad/CFDI, liquidación bancaria, dispositivos físicos, cancelaciones/devoluciones y carga mantienen sus historias. PostgreSQL de ensayo detenido; demo separada continúa disponible.
- Próximo paso: revisar evidencia y ST-06, caja, cancelaciones y devoluciones. Sin cargos, mensajes externos, push, ejecución CI remota ni despliegue. Sinhue puede revisar el flujo en la demo.

## 2026-10-07 · Revisión de integración ST-01 a ST-04

- Solicitud de Sinhue: mejorar las integraciones anteriores con skills/MCP nuevos antes de ST-06. Se conservaron las cuarenta historias; las cuatro continúan En revisión y ST-06 no comenzó.
- ST-01: requisitos de checkout por plan y entorno compartidos con conexiones; clave, firma de pagos, precio y dominio válidos antes de contactar Stripe. Motivo visible cuando falta configuración. Clave live rechazada en pruebas. Origen público único para pagos y enlaces de cuenta.
- ST-02: JWT inválido conserva 401; caída de base devuelve 503 sin invalidar sesión. Navegador confirmó token/ruta conservados y recuperación al reintentar.
- ST-03: petición exacta del correo cifrada y reutilizada; respuesta de trabajador antiguo no pisa reserva nueva, último intento interrumpido no queda enviando indefinidamente y reintento incierto fuera de retención requiere un enlace nuevo.
- ST-04: db:check de solo lectura comprueba historial y esquema; rechaza actualización pendiente y diferencias sin reparar ni alterar filas. Integrado en el arranque Docker preparado. Cliente de ensayo renovado tras migrar para no reutilizar un SELECT * preparado con columnas antiguas.
- Pruebas: 9/9 suites SQLite y 9/9 PostgreSQL; 30 casos de catálogo, 19 de cuentas y 19 de permisos por motor; 137 rutas. 13 comprobaciones de migración/recuperación PostgreSQL, tres nuevas de solo lectura. API/web compilan; tamaño de paquete conserva ST-31.
- Herramientas: Context7 (Resend/Prisma), Playwright (conexiones, licencia y fallo de carga de sesión), React Best Practices y Notion. Capturas móviles 390 × 844 sin desbordamiento; ventana de conexiones completa. Sin conectores, proveedores o cuentas nuevas.
- Evidencia: docs/scrum/ST01_04_REINTEGRACION.md y resultados JSON; evidencias originales actualizadas con nota actual sin borrar histórico. Notion y respaldo local puestos al día.
- Operación: datos de trabajo intactos por hash; demo desechable renovada, PostgreSQL de ensayo detenido. Sin correo externo, cargos, push, CI remoto o despliegue. Docker operativo, dominio/entrega real y ciclo de Stripe conservan ST-13/ST-14, ST-08 y ST-10/ST-16.
- Siguiente desarrollo: ST-06 después de revisar estas mejoras; revisión comercial/fiscal y de Sinhue pendientes.

## 2026-10-07 · ST-06 implementada y probada

- Autorización de Sinhue: continuar ST-06. Actividad: En curso → En revisión; se conservan las cuarenta historias.
- Entrega: caja transaccional, corte ciego también en servidor e impresión, movimientos en centavos, devoluciones parciales/cancelación restante y ajustes históricos de comisión. Cobro móvil del barbero conserva quién atendió y quién cobró; aviso persistente al dueño y recepción de efectivo cambian custodia sin duplicar venta o comisión.
- Recuperación: intención financiera en almacenamiento local, clave y contenido conservados; resultado incierto no inicia otra operación. Recarga y recuperación de una devolución con respuesta perdida comprobadas en navegador.
- Pruebas: 21/21 comprobaciones ST-06 por motor con dos procesos API; regresión 10/10 suites SQLite y 10/10 PostgreSQL. Trece comprobaciones de migración/recuperación PostgreSQL, siete migraciones; permisos cubren 141 rutas. API/web compilan; advertencia de paquete web en ST-31.
- Navegador: barbero móvil cobra $1,060 mixtos, dueño recibe aviso sin recargar y registra entrega de $200. Devolución parcial de $390 guardada una vez pese a respuesta perdida y recarga: stock 8 → 6 → 7, comisión $218 → $179 y efectivo del barbero $217.17. Corte ciego: fondo $1,000 más entrega $200, conteo $1,200 y diferencia $0.00. Ventas netas $670. Fallo simulado retirado.
- Evidencia: docs/scrum/ST06_EVIDENCIA.md, ST06_BROWSER_RESULTADOS.json, resultados SQLite/PostgreSQL y siete capturas. Backlog y tablero locales reflejan el cierre; Notion conserva criterios, límites y siguiente paso.
- Operación: hash de la base de trabajo intacto, migración operativa pendiente. PostgreSQL de ensayo detenido; demo ficticia renovada con versión final. Reembolsos tarjeta/SPEI registrados manualmente; no ejecutados con banco/proveedor. Hardware y CFDI no certificados; sin cargos, mensajes externos, despliegue, push o CI remoto.
- Revisión de Sinhue: comprobar flujo barbero → receptor → corte y permisos de devolución; confirmar reglas de comisión. Después acordar respaldo, conciliación y migración operativa; ST-07 sigue pendiente.

## 2026-10-07 · Revisión agrupada al cierre del Sprint 2

- Acuerdo solicitado por Sinhue: revisar todas las historias de los sprints 1 y 2 al terminar el Sprint 2, con resumen de recorridos y resultados esperados, y ajustar el producto desde esa revisión.
- No se exige aceptación individual antes de continuar el desarrollo autorizado. ST-01 a ST-06 conservan En revisión; ST-07 a ST-09 siguen pendientes. No se declara aprobación de historias ni cierre comercial.
- Guía preparatoria: docs/scrum/REVISION_CIERRE_SPRINT_02.md. Incluye planes/permisos/acceso/datos, cobro/stock, caja/devoluciones/comisiones, agenda, alta/correo y dispositivos/tickets. Se actualizará con resultados al cierre.
- Retroalimentación por recorrido: me sirve, quiero un ajuste o encontré un fallo; registrar pantalla, acción, resultado y expectativa. Fallos de integridad/permisos primero; nuevas ideas se contrastan con el backlog antes de cambiar prioridades.
- Siguiente desarrollo: ST-07. Dominio/proveedores y hardware requieren comprobaciones propias cuando corresponda; la revisión agrupada no las sustituye.

## 2026-10-07 · Objetivo de piloto pagado

- Sinhue acepta apuntar al 2026-11-05 para un primer piloto pagado con alcance comprobado: operación principal, licencia/cobro, despliegue, respaldos, soporte y pruebas con barberías.
- Se conserva el backlog de cuarenta historias. La fecha no compromete su entrega completa ni sustituye aceptación, requisitos fiscales, validación de proveedores o dispositivos pertinentes. La venta general conserva su puerta de validación.
- DEC-09 registrada; reestimar alcance y fecha al cierre del Sprint 2 con resultados, uso disponible y dependencias reales. Capacidades adicionales se priorizan según el piloto.

## 2026-10-07 · Presupuesto mínimo de piloto preparado

- Solicitud de Sinhue: recalcular desembolso, separar su trabajo y definir alcance real de planes antes de ST-07. Prefiere solo gastos esenciales y que la operación se cubra con ventas; no indicó un máximo numérico.
- Propuesta: API/base pequeñas pagadas, frontend y correo dentro de cuotas gratuitas, sin workspace Pro, Redis o worker dedicado al arranque. Tecnológico candidato $450/mes y dominio $300/año: primer mes $750. Capacidad todavía por probar en ST-13/ST-19; alternativa de mayor tamaño $1,170/mes y primer mes $1,470. Respaldo externo y restauración siguen pendientes ST-14; cola durable ST-12.
- Fuentes oficiales: Render pricing consultado también en navegador, recuperación PostgreSQL, cuotas Resend, límites Pages, dominio Porkbun y Stripe México. Conversión presupuestaria $20/USD y margen 15%; no tipo de cambio ni impuestos finales. Reserva de $100 para respaldo/monitoreo es estimación, no contrato.
- Escenario: dos Esencial a $499 más IVA, cobro completo, tarifa nacional + Billing y reserva 2%, dejan $463.33 antes de trabajo/contabilidad/ISR con tamaño pequeño; alternativa ampliada deja −$256.67. No es utilidad ni garantía de autofinanciarse.
- Alcance: precios/límites actuales conservados como propuesta; núcleo operativo debe pasar sus historias. WhatsApp automático, CFDI de barberías, IA, offline y pagos integrados de clientes no se anuncian antes de validarse. Cadena condicionada a ST-18/ST-19. Comprobantes del SaaS y revisión fiscal propia permanecen necesarios dentro del plan, por cotizar.
- Evidencia: docs/PRESUPUESTO_MINIMO_PILOTO.md, cálculo reproducible scripts/presupuesto_piloto.js y JSON. Documento histórico de costos conserva sus escenarios con aviso visible del nuevo presupuesto; Notion actualizado. Sin compras, despliegue, modificación de catálogo/Stripe ni pruebas innecesarias de la aplicación.
- Próximo desarrollo permanece ST-07 después de esta planeación. Condición del 5 de noviembre: termina la suscripción indicada por Sinhue; preparar entrega y operación sin prometer mantenimiento permanente.

## 2026-10-07 · ST-07 implementada y probada

- Agenda, reservas y bloqueos unificados bajo transacción por sucursal; horario civil, descansos, duración y separación comprobados. Cualquier profesional asignado al confirmar; reintento público durable tras recarga.
- Enlace privado con caducidad permite reprogramar/cancelar; folio sin PII ni permisos de cambio. Estados terminales, ausencia y visitas protegidos; cita cobrada una sola vez.
- 20/20 casos por motor, dos procesos API; 11/11 suites SQLite y PostgreSQL; 13 comprobaciones de migración con ocho migraciones. API/web compilan.
- Navegador: reserva $280, respuesta perdida, recarga y recuperación misma cita; enlace privado cambia horario, dueño reprograma y cobra A-000002; una venta y una visita. Otra cita cancelada desde móvil. Sin desbordamiento. Corregidos selección nula, ruta privada y bloqueos del día.
- Evidencia docs/scrum/ST07_EVIDENCIA.md, resultados por motor/navegador y capturas ficticias. Base operativa intacta; migración pendiente de respaldo/ventana; PostgreSQL temporal detenido. Sin proveedores externos, compras, despliegue o push.
- ST-07 pasa En curso → En revisión, sin Validada automática. Revisión conjunta al cierre de Sprint 2; próximo desarrollo ST-08.

## 2026-10-08 · Inventario: historias incorporadas

- Sinhue autorizó definir ST-41 Inventario operativo y conteos confiables y ST-42 Consumo de insumos por servicio y diferencias explicables, a partir de revisión con su profesor.
- Creadas en Notion y respaldo local, ambas Pendiente; sprints 4 y 7 provisionales, sin fecha comprometida. No son funciones implementadas.
- ST-30 incorpora análisis de productos basado en ST-41; diferencias de consumo requieren ST-42 y conteo válido. Margen histórico necesita costos aplicados.
- Backlog: 42 IDs únicos, dependencias existentes sin ciclos; regeneradas ACTIVIDADES y TABLERO. ST-01 a ST-09 siguen En revisión. Sin cambios de aplicación, base de datos o precios.
- Próximo paso acordado: revisión conjunta Sprint 2 y planificación antes de iniciar nuevas historias.

## 2026-10-09 · Dueño virtual: revisión delegada

- Sinhue pidió un agente que asuma sus recorridos para no probar funcionalidades manualmente. Se creó /root/dueno_virtual y contrato detallado en AGENTE_DUENO_VIRTUAL.md, respaldado en Notion dentro del equipo.
- Perfil: dueño que corta, cliente, barbero móvil y cadena; evaluación de comprensión, esfuerzo, control, recuperación y utilidad. Evidencia actual, hallazgos reproducibles y límite explícito entre simulación y aceptación humana/externa.
- Checklist conserva cobertura pero deja de ser una obligación de pruebas para Sinhue. No se marcaron tareas realizadas ni historias Validada.
- Primera asignación: plan de tres misiones, solo documentación; sin ejecutar operaciones, modificar aplicación o tocar base operativa.


## 2026-10-09 · Cierre de revisión delegado

- ST-02/ST-03/ST-04/ST-05/ST-06/ST-07 Validadas en Notion, verificadas y respaldadas localmente. ST-01/ST-08/ST-09 Bloqueadas con condición fiscal/correo/hardware concreta; sin checklist manual adicional.
- 13/13 suites y286 comprobaciones por motor incluyendo dirigidas; 13 migración/recuperación/restore PostgreSQL. API/web/build final aprobados. CSV corregido, permisos e inventario reforzados; auditoría dependencias renovada y poda Docker preparada/simulada.
- Ajustes finales de entrega/corte observados visualmente; JSON independiente y capturas15/16. Base real intacta por hash; ningún cargo, compra, correo externo o despliegue. Acta CIERRE_REVISION_ST01_09_2026-10-09.md.
- DEC-08 actualizada por delegación; próximo candidato ST-10 sandbox, con ST-01 fiscal pendiente. No marcar venta general lista.


## 2026-10-09 · Reorganización para primeros compradores

- 42 historias originales conservadas y seis desgloses nuevos ST-43 a ST-48. Sprint 3 demo/demanda; 4 operación; 5 pilotos/renovación; 6 valor/salida independiente; 7 cadenas; 8 conectores; 9 expansión.
- ST-20 y ST-32/33 dejan de exigir piloto de cadena para oferta independiente: lo reemplaza capacidad ST-45 y go/no-go acotado. ST-19 continúa obligatorio para Cadena/ST-46.
- ST-26 atiende primeros pilotos; crecimiento a diez mantiene ST-48. Pulido previo ST-43 no cierra ST-31; preparación ST-44 no cierra publicación ST-27.
- Estados: seis Validadas, tres Bloqueadas, 39 Pendientes; ningún avance funcional inventado por reordenar. Referencia REORGANIZACION_COMERCIAL_2026-10-09.md.

## 2026-10-10 · Sprint 3: demo y automatizaciones

- ST43 y ST12 Validadas en Notion y respaldo local. Notion/JSON:48 IDs únicos,8 Validadas,3 Bloqueadas,37 Pendientes; sprints/estados coinciden. Sprint3 abierto por ST44, cero conversaciones reales registradas.
- ST43: capturas01–27, moneda conciliada24/24; error de fecha fuera de rango y refresh de horarios corregidos. Recorrido monetario previo conservado, no repetido al retomar. ST31/hardware no aceptados globalmente.
- ST12:14/14 por motor; regresiones cuentas19/correo17/permisos19/integraciones25 por motor. QA visible13/13 con caída real, recovery, cancelación/reintento único y pausas persistidas. API/web compilan; índice de ejecuciones y salvedades archivados.
- Corregidas carrera PostgreSQL, conversiónUTC y pausa de licencia por cliente. Worker local observado: una conexiónPG y75–77MB RSS; costo450MXN/mes hipótesis sin certificación de hosting/capacidad.
- Upgrade coordinado únicamente sobre demo desechable:3 tablas/4 índices,38 tablas anteriores preservadas; login posterior añadió1 auditoría normal. dev.db/manifiesto intactos. Restore separado verificó copia/hash/integridad; API3101/5179 restauradas.
- Equipo completó revisión delegada sin enviar mensajes comerciales, cobrar, comprar ni desplegar. Próximo refinamiento ST10 sandbox/ST13 y conversaciones ST44, conservando condiciones fiscales/correo/hardware.
- Reporte: https://app.notion.com/p/3f62035ac0d08147a524c5c7fb8d9d5e?pvs=204; respaldo REPORTE_SPRINT3_2026-10-10.md.

## 2026-10-10 · Configuración unificada y reservas personalizables

- Petición de Sinhue: mejorar UI/UX, reservas y duplicación de ajustes. Una ruta de configuración con cinco apartados; antigua personalización redirige a apariencia. Ajustes nuevos persistidos con dueño e aislamiento preservados.
- Tres temas, dos portadas, encuadre, bienvenida, CTA y cuatro secciones visibles; perfiles individuales y contacto/redes/horarios organizados. Público con precio/duración, tarjetas grandes y flujo de cuatro pasos para una sucursal.
- QA visible: persistencia tras reload, borradores entre secciones, protección de Atrás, error conservando texto, perfil individual/éxito no obsoleto, normalización de red social y recorrido hasta datos en tamaño móvil. Cambios de prueba restaurados. No repetir venta ST43 ni crear cita final en demo.
- Personalización15/15 SQLite y15/15 PostgreSQL; autorización19/19SQLite del responsable. Líder: reservas20/20SQLite. API/web compilan; JS674.65kB/gzip182.33kB conserva tarea de rendimiento.
- Upgrade aditivo en demo con41 tablas previas preservadas durante migración, backup nuevo y SDK aislado; dev.db/manifiesto intactos. API3101 restaurada con SDK UIUX. Cero compras/despliegues/envíos externos.
- ST31 continúa pendiente de aceptación integral; se registra avance acotado sin alterar48historias/estados. Informe UX_CONFIGURACION_2026-10-10.md,20capturas de esta sesión. Pendientes físicos/accesibilidad/rendimiento y casos demorados explícitos.

## 2026-10-11 · Preferencia de corte y referencia privada de la cita

- Tipo de corte y foto opcionales en reserva pública, nueva cita y turno sin cita; visor privado de agenda. Foto JPEG ≤48 KiB preparada localmente, metadatos eliminados, dimensiones/tiempos acotados y cancelación. Precio/duración del catálogo conservados.
- Backend17/17 referencias y19/19 autorización por motor; frontend11/11, retención11/11 y recuperación del cliente8/8. Recuperación por UUID evita repetir reservas; interno mantiene snapshot durante la sesión. Límites de caducidad diferida/cierre de pestaña documentados.
- Recorrido real de navegador: PNG sintético → JPEG23461bytes → cita ficticia RES-A3171A3919D3846E → agenda → foto igual → recarga; visor390px/Escape. SVG rechazado conservando imagen; quitar foto comprobado. Sin cargos/envíos externos ni nuevas operaciones monetarias.
- Upgrade aditivo con backup en demo:41 tablas previas/filas/columnas preservadas durante migración; dev.db/manifiesto intactos. ST29/ST31 mantienen Pendiente;48historias sin cambios de estado. Informe REFERENCIA_CORTE_2026-10-11.md.
