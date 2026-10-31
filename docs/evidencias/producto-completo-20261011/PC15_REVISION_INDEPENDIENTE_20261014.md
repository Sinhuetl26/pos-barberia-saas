# PC-15 — revisión independiente de identidad telefónica, 14 de octubre de 2026

## Resultado independiente

`node scripts/qa_isolated_postgres.cjs qa_booking_phone_identity.cjs`: **7/7 PASS PostgreSQL aislado**, tras revisar `apps/api/src/services/booking-operations.service.ts` y la suite. El clúster exclusivo se detuvo al finalizar; hash de base operativa intacto; sin demo ni navegador ni mensajes externos.

El agente de implementación había reportado SQLite **7/7**, reservas **20/20** y fila **8/8**. Esos resultados no se repitieron aquí. Tampoco se repitió la suite general de privacidad.

## Comprobaciones reproducidas

1. Importación real de cliente guarda formato canónico 52; una reserva con teléfono nacional reutiliza el mismo cliente, conservando nombre/correo/teléfono del CRM.
2. Alias vigente 52 y antiguo 521 reutilizan el mismo ID; replay devuelve la cita original sin otra alta.
3. Registro histórico nacional se reutiliza en reprogramación interna con alias 52/521 sin reescribir sus datos personales.
4. Equivalencia telefónica se limita al negocio: el mismo teléfono de otro tenant no selecciona ni altera el cliente del primero.
5. Nuevo mexicano se guarda canónico; el caso extranjero probado **+1 con 11 dígitos** se conserva sin forzarlo a México.
6. Dos identidades históricas con alias equivalentes devuelven **409 CUSTOMER_PHONE_AMBIGUOUS**: no fusionan clientes, no crean cita ni notificación ni alteran registros; respuesta no expone correo privado.
7. Base operativa conserva su hash después de todas las operaciones de fixture.

## Cambios permitidos de soporte QA

- `scripts/qa_booking_phone_identity.cjs`: guard de URL/cliente PostgreSQL juntos, carga del cliente Prisma separado y preload del mismo cliente en el servidor hijo; descripción de motor correcta. **No cambiaron assertions, cantidades o criterios**.
- `scripts/qa_isolated_postgres.cjs`: solamente añadir esta suite a la allowlist.

Fuente de producto intocada. No se encontró P1 reproducible en la resolución mexicana, ambigüedad y aislamiento de negocio de esta entrega.

## Alcance pendiente separado

El caso extranjero aprobado no valida todos los países ni un número internacional explícito de diez dígitos. El coordinador revisa ese límite del normalizador compartido; este reporte no declara esa revisión terminada.

El limitador de reservas sigue usando `who.phone` antes de resolver formato canónico. Los alias nacional/52/521 reutilizan el mismo cliente, pero pueden contar en buckets telefónicos distintos. Es una limitación del mecanismo de cuota, **no una fusión ni fuga de identidad**; no se modificó fuera del fix autorizado ni se declara cubierto por estos siete casos. La cuota general por IP y las transacciones siguen en su comportamiento existente.

Aceptación visual de historial/rebooking y los demás criterios PC-15 corresponden a root y a su evidencia previa. Esta revisión acredita el fix de identidad entre importación/reserva y su compatibilidad PostgreSQL, no producción ni envío externo.
