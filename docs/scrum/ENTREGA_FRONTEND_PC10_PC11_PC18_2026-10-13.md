# Entrega frontend: tarifas, descuentos y personalización

13 de octubre de 2026. Implementado localmente, pendiente de recorrido completo de navegador con fixture aislado. No se marcaron historias completas por compilar.

## PC10 / PC11

- `CommercialControls` dentro de Equipo, pestaña Tarifas y descuentos para dueño/gerente; conserva permisos de API.
- Tarifas por profesional/servicio: precio específico o heredar catálogo, vigencia local, versión conocida y consulta del historial. No se publican precios predeterminados.
- Política opcional: límites de cada rol, requisito de motivo y minutos de aprobación elegidos explícitamente. Ausencia/desactivación conserva comportamiento actual; se explica en pantalla.
- Solicitudes: resumen autoritario de carrito, motivo, estado y vigencia; decisión únicamente sobre solicitud ajena pendiente. Aprobar no cobra ni reutiliza aprobaciones usadas/vencidas.
- Una operación administrativa pendiente conserva payload/UUID por cuenta y sucursal. Respuesta perdida ofrece recuperar lo mismo; errores definitivos/versiones desactualizadas exigen revisar antes de publicar otra intención.
- Catálogo/precios y solicitudes consultados en paralelo; errores no permiten guardar desde versiones desconocidas. Respuestas de otra sucursal se descartan.
- `api.ts` expone métodos para catálogo resuelto, tarifas, política y aprobaciones. La raíz implementa su integración en POS.
- Reserva pública muestra profesional/precio/líneas de servicios del horario elegido y envía `precioConfirmado` de la cotización. Cambios de tarifa obligan a elegir/revisar horario otra vez. Resumen cacheado distingue profesional y fecha; para “cualquiera” se muestra el profesional ofertado por ese horario.

## PC18

- Reutiliza `personalizacionWeb` y el guardado de configuración existente; no crea constructor adicional.
- Galería opcional, apagada por defecto: hasta 12 enlaces públicos HTTPS autorizados, título, descripción accesible, orden con botones y visibilidad individual.
- No se cargan en vista previa ni se renderizan URLs de API/referencias privadas, credenciales o claves en query. No se reutilizan las fotos privadas de cortes. El sistema no puede verificar legalmente permiso de una foto externa; la UI exige material autorizado.
- Fotografías públicas con carga diferida y recuperación visual ante imagen inaccesible. La galería no impide reservar. Sin galería la página conserva su flujo.
- Instrucciones de llegada y políticas informativas opcionales antes de reservar; texto no activa cargos, depósitos o cancelaciones automáticas.
- Descripciones de servicios y temas/editorial/compacta ya existentes se conservan.
- Backend de validación corresponde a raíz; se coordinó forma de los campos y valores vacíos.

## Validación de esta entrega

- `npx tsc --noEmit -p apps/web/tsconfig.json`: PASS.
- `scripts/test_commercial_ui_helpers.cjs`: 5/5 PASS; porcentajes explícitos/rangos, versión por combinación exacta, conservación de última versión anulada, impedimento de autoaprobación y estados terminales.
- `scripts/test_booking_gallery_ui.cjs`: 5/5 PASS; defaults antiguos, URLs privadas/credenciales/esquemas inseguros, orden/ocultación, alt obligatorio y límites.
- `scripts/test_cash_client_ui_helpers.cjs`: 12/12 PASS con guardas actuales de raíz.
- No se agregaron dependencias. Se aplicó Ponytail: reutilizar APIs, formularios y mecanismo persistente existentes; evitar nuevos editores, subidas externas y políticas automáticas.

Pendiente: revisión de navegador móvil/escritorio y persistencia de configuración con fixture aislado; integración POS/solicitudes por raíz; pruebas independientes backend y reintentos de aprobación. No se desplegó ni contrató nada y no se modificaron precios reales.

## Actualización PC12

La entrega previa describía una limitación real de la API entonces disponible. Ya se integró el nuevo endpoint de previsualización: declarar conteo → comparar sin cerrar → confirmar con token ligado a versión/actor/conteo/notas → comprobante. Errores definitivos `CASH_PREVIEW_CHANGED` y `CASH_PREVIEW_EXPIRED` limpian la intención para revisar otra vez; cierre comprometido conserva recuperación del payload original. La raíz mantiene las guardas y la verificación de navegador de `CloseCashGuide`; este documento no reemplaza esa evidencia.
