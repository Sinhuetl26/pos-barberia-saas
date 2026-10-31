# Continuación del cierre de demo

11/oct/2026. Primera entrega del plan programado. No repetir el heartbeat; continuar desde aquí en una nueva ejecución autorizada.

Plan: PLAN_CIERRE_DEMO_POS_2026-10-11.md. Reporte: ../evidencias/cierre-demo-20261011/REPORTE_BLOQUE_A.md. Matriz: ../evidencias/cierre-demo-20261011/CD01_MATRIZ.md.

## Estado y entorno

- Nueva demo cierre-demo, distinta de dv-r01 y Estudio Norte. `.tools/closure-demo.json` contiene IDs/base/credenciales ficticias. Copia del manifiesto dentro del fixture.
- API3102 iniciada en sesión79537; Vite5190 sesión52485. No detener servidores5179/3101 ni reemplazar su base. Si han terminado, usar scripts del reporte para iniciar los nuevos.
- Navegador tab16: dueño ficticio autenticado en 127.0.0.1:5190/app/inicio. Tab15 es un intento fallido previo, temporal. Releer documentación CUA antes de operar. Mantener pruebas en origen5190 para no mezclar sesiones.
- 9 comprobaciones aprobadas con scripts/verify_closure_demo.cjs. Reserva API de verificación a09:00 del siguiente día laboral, intención conservada en fixture. Tres citas iniciales a10/11/12h, la última cancelada. No repetir reserva con clave nueva por accidente.
- Datos iniciales sin ventas. Producto Aceite de barba demo stock2/mínimo3; Pomada8/mínimo3; Peine5/mínimo1. Kardex inicial conciliado.
- dev.db intacta durante preparación. No migraciones ni cambios de producto en esta ejecución.

## Próxima acción

Actualización UI: aplicación de referencias de diseño en `../evidencias/referencias-tiktok-20261011/APLICACION.md`. Reportes ahora tiene carga/error/reintento y protección de consultas anteriores; acceso y reservas tienen mejoras de teclado. No repetir esas correcciones como pendientes. API3102 reiniciada en sesión77144 durante prueba de recuperación; conserva el mismo fixture. Nueve comprobaciones de verify_closure_demo aprobadas de nuevo. Pendientes P0 y puertas de CD no se han cerrado por esta entrega visual.

1. Completar CD-02 desde navegador: reservar otra hora libre con cliente ficticio, guardar folio y comprobar agenda/recarga. Acceder como barbero en una pestaña/origen controlado; no cerrar sesiones del dueño hasta capturar su estado. Verificar permisos y cita propia. Guardar evidencias.
2. Recorrer pantallas y completar matriz CD-01, sin atribuir a prueba visual lo que solo se leyó en código.
3. Crear pruebas que reproduzcan riesgos P0 de inventario: creación producto/Kardex atómica, reintento de movimiento y ajuste concurrente. No ejecutar esas pruebas contra fixture usado en presentación; usar createTestFixture.
4. Avanzar CD-03/04: estados consistentes y menú por rol. ReportesView.tsx necesita carga/error/reintento y protección de respuestas obsoletas; evitar cifras antiguas bajo filtros nuevos. Inventario P0 se resuelve antes de aceptar funciones nuevas, no después del pulido.
5. Continuar bloques C→G del plan. Dataset de ventas históricas con servicios transaccionales, conteos/recetas solo después de implementar sus modelos y reglas. Nada de números inventados en dashboards.

No hay bloqueo activo. Esta es una entrega por bloque conforme al plan, no pausa solicitada ni declaración de finalización. No contratar/conectar proveedores, cambiar precios, desplegar ni enviar mensajes. Estados de historias permanecen como estaban; validar contra criterios originales antes de cambiar Notion.
