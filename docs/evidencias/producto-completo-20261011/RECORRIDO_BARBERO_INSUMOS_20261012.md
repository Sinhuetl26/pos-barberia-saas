# Recorrido barbero e insumos — 12 de octubre

Coordinador verificó desde CUA sobre preview estáticoPC04 en5192 y API3103. Usuario BARBERO ficticio enlocalhost5192, dueño ficticio en127.0.0.1:5192: sesiones separadas para comprobar roles sin manipular credenciales ni estado interno. Datos exclusivamente de la copia ficticia.

## Comprobado

1. Login de barbero muestra Mi agenda, POS y Mi caja/comisiones. No aparecen Reportes, Configuración, catálogo privado ni finanzas generales.
2. Agenda12/oct solo muestra profesional Alex y dos citas propias. Mi jornada conserva referencia/cliente/servicio y presenta acción principal según estado.
3. «Atender a este cliente» cambia PENDIENTE→EN_CURSO. «Terminar atención» cambia aCOMPLETADA y habilita cobrar visita.
4. Dueño recarga Inventario: Gel operativo ficticio pasó500→495ML con receta publicada5ML. No se editó base manualmente para obtener el resultado.
5. «Cobrar esta visita» precarga Alex, Reserva ficticia de verificación, un Corte clásico, precio reservado200. Controles de cantidad del servicio bloqueados, productos de reventa disponibles y gel operativo ausente del catálogo POS.
6. Efectivo ficticio200, confirmar: venta A-000002 con cobradorbarbero-cierre@fixture.invalid. No se envió WhatsApp ni se ejecutó cobro real externo.
7. Dueño vuelve a recargar: gel sigue495ML. Cobrar la atención previamente completada NO consumió otros5ML.
8. Viewport390×844, ancho390 igual al documento390. Captura barbero-cobro-mobile-20261012.png. No acredita prueba física de impresora ni pilotaje real.

## Continuidad de datos

Venta A-000001 anterior se conserva. Nueva A-000002200 de servicio en copia. Gel495ML, receta1 cincoML. La cita ficticia de las09:00 conAlex ahora está completada y cobrada; no repetirla para otra venta. La siguiente cita propia deClienteDemoUno sigue pendiente a10:00.

## Mejoras visuales pendientes comunicadas

- Preset200 duplicado en efectivo (importe exacto y redondeado): deduplicar y excluir opciones inferiores al total.
- En cita vinculada, ocultar/deshabilitar CTA de agregar otros servicios en catálogo, coherente con bloqueo servidor de líneas reservadas.
- Revisar teléfono ficticio de fallback en recibo cuando el negocio no configuró teléfono; mostrar únicamente datos reales configurados.
- La aceptación de fila/ausencias requiere previewPC07, no se atribuye a esta capturaPC04.
