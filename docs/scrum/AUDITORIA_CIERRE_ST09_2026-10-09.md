# Auditoría de cierre ST-09 — 9 de octubre de 2026

**Decisión: ST-09 no es cerrable como Validada.** Hay evidencia funcional local, móvil emulado y recuperación de operaciones; faltan las pruebas físicas exigidas expresamente y revisión visual de dos ajustes finales. No se modifica el estado del backlog ni se elimina ningún criterio para obtener el cierre.

## Compilación final

Ejecución desde `apps/web` con Node incluido en Codex: TypeScript (`tsc --noEmit`) aprobó; Vite en sandbox falló con `EPERM` al resolver `src/main.tsx`. El reintento mediante `require_escalated` fue autorizado por la herramienta y **aprobó con código 0**: Vite 6.4.3, 1,298 módulos, empaquetado en 29.08 s. No se eludió el control de permisos.

Se conserva el aviso de paquete principal superior a 500 kB: JS 603.20 kB (gzip 156.85 kB), CSS 51.96 kB (gzip 9.55 kB). No impide la compilación; la optimización queda fuera de esta auditoría. El reporte anterior DV dejaba Vite pendiente; este resultado final actualiza únicamente ese límite técnico, sin convertir simulación en aceptación física.

## Criterios exactos y evidencia

Fuente: `ACTIVIDADES.md`, sección ST-09, líneas 218–235. Dependencias: ST-06 y ST-07.

| Criterio de aceptación existente | Evidencia disponible | Estado de aceptación |
| --- | --- | --- |
| Recorrido reserva/venta/corte probado en móvil, tablet y computadora con errores recuperables y sin doble cobro al repetir clic | `ST09_EVIDENCIA.md` y `ST09_BROWSER_RESULTADOS.json`: emulación 390×844, 768×1024 y 1440×900; respuesta perdida, doble clic y recuperación. `DV_CIERRE_2026-10-09.md`: reserva/cobro/corte actuales, teclado y móvil emulado, una venta ficticia y un corte. | Parcial: emulación documentada, no tres dispositivos físicos ni todas las variantes de pago por tamaño. |
| Ticket legible probado en al menos un modelo físico 58 mm y uno 80 mm; publicar matriz compatible | HTML/tickets inspeccionados y siete comprobaciones técnicas por motor en evidencia previa; siete de SQLite actualizadas en QA. Matriz publicada en `../IMPRESION_COMPATIBILIDAD_Y_CONTINGENCIA.md`. | Incumplido para aceptación física: ambos modelos, conexión, sistema y controlador figuran pendientes; ningún modelo certificado. |
| Caída de red informa venta sin confirmar; datos móviles como contingencia documentada; no anunciar venta offline ni apertura de gaveta sin prueba | Recorrido ST09 previo: desconexión, bloqueo de nuevo cobro, recuperación con intención original, popup bloqueado y errores de impresión. Contingencia documentada. El recorrido DV actual no inyectó fallo de red. | Evidencia local y documentación disponibles; hotspot/datos móviles no comprobados en equipo real. No hay venta offline ni gaveta certificadas. |
| Probar barbero cobrando desde celular y dueño supervisando desde laptop/PC: aviso sin recargar, venta única, identificación de prestador/cobrador y conciliación de entrega de efectivo; repetir con dos barberos y cuentas de negocios distintos | ST09 previo: dos barberos, dos negocios y entregas. DV actual: barbero móvil emulado, aviso al dueño abierto, venta $200, recibido $500, cambio $300, entrega $150, pendiente $50 y cierre con faltante $10; persistencia comprobada separadamente. | Parcial: sesiones independientes y emulación; no certifica celular/laptop físicos. La corrida actual tiene una venta, no reemplaza el escenario previo de dos barberos/dos negocios. |

La evidencia requerida existente menciona siete comprobaciones de tickets por motor y 13/13 suites en SQLite y PostgreSQL. Esta auditoría lee los registros; no repite suites API ni declara resultados PostgreSQL nuevos. `QA_CIERRE_2026-10-09.md` distingue el resultado PostgreSQL histórico del resultado SQLite actualizado.

## Definition of Done aplicable

`../PLAN_AGIL_LANZAMIENTO.md:64`: criterios cumplidos; autorización en servidor; aislamiento tenant/sucursal; comportamiento correcto al repetir o fallar; pruebas pertinentes; **revisión visual si cambió interfaz**; evidencia archivada sin secretos; migración/rollback si aplica; documentación y oferta coherentes. Añade expresamente: **Una historia fiscal o de hardware requiere prueba externa para declararse validada.**

La compilación no sustituye estos criterios. ST-09 sigue En revisión: su prueba de impresoras físicas es una condición expresa, no una recomendación añadida por esta auditoría.

## Ajustes frontend actuales y límites visuales

- `CashCustody.tsx`: el importe escrito se elimina del estado solo después de `receiveCash` confirmado; la lectura posterior usa saldo actualizado. Revisión estática respalda que no se borran importes antes de confirmar. No hubo segunda entrega financiera en la corrida DV para observar el aspecto final.
- `BarberosView.tsx`: cierre descuadrado configura `cashNoticeWarning` desde `res.resumen.descuadrado`; la clase del aviso usa ámbar cuando ese indicador es verdadero y conserva texto de diferencia. No se generó otro corte después del ajuste para capturarlo.
- Las capturas DV 10/11 preceden estos ajustes; no deben presentarse como evidencia visual de su estado final. Queda pendiente observación del coordinador en su navegador exclusivo. Esta auditoría no usa navegador ni modifica componentes.
- El ciclo Tab/Shift+Tab del cobro actual fue observado por el coordinador después de su corrección. Lectores de pantalla y Escape durante envío no fueron observados directamente en esa corrida; revisión estática no equivale a esas pruebas.

## Capacidad demostrada y pendiente

Móvil: recorrido operativo en viewport emulado; no certificación de dispositivos reales, impresión desde celular ni tiempo humano de cobro de 30 segundos.

Red: informa y bloquea nuevos cobros sin conexión; conserva la intención para recuperar el resultado. No existe venta offline certificada ni cola de cobros desconectados. Hotspot es contingencia documentada que aún debe comprobarse en dispositivo real.

Impresión: salida HTML 58/80 mm y reimpresión del mismo folio con errores visibles; una falla de impresión no requiere otra venta. Pendientes papel real, legibilidad/cortes, modelos 58/80, controlador/conexión/sistema, reimpresión física y comprobante de caja. No se certifican Bluetooth, ESC/POS, corte automático, apertura de gaveta ni CFDI.

No se pide comprar equipo para cerrar la revisión de software. La aceptación integral queda pendiente hasta disponer de la evidencia externa requerida y la revisión visual final. No se hicieron compras, DB, Prisma, Notion, cambios de aplicación ni nuevas suites API en esta auditoría.
