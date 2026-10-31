# ST-09 · Mostrador y tickets

Fecha: 2026-10-08. **En revisión local; aceptación física pendiente.** Sinhue confirmó que todavía no tiene impresora. No se certifica hardware ni se requiere comprarlo para revisar el software.

## Cambios

- El POS avisa al perder conexión y deshabilita nuevos cobros. Una operación con respuesta perdida se recupera con su identificador original, incluso después de recargar.
- Impresión 58/80 mm y reimpresión desde historial: ventana abierta desde el clic, errores visibles por bloqueo, respuesta HTTP o pérdida de conexión. Un fallo de impresión no repite la venta.
- Cierre de caja: aviso en pantalla cuando queda por confirmar y recuperación del resultado. El comprobante se solicita desde el historial sin abandonar caja ni poner credenciales en su URL.
- Ticket: texto largo acotado, cobrador y prestador separados, efectivo recibido y cambio guardados, fecha de la sucursal; comprobante de venta identificado como no CFDI. Se retiró la decoración que aparentaba un código de barras escaneable.
- Controles principales del panel con objetivos táctiles mínimos bajo puntero grueso. Los modales requieren además revisión práctica: no se declara que todos sus controles estén certificados.

## Evidencia automatizada

API y web compilan. Compilación web de producción comprobada; conserva el aviso de tamaño del paquete principal, pendiente de optimización posterior.

- 7 comprobaciones nuevas de tickets por motor: ancho, texto escapado, prestador/cobrador, efectivo/cambio, acceso privado, zona horaria y conservación de base operativa.
- Regresión completa: **13/13 suites en SQLite y 13/13 en PostgreSQL**.
- PostgreSQL: **13 comprobaciones de migración**, con nueve migraciones; ejecutadas en esquemas desechables, sin migrar la base operativa.
- Resultados: `docs/ST09_RESULTADOS_SQLITE.json`, `docs/ST09_RESULTADOS_POSTGRES.json` y `docs/scrum/ST09_BROWSER_RESULTADOS.json`.

## Recorrido de navegador

Base SQLite desechable; cuentas y operaciones ficticias. Navegador emulado a 390×844, 768×1024 y 1440×900. Se comprobaron los tamaños de reserva, POS y modal de corte; los flujos multiusuario usaron sesiones independientes móviles/escritorio. Esto no equivale a probar tres dispositivos físicos ni cada variante de pago en cada tamaño.

1. Venta en efectivo de $280: respuesta interrumpida después de guardarse y doble clic. Recarga y recuperación: un folio, $500 recibidos y $220 de cambio.
2. Dos barberos con cuentas propias registraron una venta de $280 cada uno. El dueño recibió avisos sin recargar. Recepción de dos entregas de $280; cada transferencia genera dos asientos opuestos, no dos entregas.
3. Reserva pública con doble clic: una cita. Cobro vinculado de $280 registrado como tarjeta: una visita, cita completada y una venta. El registro manual de tarjeta no procesa un cargo bancario.
4. Segundo negocio: su propio barbero registró $190 y su dueño recibió el aviso y el efectivo. Autorización entre negocios cubierta además por la regresión API.
5. Dos cortes del primer negocio cuadrados: fondo $1,000 + efectivo $840 = conteo $1,840; segundo corte fondo $0, tarjeta $280, efectivo $0. Respuesta de cierre perdida recuperada sin otro cierre.
6. Desconexión en navegador: aviso y bloqueo de nuevo cobro. Popup bloqueado, HTTP 503 y conexión interrumpida al consultar ticket: errores visibles; venta permanece guardada.
7. Reimpresión desde historial en 58/80 mm sin crear venta; comprobante de corte en ventana aparte sin abandonar caja.

Capturas en `docs/screenshots/ST09_*.png`. Los tickets 58/80 se inspeccionaron visualmente. `ST09_ticket_largo.png` usa texto largo inyectado únicamente en el DOM para comprobar geometría; el escape de texto almacenado se comprobó con la suite API. Las capturas no son pruebas de impresión física.

## Pendientes

- Un modelo físico de 58 mm y uno de 80 mm; dispositivos reales, sistema y controlador. Matriz y contingencia: `docs/IMPRESION_COMPATIBILIDAD_Y_CONTINGENCIA.md`.
- Revisión conjunta de Sinhue: `docs/scrum/REVISION_CIERRE_SPRINT_02.md`.
- ST-08 mantiene dominio/remitente y entrega real pendientes. ST-09 no certifica venta offline, Bluetooth/ESC-POS, gaveta, CFDI ni cargos reales.

No se hicieron compras, mensajes externos, despliegues ni migraciones sobre la base operativa. El resultado local no autoriza declarar el producto listo para venta general.
