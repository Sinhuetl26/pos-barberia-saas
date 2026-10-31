# ST-04 · PostgreSQL y migraciones seguras

Fecha: 6 de octubre de 2026. Estado: **En revisión**.

## Entrega

Se validó PostgreSQL real, sin sustituir la base SQLite de trabajo ni conectar proveedores externos. Se preparó una instancia PostgreSQL 16.15 de prueba en 127.0.0.1:55404, sin servicio de Windows, dentro de `.tools/postgres` (ignorado por Git). Credenciales aleatorias, nunca incluidas en esta evidencia. La instancia se detiene al finalizar las pruebas.

Las migraciones históricas no se reescribieron. Se añadieron:

- `20261006_01_postgres_compatibility`: conserva estado y período de la licencia mediante renombrado; añade monto y gracia; preserva metadatos antiguos, fechas de creación y facturas. Ajusta precisión temporal al modelo de Prisma. Las citas antiguas sin cliente reciben un registro explícito sin teléfono inventado.
- `20261006_02_postgres_integrity`: añade los índices y relaciones que faltaban. Se ejecuta en una transacción; referencias inválidas o duplicados impiden aplicar la migración y requieren revisión, sin borrar filas automáticamente.

No se utilizó `db push` para PostgreSQL. Las pruebas de SQLite siguen creando exclusivamente bases desechables con su mecanismo anterior. Una comparación de esquema después del despliegue confirmó ausencia de diferencias respecto al modelo PostgreSQL.

## Conservación comprobada

La base de trabajo se leyó con una transacción SQLite en modo de solo lectura. Se creó una copia anonimizada con identificadores nuevos, contactos ficticios, texto privado retirado y contraseñas inutilizadas. Se excluyeron las colas de autenticación y sus tokens. La copia permanece únicamente en `.tools`, fuera de Git y Notion.

La copia conserva, entre otros, 6 negocios, 7 sucursales, 7 barberos, 15 clientes, 73 ventas, 74 partidas, 102 citas y 52 comisiones. La actualización con índices y relaciones conservó todas las filas y sus importes; la comparación incluye el contenido de las tablas antes/después. El hash de la base SQLite de trabajo fue idéntico al comienzo y al final.

También se construyó una base histórica con suscripción vencida, una cita sin cliente y una factura ficticia. Después de migrar se conservaron estado, período, monto de plan, metadatos de cancelación/reintentos, fecha de creación de la cita y factura. Una repetición de `migrate deploy` no alteró sus registros.

## Pruebas

Resultado reproducible en `ST04_RESULTADOS.json`:

1. Instalación limpia de las cinco migraciones versionadas.
2. Modelo PostgreSQL y base sin diferencias de esquema.
3. Actualización histórica con registros conservados.
4. Repetición idempotente de migraciones.
5. Precisión decimal, fechas UTC, índices, unicidad y claves externas.
6. Copia SQLite anonimizada actualizada sin pérdida de filas o dinero.
7. Migración fallida revertida; resolución del fallo y reejecución correcta.
8. Respaldo y restauración en una base nueva con registros idénticos.
9. Regresión completa de la API: **8/8 suites aprobadas contra PostgreSQL**.
10. Base SQLite de trabajo sin cambios.

Después de los cambios también aprobaron las **8/8 suites de SQLite**. Se comprobó el cambio de proveedor de ida y vuelta, la generación de ambos clientes y el rechazo de un arranque de producción sin URL PostgreSQL explícita.

El respaldo de ensayo utiliza `pg_dump` en formato personalizado y `pg_restore` con transacción y fallo inmediato. La restauración exige una base nueva cuyo nombre empiece por `systech_test_restore_`; rechaza sobrescribir una base existente. Esta prueba no acredita aún cifrado externo, retención, RPO/RTO ni recuperación operativa de producción: ST-14 conserva ese alcance.

Se detectó y corrigió una carrera que SQLite no permite evaluar de la misma forma: la reserva pública ahora bloquea al profesional dentro de su transacción antes de consultar solapamientos. La regresión concurrente funciona con ambos motores. Duración, descansos, zona horaria y demás alcance de ST-07 siguen pendientes; no se declaró terminada esa historia.

Una prueba de Stripe tenía dos negocios con los mismos identificadores ficticios de suscripción. Se corrigió el fixture para que cada negocio tenga sus propios identificadores; no se cambió el tratamiento de un evento de pago real ni se contactó Stripe. El ciclo completo continúa en ST-10.

## Ejecución y CI

```sh
npm run test:postgres
```

En Windows requiere binarios oficiales de PostgreSQL (`PG_BIN`) y Python (`PYTHON_BIN`), o la instalación portátil local preparada. Para una instancia externa de CI, proporcionar `SYSTECH_TEST_PG_URL` en una base cuyo nombre empiece por `systech_test_`. El ejecutor crea esquemas propios, clientes PostgreSQL separados y API de prueba; no cambia el cliente de SQLite instalado para el desarrollo.

El workflow `.github/workflows/postgres.yml` instala dependencias, genera un snapshot SQLite ficticio, levanta PostgreSQL 16 y ejecuta esta validación. Publica solo el resultado sin secretos. **El workflow está preparado; no se hizo push ni se ejecutó en GitHub durante esta sesión.** La ejecución local real es la evidencia disponible.

El selector de motor comprueba que los modelos coincidan y cambia el proveedor sin copiar respaldos de esquema obsoletos. Se probó cambiar a PostgreSQL y regresar a SQLite sin modificar filas. `npm run db:migrate` exige una URL PostgreSQL explícita. El arranque de producción también la exige.

## Recuperación

El procedimiento detallado está en `docs/POSTGRES_MIGRACIONES_Y_RECUPERACION.md`. El ensayo provoca un error después de crear una tabla y cambiar un monto dentro de una transacción. El error dejó ambos cambios sin aplicar. Se comprobó el historial de migraciones, se marcó el intento como revertido con `migrate resolve --rolled-back`, se corrigió el SQL del ensayo y se ejecutó de nuevo. Los registros financieros anteriores permanecieron iguales.

## Pendiente para validación final

- Revisar la evidencia de ST-04 y ejecutar el workflow en el repositorio remoto al realizar el siguiente envío autorizado.
- Contratar y configurar el alojamiento definitivo en su historia de despliegue; no se abrió ninguna cuenta de pago.
- Migrar datos operativos reales solo con un destino, ventana de mantenimiento, respaldo y conciliación acordados. Esta sesión preparó y verificó el mecanismo en copias aisladas.
- Continuar con ST-05: venta, stock y folio consistentes bajo concurrencia.

## Fuentes técnicas

- [PostgreSQL para Windows](https://www.postgresql.org/download/windows/): referencia oficial al distribuidor de binarios.
- [Binarios de EnterpriseDB](https://www.enterprisedb.com/download-postgresql-binaries): archivo utilizado para el entorno de ensayo. SHA-256 del archivo descargado: `43bb45f173a6f08cf1d29a97a6d8deb119e8e8093a24c00d2d1001a0ccaa8281` (registro local de integridad, no firma del proveedor).
- [Prisma migrate resolve](https://docs.prisma.io/docs/cli/migrate/resolve): recuperación del historial. Comandos comprobados con Prisma 5.22.0 instalado en el proyecto.

## Actualización de integración · 7 de octubre de 2026

13 comprobaciones PostgreSQL, 9/9 suites en cada motor; db:check de solo lectura y arranque Docker preparado. Regresión actual: 9/9 suites SQLite y 9/9 PostgreSQL. Este resultado actualiza los pendientes técnicos de PostgreSQL descritos en la evidencia histórica anterior. Estado conservado: En revisión. Detalle, límites y capturas en [revisión ST-01 a ST-04](ST01_04_REINTEGRACION.md).

Revisar evidencia; CI remoto, operación Docker y migración real pendientes en sus historias. Siguiente desarrollo ST-06.
