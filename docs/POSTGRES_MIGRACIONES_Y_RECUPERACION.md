# PostgreSQL · Migraciones y recuperación

## Antes de una migración operativa

1. Identificar la base y entorno de destino, versión de aplicación y migraciones pendientes. Trabajar primero sobre una copia aislada y anonimizada.
2. Detener escrituras durante la ventana acordada. Preparar un respaldo consistente y restaurarlo en otro destino para comprobarlo. Contar ventas, clientes, citas y conciliar importes antes de habilitar tráfico.
3. Conservar la misma versión de Prisma que aplicó y probó las migraciones. No editar SQL ya aplicado ni usar `db push --accept-data-loss`, `migrate reset` o un borrado como alternativa.
4. Confirmar que el usuario de migraciones tenga los permisos necesarios. Los secretos se entregan mediante variables del entorno, no en Notion, comandos registrados ni argumentos visibles de procesos.
5. Si hay datos huérfanos, duplicados o citas sin cliente, evaluar el resultado de la copia antes de la actualización real. La migración de integridad falla ante referencias inválidas; no elimina filas para pasar.

## Aplicar

Antes de habilitar una versión ya migrada, `npm run db:check` comprueba historial y esquema sin escribir filas ni aplicar cambios. Requiere una URL PostgreSQL explícita. Si hay migraciones pendientes, la comprobación falla: no sustituye el respaldo ni autoriza ejecutar la actualización. Tampoco acredita conciliación financiera o permisos de usuarios.

```sh
npm run db:migrate
```

Requiere `DATABASE_URL` PostgreSQL. Aplica `packages/database/prisma/schema.postgres.prisma` con `prisma migrate deploy`, independientemente del proveedor elegido para el cliente local. El cliente que ejecuta la aplicación debe generarse para PostgreSQL en la construcción de su ambiente.

Después comprobar `prisma migrate status`, diferencias de esquema, conexión de la API, permisos por negocio/sucursal y conciliación de datos. Conservar las evidencias sin datos personales ni credenciales. El contenedor se detiene si falla una migración; no usar un esquema improvisado para permitir el arranque.

## Si falla

1. Mantener detenidas las escrituras. Identificar la migración y el error sin publicar URLs de conexión ni contenido sensible de registros.
2. Verificar `_prisma_migrations` y el estado físico de la base. **No marcarla aplicada por existir un registro de intento.**
3. Las migraciones nuevas de ST-04 contienen `BEGIN`/`COMMIT`. Confirmar que la transacción fallida no dejó cambios parciales; no asumirlo para SQL histórico que no tenga transacción.
4. Corregir la causa en una copia: datos incompatibles, permiso faltante o SQL pendiente. Conservar los registros; no borrar el dato que dispara el error sin una decisión documentada.
5. Solo si se confirmó que el intento fue revertido completamente, ejecutar:

```sh
npx prisma migrate resolve --rolled-back NOMBRE_MIGRACION --schema=packages/database/prisma/schema.postgres.prisma
npm run db:migrate
```

6. Si hubo cambios parciales, no utilizar ese comando todavía. Preparar y probar SQL de reversión o una reparación hacia adelante; conciliar la base. `--applied` se reserva para cuando el SQL completo ya se ejecutó y fue verificado, no para ocultar el fallo.
7. Si se requiere restaurar, hacerlo en un destino nuevo aislado, comprobar filas/importes y coordinar el cambio de conexión. No restaurar encima de la base activa sin un procedimiento específico aprobado.
8. Abrir la aplicación únicamente tras las pruebas y conciliación; registrar el incidente y resultado.

## Ensayo reproducible de ST-04

```sh
npm run test:postgres
```

El script crea bases/esquemas `systech_test_*`/`st04_*`, usa una copia anonimizada, provoca un fallo transaccional, verifica que el dinero siga igual, resuelve el intento y reejecuta la migración de ensayo. También genera un dump y lo restaura en una base nueva. Las credenciales y archivos de ensayo quedan en `.tools`, ignorados por Git.

Para CI, el workflow prepara `.tools/ci-source.db` con datos ficticios y lo proporciona mediante `SYSTECH_ANON_SOURCE`. Localmente se lee `packages/database/prisma/dev.db` en modo de solo lectura. No cambiar esta variable para apuntar a datos externos sin autorización.

La instancia portátil local escucha solo en 127.0.0.1:55404 y se detiene al finalizar. Si una interrupción deja el proceso activo, `node scripts/postgres_test_runtime.js stop` detiene exclusivamente ese clúster de prueba. No detiene el PostgreSQL contratado ni un servicio de Windows.

El respaldo de este ensayo acredita recuperación técnica de ST-04. Cifrado, copia independiente, retención y compromisos RPO/RTO se implementan y prueban en ST-14.
