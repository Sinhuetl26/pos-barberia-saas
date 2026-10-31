# Tickets: nombre del cobrador y cierre más claro

15/oct/2026. Solicitud de Sinhue: quitar correo de «Cobrado por», usar nombre y pulir manteniendo el resto del formato.

## Resultado

- Nuevas ventas consultan nombre de la cuenta autorizada dentro del negocio y guardan snapshot, no nombre del payload ni correo. Aviso interno nuevo usa el mismo nombre; la identidad de auditoría no se modifica.
- HTML58/80, datos del ticket y texto preparado para WhatsApp usan resolución común. Si un ticket antiguo guardó un correo, se consulta el nombre actual de esa cuenta exclusivamente dentro del tenant; si no hay identificación disponible se informa «Nombre no disponible». No se infiere el cobrador a partir del profesional que atendió. Un snapshot de nombre válido no cambia cuando se renombra la cuenta.
- La resolución de tickets antiguos no reescribe la venta histórica. No se realizó migración ni cambio en registros financieros de demo. Campos internos históricos/CSV no se transformaron por esta presentación.
- Cierre: título/botón simplificados, fecha de sucursal explícita y firma «Firma de quien cierra», útil si cobra dueño o barbero. El formato térmico y todas las cifras se conservan.

Archivos: `utils/receipt-identity.ts`, `services/pos-sale.service.ts`, `routes/pos.routes.ts`, `routes/cortes.routes.ts` en API. API build PASS; sin cambios web/dependencias/esquema/Stripe.

## Verificación

- `qa_receipt_names.cjs`:6/6SQLite desechable. Identidad real vs payload manipulado; replay/stock único; renombre sin alterar snapshot; legado sin reescritura; aislamiento ante cobrador ajeno/inexistente; escapeHTML; texto/JSON/ambos anchos sin correo; cierre con hostUTC y sucursalCancún.
- `test_pos_integrity.js`:17/17PASS.
- `test_cash_integrity.js`:21/21PASS. Su primera ejecución esperaba correo en el aviso y falló por el contrato nuevo; se corrigió a nombre exacto y además se exige que sea distinto del correo. Sin retirar comprobaciones financieras o de permisos; reejecución completa PASS.
- `verify_commercial_review.py`:PASSRO; A3=600/Gel490/Cera1/corte675cuadrado, y datos de copia de revisión intactos. No se cobró ni cerró de nuevo.
- `capture_print_samples.cjs` actualizó las tres muestras HTML mediante rutas autenticadas de copia ficticia. Navegador80mm: «Cobrado por: Alex ficticio», sin@fixture.invalid, total600/cambio0;302,36px de ancho,591pxalto, sin desbordamiento. Cierre675 usa zonaAmerica/Mexico_City y rótulos nuevos. Capturas `ticket-80mm-mejorado-20261015.jpg` y `cierre-mejorado-20261015.jpg`.

Demo API3103 reiniciada, sesión26935; preview5197 permanece85350. Las muestras son estáticas y exclusivamente ficticias, no un modo público para tickets reales. Preservadas pestañas de ticket y cierre. La salidaPDF/ventana emergente e impresión física siguen sin certificarse, PC12 no se transforma en completado. No se hicieron pruebas nuevas en PostgreSQL durante este cambio.
