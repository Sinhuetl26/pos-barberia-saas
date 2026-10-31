# Demo local en Docker — 18/oct/2026

Objetivo: abrir panel y reservas de la demo sin iniciar manualmente API y Vite desde el chat. Flujo: navegador5197 → API3103 → SQLite persistente → datos de la demo. Sin despliegue, contratación, cargos ni mensajes externos.

## Resultado observado

- Docker Desktop inicialmente respondía «unable to start». Un reinicio autorizado de Docker recuperó el motor29.8.2; no se cambiaron WSL, virtualización, firewall ni credenciales.
- `docker compose -f compose.demo.yaml config --quiet`: PASS. Imagen API Node22/Linux construida con PrismaSQLite y compilación TypeScript/database/API PASS. El compose y Dockerfile de producción PostgreSQL quedan separados.
- Copia inicial SQLite consistente:54tablas verificadas e integrity_check=ok. Base original conservada. Semilla montada solo lectura; inicialización del volumen se hace una vez y sin migraciones. Los datos nuevos de Docker NO se sincronizan de vuelta a la base original.
- Contenedores systech-demo-api-1 y systech-demo-web-1 healthy, puertos publicados solo127.0.0.1:3103/5197. Volumen activo systech-demo_demo_data. Ambos restart:unless-stopped.
- `scripts/test_docker_demo.cjs`: PASS de copia inicial, conservación de cambios ante segunda inicialización, rechazo de archivo inválido y rechazo de semilla ausente. Segunda ejecución del preparador conserva la semilla sin sobrescribir.
- `scripts/verify_docker_demo.cjs`: PASS antes y después de `compose restart api web` + espera de health. API/database connected, perfil público/servicios, login dueño/barbero, A-000003=600, corte675CERRADO/diferencia0, fallbackSPA y assets correctos. Autenticaciones de prueba crean sesiones; no hay escrituras financieras.
- Navegador integrado: portal muestra servicios y tres barberos desde la API; login ficticio de dueño llega a /app/inicio con equipo3 y datos consultados. Captura panel-docker.jpg en esta carpeta. No se generaron reservas ni ventas.
- Web monta el snapshot existente de solo lectura con index-CsF_Gq8U.js/index-KvKj7dxY.css, conservando la portada corregida y las muestras de impresión. No se sustituyó por otro build.
- Inicio de Windows: acceso directo SYSTECH - Docker Desktop.lnk creado en carpeta Inicio del usuario y destino verificado al Docker Desktop instalado. Acceso SYSTECH Demo.lnk creado en escritorio hacia Abrir Demo Docker.cmd. No se reinició Windows: el arranque tras entrar a sesión está configurado, pendiente de observar en próximo inicio real. El reinicio de contenedores sí se probó.

## Límites

Demo ficticia solo local, NODE_ENV=test; proveedores vacíos, sin producción ni capacidad50certificada. PC12/PDF sigue pendiente por decisión previa. No se ejecutó batería completa de negocio porque no se cambió su lógica; se verificó el recorrido de disponibilidad, autenticación y persistencia pertinente. Dependencias existentes se instalaron desde lockfile; no hubo actualización ni audit fix automático. Docker Desktop debe permanecer abierto; cerrar sesión, suspender o apagar detiene la disponibilidad local.

## Uso y continuación

Guía vigente docs/DEMO_DOCKER.md. Ya no arrancar scripts/start_product_demo.cjs ni Vite5197 simultáneamente. Nuevos cambios y datos de presentación deben verificarse contra el volumenDocker. No borrar volumen ni usar down-v/prune si se necesitan sus datos. No hubo commit/reset ni modificación de precios/Stripe.
