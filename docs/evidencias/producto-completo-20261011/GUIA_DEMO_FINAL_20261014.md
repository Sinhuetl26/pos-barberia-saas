# Guía de presentación de la demo — 14 de octubre de 2026

**Actualización18/oct: el arranque vigente es Docker; seguir docs/DEMO_DOCKER.md o el acceso SYSTECH Demo del escritorio. No ejecutar los comandos Node/Vite de esta guía histórica junto con Docker. Los datos activos están en su volumen persistente, no en la base original conservada. El guion de presentación sigue siendo útil.**

Esta es una demo local con datos ficticios. Permite enseñar reserva, agenda, cobro, inventario y control del dueño; no acredita operación en producción ni conexiones externas activas.

## Abrir el entorno correcto

Repositorio: `C:/Users/Sinhue/Desktop/POS Barberia`.

- API de la copia: `http://127.0.0.1:3103/api`.
- Panel de presentación: `http://127.0.0.1:5197/app/inicio`.
- Reserva pública: `http://127.0.0.1:5197/b/cierre-demo`.
- Reserva pública en sesión separada: `http://localhost:5197/b/cierre-demo`.
- Base permitida para esta demo: `.tools/product-complete-demo/test.db`, identificada por `.tools/product-complete-demo.json`. No usar `packages/database/prisma/dev.db`, la copia fuente antigua ni puertos de otra demo.

El manifiesto y su enlace público apuntan a **webPort 5197**. El preview estático no se actualiza al editar código: debe corresponder al build final confirmado por el coordinador.

Si los servidores ya responden, conservarlos. Si están detenidos, iniciar únicamente estos procesos desde dos terminales; no terminar procesos ajenos ni iniciar otro sobre un puerto ocupado:

```powershell
# Terminal API, desde el repositorio. Usa la copia guardada y desactiva proveedores.
Set-Location -LiteralPath 'C:/Users/Sinhue/Desktop/POS Barberia'
node scripts/start_product_demo.cjs
```

```powershell
# Terminal web: snapshot de presentación que el coordinador haya confirmado.
Set-Location -LiteralPath 'C:/Users/Sinhue/Desktop/POS Barberia/apps/web'
node ../../node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5197 --strictPort --outDir ../../.tools/product-ui-preview-verified-20261014
```

Estos comandos no compilan, migran, siembran ni reinician la base. Si se desea mostrar código posterior al snapshot, primero el coordinador debe confirmar un build nuevo y su carpeta de preview; no atribuir cambios nuevos a la versión vieja. No copiar credenciales de proveedores ni modificar variables de producción para arrancar.

## Acceso exclusivamente ficticio

Las cuentas autorizadas y su contraseña local están en `credentials` de `.tools/product-complete-demo.json`:

- `owner`: dueño ficticio.
- `barber`: barbero ficticio.
- `other`: otro negocio ficticio, reservado para verificar aislamiento; no usar como cuenta de presentación principal.

No se reproducen contraseñas, tokens ni claves en esta guía. Usar esas cuentas únicamente en la copia de 3103/5197. La persona que reserva puede usar la página pública sin abrir el panel de administración. Mantener dueño y barbero en sesiones separadas si se comparan ambos roles; cambiar de cuenta mediante Salir/Entrar, sin manipular almacenamiento interno del navegador.

## Guion de tres minutos, sin escribir más datos

**0:00–0:30 — Cliente.** Abrir reservas públicas. Mostrar servicios, profesional, selección de horario y resumen de precio/duración. Explicar: «El cliente elige su cita y la agenda queda registrada; no necesita entrar al panel del negocio». No prometer WhatsApp o correo entregados: en este entorno los proveedores están desactivados.

**0:30–1:00 — Barbero.** Mostrar su agenda y una atención existente. Explicar cómo inicia/termina un corte y pasa a cobrar. Mostrar el registro existente del recorrido: dos servicios de Alex, 75 minutos, reserva de 450. No volver a completar ni cobrar esa misma cita.

**1:00–1:30 — Cobro.** Abrir historial del POS y el ticket **A-000003**: servicios 450 + Cera importada 150 = **600**. Mostrar que se identifican profesional y cobro. La comisión registrada de esa venta es **195**. Este ticket ya está guardado; abrirlo es lectura, no una nueva venta.

**1:30–2:00 — Inventario.** Mostrar los movimientos asociados: Gel **495 → 490 ML** al completar y permanece 490 al cobrar; Cera importada **2 → 1**. Explicar: «Los insumos del servicio se descuentan una vez y la reventa descuenta su producto». Son resultados del recorrido ficticio ya realizado, no métricas universales de ahorro o ganancias.

**2:00–2:30 — Dueño y caja.** Mostrar el corte cerrado y su comprobante: fondo 100 + entrega de ese cobro 600 − gasto registrado 25 = **675**. Conteo 675, esperado 675, diferencia cero. Se recibió solo 600; quedaron separados 200 anteriores en custodia del barbero y 380 propios del dueño. No recibirlos ni volver a cerrar para la presentación.

**2:30–3:00 — Decisiones.** Abrir estadísticas/gastos y explicar ranking, costos, comisiones, existencias y datos insuficientes. Aclarar que la utilidad operativa depende de costos y gastos completos y no es una declaración fiscal. Terminar mostrando que los registros se conservan al recargar.

## Si después se necesita demostrar una venta nueva

Preparar otra visita o cliente ficticio y **un turno nuevo**, con intención y datos nuevos. Antes de hacerlo, guardar el estado y establecer qué saldo/stock se espera. No reutilizar el ticket A-000003, la reserva ya atendida, su entrega de 600 ni el corte cerrado de 675. No resetear la base para aparentar una primera operación. Esta guía **no ejecutó** una nueva visita, venta, entrega ni apertura de caja.

## Qué evidencia respalda la explicación

- Recorrido real de navegador de **cliente, barbero y dueño**: reserva combinada, atención, ticket A-000003, consumo único, entrega/gasto/cierre y persistencia de 675 al recargar. Ver `RECORRIDO_UI_DB_20261014.json` y la continuación vigente del producto. Se adelantaron estados de atención mediante acciones normales de la demo, sin cambiar reloj ni fechas.
- **Gerente:** permisos y alcance por sucursal comprobados en API con fixture desechable. Esta guía no afirma un recorrido visual completo con sesión de gerente.
- Secuencia independiente API → base → respuesta → reinicio: `PC21_RECORRIDO_API_sqlite.json` y `PC21_RECORRIDO_API_20261014.md`, **11/11**. Sus números pertenecen a otra fixture (caja 315, utilidad estimada 100.60), por lo que **no deben presentarse como cifras de A-000003 o de la demo visible**.
- Modales nuevos de Agenda: `PC19_AGENDA_MODALES_20261014.md` acredita fuente/TSC y helpers, no reemplaza la aceptación visual del build final. El coordinador mantiene la lista de pantallas y controles verificados.

## Límites que siguen separados de la demo local

Stripe y licencias pagadas reales; WhatsApp/correo efectivamente entregados; proveedor de facturación y revisión fiscal/legal; alojamiento, dominio y respaldo en producción; impresora física y pilotaje con una barbería real. No se contrató ni cobró nada para esta presentación. Mostrar un comprobante local no equivale a probar una impresora ni a emitir CFDI.
