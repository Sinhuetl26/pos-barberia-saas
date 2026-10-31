# Hoy — tercera propuesta implementada

27/oct/2026. Selección explícita de Sinhue: propuesta-3.png (Jornada de un vistazo), según OPCIONES.json. Alcance de esta entrega: Hoy del dueño/gerente. No es el cierre de los 20 bloques de UI ni una entrega de producción.

## Resultado

InicioView ya organiza atenciones por identidad de barbero, con próxima atención destacada, fecha local de sucursal y acceso directo a cada cita. Ventas, pendientes e inventario pasan a una franja inferior. Otros indicadores y preparación inicial permanecen en desplegables secundarios. En móvil se apilan los profesionales; a 320px los botones principales se apilan para conservar tamaño y lectura.

La información procede de resumen + citas del día + equipo existentes. No se modificó la API ni sus permisos. Se consultan todas las citas del día, evitando la limitación de cinco del resumen anterior. Pendientes de hora pasada siguen visibles hasta resolverse; completadas cuentan en el día y salen de las atenciones pendientes. Canceladas/ausencias quedan en métricas secundarias. Agrupación por ID, nunca por nombre. Cambio de sucursal o error elimina datos anteriores; sin información no se muestra un cero inventado.

## Evidencia

- desktop-final.png, movil-390.png, movil-320.png: navegador real.
- comparacion-1.png: primera revisión; se detectó botón azul heredado, jerarquía pequeña y capitalización excesiva.
- comparacion-final.png y comparacion-detalle.png: segunda revisión, después de corregir color, escala de tipografía, altura de columnas y fecha.
- cita-vinculada.png: Ver cita de Diego abre su ID y fecha correctos, sin editar la reserva.
- sin-proximas.png y error-sin-datos-antiguos.png: vacío y fallo de consulta con Reintentar; recuperación comprobada.
- permisos.json: dueño200, barbero403, anónimo401 ante el resumen financiero.
- test_daybook.cjs aprobado: profesionales homónimos separados, orden, atrasadas, en atención, completadas, canceladas, ausencias, barbero inactivo con cita y ausencia de mutaciones.
- TypeScript sin errores; Vite compilado. Aviso de tamaño de bundle preexistente (~931KB), sin dependencias nuevas.
- Teclado: Enter abre/cierra Más de tu negocio, foco visible. Consola del recorrido sin errores de JS. Navegación comprobada a cita concreta, agenda con fecha, Cobrar, Caja e Inventario. No se realizaron cobros.
- Móvil 390 y 320: sin desbordamiento horizontal; navegación inferior conserva acceso.

## Datos y servicios

Nueva sucursal ficticia Jornada UI15, dentro del laboratorio UI07. Manifest .tools/ui15-daybook.json: tres barberos/cinco citas ficticias, ninguna venta ni movimiento. Script idempotente .tools/ui15-prepare.cjs NO vuelve a crear ni mover estas citas. Sus nombres coinciden con el concepto exclusivamente para comparación. Ventas reales de esa fixture=0, por lo que se muestra $0, no $1,050 inventados. Reposición=0. No mezclar con la demo principal.

UI07/UI12/UI14 preservados: cuatro ventas y dos devoluciones totales; UI12 stock9 y cierre100/diferencia0; UI14 tres movimientos, saldo100, turno abierto. Verificadores ui12 --closed y ui14 final aprobados.

Build principal .tools/hoy-daybook-final-20261027, API3103: index-CYDVhNT9.js / index-Ximl9AAm.css. Incorporado a .tools/product-ui-preview-verified-20261014 conservando assets anteriores. Demo Docker5197/API3103 healthy, 7 ventas/0 devoluciones/1 turno abierto. Navegador confirma el JS nuevo en login; sesión principal vencida, no se alteró autenticación ni la pestaña del usuario.

Preview de evaluación5198, API ficticia3104/proxy3105: .tools/hoy-daybook-qa-20261027. Se deja abierto con Jornada UI15 seleccionada y servicios activos para inspección. No utiliza proveedores reales. El laboratorio puede detenerse por proceso específico al cerrar la evaluación; no apagar Docker principal. La recarga restablece la sucursal original: volver a seleccionar Jornada UI15. Las citas de UI15 son del27/oct y no se deben mover para simular días futuros.

## Continuación

UI-05 sigue En curso: Hoy de dueño/gerente implementado; falta entrada Mi día del barbero y revisión integral original. Indicador ponderado conserva20%, sin acreditar toda una historia por esta pantalla. Siguiente: aplicar la dirección aprobada a Agenda (UI-06), manteniendo detalle, disponibilidad, fila y permisos. Conexiones y producción siguen en otro plan. No repetir operaciones financieras anteriores.
