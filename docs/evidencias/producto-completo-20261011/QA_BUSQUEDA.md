# QA independiente PC-17 — búsqueda

11 de octubre de 2026. API revisada y pruebas ampliadas; aceptación UI/atajos/foco reservada al navegador del coordinador.

`scripts/test_workspace_search.cjs` fue ampliado sobre fixtures propios, sin cambios de producto. PostgreSQL usa runtime local y cliente separado, nunca imprime URLs/credenciales.

## Resultados iniciales

SQLite y PostgreSQL: **9 escenarios PASS y1 FAIL**.

PASS: anónimo401; dueño case-insensitive/sucursal correcta; gerente sucursal no asignada/ajena404; barbero solo citas propias y sin lista CRM; query vacío/>80 rechazo400; ausencia de costo/finanzas/token/fotos privadas; cadena tipoSQL tratada como texto/no-store;13 matches reales por grupo devuelven máximo8 y barbero no obtiene CRM; catálogo inactivo/borrado excluido.

## P2 reproducido — wildcard produce resultados ajenos al texto buscado

Consulta `q=%%` devuelve8productos, clientes y citas sin literal%% en sus nombres. Prisma `contains` interpreta LIKE `%` como comodín en ambos motores. No es SQL injection ni fuga de negocio/sucursal: filtros y top8 se mantienen. Sí permite convertir búsqueda de texto en listado amplio y presenta coincidencias falsas. `__` también se cubre en el escenario cuando se resuelva el primer fallo.

Avisado al coordinador, único escritor del endpoint: escapar/rechazar tokens LIKE con mensaje útil. No se marcó PC-17 verificado completo con este fallo abierto; se repetirá tras build.

## Revisión crítica de consultas

- Selecciones explícitas limitan campos y tres grupos usan take8 en servidor; no descarga toda la base para filtrar en frontend.
- Citas del barbero filtran por profesional y sucursal; lista de clientes queda vacía bajo ese rol.
- Datos CRM de dueño/gerente requieren origen en sucursal o vínculo por cita en la sucursal, más tenant autorizado.
- No se ejecuta contenido de búsqueda; pruebas de cadena SQL no alteran el catálogo.
- Se mantiene pendiente revisar casos de sesión/sucursal cambiada durante respuesta en UI, teclado/móvil y abrir registro correcto.

## Repetición después de arreglo literal

SQLite y PostgreSQL:11PASS y1FAIL del escenario adicional de insumo visible para barbero. Los tokens `%%`/`__` ya no expanden búsqueda y los SKU con underscore, porcentaje y backslash sí encuentran el registro literal correcto. Source añade filtro naturaleza INSUMO para roles de venta, pero dist observado todavía no lo contiene; solicitado build final antes de aceptar ese punto.

Consulta nueva usa STRPOS/INSTR y lower sobre identificadores estáticos; query, tenant, sucursal y barbero son valores ligados. La selección SQL recupera solo ID y máximo8 por grupo, después selección ORM limitada de campos. No hay concatenación de input en SQL. Para cambios de CRM entre ambas consultas se sugirió repetir también alcance de sucursal en la selección ORM final, además del filtro tenant/IDs, como defensa adicional.

## Resultado final integrado

Después de compilar filtro INSUMO, **12/12 PASS SQLite y12/12 PASS PostgreSQL (24comprobaciones)**. P2 wildcard corregido sin prohibir SKU válidos: búsquedas literales underscore/porcentaje/backslash funcionan y no expanden directorio. Insumos se buscan por gerente y no aparecen para barbero. Scope raw tenant/branch y selección ORM final conservaron aislamiento y selección privada limitada; los dos hallazgos reproducidos ya no están abiertos en esta suite.
