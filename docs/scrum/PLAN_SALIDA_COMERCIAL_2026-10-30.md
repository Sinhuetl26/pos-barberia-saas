# Plan de salida comercial controlada

Fecha:30/oct/2026. Alcance inicial:1–3 barberías piloto. El rediseño local está cerrado; esta fase convierte la demo en un servicio operable y cobrable sin prometer todavía escala de50 negocios.

## Objetivo

Conseguir el primer piloto usando la demo local y activar una instalación pública únicamente cuando exista interés real, con datos separados, respaldo restaurable, soporte definido y cobro conciliable.

## Puerta0 — versión comercial reproducible

Estado: **en preparación**.

- [ ] Separar y revisar los385 cambios actuales; conservar archivos del usuario y excluir datos/artefactos locales.
- [ ] Crear una línea base de lanzamiento identificable, sin secretos ni bases de datos.
- [ ] Ejecutar build, regresión completa y revisión de dependencias desde esa línea base.
- [ ] Verificar imagen Docker de producción, migraciones PostgreSQL y arranque desde cero.
- [ ] Mantener demo ficticia y producción real completamente separadas.

Condición de salida: otra computadora o servidor puede reconstruir la misma versión usando instrucciones y variables documentadas.

## Puerta1 — piloto demostrable sin gasto nuevo

- [ ] Guion de demostración de10–15 minutos y credenciales ficticias por rol.
- [ ] Ficha comercial de una página: problema, resultado, funciones verificadas, precio candidato y límites.
- [ ] Formulario de diagnóstico del negocio y acuerdo de piloto.
- [ ] Importador/alta inicial para servicios, productos, equipo, horarios y stock.
- [ ] Canal y horario de soporte; registro de incidentes y respuesta esperada.
- [ ] No anunciar WhatsApp automático, CFDI, alta disponibilidad, modo offline ni escala no medida.

Condición de salida: Sinhue puede enseñar el producto local, captar datos del negocio y cerrar una intención de piloto sin entregar todavía datos reales a una nube insegura.

## Puerta2 — infraestructura pública para1–3 pilotos

- [ ] Dominio y subdominios para app/API; HTTPS obligatorio.
- [ ] Web estática, API Node y PostgreSQL administrado; región cercana y límites de conexiones definidos.
- [ ] Entornos separados: staging y producción; secretos únicamente en el proveedor.
- [ ] CORS, cookies, URLs públicas, proxy confiable y rate limits verificados.
- [ ] Migraciones versionadas; ninguna cuenta o base ficticia en producción.
- [ ] Health/readiness, logs sin secretos y alerta que llegue a una persona real.
- [ ] Respaldo cifrado diario, copia independiente y restauración cronometrada.
- [ ] Exportación de datos por negocio y política de retención/eliminación.

Condición de salida: reinicio, migración, respaldo y restauración pasan sin mezclar empresas; un fallo genera alerta y existe vuelta atrás.

## Puerta3 — identidad, cobro y comunicaciones

- [ ] Nombre/entidad que vende, RFC/régimen, cuenta bancaria y contacto de soporte definidos por el titular.
- [ ] Dominio de correo; SPF, DKIM y DMARC; prueba de entrega, rebote y supresión.
- [ ] Aviso de privacidad, términos, cancelación, renovación y tratamiento de datos revisados.
- [ ] Decidir con contador si los precios publicados son más IVA o IVA incluido.
- [ ] Stripe primero en sandbox: alta, renovación, impago, recuperación, cancelación, cambio de plan y portal.
- [ ] Stripe live solo después de webhook HTTPS, llaves en secretos y una compra controlada autorizada.
- [ ] Distinguir recibo de Stripe de CFDI; no prometer facturación automática sin circuito validado.

Condición de salida: pago, banco/Stripe, licencia y comprobante se concilian; un pago fallido no habilita el sistema.

## Puerta4 — piloto acompañado

- [ ] Alta de un negocio y una jornada acompañada.
- [ ] Cinco días consecutivos usando agenda, cobro, caja, comisión, inventario y exportación.
- [ ] Conciliación diaria de ventas/caja; cero defectos críticos abiertos.
- [ ] Medir tiempo de alta, tiempo por venta, errores, solicitudes de soporte y disposición real a pagar.
- [ ] Revisión a1,3,5 y10 negocios antes de prometer50; detener altas si recursos o soporte rebasan el límite acordado.
- [ ] Testimonio o uso de datos solamente con autorización expresa.

Condición de salida: renovación o pago real conciliado y dueño confirma valor; entonces se invierte en capacidad y automatizaciones según uso observado.

## Lo que necesitamos de Sinhue

No se requieren claves en el chat. Cuando cada puerta lo pida:

1. Tres opciones de dominio y correo de soporte deseado.
2. Nombre/RFC/régimen con el que se cobrará y decisión fiscal revisada con contador.
3. Cuenta Stripe del titular y cuenta bancaria, configuradas por él en sus portales.
4. Uno o dos contactos de barberías dispuestas a piloto acompañado.
5. Presupuesto autorizado antes de contratar; la reserva histórica es$1,000MXN, no autorización automática.
6. Horario real en que se atenderá soporte y cancelaciones.

## Orden de ejecución inmediato

1. Cerrar Puerta0: inventario de cambios, línea base, Docker PostgreSQL limpio y regresión.
2. Preparar materiales de Puerta1 mientras no se gasta.
3. Mostrar la demo y conseguir una intención de piloto.
4. Solo entonces cotizar y contratar Puerta2 con precios vigentes.
5. Activar correo y Stripe sandbox; live únicamente tras fiscal/legal y prueba controlada.

## Marcador

- UI/UX local:100 % y cerrado.
- Salida comercial:0/4 puertas cerradas; Puerta0 iniciada.
- Producción, Stripe live y capacidad50: no certificados todavía.
