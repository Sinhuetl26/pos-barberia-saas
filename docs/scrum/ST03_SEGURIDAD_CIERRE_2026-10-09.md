# ST-03 · Dependencias y contenedor — cierre de revisión del 9 de octubre de 2026

**Auditoría npm renovada: producción 0 avisos; total 9 (7 altos, 2 moderados, 0 críticos).** No se declara que los nueve avisos estén corregidos. El Dockerfile ahora retira las dependencias de desarrollo después de compilar; la simulación de poda pasó, pero la imagen no se ejecutó.

## Evidencia actual y criterio

`ACTIVIDADES.md:71` exige: secretos fuera de logs, repositorio y respuestas; revisión de dependencias con hallazgos críticos resueltos o mitigados con evidencia. Esta revisión renueva únicamente dependencias y su exposición en Docker. No sustituye el escaneo de secretos ni los escenarios de sesiones de `ST03_EVIDENCIA.md` y `ST01_04_REINTEGRACION.md`; tampoco afirma una nueva entrega de correo o un cierre completo de ST-03.

Fecha real: **2026-10-09**, zona America/Mexico_City. La consulta de producción aprobada terminó a **2026-10-09T18:23:40.428Z** (12:23:40 local). Conteos y paquetes en `ST03_DEPENDENCIAS.json`; el resultado del 5 de octubre permanece bajo `historico`.

| Consulta | Resultado actual | Interpretación |
| --- | --- | --- |
| `npm audit --json` | código 1; 7 altos, 2 moderados, 0 críticos; total 9 | Nueve paquetes señalados, no necesariamente nueve fallos independientes; varios propagan el mismo aviso. |
| `npm audit --omit=dev --json` | código 0; todos los conteos 0 | El grafo de producción del lockfile no presenta avisos npm al consultar; esto no audita el sistema operativo ni garantiza ausencia de vulnerabilidades desconocidas. |
| Poda con `--omit=dev --ignore-scripts --offline --no-audit --no-fund --dry-run --json` | código 0; 180 paquetes se retirarían | Comprobación adicional aprobada: los nueve paquetes con aviso aparecen en la lista de retirada; Prisma no aparece. No se podó el entorno local. |

La consulta normal falló al resolver registry.npmjs.org. Se usó aprobación de la herramienta para acceso de red. El primer intento de producción recibió 503; un reintento acotado de 30 segundos aprobó. No se conservaron cabeceras, cookies ni logs del registro en estos documentos.

## Hallazgos y mitigación fundada

| Grupo | Paquetes señalados | Mitigación y límite |
| --- | --- | --- |
| Patrones anidados; agotamiento de pila | braces, chokidar, fast-glob, micromatch, tailwindcss, ts-node-dev | Dependencias de desarrollo según lockfile; patrones/fuentes del repositorio, sin entrada de clientes en las rutas revisadas. Vite y preview están vinculados a 127.0.0.1. No usar observadores ni servidores de desarrollo en producción. El aviso de braces sigue sin corrección ofrecida por audit. |
| Complejidad al analizar selectores | postcss-selector-parser, postcss-nested; propagación a Tailwind | CSS del repositorio durante compilación, sin aceptar CSS/selectores arbitrarios de clientes. Audit propone Tailwind 4.3.3 como cambio mayor para la cadena; no se aplica esa migración en esta tarea. |
| Mapas de fuentes indexados; bloqueo del bucle de eventos | source-map-js | Herramienta de desarrollo según lockfile; no procesar mapas arbitrarios de usuarios durante compilación. La versión 1.2.1 instalada permanece; audit informa corrección disponible. Requiere actualización puntual futura con validación. |

Estas medidas reducen exposición, no reparan los paquetes. La poda retira el conjunto del runner cuando la imagen se construye correctamente. La mitigación de imágenes ya construidas no se presume: deben reconstruirse y verificarse antes de desplegar.

Fuentes consultadas: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [PostCSS](https://github.com/advisories/GHSA-rj75-hqrm-r3gf), [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), [npm prune](https://docs.npmjs.com/cli/v11/commands/npm-prune/). La documentación npm respalda que `--omit=dev` retira dependencias de desarrollo y `--dry-run` muestra el plan sin aplicarlo.

## Dockerfile: cambio acotado

Antes, el comentario hablaba de módulos podados, pero no había comando de poda: el runner copiaba `node_modules` completo, incluidos Tailwind, Vite y ts-node-dev.

Después de los pasos de compilación existentes se añade `npm prune --omit=dev --ignore-scripts --offline --no-audit --no-fund`. `--ignore-scripts` evita ejecutar ciclos de instalación durante esa poda; `--offline` evita descargar o cambiar paquetes mediante red en ese paso.

El lockfile existente conserva Prisma 5.22.0 mediante la dependencia peer de `@prisma/client`; no está marcado como exclusivo de desarrollo. El dry-run confirma que no se retira, y el Dockerfile exige que existan CLI, cliente generado y salida compilada de database. También exige ausencia de Vite, Tailwind, ts-node-dev, braces, source-map-js y postcss-selector-parser. Si alguna condición falla, la construcción se detiene en lugar de publicar una imagen incompleta.

Las dependencias anidadas de runtime de la API (`svix` y `standardwebhooks`) siguen presentes en el grafo y se conserva su copia existente. No se modifican package.json, package-lock, entrypoint, migraciones ni scripts API/QA; no se ejecuta Prisma.

## Validación y pendientes

- Dry-run aprobado; nueve paquetes señalados retirables; Prisma conservado; cliente generado presente en el entorno revisado.
- Docker CLI está instalado, pero consultar el motor devuelve `permission denied` en Docker Desktop. **No se construyó, arrancó ni escaneó una imagen Docker**; tampoco se probó su entrypoint o una migración dentro de contenedor.
- Pendiente antes de desplegar: construir el Dockerfile y revisar dependencias del runner, Prisma/cliente y arranque con migraciones en entorno desechable autorizado; auditar también Node/Alpine y paquetes del sistema. La etiqueta Node 20 Alpine existente no queda certificada por npm audit.
- Pendientes de desarrollo: parche puntual de source-map-js y evaluación de PostCSS/Tailwind; braces y la cadena sin parche permanecen documentados. No se ejecuta `npm audit fix --force` ni una actualización amplia del lockfile.
- El resultado no certifica secretos en todo el historial Git ni en todos los archivos locales; se conserva el límite del escaneo anterior. No se escribieron datos en DB o Notion, ni se ejecutaron suites API.

Decisión de este subalcance: revisión de dependencias completada con conteos actuales, ausencia de críticos npm y mitigaciones documentadas. Aceptación operativa del contenedor pendiente; este informe no cambia el estado integral de ST-03 por sí solo.
