# Tipo de corte y foto de referencia — 11 de octubre de 2026

Solicitud de Sinhue: añadir tipo de corte y foto de referencia. Entrega acotada sobre reservas y agenda, anticipando parte de ST-29 y ST-31; no acepta ambas historias completas.

## Comportamiento entregado

- Reserva pública, nueva cita interna y turno sin cita permiten una preferencia opcional de hasta 80 caracteres. Ideas rápidas: Fade, Taper, Clásico, Crop, Undercut o definirlo con el barbero; también admite texto propio.
- Foto opcional JPG/PNG/WebP de hasta 8 MB de origen. El navegador verifica formato y dimensiones antes de abrirla, respeta orientación, reduce a JPEG de hasta 48 KiB y elimina metadatos. La preparación tiene tiempos máximos y acciones para cancelar o continuar sin foto. Una sustitución inválida conserva la foto anterior.
- La cita y su foto se guardan en una misma transacción. La foto vive en una relación privada separada: la agenda recibe sólo preferencia y un indicador. Abrir «Ver referencia y foto» consulta la imagen bajo sesión, negocio, sucursal y asignación del barbero. Los folios, enlaces públicos y comprobantes no muestran la foto.
- La referencia sirve para conversar el resultado con el cliente. No cambia el precio ni la duración del servicio ni garantiza un acabado. El aviso de privacidad describe este uso opcional; no se reutiliza para publicidad.
- La confirmación pública indica la preferencia y la presencia de una foto adjunta sin exponer la imagen.

## Recuperación y límites

La reserva pública conserva una clave aleatoria de recuperación; los datos y la foto pendientes quedan en `sessionStorage`, no en almacenamiento permanente del navegador. Tras 24 horas, al leer el intento se elimina ese payload pero se conserva el marcador de recuperación. Si se perdió la sesión o venció la foto, se consulta el resultado por la misma clave; no se crea otra reserva silenciosamente. La limpieza es diferida al acceso, no un borrado garantizado por temporizador.

La creación interna y el turno sin cita conservan un snapshot y UUID exactos durante la sesión de la pestaña, también tras recarga. Mientras el resultado sea incierto, bloquean cambios y ofrecen recuperar la misma solicitud. Cerrar definitivamente la pestaña no acredita esa recuperación: revisar la agenda antes de repetir. Los POST de creación y recuperación tienen límite de 20 segundos; abortar la espera no prueba que el servidor haya cancelado la operación.

## Evidencia de pruebas

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Referencias, transacción, JPEG, precio/duración, replay, aislamiento y consulta pública | 17/17 SQLite y 17/17 PostgreSQL | `docs/scrum/evidencia/cut-reference-20261011/{sqlite,postgresql}-regression.json` |
| Autorización y rutas | 19/19 por motor; 153 rutas inventariadas | Ejecución del responsable backend con SDK aislado |
| Preparador frontend: dimensiones, metadatos, formatos, aborto y bitmap tardío | 11/11 | `scripts/check_cut_reference_frontend.cjs`; `docs/scrum/evidencia/ux-20261011/referencia-frontend-helpers.json` |
| Retención: replay exacto, marcador tras caducidad/cierre, migración de intentos y almacenamiento fallido | 11/11 | `scripts/test_public_booking_intent.js` |
| Cliente real de API con respuestas simuladas: pérdida, 429 al replay, recuperación, caducidad, sesión perdida y timeout | 8/8 | `scripts/test_booking_client_recovery.js`; sin red ni proveedores |

Recorrido observado mediante el navegador de la app:

1. Elegir Corte DV $200, Alex DV y 14/octubre a las 10:00 en el negocio ficticio `dv-r01`.
2. Escribir «Fade bajo, conservar el largo de arriba» y cargar un PNG sintético de 900 × 1000. Chrome agregó un perfil ICC: la primera prueba detectó su rechazo antes de crear la cita. El preparador se corrigió retirando APP2; JPEG final 23,461 bytes aceptado sin relajar la validación del servidor.
3. Confirmar una única cita ficticia, folio `RES-A3171A3919D3846E`. Consultar la agenda y abrir su referencia: foto idéntica byte por byte a la preparada, $200 y 30 minutos conservados. Recargar y consultar de nuevo: referencia persistente.
4. Visor probado a 390 × 844, sin desbordamiento horizontal, imagen cargada y Escape devuelve foco al botón de la cita. Emulación, no certificación de teléfono físico.
5. Nueva cita interna: seleccionar Taper, cargar PNG, intentar SVG y observar rechazo conservando la foto anterior; quitar foto y cancelar sin crear otra cita. Turno sin cita muestra los mismos campos; no se creó un turno adicional en la demo.

Capturas: `docs/screenshots/cut-reference-20261011/01-reserva-con-referencia.jpg` a `07-turno-sin-cita.jpg`. La ilustración es un fixture sintético de prueba, no una foto de cliente real. Los ensayos simulados de red se distinguen del recorrido visual, que usó una conexión normal.

## Entorno y alcance pendiente

Upgrade aditivo únicamente en la base ficticia de demostración, con respaldo verificado: añade `Cita.tipoCorte` y `CitaReferencia`; 41 tablas previas, columnas y filas originales preservadas durante la migración. Base operativa `dev.db` y manifiesto intactos. Evidencia coordinada en `.tools/cut-reference-demo-upgrade-result.json`. No se repitió el ledger monetario de ST-43 ni se hicieron compras, cargos, despliegues o envíos externos.

ST-29 sigue pendiente: faltan ficha histórica de preferencias, reagendar al cobrar, controles de retención/eliminación posterior de imágenes, revisión legal y experimento de recurrencia. La referencia de esta entrega pertenece a una cita y no constituye una galería permanente del cliente. ST-31 conserva accesibilidad integral, dispositivo físico, rendimiento y feedback de piloto. El aviso legal previo mantiene una revisión comercial/legal separada; añadir una finalidad técnica no certifica su cumplimiento.

API compilada por el responsable y web final compilada por el líder con TypeScript/Vite aprobados. Bundle final JS 695.02 kB (gzip 189.13 kB), CSS 81.89 kB (gzip 15.47 kB); sigue la advertencia de tamaño de bundle y la tarea de dividir/medir en ST-31.

Revisión independiente favorable: corregidos reintento interno, intención pública y tiempos máximos; sin defectos bloqueantes nuevos detectados dentro del alcance. Pruebas y emulación local no equivalen a aceptación de producción.
