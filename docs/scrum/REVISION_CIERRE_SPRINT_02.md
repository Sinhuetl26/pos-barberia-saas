# Revisión conjunta al cierre del Sprint 2

Checklist ampliado con casillas y observaciones: [Notion](https://app.notion.com/p/3f32035ac0d081afa8bfda3da6d1d7b5?pvs=204). Respaldo local: `docs/scrum/CHECKLIST_SINHUE_SPRINT_02.md`. Actualizado el 2026-10-08.

Acuerdo con Sinhue, 2026-10-07: revisar juntas las historias de los sprints 1 y 2, ST-01 a ST-09. Codex continúa implementación y pruebas y prepara el recorrido final. No se requiere aceptación de cada historia para seguir con el desarrollo autorizado. La revisión conjunta no sustituye las comprobaciones externas ni cambia automáticamente una historia a Validada.

Actualización 2026-10-08: ST-01 a ST-09 están En revisión. ST-09 tiene implementación y recorrido local comprobados; falta probar dispositivos e impresoras físicos de 58/80 mm. Sinhue todavía no tiene impresora. ST-08 conserva dominio/remitente y entrega real pendientes. Esta revisión no equivale a certificar producción.

Objetivo comercial acordado (DEC-09): primer piloto pagado para el 2026-11-05 con alcance comprobado. Al cierre del Sprint 2 se revisan alcance, capacidad de sesiones, dependencias externas y estimación. La fecha es un objetivo sujeto a pruebas y requisitos de producción; no implica entregar las cuarenta historias ni aprobar la venta general.

## Qué revisará Sinhue

| Historias | Recorrido | Qué observar |
| --- | --- | --- |
| ST-01 | Comparar planes y capacidad; intentar superar el límite del plan | Precio y total comprensibles; sucursales/barberos permitidos claros; límites sin perder datos |
| ST-02 | Entrar como dueño, gerente y barbero; cambiar sucursal con cuentas de prueba | Cada persona ve y hace únicamente lo que necesita; ningún dato de otro negocio aparece |
| ST-03 | Recuperar contraseña, invitar empleado y cerrar sesiones | Enlaces comprensibles; cuenta propia para cada empleado; acceso anterior revocado cuando corresponde |
| ST-04 | Revisar evidencia de actualización y restauración con Codex | Los registros e importes se conservan; existe una forma comprobada de recuperar datos. No ejecutar migraciones reales durante el recorrido |
| ST-05 | Cobrar servicio/producto, descuento, propina y pago mixto; recuperar una respuesta interrumpida | Total, cambio, ticket y stock correctos; una venta aunque se reintente |
| ST-06 | Barbero cobra en celular; dueño supervisa; receptor recibe efectivo; devolución parcial y corte | Aviso claro; cobrador y prestador identificados; dinero entregado una sola vez; comisión y devolución comprensibles; conteo ciego |
| ST-07 | Reservar, reprogramar, cancelar y atender; dos intentos para el mismo horario | Duración, descanso y sucursal correctos; sin doble reserva; cita vinculada una sola vez a la venta |
| ST-08 | Dar de alta una barbería sin datos demo y probar los correos | Puede configurar su operación; estados de entrega/fallo claros; dominio y entrega real comprobados cuando estén disponibles |
| ST-09 | Repetir reserva → venta → corte en celular y computadora; imprimir tickets | Botones legibles y al alcance; recuperación de errores; ticket físico correcto. Impresoras de 58/80 mm requieren equipos disponibles para certificación |

## Cómo recogeremos resultados

Por recorrido, Sinhue indica: **me sirve**, **quiero un ajuste** o **encontré un fallo**. Para ajustes/fallos, anotar pantalla, qué intentó hacer, qué ocurrió y qué esperaba. Captura o ejemplo concreto cuando ayude; nunca contraseñas reales ni datos de clientes.

Codex registra el resultado por historia y propone el siguiente paso:

- Fallo que pierde datos, duplica cobros o expone información: corregir y volver a comprobar antes de vender ese alcance.
- Flujo confuso o regla que no refleja la barbería: acordar cambio, implementarlo y repetir el recorrido afectado.
- Idea adicional: contrastar con el backlog existente, decidir valor y prioridad antes de incorporarla.
- Proveedor, fiscalidad o hardware pendiente: conservar el límite explícito y definir quién aporta la comprobación.

Al final se decide qué aceptar, qué corregir y qué priorizar. Las historias permanecen En revisión si faltan pruebas pertinentes o aceptación. El siguiente paso es este recorrido conjunto antes de abordar ST-10 del Sprint 3. Las dependencias de proveedor/hardware mantienen su aceptación pendiente.

## Para empezar la revisión ahora

Ambiente local desechable, no producción: `http://localhost:5179/login`.

- Dueño de prueba: `dueno@elbigote.com` / `Dueno123!`.
- Barbero de prueba: `barbero@elbigote.com` / `Barbero123!`. Usar otra sesión de navegador para no cerrar la del dueño.
- Reservas públicas: `http://localhost:5179/b/el-bigote`.

Primero reserva un corte como cliente; después cobra como barbero y comprueba el aviso del dueño, el efectivo por entregar y su recepción. Revisa el historial y solicita otra copia del mismo ticket. Abre un turno, cuenta el efectivo y cierra: los importes deben ser comprensibles. Continúa con los recorridos de la tabla para planes, permisos, acceso y configuración. La revisión de aislamiento utiliza cuentas de negocios distintos; cambiar solo de sucursal no la sustituye.

La pérdida de respuesta debe reproducirse con Codex en el ambiente desechable: no cortar internet a ciegas durante una venta real. No migrar producción, enviar correos reales ni efectuar cargos bancarios durante esta revisión.

Resultados locales ST-09: 7 comprobaciones de tickets por motor, regresión 13/13 suites en SQLite y PostgreSQL, cinco ventas nuevas únicas y dos cortes cuadrados. Evidencia: `docs/scrum/ST09_EVIDENCIA.md`. Guía de impresión y red: `docs/IMPRESION_COMPATIBILIDAD_Y_CONTINGENCIA.md`.
