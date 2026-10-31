# Plan inicial del dueño virtual

Fecha: 2026-10-09. Agente: `/root/dueno_virtual`, evaluador de operación; no dueño humano. Rol disponible para futuras asignaciones en este chat, sin ejecución autónoma en segundo plano.

Leí íntegros [contrato](AGENTE_DUENO_VIRTUAL.md) y [checklist](CHECKLIST_SINHUE_SPRINT_02.md), además de la guía de cierre como contexto. El contrato separa correctamente simulación, integridad técnica, aceptación humana y dependencias externas. El checklist sirve como mapa; no se devuelve a Sinhue para ejecutarlo.

**No abrí navegador ni operé el producto. Las tres misiones están no comprobadas.** Este documento es el único archivo creado/modificado por este agente.

## Preparación común

El coordinador confirma URL, versión entregada, entorno desechable, cuentas ficticias, reglas vigentes y acceso exclusivo al navegador. Las rutas documentadas `/login` y `/b/el-bigote` requieren confirmar disponibilidad. Prepara sesiones aisladas de cliente, barbero A y dueño, un servicio de $200/30 minutos y turno exclusivo con fondo $300, sin otros movimientos. El agente registra línea base visible; no cambia directamente bases, servidores ni permisos.

Identificador: `DV-20261009-R01`, cambiable antes de empezar si existe. Cliente: Cliente DV R01, contacto ficticio permitido sin entrega real. Comisión propuesta: 40% = $80, únicamente si la configuración/regla de prueba se confirma antes de cobrar. Si falta entorno, regla o evidencia, se bloquea la parte dependiente y se resuelve con el coordinador, sin trasladar pruebas a Sinhue.

Libro independiente, preparado antes de actuar: venta $200, recibido $500, cambio $300; A conserva $200. Entrega parcial $150: caja $450 y pendiente $50. Conteo ficticio predeterminado: dos billetes de $200 y dos de $20 = $440; diferencia esperada −$10. No copiar saldos del producto. Si la regla impide entrega parcial/cierre con pendiente, fijar previamente variante autorizada: entrega $200, caja $500, pendiente $0, conteo ficticio $490, diferencia −$10. La comisión no es salida de caja hasta pagarse.

## Misión 1: cliente reserva

**Objetivo:** reservar y gestionar una cita comprensible; ST-07/09.

Abrir la página pública, identificar negocio, servicio, precio, duración y profesional. Elegir H1 disponible en fecha futura/horario confirmado; reservar una vez. Encontrar la referencia en agenda del dueño; reprogramar a H2 por el mecanismo visible y comprobar el cambio. Crear una secundaria en H3, cancelarla y conservar la principal para cobrar.

**Esperado/evidencia:** principal activa en H2, secundaria cancelada, sin ventas. Capturas inicial, selección, confirmación, agenda antes/después y cancelación; referencias y pasos. Calidad verifica persistencia y conflicto simultáneo aparte. Un mensaje de confirmación no prueba correo entregado.

## Misión 2: barbero cobra

**Objetivo:** atender y cobrar una vez entre clientes; ST-02/05/06/07/09.

Dueño mantiene supervisión abierta. A encuentra la cita principal, confirma servicio $200, descuento/propina $0, profesional A y cobrador A; registra recibido $500/cambio $300. Confirma una vez, revisa cita atendida, folio, comisión y pendiente; solicita copia del mismo ticket.

**Esperado/evidencia:** venta $200, pendiente $200, comisión $80 bajo regla confirmada. Capturas antes/después, vínculo cita/venta, folio, ticket/copia y comisión. Identidades coincidentes no prueban prestador/cobrador distintos. Calidad verifica unicidad persistida y ausencia de venta por reimpresión. Ante respuesta incierta, conservar sesión y recuperar la misma operación con el coordinador; no cobrar otra vez.

## Misión 3: dueño concilia

**Objetivo:** seguir dinero desde cobro hasta corte; ST-06/09.

Observar aviso sin recargar y comparar identidades, importe y medio. Recibir entrega autorizada una vez; comprobar pendiente y movimiento. Capturar conteo ciego antes de introducir cantidades ficticias predefinidas; cerrar una vez y consultar el mismo corte en historial.

**Esperado/evidencia:** variante principal: venta $200, caja esperada $450, contado $440, diferencia −$10, pendiente $50. Capturas supervisión antes/después, entrega, pendiente, movimiento, conteo y corte. Calidad verifica persistencia/unicidad y que entrega no crea venta/comisión. El faltante ficticio no demuestra pérdida física ni culpa del empleado.

## Matriz de evidencia

| Aspecto | Observado hoy | Inferido/propuesto | No comprobado |
| --- | --- | --- | --- |
| Contrato/checklist | Lectura documental | Distribución de trabajo | Cumplimiento operativo |
| Entorno y reglas | Referencias documentadas | Fixtures e importes | Disponibilidad/configuración actual |
| Tres recorridos | Ninguno | Acciones y expectativas | UX, capturas y resultados |
| Integridad | Ninguna | Controles independientes | Persistencia/concurrencia: calidad |
| Aceptación externa | Ninguna | Ninguna certificación | Humanos, dispositivos, impresoras, banco, correo, producción |

Registrar pasos, retrocesos, errores y ayuda; tiempos solo medidos, móvil emulado identificado. Capturas nuevas guardadas/inspeccionadas, sin secretos. Entregar al coordinador máximo cinco hallazgos prioritarios con esperado/observado, evidencia, severidad y reintento tras corrección. Estados: claro en simulación/requiere ajuste/bloqueado/no comprobado; ninguna historia cambia automáticamente a Validada.

Tres mejoras propuestas al contrato: formato obligatorio de asignación; libro previo de esperado/observado; responsables y pendientes separados por simulación/técnica/humana/externa. Sinhue recibe hallazgos, correcciones propuestas y solo decisiones comerciales preparadas.
