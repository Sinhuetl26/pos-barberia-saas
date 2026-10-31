# Checklist de Sinhue · Revisión ST-01 a ST-09

Actualización 2026-10-09: recorrido delegado al dueño virtual por petición de Sinhue. Esta lista se conserva como cobertura para el equipo; ya no es una tarea obligatoria para Sinhue. Contrato: `docs/scrum/AGENTE_DUENO_VIRTUAL.md`. Conclusiones simuladas separadas de aceptación humana y pruebas externas; las casillas no se marcan sin evidencia actual.

Fuente editable principal: [Notion](https://app.notion.com/p/3f32035ac0d081afa8bfda3da6d1d7b5?pvs=204). Respaldo inicial del 2026-10-08; casillas no sincronizadas automáticamente.

## Para qué es esta revisión
Comprobar si el POS te resulta claro y si sus reglas encajan con una barbería real. Revisamos ST-01 a ST-09 juntas antes de pasar a ST-10. Marcar una tarea indica que la recorriste; no valida automáticamente la historia ni sus requisitos externos.
Actualizada el 2026-10-08.
## Antes de empezar
- [ ] Abrir [el panel local](http://localhost:5179/login) y confirmar con Codex que sigue conectado a la base de demostración.
- [ ] Usar únicamente personas, ventas y productos ficticios. No capturar información de clientes reales.
- [ ] Tener dos sesiones separadas: dueño en computadora y barbero en celular u otro perfil del navegador. Cambiar de cuenta en una misma sesión no permite supervisar a ambos a la vez.
- [ ] Preparar una hoja o notas para registrar importes, folios y stock antes/después.
- [ ] Si un botón devuelve error, anotar qué ocurrió; no repetir un cobro a ciegas.
Las cuentas ficticias están en la guía local `docs/scrum/REVISION_CIERRE_SPRINT_02.md`. El teléfono necesita una dirección de red accesible: localhost en el celular apunta al celular, no a tu PC. Codex preparará ese acceso si vas a usar el dispositivo físico; mientras tanto pueden usarse sesiones separadas en computadora.
No activar Stripe real, contratar planes ni enviar WhatsApp/correos reales durante el recorrido.
## 1. Vista general del dueño
Historias relacionadas: ST-02, ST-08 y ST-09.
- [ ] Entrar como dueño y encontrar resumen, agenda, POS, equipo, inventario y reportes.
- [ ] Verificar que el nombre del negocio y la sucursal actual siempre sean claros.
- [ ] Cambiar de sucursal y revisar qué datos aparecen; regresar a la sucursal de prueba.
- [ ] Abrir el resumen: explicar con tus palabras ventas del día, citas y cajas abiertas.
- [ ] Revisar si los textos y botones permiten saber qué hacer sin que Codex te lo explique.
- [ ] Revisar el panel en computadora y, si está disponible, en celular: texto legible, controles alcanzables y sin contenido cortado.
Resultado esperado: sabes en qué negocio/sucursal estás y puedes encontrar las tareas frecuentes. Anota cualquier cifra que no entiendas o ruta que te haga perder contexto.
### Mis observaciones
Resultado: por revisar.
Pantalla y ajuste/fallo:
## 2. Servicios, equipo y configuración
Historias relacionadas: ST-01, ST-02 y ST-08.
- [ ] Revisar o crear un servicio ficticio con nombre, precio y duración; confirmar que aparece donde corresponde.
- [ ] Revisar la comisión del profesional y distinguir comisión por servicio de comisión por producto.
- [ ] Configurar/revisar horario, días de atención y descansos de la sucursal.
- [ ] Revisar perfiles de barberos y saber cuáles participan en reservas.
- [ ] Revisar planes y capacidad: explicar qué incluye cada plan y qué límite aplica.
- [ ] Con Codex, comprobar un intento que exceda capacidad en un negocio desechable; verificar que se rechaza sin borrar datos.
Resultado esperado: puedes preparar una barbería con sus propias reglas; los precios y límites se entienden. No hacer compras para comprobar esta sección.
### Mis observaciones
Resultado: por revisar.
Regla que no representa una barbería:
## 3. Cliente: reservar un corte
Historias relacionadas: ST-07 y ST-09.
- [ ] Abrir [reservas de El Bigote](http://localhost:5179/b/el-bigote) en una sesión de cliente.
- [ ] Identificar negocio, servicios, precios y profesionales sin entrar al panel administrativo.
- [ ] Elegir profesional, servicio y horario; comprobar duración y fecha.
- [ ] Revisar mensajes si falta un dato o no hay horarios.
- [ ] Confirmar con nombre y contacto ficticios; anotar el resultado y referencia visible.
- [ ] Como dueño, encontrar esa cita en la agenda y comprobar cliente, profesional, servicio y hora.
- [ ] Probar reprogramación con el mecanismo de gestión disponible y comprobar el cambio en agenda.
- [ ] Crear una segunda cita de prueba, cancelarla y comprobar su estado. Conserva la primera para el recorrido de cobro.
- [ ] Con Codex, intentar el mismo horario desde dos sesiones y comprobar que no se confirman dos citas incompatibles.
Resultado esperado: el cliente puede reservar y gestionar su cita sin ver configuración o compra de software. No esperes un correo entregado hasta validar el proveedor real. No compartas públicamente enlaces privados de gestión de citas.
### Mis observaciones
Resultado: por revisar.
Paso confuso o información faltante:
## 4. Barbero: atender y cobrar
Historias relacionadas: ST-02, ST-05, ST-06 y ST-07.
- [ ] Entrar como barbero en la sesión separada y revisar qué tareas tiene disponibles.
- [ ] Encontrar su cita de prueba y revisar cliente, servicio e importe.
- [ ] Registrar el servicio desde el flujo de cobro disponible; confirmar el vínculo de la cita y el profesional.
- [ ] Antes de confirmar, explicar subtotal, descuento, propina y total.
- [ ] Registrar efectivo recibido y revisar el cambio. Anotar total, efectivo recibido, cambio y folio.
- [ ] Comprobar que la cita queda atendida/completada y se vincula a una sola venta.
- [ ] Comprobar qué información de comisión puede consultar ese barbero.
- [ ] Con Codex, comprobar que no modifica inventario ni consulta datos financieros de otros empleados o negocios sin permiso.
Resultado esperado: el barbero registra su trabajo con su cuenta y la venta distingue prestador y cobrador. Registrar tarjeta/transferencia aquí no ejecuta un cargo bancario.
### Mis observaciones
Resultado: por revisar.
Qué le estorbaría al barbero entre cortes:
## 5. Dueño: supervisar y recibir efectivo
Historia relacionada: ST-06.
- [ ] Dejar abierto el panel del dueño mientras el barbero registra la venta.
- [ ] Esperar la actualización de avisos sin recargar; revisar profesional, cobrador, importe y medio de pago.
- [ ] Encontrar el efectivo pendiente de entregar y entender quién lo tiene.
- [ ] Abrir un turno de caja de prueba si el flujo lo requiere, anotando el fondo inicial.
- [ ] Recibir una entrega del barbero y verificar que disminuye su pendiente.
- [ ] Comprobar que la entrega no crea otra venta ni otra comisión.
- [ ] Repetir el recorrido con una segunda cuenta de barbero, con Codex, para distinguir sus ventas y entregas.
Resultado esperado: puedes seguir el dinero desde el cobro hasta la caja. Un aviso no sustituye la confirmación bancaria de tarjeta o transferencia.
### Mis observaciones
Resultado: por revisar.
Dato que necesitas ver en el aviso o entrega:
## 6. POS: productos, descuentos y formas de pago
Historias relacionadas: ST-05 y ST-06.
- [ ] Elegir un producto con existencias y anotar stock y precio antes de venderlo.
- [ ] Agregar un servicio y un producto; cambiar cantidad o quitar un item y revisar los totales.
- [ ] Probar un descuento y una propina; comprobar importes finales antes de confirmar.
- [ ] Registrar una venta en efectivo y revisar recibido/cambio.
- [ ] Registrar otra venta con pago mixto; comprobar que las partes suman el importe requerido y que el cambio de efectivo se explica.
- [ ] Revisar historial: folio, items, importe y forma de pago coinciden con lo que registraste.
- [ ] Volver al inventario y comprobar que bajó la cantidad vendida del producto; el servicio no se descuenta como pieza.
- [ ] Con Codex, probar falta de stock y reintento de una misma operación en una base desechable.
Resultado esperado: totales coherentes, existencias correctas y una venta por operación. Cada prueba crea datos ficticios nuevos; anota los folios para conciliarlos.
### Mis observaciones
Resultado: por revisar.
Importe o mensaje que no se entiende:
## 7. Ticket y reimpresión
Historia relacionada: ST-09.
- [ ] Abrir el ticket de una venta confirmada y revisar negocio, sucursal, folio, items y total.
- [ ] Revisar quién atendió y quién cobró; en efectivo, comprobar recibido y cambio.
- [ ] Abrir formatos 58 y 80 mm y revisar nombres largos e importes en pantalla.
- [ ] Recargar/cambiar de pantalla, entrar al historial y solicitar una copia del mismo folio.
- [ ] Comprobar que reimprimir no crea otra venta.
- [ ] Con Codex, comprobar aviso por ventana bloqueada o conexión interrumpida al consultar el ticket.
Resultado esperado: ticket legible y recuperable, identificado como comprobante de venta y no CFDI. La impresión en papel queda pendiente: Sinhue todavía no tiene impresora. No marcar compatibilidad física por ver una ventana o generar PDF.
### Mis observaciones
Resultado: por revisar.
Información que falta en el ticket:
## 8. Devolución, comisión y cierre de caja
Historia relacionada: ST-06.
- [ ] Seleccionar una venta ficticia y probar devolución parcial con motivo.
- [ ] Revisar cuánto se devuelve, la comisión ajustada y si el producto vuelve a stock según su condición.
- [ ] Confirmar que se conserva la venta y el historial de devolución; no desaparece el registro.
- [ ] Reunir fondo inicial, cobros en efectivo, entregas, entradas/retiros y devoluciones del turno para conciliarlos.
- [ ] Abrir el conteo de caja y capturar el efectivo realmente contado con cantidades de billetes/monedas.
- [ ] Cerrar el turno y revisar efectivo esperado, contado y diferencia. El conteo es ciego: no debe mostrar anticipadamente el saldo esperado para copiarlo.
- [ ] Abrir el comprobante del corte desde historial sin abandonar la caja.
- [ ] Con Codex, demostrar una diferencia intencional y revisar cómo se explica, conservando la evidencia.
Resultado esperado: entiendes dónde está el dinero y por qué el corte cuadra o difiere. Las devoluciones del POS no certifican reembolsos bancarios.
### Mis observaciones
Resultado: por revisar.
Diferencia o regla de comisión que hay que ajustar:
## 9. Inventario actual y lo nuevo que falta
Historias relacionadas: ST-05; desarrollo pendiente ST-41 y ST-42.
- [ ] Crear un producto ficticio con costo, precio, stock inicial y mínimo.
- [ ] Registrar una entrada de compra y revisar el saldo y movimiento.
- [ ] Registrar uso interno o merma de prueba con motivo y revisar el historial.
- [ ] Revisar un ajuste manual con Codex: distinguir cantidad que se agrega/resta de cantidad final contada.
- [ ] Revisar productos bajo stock y comprobar que puedes identificar cuáles requieren atención.
- [ ] Anotar qué necesitarías para recibir compras o hacer un conteo práctico en tu barbería.
Resultado esperado hoy: productos y movimientos básicos visibles. Todavía no exigir conteos completos, consumos en ml/gramos, recetas automáticas ni recomendaciones de fugas.
Pendiente de desarrollo: [Historia en Notion](https://app.notion.com/p/3f32035ac0d081389ab6dc26d2b26585) y [Historia en Notion](https://app.notion.com/p/3f32035ac0d08184960efe898c548c2c). Su ausencia no debe registrarse como regresión de una función ya entregada; sirve para refinar esas historias.
### Mis observaciones
Resultado: por revisar.
Qué faltó cuando lo mostré al profesor:
## 10. Acceso, alta limpia y recuperación: con Codex
Historias relacionadas: ST-02, ST-03, ST-04 y ST-08.
- [ ] Revisar invitación de empleado y recuperación de acceso con el método de prueba disponible.
- [ ] Revisar revocación de sesiones y cambio de permisos en cuentas ficticias.
- [ ] Usar cuentas de negocios distintos: intentar acceder a datos ajenos debe rechazarse. Otra sucursal del mismo negocio no sustituye esta prueba.
- [ ] Crear una barbería desechable limpia con Codex y comprobar que no aparecen servicios, ventas o existencias demo.
- [ ] Revisar la guía para configurar horario, catálogo, equipo y primera caja.
- [ ] Revisar evidencia de migración/restauración; no ejecutar cambios sobre la base operativa.
Resultado esperado: acceso propio por usuario, separación de negocios y puesta en marcha comprensible. Dominio/remitente y entrega/rebote/supresión reales siguen pendientes.
### Mis observaciones
Resultado: por revisar.
Qué necesitaría alguien que contrata por primera vez:
## 11. Fallos de conexión: con Codex
Historias relacionadas: ST-05, ST-06 y ST-09.
- [ ] Ver el aviso sin conexión y comprobar que no invita a iniciar otro cobro.
- [ ] En una operación ficticia, interrumpir la respuesta después de guardar y recuperar el resultado original.
- [ ] Revisar que la recuperación devuelve el mismo folio y no otra venta.
- [ ] Repetir la demostración de cierre por confirmar y recuperación del mismo corte.
- [ ] Revisar la contingencia de datos móviles; comprobar acceso desde el dispositivo real cuando esté disponible.
Resultado esperado: mensajes claros y recuperación sin duplicar. Conservar pestaña y almacenamiento; no repetir cobros ni borrar datos. No hay venta offline certificada.
### Mis observaciones
Resultado: por revisar.
Qué mensaje me ayudaría a actuar:
## 12. Cierre de mi revisión
- [ ] Señalar los tres problemas que más estorban para operar.
- [ ] Separar fallo de función existente, ajuste de negocio, idea nueva y dependencia externa.
- [ ] Indicar qué recorridos sí te sirven tal como están.
- [ ] Revisar con Codex qué se corrige antes de ST-10 y qué conserva su historia pendiente.
- [ ] Volver a probar los pasos afectados después de cada corrección.
### Plantilla para registrar un hallazgo
Resultado: Me sirve / Quiero ajuste / Falló / No pude probar.
Historia o sección:
Pantalla y dispositivo:
Qué intenté:
Qué ocurrió:
Qué esperaba:
Folio o referencia ficticia:
Captura, si ayuda:
Prioridad para mí:
No incluir contraseñas reales, tokens, enlaces privados ni datos de clientes.
## Pendientes externos que esta lista no cierra
- Impresoras físicas 58/80 mm y dispositivos reales no disponibles.
- Dominio y correo real de ST-08.
- Pagos y reembolsos bancarios, CFDI y WhatsApp operativo.
- Alojamiento, respaldo y migración de producción.
La revisión prepara correcciones y decisiones; el producto no pasa a venta general por marcar todas las casillas.
