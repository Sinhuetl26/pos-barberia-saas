# PC-07/08 — fila presencial y disponibilidad

Implementador: inventory_integrity_pc01. Backend integrado y build aprobado. QA independiente:16comprobaciones entre SQLite y PostgreSQL; fuente QA_OPERACION.md. No equivale a revisión completa de interfaz o piloto real.

## Fila

GET/POST `/citas/fila`, con sucursalId obligatorio. Entrada permite nombre/contacto opcionales, servicios distintos y profesional preferido. No es la lista de espera de cancelaciones ni envía mensajes externos. Servicios de llegada constituyen estimación; la cita confirma el precio servidor al asignarse.

GET prioriza hasta500activos por llegada ascendente y últimos50terminales, para evitar que historial antiguo oculte nuevos clientes. Impide ingresar más de500activos mediante error explícito de capacidad operativa. Cada fila contiene servicios, estado, version, fechaLlegada, citaId y cita mínima con id/fechaHora/estado/barberoId.

POST `/citas/fila/:id/asignar|reasignar|atender|retirar` requiere versionEsperada e idempotencyKey. Reintento exacto recupera resultado; contenido distinto con misma key devuelve409. Operaciones bloquean sucursal y verifican versión:

- ESPERANDO→ASIGNADO: comprueba horario/margen/bloqueos y crea una sola cita CONFIRMADA para ahora.
- Reasignar ASIGNADO conserva cita y snapshots, verificando disponibilidad del nuevo profesional.
- ASIGNADO→EN_ATENCION: revalida disponibilidad y pasa la cita a EN_CURSO.
- Completar/cobrar cambia a ATENDIDO dentro de la transacción correspondiente, sin repetir transición al cobrar una cita previamente completada.
- Retirar solo ESPERANDO/ASIGNADO, con motivo. Cita asignada se cancela explícitamente y conserva historial; atención iniciada/cobrada no se retira.

Roles siguen recepción/agenda existentes. Barbero solo asigna y opera su perfil; ve sus turnos o esperando sin preferencia ajena. Sucursal y negocio se validan en API; nada depende de ocultar botones.

## Ausencias, vacaciones y turnos puntuales

POST `/bloqueos/impacto`: tipoAUSENCIA/VACACIONES con fechaInicio/Fin, o HORARIO_ESPECIAL con fechaYYYY-MM-DD y horarioInicio/Fin. Motivo y sucursal; profesional requerido en turno especial. Respuesta: previewHash y resumen mínimo de citas afectadas, sin fotografías o notas privadas.

POST `/bloqueos/ausencias|horarios` confirma cuerpo revisado, previewHash, idempotencyKey y aceptarCitasAfectadas booleantrue cuando exista impacto. Recalcula bajo bloqueo; cambios de agenda, bloques o turno desde revisión devuelven409IMPACT_CHANGED. No cancela/reprograma citas automáticamente.

Ausencia se guarda como BloqueoHorario tipado y limita nuevos cupos. Vacaciones conservan límite31días por segmento. TurnoEspecial es específico por fecha/profesional, versionado y dentro del horario de sucursal; reemplaza descanso y horario del profesional solo ese día. Público, reserva interna, reasignación y llegada usan la misma regla de disponibilidad.

Citas GET contiene conflictos de lectura para resolver. Citas completadas/canceladas/no-show no se presentan como conflicto operativo activo. Barbero no puede eliminar una ausencia administrativa aunque sea su perfil; permiso anterior sobre sus bloqueos ordinarios se conserva.

GET `/bloqueos/horarios` muestra excepciones. Mutaciones de ausencias/turnos son dueño/gerente; consulta staff dentro de alcance propio. Sin mensajes externos, cambio de precios ni borrado de citas.

## Rollout

Nuevos FilaPresencial/OperacionAgenda/TurnoEspecial y columnas tipadas en BloqueoHorario. Migración PostgreSQL20261011_queue_schedules; para SQLite usar copia respaldada/esquema Prisma compatible, no ejecutar SQL PostgreSQL literalmente. El coordinador controla copia/servidores; el implementador no migró ni reinició bases vivas. Modelo/clienteJS y tipos generados; binary5.22 anterior conservado cuando Windows negó reemplazo por estar en uso. QA fixtures comprobó runtime separado.
