# ST-43 · Calidad y dueño virtual

Fecha de baseline: 2026-10-09. Cierre de QA: 2026-10-10 (México). Estado: **claro en simulación en los cuatro flujos entregados; conciliación financiera 24/24 y revisión posterior realizadas**. Responsable: calidad/dueño virtual. El coordinador decide aceptación y backlog; no se certifican equipos físicos.

## Meta y libro independiente de importes

Persona: dueño que también corta, con una computadora y un barbero desde celular emulado. Meta: entender la siguiente acción, reservar un corte, cobrar una sola vez, recibir el efectivo, reconocer la comisión y cerrar una caja conciliada.

Caso alineado al guion ST-44 por instrucción del coordinador antes de crear operaciones: negocio ficticio nuevo y separado; un servicio de $200, comisión del 40%, sin descuento, impuesto configurado 0% ni propina. Caja con fondo $500. Una reserva y una venta vinculada. Barbero recibe $300 y entrega $100 de cambio: custodia pendiente $200. Entrega de $200 a caja: custodia $0, fondo más entrega $700. Comisión pendiente $80, sin liquidarla. Conteo $700: diferencia $0. Entregar efectivo no crea otra venta ni otra comisión. Estos importes esperados se fijan antes de ejecutar y no se deducen de la pantalla.

La reserva/cobro/entrega/corte se operaron desde controles visibles en la secuencia anterior a la pausa, conservada en capturas 06–16 y conciliaciones por etapa. En esta continuación no se repiten operaciones monetarias ni reservas: únicamente se concilian lecturas y se revisan correcciones de presentación. La preparación de catálogo/cuentas y la conciliación usan helpers acotados a la base desechable `.test-db-` indicada por `.tools/dv-preview.json`. Se conserva el negocio DV original y su manifiesto.

## Baseline actual, solo lectura de operación

API observada: `127.0.0.1:3101`, respuestas HTTP 200 de login, catálogo, resumen, comisiones, caja/custodia y reserva pública. Web: `127.0.0.1:5179`. Error incidental: favicon.ico 404; no bloqueó estas pantallas. Cuenta ficticia DV autorizada; no se crearon ventas, reservas, entregas ni cortes en ese negocio.

Capturas nuevas guardadas e inspeccionadas en esta ejecución:

1. `evidencia/st43-20261009/01-antes-inicio-escritorio.png`: 1440×900, `/app/inicio`. Ventas reales del fixture $200, una venta, equipo 3, cajas abiertas 0. Bloque motivacional ocupa la franja prioritaria; abrir caja exige buscar otra vista.
2. `evidencia/st43-20261009/02-antes-pos-movil.png`: 390×844 emulado, `/app/pos`. Catálogo y profesional claros; el resumen vacío tiene altura extensa y desplaza Cobrar bajo el primer viewport. Promesa visible «menos de 30 segundos» no está medida por esta auditoría.
3. `evidencia/st43-20261009/03-antes-reserva-movil.png`: 390×844 emulado, `/b/dv-r01`. Precio/duración y CTA visibles. Portada de stock y biografías iguales aparentan información del negocio que no proviene de la configuración ficticia; barra fija ocupa parte del primer perfil. No se reservó en este negocio.
4. `evidencia/st43-20261009/04-antes-equipo-caja-escritorio.png`: equipo/caja/comisiones, tres perfiles, comisión pendiente $80 de Alex DV. Pestañas operativas ubicadas junto al título.
5. `evidencia/st43-20261009/05-antes-caja-custodia.png`: custodia pendiente $30 del barbero DV, caja cerrada y dos cortes históricos. Explica que la entrega cambia quién conserva efectivo. No se recibió ni abrió turno.

Baseline principal liberada al frontend después de inspeccionar 01–03; equipo/custodia liberados después de 04–05. No se usaron capturas antiguas como evidencia de ST-43.

## Secuencia posterior a la implementación, anterior a la pausa

Estas capturas son evidencia conservada de la secuencia ejecutada el 9 de octubre, aportada por coordinación al retomar. Fueron inspeccionadas al cerrar el reporte; no se presentan como operaciones nuevas del 10 de octubre.

| Paso | Evidencia | Resultado observado / salud |
| --- | --- | --- |
| 1. Abrir caja con fondo independiente $500 | 06-despues-abrir-caja.png; ledger-opened.json | Turno abierto, fondo $500. Claro en simulación. |
| 2. Datos y consentimiento de reserva | 07-despues-reserva-error.png; ledger-reserved.json | Error de consentimiento visible; cero citas antes de confirmar. Recuperable. |
| 3. Confirmar una reserva | 08-despues-reserva-confirmada.png; ledger-reserved-success.json | Folio, servicio $200, profesional y sucursal. Una reserva. El encabezado fijo tapa una franja superior de la confirmación en esta captura; pendiente de revisión actual. |
| 4. Cobrar reserva con cuenta del barbero | 09-despues-pos-movil.png; 10-despues-cobro-movil.png; ledger-sold.json | Cliente/cita/profesional vinculados; total $200, recibido $300, cambio $100; una venta. Claro en simulación. |
| 5. Dueño recibe entrega de $200 | 11-despues-aviso-entrega.png; ledger-handed-off.json | Aviso interno de una venta. Entrega cambia custodia mediante dos movimientos, sin otra venta. Claro en simulación. |
| 6. Consultar comisión | 12-despues-comision-escritorio.png | $80 pendiente, $0 liquidado, profesional identificable. Claro en simulación. |
| 7. Conteo ciego y cierre | 13-despues-corte-ciego-movil.png; 14-despues-corte-confirmar-movil.png; ledger-closed.json | Conteo independiente: un billete $500 y uno $200. Antes de cerrar no se enseña esperado $700; contorno de foco visible en nota/botón. Claro en simulación. |
| 8. Caja cerrada y comisión del barbero | 15-despues-caja-cerrada-escritorio.png; 16-despues-barbero-comision-movil.png | Caja CERRADA, conteo $700, diferencia $0; custodia $0 y comisión pendiente $80. Tabla móvil usa desplazamiento horizontal interno; falta comprobar reflujo de página actual. |

## Conciliación de lecturas del 10 de octubre

`node .tools/st43-reconcile.cjs final`: **24/24 comprobaciones pasan**, sin crear operaciones. `ledger-final.json` guarda fecha UTC exacta de esta lectura, expectativas independientes y entidades persistidas.

- Una cita COMPLETADA vinculada a una venta COMPLETADA de $200, cobrada por la cuenta propia del barbero; cliente compartido y una visita de $200.
- Una comisión de 40% = $80 pendiente, sin liquidar. Recibido $300, cambio $100 y efectivo neto $200 persistidos.
- Ledger: VENTA +$200 bajo custodia del barbero, ENTREGA −$200 del barbero y ENTREGA +$200 a caja. Custodia neta $0; tres movimientos, sin duplicar venta.
- Un turno CERRADO: fondo $500, contado $700, esperado persistido $700 y diferencia $0; fecha y huella de cierre presentes.
- Servicio conserva stock 0; cero movimientos Kardex. Aviso interno único de venta. Todas las operaciones pertenecen a la sucursal QA.
- `node .tools/st43-fixture.cjs verify-original`: negocio DV original, manifiesto y archivo operativo `dev.db` **sin cambios** según las tres huellas guardadas antes del fixture.

## Revisión actual del 10 de octubre, sin nuevas operaciones financieras

Al iniciar, `5179` rechazaba la conexión y los primeros procesos restaurados no tenían acceso local; el coordinador los restauró con acceso aprobado. Después se navegó mediante Playwright por controles visibles y login normal de cuenta ficticia. No se modifica DOM, se inyectan tokens ni se simulan respuestas. No se repitió reserva, venta, entrega ni cierre.

| Paso | Captura actual y comprobación | Resultado / salud |
| --- | --- | --- |
| 9. Reserva pública sin sesión, 390×844 | 17-reserva-movil-actual.png | CTA visible, precio $200.00, duración 30 minutos, sucursal y perfil del fixture. Sin portada stock, Master Barber ni bio inventada; sin botón del panel. Perfil sin foto usa inicial, no una persona inventada. Claro en simulación. |
| 10. Horario → datos → cambiar horario | 18-horario-refrescado-movil.png; slots-refresh.txt | Solicitud GET adicional real al volver de paso 5 a 4, HTTP200. Foco en título del paso. No se confirmó reserva. Claro en simulación. |
| 11. Fecha fuera del horizonte permitido | 19-error-fecha-real.png, fecha-error-response.txt; corrección 25-error-fecha-corregido.png | Defecto medio observado: respuesta BOOKING_HORIZON mostraba Reintentar genérico. Coordinación corrigió; reintento de QA muestra «Cambia la fecha… próximos 90 días», sin botón Reintentar. Resuelto. |
| 12. Recuperación con fecha válida | 26-horario-recuperado.png; fecha-recuperada-network.txt | Tras introducir 2026-10-11, estado Consultando horarios y respuesta real200, horarios disponibles sin error. La primera captura transitoria fue descartada y reemplazada por estado estable inspeccionado. Claro en simulación. |
| 13. Resumen dueño 1440×900 | 20-inicio-escritorio-actual.png | Ventas hoy $0 y ayer $200 concuerdan con operación del día anterior; caja cerrada y acciones concretas de caja/agenda/equipo, vacíos explicados. Sin banner motivacional ni gráfica de relleno. Claro en simulación. |
| 14. POS vacío y teclado 390×844 | 21-pos-vacio-movil-actual.png; 22-pos-foco-movil.png; pos-dom-metrics.json | Total $0, cobro deshabilitado, vacío explicado, resumen sin altura fija. Enlace Ver resumen lleva al carrito; Tab al profesional con contorno visible. No se agregan artículos. Claro en simulación. |
| 15. Caja cerrada y diálogo cancelado | 23-caja-cerrada-movil-actual.png; 24-dialogo-foco-cancelable-movil.png; dialog-dom-metrics.json; dialog-focus-restored.json | Custodia vacía explicada, historial persistido. Abrir sólo diálogo: título asociado, Shift+Tab lleva al último botón dentro del diálogo, Escape cierra y restaura foco en Abrir turno. Ningún turno nuevo. Claro en simulación. |
| 16. Tres profesionales configurados, sin sesión del mismo tenant | 27-perfiles-configurados-escritorio.png | Alex, Mateo y Luis del negocio DV original visibles; iniciales y horarios configurados, sin biografías ni fotos externas inventadas. No aparece volver al panel porque la sesión pertenece al otro negocio QA. Lectura sin cambiar negocio original. Claro en simulación. |

## Accesibilidad comprobada y límites concretos

En Horario, POS y Caja, las mediciones de DOM sólo lectura dan viewport 390 y ancho de página 390: sin desbordamiento horizontal de página. Tablas históricas usan scroll interno; esta revisión no certifica interacción táctil de todos sus campos. Los controles activos de horario medidos tienen altura44; acciones principales POS44. Propina44 de alto ×36.5 de ancho, menú36×36, icono heredado de reservas14×14; no afirmar que todo el producto cumple un objetivo44×44. Las cifras y estados se explican con texto y color.

Se comprobó foco al cambiar paso, al entrar al resumen y al cerrar diálogo cancelado. Los snapshots contienen nombres de campos y acciones principales; esto no sustituye lector de pantalla. El frontend calculó contraste de sus tokens en ST43_DISENO.md; QA inspeccionó legibilidad visual, pero no midió cada combinación ni certifica WCAG completa. Cargas reales del resumen/disponibilidad y error real400 se distinguieron de vacío/éxito. No se forzó corte de red ni doble confirmación monetaria en esta fase.

## Hallazgos prioritarios y resolución

1. **ST43-01, medio, observado y resuelto:** fecha fuera de90 días inducía Reintentar en vez de cambiar fecha. Paso11, capturas19→25 y respuesta400. Corrección y recuperación200 comprobadas.
2. **ST43-02, bajo, observado, permanece para pulido amplio ST-31:** objetivos pequeños heredados en cabecera y desplazamiento interno de tablas móviles. Paso14/15, DOM/capturas21–24. No bloqueó cobro/consulta ni creó diferencia financiera; revisar con dispositivo real y teclado/lector completo antes de afirmar accesibilidad global.
3. **Límite del caso:** los fixtures no tienen fotografías configuradas. Se verificó ausencia de fotografías de stock y fallback honesto; no se probó carga de una fotografía subida real en esta revisión. Tampoco se reproduce una nueva colisión SLOT_OCCUPIED al confirmar: la corrección de código no se presenta como nueva prueba runtime, para conservar una sola reserva/venta.

No se observaron pérdidas/duplicación/exposición entre negocios en el recorrido entregado. Esta frase está limitada al caso y lecturas verificadas; no constituye auditoría completa de seguridad.

## Resultado para coordinación

Los cuatro flujos ST-43 son claros en simulación y conservan el libro independiente del dinero. Conciliación final repetida únicamente para lecturas después de navegación: 24/24; las tres huellas del entorno original eran iguales en la lectura de cierre a 03:45:43Z del 11/oct (10/oct en México). Recomiendo aceptar el pulido temprano con los límites anteriores y conservar ST-31 para dispositivos móviles reales/accesibilidad amplia; impresora física corresponde a ST-09. Aceptación humana y comercial: **no ejecutadas**.

Nota posterior al cierre ST-43: el coordinador actualizó de forma aditiva el esquema del fixture de demo para ST-12, preservando todas las filas de las 38 tablas existentes. Desde ese upgrade el hash del archivo completo de esa demo cambia, sin invalidar la comparación previa de ST-43. dev.db y el manifiesto DV permanecen iguales. La evidencia separada es docs/scrum/evidencia/st12-20261010/demo-compatibility.json; un login normal posterior sólo añadió una fila INICIO_SESION. No hubo nuevas operaciones monetarias por QA.

### Comparación visible

![Inicio actual del dueño, datos ficticios persistidos](C:/Users/Sinhue/Desktop/POS%20Barberia/docs/scrum/evidencia/st43-20261009/20-inicio-escritorio-actual.png)

![Reserva pública móvil, perfil configurado sin stock inventado](C:/Users/Sinhue/Desktop/POS%20Barberia/docs/scrum/evidencia/st43-20261009/17-reserva-movil-actual.png)

![Recuperación explicada de fecha fuera de rango](C:/Users/Sinhue/Desktop/POS%20Barberia/docs/scrum/evidencia/st43-20261009/25-error-fecha-corregido.png)

