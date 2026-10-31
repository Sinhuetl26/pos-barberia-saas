# Comparativa de interfaz: SYSTECH y productos establecidos

Fecha: 11 de octubre de 2026. Alcance: pantallas publicadas y documentación oficial de Fresha, SQUIRE y AgendaPro México; recorrido de Agenda y POS de la demo ficticia Estudio Norte. No se probaron cuentas privadas de estos proveedores. Las recomendaciones son juicio de diseño, no resultados de pruebas comparativas con usuarios.

## Conclusión

La prioridad es hacer más comprensible la operación diaria. No hace falta acumular módulos para que el producto parezca profesional. SYSTECH ya conecta citas con cobros y contempla estados, reprogramación, comisiones y existencias; esas capacidades deben verse como un recorrido continuo y sencillo.

## Referencias oficiales

- Fresha: https://www.fresha.com/es/for-business/features/scheduling — sus imágenes publicadas muestran agenda sobre escala horaria y columnas de profesionales, también en móvil.
- SQUIRE: https://www.getsquire.com/features/pos-payments — describe tickets preparados desde citas, combinación de servicios, productos y propinas, atribución por barbero e historial del cliente en caja. Su página localizada muestra un registro compacto de transacciones.
- AgendaPro México: https://agendapro.com/mx/sistema-pos-terminal-punto-venta/barberias — documenta conexión entre reservas, ventas, pagos y gestión. No se verificó su funcionamiento privado ni la disponibilidad de cada integración para una cuenta concreta.

## Observaciones y cambios propuestos

| Área | Estado observado en SYSTECH | Propuesta | Historia existente / prioridad |
|---|---|---|---|
| Agenda | Tarjetas por barbero; las horas aparecen dentro de las citas, sin escala temporal compartida. | Escritorio: calendario por horas y barbero para entender ocupación y huecos. Móvil: lista cronológica del profesional. Mantener una vista lista accesible. | ST-31; alta |
| Acciones de cita | Confirmar, atender, cobrar, reprogramar y comprobante aparecen juntos en la tarjeta. | Una acción principal según estado y un panel de detalle para las demás; etiquetas humanas para los estados. Conservar todos los permisos y reglas existentes. | ST-31; alta |
| Cobro | Catálogo y resumen separados correctamente, pero en 1280×720 el total/botón quedan bajo el borde inferior. | Total y acción de cobro persistentes; encabezado de carrito compacto; desplazamiento en artículos, sin ocultar la decisión final. | ST-31; alta |
| Profesional y cliente | El selector incluye porcentajes de comisión; cliente registrado y nombre de mostrador ocupan campos separados visibles. | Mostrar nombre del profesional y un resumen único del cliente. Porcentajes en gestión/detalle; edición secundaria para nombre de mostrador. | ST-31; alta |
| Retorno del cliente | Preferencias y foto de corte existen; la recontratación completa sigue pendiente en backlog. | Al terminar, ofrecer agendar la próxima visita sin recapturar datos. Mostrar últimas preferencias donde sirven al barbero. | ST-29; media |
| Página pública | Flujo por pasos y personalización disponibles; fechas consultables no equivalen a disponibilidad calculada. | Primer horario realmente disponible, explicación breve de cada servicio y mejor distinción entre cerrado y lleno. Requiere contratos de datos, no solo estilos. | ST-31; alta para demo |
| Resumen del dueño | No se auditó su pantalla en este recorrido; la mejora está prevista. | Priorizar decisiones: próximas citas, cobros pendientes y alertas de caja/stock, en lugar de añadir indicadores decorativos. | ST-30; media |
| Lista de espera y anticipos | Historias previstas; no validadas como completas. | Añadir tras validar demanda del piloto. Evitar presentar botones como operativos antes de conectar y verificar el flujo. | ST-34 / ST-35; posterior |

## Qué conservar

- Identidad visual propia, catálogo sencillo y separación entre experiencia del cliente y administración.
- Transferencia de cita al POS: ya existe, no debe duplicarse como nueva funcionalidad.
- Preferencias y referencia privada del corte como hipótesis de valor a validar con clientes.
- Reglas de ventas, inventario y caja: el rediseño no puede relajar permisos ni consistencia.

## Qué simplificar o posponer

- Sustituir jerga como «Turno Walk-In» y «transferencia directa a cobro en POS» por «Cliente sin cita» y textos cortos.
- Reducir instrucciones repetidas, porcentajes administrativos y botones secundarios en las superficies de operación.
- No retirar módulos útiles del dueño: agruparlos y ocultarlos según rol y contexto.
- Posponer marketplace, membresías complejas, campañas masivas e IA hasta demostrar demanda; no copiar toda la amplitud de un producto maduro.

## Orden sugerido

1. Cobro con total/acción persistentes y contexto de cliente/barbero más claro.
2. Agenda temporal y detalle de cita con una acción principal.
3. Reservas con disponibilidad real y descripciones administrables.
4. Reagendamiento y resumen accionable, tras revisar con el piloto.

No se modificó código, precios, estados de historias ni servicios contratados por esta comparación. Las capturas locales son evidencia visual, no evidencia de integraciones funcionando.

## Evidencia

- `fresha-agenda-publicada.jpg`: imágenes oficiales de agenda móvil.
- `systech-agenda.jpg`: demo con una cita ficticia el 12 de octubre.
- `systech-pos.jpg`: primera vista del punto de venta a 1280×720 aproximadamente.
