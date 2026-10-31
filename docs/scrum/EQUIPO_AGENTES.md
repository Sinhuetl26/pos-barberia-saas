# Equipo de agentes · SYSTECH

Configurado el 2026-10-09 por petición de Sinhue. Sinhue define decisiones comerciales y recibe reportes; delega la ejecución de pruebas y correcciones al equipo. Coordinación e integración: agente principal de este chat.

Página de coordinación en [Notion](https://app.notion.com/p/3f42035ac0d081ae84ffe5226db6d70b?pvs=204).

## Especialistas

| Agente | Responsabilidad | Primera tarea |
| --- | --- | --- |
| producto | Reglas de barbería, alcance, valor agregado y analítica | Refinar prioridad y desglose ST-41/42/30 |
| backend | API, autorización, transacciones, modelos y migraciones | Revisar entradas, ajustes y trazabilidad frente a ST-41 |
| calidad | Pruebas, casos límite, regresión y evidencia | Detectar huecos de verificación ST-01 a ST-09 |
| frontend | Panel, reservas, móvil, accesibilidad y recuperación de errores | Revisar código del recorrido reserva/cobro sin cambiar la app |
| integraciones | Stripe, correo, WhatsApp, CFDI y sus eventos | Preparar alcance concreto de ST-10 y separar prueba/producción |
| infraestructura | Despliegue, seguridad operativa, respaldos y observabilidad | Revisar configuración existente y dependencias ST-12 a ST-14 |

Son seis especialistas, además del coordinador. La herramienta admite cuatro ejecuciones simultáneas incluyéndolo: se trabajan hasta tres especialidades en paralelo y se rotan según dependencias. No son seis servicios permanentes ni tareas programadas que siguen trabajando cuando termina el chat.

Actualización 2026-10-09: se incorpora un séptimo rol, **dueño virtual**, solicitado por Sinhue para asumir recorridos de operación y crítica de producto. Contrato detallado: `docs/scrum/AGENTE_DUENO_VIRTUAL.md`. Evalúa desde pantallas y evidencia propia, propone ajustes y reduce carga humana; sus conclusiones son simuladas y no sustituyen validación física ni aceptación de clientes reales. Identidad creada: `/root/dueno_virtual`. El límite de cuatro ejecuciones simultáneas permanece.

## Cómo se asigna trabajo

1. El coordinador lee estado, define una tarea acotada y entrega evidencia/datos necesarios. No se inicia una historia solo por existir un especialista.
2. Se asignan archivos y responsabilidades sin solapamiento de escritura; las revisiones iniciales son de solo lectura. Un único agente controla navegador compartido y Notion cuando haya cambios.
3. Cada especialista entrega resultado, referencias verificables, pruebas y límites. Un requisito pendiente se distingue de un defecto demostrado.
4. El coordinador revisa hallazgos, integra cambios y ejecuta comprobaciones pertinentes una sola vez sobre el resultado conjunto.
5. Se actualiza evidencia/Notion y se presenta el resultado a Sinhue: resuelto, pendiente, riesgo y siguiente paso. No se le devuelve una lista de pruebas manuales. La simulación no certifica dispositivos físicos, proveedores reales ni aceptación de un piloto.

## Uso a lo largo del desarrollo

- Cierre Sprint 2: calidad y frontend revisan, backend resuelve defectos comprobados y el dueño virtual recorre los tres flujos principales. Sinhue recibe el reporte.
- ST-10/11: integraciones implementa ciclo de licencia y backend revisa persistencia/conciliación; calidad prueba fallos/reintentos.
- ST-12/13/14: infraestructura prepara operación, backend coordina scheduler y calidad verifica recuperación.
- ST-41: producto define entradas/conteos, backend implementa integridad, frontend el flujo, calidad verifica concurrencia y reintentos.
- ST-42/30: producto define unidades/métricas, backend conserva históricos, frontend explica señales y calidad concilia cifras.

## Límites compartidos

No migrar base operativa, desplegar, comprar, realizar cargos reales, enviar mensajes a personas ni compartir secretos fuera del alcance autorizado. Pruebas con datos y bases desechables. No cambiar una historia a Validada sin todos sus criterios y aceptación pertinente. Mantener los cambios previos del repositorio.

## Continuidad

Este documento conserva los roles entre sesiones. Los agentes de ejecución pertenecen a este chat y pueden terminar su tarea. Se reutilizan mediante nuevas asignaciones cuando estén disponibles; si la sesión no conserva un agente, se recrea con el rol y contexto necesario. El documento no garantiza procesos de fondo ni activación diaria automática.

Identidades creadas en esta sesión: `/root/producto`, `/root/backend`, `/root/calidad`, `/root/frontend`, `/root/integraciones` y `/root/infraestructura`.
