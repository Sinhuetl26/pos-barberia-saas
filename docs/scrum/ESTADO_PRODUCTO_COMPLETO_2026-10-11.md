# Estado del plan de producto completo

Fecha: 11 de octubre de 2026. Inicio programado: 18:15, America/Mexico_City.

Automatización confirmada: producto-completo-pos-iniciar-a-las-18-15. Ejecución única en este chat.

Los siguientes bloques pertenecen al nuevo plan. Las implementaciones y pruebas anteriores se conservan como base; no acreditan automáticamente estos criterios ampliados.

Estados permitidos: Pendiente, En curso, Implementado, Verificado o Bloqueado. Implementado no equivale a Verificado. Añadir evidencia concreta antes de actualizar el estado.

| Bloque | Alcance | Estado | Evidencia |
| --- | --- | --- | --- |
| PC-01 | Integridad de inventario — ST-41 / CD-11 | Verificado | QA_INVENTARIO.md: 44 checks SQLite/PostgreSQL; UI de intención recuperada y copia aislada |
| PC-02 | Entradas, mermas y trazabilidad — ST-41A | Verificado | API QA + compra navegador 2→5, costo 65, referencia/responsable visibles en Kardex; copia 5191 |
| PC-03 | Conteos físicos seguros — ST-41B | Verificado | QA_CONTEOS.md: 16 checks; borrador parcial persiste; aceite 5→4, peine no contado conserva 5; recuperación y capturas |
| PC-04 | Insumos y recetas — ST-42A | Verificado | QA_INSUMOS.md y recorrido12oct: receta5ml, terminar500→495, cobrar A-000002 conserva495; corrección API/historia aprobadas |
| PC-05 | Diferencias de insumos — ST-42B | Verificado | CIERRE_REVISIONES_RESTANTES_20261014.md:11QA SQLite ejemplo500-300=200/conteo150/diferencia50/tolerancia49-50; GUI desglose500-10=490, dato físico faltante explícito y corrección móvil390px cancelada con foco. Medición real externa |
| PC-06 | Mi jornada del barbero — ST-02/06/29/31 | Verificado | CuentaBARBERO390px: Atender→Terminar→Cobrar con cliente/profesional/precio; A-000002; API roles previamente verificados |
| PC-07 | Llegadas y fila presencial | Verificado | CIERRE_REVISION_INTERNA_20261014.md:9API por motor, fila280 revisada/asignada una vez, rechazo fuera de horario sin cambio, reapertura de cita y recuperación; copia aislada5198 |
| PC-08 | Agenda y disponibilidad del equipo | Verificado | CIERRE_REVISION_INTERNA_20261014.md:9API por motor conPC07; ausenciaLuis histórica preservada; turno especialMateo14oct09–23 revisado impacto0 y guardado en copiaQA; disponibilidad rechaza fuera de horario |
| PC-09 | Servicios combinados | Verificado | CIERRE_REVISIONES_RESTANTES_20261014.md:6/6SQLite+6/6PG incluido reprogramar/cancelar visitaentera; GUI una cita450/75 y selección pública2servicios/75/450, A3 existente600 sin duplicar |
| PC-10 | Precio opcional por profesional | Verificado | CIERRE_REVISION_INTERNA_20261014.md:10API por motor conPC11, cotización pública/POS/interna280, herenciaAlex200, cita/fila280 persistentes; hooks5+fila4. Demo principal conserva reglas vacías |
| PC-11 | Descuentos con control | Verificado | CIERRE_REVISION_INTERNA_20261014.md:10API por motor conPC10, helpers5+recuperación26; otra cuentaaprueba, cambioTarjeta→SPEI requiere renovación; A4ficticia170 una vez, comisión68, identidad/aprobaciónUSADA |
| PC-12 | Cierre diario guiado — ST-06/09 | En curso | CIERRE_REVISIONES_RESTANTES_20261014.md:previsualización7por motor/regresiones+GUI y persistencia cierre675 ya aprobados; pendiente aceptación de ventana/comprobante/impresión del navegador controlado. No repetir cierre ni A3. Impresora real externa |
| PC-13 | Gastos operativos | Verificado | CIERRE_REVISION_INTERNA_20261014.md:gastos8QA actuales, evidencia anterior en ambos motores; UI original12→corrección14/v2/motivo responsable/recarga, sin efectivo; DBRO concilia originalinmutable+corrección |
| PC-14 | Inteligencia del dueño — ST-30 | Verificado | CIERRE_REVISION_INTERNA_20261014.md:fix histórico5 por motor independiente; E2E anterior utilidad100.60; navegador neto1350/441comisión/39gasto y utilidad desconocida explícita. Horarios históricos no versionados informados |
| PC-15 | Historial y próxima visita — ST-29 | Verificado | CIERRE_REVISION_INTERNA_20261014.md:perfil→agenda mismo cliente sin reserva automática/foto copiada, fallback retirado5checks, equivalenciaMX7 por motor y reservas20, privacidad17 previa. Internacional10/cuotas por alias fuera del cierre |
| PC-16 | Primer uso e importación — ST-26 | Verificado | PC16_IMPORTACION_20261014.md:10checks por motor,16recuperación; UI inválido/lote/stock persistente/duplicado/exporte; checklist opcional integrado |
| PC-17 | Búsqueda y acciones rápidas | Verificado | PC17_BUSQUEDA_20261014.md:13API por motor+10UI;390px flechas/Enter artículo exacto y Escape devuelve foco/origen; permisos+literales |
| PC-18 | Personalización de reservas | Verificado | CIERRE_REVISIONES_RESTANTES_20261014.md:fix parches que borraban galería/URL privada;7por motor+5helpers;6variantes390px, save/reload/orden/oculta, lazy/falloCTA, sin opcionales y textos antesconfirm en copia5198. Principal conservada |
| PC-19 | UI/UX transversal — ST-31 | Verificado | CIERRE_CUATRO_BLOQUES_20261014.md: modales Agenda/Clientes/Equipo/POS/registro y teclado;39mediciones; contraste secundario corregido/computed; errores/retry y respuestas antiguas Clientes6/6. Verificado local, sin certificado WCAG global |
| PC-20 | Auditoría comprensible | Verificado | CIERRE_REVISIONES_RESTANTES_20261014.md:9por motor; gastos/citas/cierres proyectados sin secretos, sucursal tenant-scoped y snapshot; GUI12→14/v2 y cierre675/675/0 móvil385en390; monedas/estados legibles |
| PC-21 | Regresión y demo final — CD-19/20 / ST-44 | Verificado | CIERRE_CUATRO_BLOQUES_20261014.md:13/13suites y phase3 final23/23;11/11 por motor+17privacidad; navegador A3=600→cierre675, persistencia final sin repetir; timeout5/5, guion e inicio local. Proveedores/impresión física pendientes |
