# ST-12 · Verificación visible de automatizaciones

Fecha local: **10/oct/2026, America/Mexico_City**. Responsable: QA/dueño virtual. Estado: **QA visible concluida; alcance técnico aceptado por el coordinador**. El coordinador controla el estado final de la historia.

## Alcance fijado y entorno observado

Persona principal: dueño que necesita saber por qué una revisión o recordatorio no avanza, y recuperar una tarea sin duplicar mensajes. Segunda empresa y gerente con permisos menores. Se fijaron antes del recorrido expectativas de estados honestos, confirmación/cancelación, pausa persistida, separación de negocios, error distinto de vacío y navegación de teclado. Se aplicó la skill product-design:audit con capturas inspeccionadas y lectura independiente; no se sustituyó la aplicación por un mock.

Se navegó en **Vite 5182 → API 3112 → .test-db-o9M3su/test.db**, con SDK aislado .tools/prisma-sqlite/client. Login mediante los controles visibles y cuentas ficticias @qa.invalid. El manifiesto .tools/st12-preview.json identifica dos negocios y el helper scripts/test_durable_jobs_preview.js restringe base/puerto/modo de pruebas; sus claves de proveedores están vacías y el scheduler deshabilitado. La prueba no creó ventas, reservas, entregas de efectivo ni contactos externos.

Las seis filas iniciales **FAILED, UNCERTAIN, EXPIRED, NOT_CONFIGURED, QUEUED y ACCEPTED fueron preparadas sintéticamente por backend**. Permiten probar mensajes y controles en una API y BD reales; no son fallos ni aceptaciones de un proveedor comercial. EXPIRED usa deliberadamente fecha 1970; la UI presenta la fecha local 1969 sin hacerla pasar por un vencimiento productivo.

## Recorrido y resultados observados

| Caso | Acción y resultado factual | Evidencia |
| --- | --- | --- |
| Dueño A, escritorio 1440 | Conexiones muestra los seis estados iniciales, contador de correos 0 y actividad reciente del worker separado. FAILED muestra 4/4 intentos y revisión del reintento; UNCERTAIN y EXPIRED no ofrecen reenvío. | 01-estado-escritorio.png, ledger-initial.json |
| Licencia de plataforma | La fila LICENSE dice «Administrada por SYSTECH»; no tiene Pausar/Reanudar. MAIL/WHATSAPP conservan controles distintos. | 01, panel-mobile-final-dom.json (LICENSE 0 botones) |
| Cancelar reintento, móvil 390 | Se abre confirmación; explica que programar no confirma envío ni cobro. Cancelar no cambia las seis tareas ni ninguna auditoría JOB. | 02-confirmacion-reintento-movil.png, ledger-canceled.json |
| Confirmar una vez | FAILED conserva ID dae7f87d-d120-4a01-8906-37f89fca24f8, pasa a QUEUED con 0 intentos bajo MAIL en pausa. Se registra una sola JOB_RETRY, ID d8961241-56ef-4391-84bf-067341827019. No aparece una séptima tarea. | 03-reintento-registrado-movil.png, ledger-retried.json |
| Reanudar MAIL | Confirmación visible y registro persistido paused=false, una JOB_PROVIDER_RESUMED. El proceso real revisa las dos tareas MAIL_OUTBOX: SUCCEEDED, intento 1, OUTBOX_SCANNED. La UI dice «Revisión terminada; no confirma entrega». | 04-reanudar-confirmacion.png, 05-reanudacion-registrada.png, ledger-resumed.json |
| Volver a pausar | Confirmación registra paused=true y una JOB_PROVIDER_PAUSED adicional. Recargar Conexiones conserva la pausa; WHATSAPP sigue pausado y LICENSE sin pausa. | 06-pausa-persistida-movil.png, ledger-paused.json |
| Empresa B | Logout de la cuenta ficticia A y login normal del dueño B. Su panel no muestra tareas ni servicios registrados; no hereda las seis tareas o pausas de A. El heartbeat común sólo indica vida de plataforma. | 07-otro-negocio-vacio.png, ledger-tenant-b.json |
| Gerente A | Login visible normal. No aparece Conexiones en su menú; abrir la URL de integraciones redirige a /app/inicio. No se afirma que ese redirect por sí mismo pruebe HTTP403. | 08-gerente-redirigido.png |
| Teclado y móvil | Shift+Tab permanece en Cancelar del diálogo; Escape cierra una segunda revisión sin confirmar y devuelve foco al botón que la abrió. A 390 px la página mide 390 px; los cuatro botones visibles del panel miden 44 px de alto. | dialog-metrics.json, focus-restored.json, panel-mobile-final-dom.json |
| Worker detenido, API viva | Coordinador detiene sólo el hijo de preview a 03:58:35Z; último pulso persistido 03:58:21.761Z. Tras actualizar a 04:00:57Z, UI dice «Sin actividad reciente del procesador» y explica conservación de pendientes. Las seis tareas y pausas siguen en BD. | 09-sin-actividad-real.png, ledger-worker-stopped.json, worker-stopped-network.txt |
| API caída | Coordinador detiene sólo API 3112. Actualizar tareas consulta realmente y falla por conexión rechazada: «Estado sin consultar», aviso de conexión y botón Reintentar consulta. No presenta cero tareas ni datos anteriores como si fueran vigentes. | 10-api-caida-error-real.png, api-unavailable-network.txt |
| Recuperación | API y worker reiniciados en la misma base, sin preparar datos otra vez. Reintentar consulta a 04:03:09Z devuelve GET jobs/estado 200, desaparece el error, reaparecen las mismas seis tareas y pausas, y el nuevo pulso real indica actividad. | 11-recuperacion-confirmada.png, 12-panel-final-escritorio.png, recovery-network.txt, ledger-final.json |

Se inspeccionó cada captura aceptada. Capturas iniciales con cabecera fija fuera de lugar y una captura aún cargando se descartaron y sobrescribieron antes de aceptarlas; las imágenes enumeradas aquí corresponden a estados legibles. Los mensajes de aceptación y heartbeat no equivalen a entrega ni pago. La fila ACCEPTED permanece **sintética**, mientras los dos OUTBOX_SCANNED sí provienen del worker real revisando una bandeja sin acciones de cuenta.

## Conciliación de datos y preservación

Lecturas directas y acotadas por .tools/st12-qa-read.cjs se guardan por etapa. Antes de cambiar de cuentas (03:53:41Z), **dev.db, manifiesto DV y archivo completo de la demo original conservaban sus hashes**. Cambiar cuentas añadió auditorías normales de login/logout en el fixture de prueba, distintas de las auditorías JOB usadas para conciliar acciones.

Durante el recorrido el coordinador hizo un upgrade aditivo separado de la demo original .test-db-TrhWfE/test.db, con API 3101 detenida y backup verificado. **Desde ese upgrade su hash de archivo cambia**: las lecturas tenant-b y worker-stopped lo detectan y el guard devuelve exit1; no se oculta ni se presenta como hash inmutable. demo-compatibility.json documenta las tres tablas nuevas, comparación de las 38 tablas previas y preservación de todas las filas originales. Un login normal posterior sólo añadió 1 INICIO_SESION. dev.db y el manifiesto conservan su hash. Esto es actualización de esquema, no una venta nueva ni modificación del dinero de ST43.

El cierre se concilió a **04:03:26Z mediante reconciliation.json: 13/13 comprobaciones de las lecturas guardadas**. IDs estables, cancelación sin efecto, un solo reintento, pausa/reanudación persistidas, estados incierto/vencido inalterados, cero ventas y cero acciones de correo a entregar. La lectura final de 04:03:11Z confirma la conservación tras reiniciar API/worker. No se infiere entrega real de una tarea SUCCEEDED. Esta conciliación tiene alcance propio y no se suma como casos nuevos a las suites de backend.

## Evidencia separada de backend y límites

[Implementación ST12](</C:/Users/Sinhue/Desktop/POS Barberia/docs/scrum/ST12_IMPLEMENTACION_2026-10-09.md>) y docs/ST12_INDICE_EVIDENCIAS_2026-10-10.json identifican las ejecuciones independientes SQLite 14/14 y PostgreSQL 14/14. Allí se prueban concurrencia, concesión vencida, respuesta perdida con proveedor controlado, reinicio y restricciones de API. El código ejecutado niega 403 a GERENTE/CAJERO/BARBERO en listar/estado/reintento/pausar; **BARBERO no tuvo login visible en este fixture**, y se conserva esa distinción. La prueba de UI no reemplaza esas suites ni certifica una versión committed del repositorio.

No se verificaron entrega comercial de correo/WhatsApp, DNS, identidad por negocio, banca, SLA, capacidad del alojamiento, costo mensual ni impresora física (ST-09). ST-31 mantiene la evaluación global móvil/accesibilidad, incluida auditoría WCAG completa. Esas dependencias permanecen abiertas. Los estados sintéticos no prueban aprobación de clientes. No se modificó frontend, backend, Notion ni el estado de la historia desde QA.

## Capturas clave

![Confirmación móvil del reintento](</C:/Users/Sinhue/Desktop/POS Barberia/docs/scrum/evidencia/st12-20261010/02-confirmacion-reintento-movil.png>)

![Otra empresa sin tareas ni pausas ajenas](</C:/Users/Sinhue/Desktop/POS Barberia/docs/scrum/evidencia/st12-20261010/07-otro-negocio-vacio.png>)

![Consulta fallida real y recuperación ofrecida](</C:/Users/Sinhue/Desktop/POS Barberia/docs/scrum/evidencia/st12-20261010/10-api-caida-error-real.png>)


