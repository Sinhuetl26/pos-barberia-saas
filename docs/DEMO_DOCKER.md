# Demo local con Docker

Esta configuración es exclusivamente para la demo ficticia. No publica servicios ni conecta pagos, mensajes o facturación. El compose de producción existente no se modifica.

## Uso diario

Con Docker Desktop abierto, los servicios se recuperan automáticamente gracias a `restart: unless-stopped`. Abrir http://127.0.0.1:5197/app/inicio o http://127.0.0.1:5197/b/cierre-demo. Las credenciales ficticias siguen siendo las del manifiesto local. Se dejó el acceso directo **SYSTECH Demo** en el escritorio para abrir el lanzador.

También se puede hacer doble clic en `Abrir Demo Docker.cmd` en la raíz del proyecto: inicia Docker Desktop, levanta la demo y abre el panel. No requiere terminales de Node ni servicios iniciados desde el chat. La primera descarga/construcción requiere internet; fotos externas también pueden requerirlo.

## Datos y puertos

La API usa3103 y la web5197, publicados solo en127.0.0.1. Los datos activos de Docker están en el volumen `systech-demo_demo_data`. La base original `.tools/product-complete-demo/test.db` se conserva y no se sincroniza automáticamente: después de pasar a Docker, los cambios nuevos viven en su volumen. No alternar los antiguos comandos Node con Docker creyendo que comparten datos.

La semilla `.tools/docker-demo-seed/test.db` se generó mediante backup consistente SQLite de la demo; se copia al volumen solo si todavía no existe test.db. Reiniciar o reconstruir no vuelve a sembrar ni borra ventas. Nunca usar `docker compose down -v`, `docker volume prune` ni borrar el volumen si se quieren conservar los datos.

Para parar sin borrar: `docker compose -f compose.demo.yaml stop`. Para reanudar: doble clic en el lanzador o `docker compose -f compose.demo.yaml up -d --wait`. Si se detiene manualmente, reanudar así antes de esperar arranque automático.

## Instalación o reconstrucción

Desde la raíz del repositorio, preparar la semilla una sola vez con `python scripts/prepare_docker_demo_seed.py` (requiere Python3), luego `docker compose -f compose.demo.yaml up -d --build --wait`. Si la semilla existe se conserva. La página web monta de solo lectura el snapshot de presentación `.tools/product-ui-preview-verified-20261014`; no usa un build diferente ni altera las muestras locales. La API compila la fuente con el cliente Prisma SQLite de Linux. No se ejecutan migraciones ni preparación/reinicio de datos.

## Al iniciar Windows

Se añadió `SYSTECH - Docker Desktop.lnk` a la carpeta Inicio del usuario de Windows, apuntando al ejecutable instalado de Docker Desktop. Así Docker se inicia al entrar a la sesión y recupera los contenedores. Se verificó el destino del acceso directo; no se reinició Windows durante la instalación. Una política de reinicio del contenedor por sí sola no enciende Docker ni la laptop. No se desactiva la suspensión ni se elimina el bloqueo de pantalla.
