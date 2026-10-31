# Entrega frontend PC12 / PC15 — 13 de octubre

Estado: implementado localmente; revisión de navegador y contrato pendiente PC12. No corresponde marcar estas historias completas con esta entrega.

## PC12: cierre guiado

- `CloseCashGuide` integrado en `BarberosView`, sin nuevos endpoints financieros.
- Revisión de atenciones de hoy sin venta vinculada y efectivo del equipo por entregar. La revisión no muestra esperado de gaveta ni recibe entregas automáticamente.
- Conteo ciego por denominaciones, incluyendo monedas de 50 centavos; cálculo entero de centavos y validación de cantidades.
- La API actual confirma conteo y cierra de forma atómica. La comparación se muestra únicamente tras recibir un corte CERRADO y resumen numérico coherente. No se ha fingido una comparación previa.
- Recuperación del mismo cierre o entrega mediante intención financiera persistida existente. Otro proceso pendiente bloquea nuevas operaciones; no se cambia su contenido para reintentar.
- Resultado incompleto no permite volver a cerrar desde el formulario. Comprobante reutiliza impresión web existente; no hay prueba de impresora física.
- Custodia conserva permiso y separación entre entrega, venta y comisión. Respuestas tardías de otra sucursal no reemplazan la vista activa.

Pendiente del criterio original: contrato para revisar conteo y comparar **antes** de cierre definitivo. Necesita respuesta autoritaria versionada y confirmación protegida ante movimientos ocurridos entre revisión y cierre; no basta calcular el esperado en el navegador. Coordinado con raíz/backend.

## PC15: historial y próxima visita

- `ClientHistory` integrado en perfil existente, consulta limitada explícitamente a hasta 10 citas y 10 ventas proporcionadas por API.
- Ticket y cita vinculados se muestran una vez. Reservas, cancelaciones y compra de productos no inflan atenciones realizadas ni preferencias.
- Nombres/precios históricos proceden del ticket o snapshot de reserva; precio ausente no se interpreta como cero. Empate de preferencias queda explícito; eliminado supuesto de VIP automático.
- Importes permanecen sólo para dueño en este componente, manteniendo el criterio visual previo del perfil.
- Referencia privada se consulta a demanda mediante endpoint autorizado existente; sólo se renderizan fotografías válidas. No se copia automáticamente a una visita nueva.
- Preparar próxima visita conserva cliente/teléfono/profesional/servicio y abre agenda sin reservar ni cobrar. Para antecedente combinado se elige un servicio inicial y se indica revisión en agenda, pues el contrato de borrador existente es de un solo servicio.
- La raíz integra `onRebook`. Teléfono inválido bloquea próxima visita. Perfil cerrado cancela respuestas pendientes.

## Corrección relacionada PC08

`ScheduleChanges` marca fechas modificadas con `onInput` y referencia síncrona de dirty, invalida revisiones anteriores y conserva fechas del formulario. La revisión usa los valores de controles nativos sin reiniciar estado al enviar. Es una corrección de código: falta repetir la reproducción real del navegador con nueva preview; no se declara validada.

## Evidencia

- `npx tsc --noEmit -p apps/web/tsconfig.json`: salida 0.
- `node scripts/test_cash_client_ui_helpers.cjs`: 11/11 PASS. Casos de centavos, cantidades inválidas, ausencia/inconsistencia de resultado confirmado, asociación ticket-cita, cancelaciones/reservas, tickets sólo de producto, snapshot desconocido y preferencias empatadas.
- No se ejecutaron pruebas de API o navegador en este subagente. La raíz controla fixture y navegador, y verificará flujo completo/roles/persistencia/recuperación y capturas.
- Fuera de esta entrega: contrato backend previo al cierre, infraestructura, conexiones externas, pagos reales, impresora física, publicación y criterios restantes del plan.
