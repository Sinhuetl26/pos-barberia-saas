# Fila presencial — recorrido de navegador del 13 de octubre

Copia ficticia: preview estático PC07 en5193, API3103. Dueño ficticio; no datos operativos ni mensajes externos.

1. Agenda → Fila presencial muestra formulario accesible y estado vacío separado de error.
2. Registrar «Llegada ficticia QA 13oct» con Corte clásico crea una llegada en Esperando, sin venta.
3. Asignar Luis pasa a Profesional asignado y habilita atención/reasignación.
4. Reasignar Mateo conserva la misma llegada y cambia el profesional mostrado. La no duplicación de cita también tiene comprobaciones API independientes en QA_OPERACION.md.
5. Retirar solicita motivo y explica que cancela la cita asignada sin borrar historial. Confirmación de retiro mantiene el registro con estado Retirado, Mateo y el motivo de la prueba.
6. Captura: fila-historial-desktop-20261013.png.

No se inició atención ni cobro en este recorrido. Pendiente recorrido móvil y ciclo completo de atención/cobro de fila.

## Ausencias: defecto encontrado, no aceptado

En la misma preview, editar datetime-local de inicio/fin al14oct y revisar devolvió ambos campos al13oct. No se confirmó ni guardó ausencia. Se comunicó al escritor frontend; añadió manejo onInput y marca explícita de borrador. Falta verificar ese cambio en nueva preview. Esta captura/recorrido no acredita PC08.
