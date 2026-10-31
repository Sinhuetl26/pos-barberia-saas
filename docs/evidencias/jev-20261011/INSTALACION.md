# Jev MCP de Rashed — instalación y pruebas

Fecha: 2026-10-11. Servidor registrado: `jev-rashed` (configuración global de Codex).

Paquete `jev-mcp@0.5.1`, repositorio https://github.com/rashedInt32/jev-mcp.
Instalación aislada en `.tools/jev-mcp/package`, dependencias bloqueadas en su `package-lock.json`; scripts de instalación desactivados. No se cambiaron dependencias del POS.

## Verificado

- Inicialización MCP por stdio: correcta.
- Descubrimiento de seis herramientas: classify, score, check, ask, triage, models.
- Ausencia de credencial: error controlado; cero consultas al proveedor.
- Registro leído de vuelta mediante Codex: habilitado y apunta a la instalación local.
- Lectura de archivos desactivada (`JEV_FILE_ROOTS=off`). Límites: 20.000 caracteres, cinco elementos, concurrencia uno, timeout 15 segundos.

No se verificó todavía la carga de herramientas en la sesión activa de la app ni la API real. Puede requerirse recargar la conexión MCP o reiniciar la app.

## Pendiente

Crear cuenta y clave en https://console.typesafe.ai. No compartir la clave en chat ni guardarla en el repositorio. Configurar la credencial de forma local antes de las pruebas reales; el servidor admite TYPESAFE_API_KEY o un archivo de credencial externo. En Windows, proteger cualquier archivo de clave mediante permisos del usuario, no confiar en permisos POSIX 0600.

## Pruebas propuestas con datos ficticios

1. Producto sin movimiento: 45 días sin ventas, 12 unidades; elegir entre revisar promoción, reponer o datos insuficientes.
2. Reposición: existencias dos, consumo conocido seis por semana, entrega cinco días; contrastar el juicio con una regla determinista calculada aparte.
3. Diferencia de insumos: consumo esperado 100 ml, conteo indica 180 ml consumidos; clasificar como discrepancia a revisar, sin concluir robo.
4. Datos incompletos: falta costo del producto; debe abstenerse de recomendar por margen.
5. Consistencia: repetir los mismos casos y registrar respuestas, tiempos, uso informado por proveedor y desacuerdos con el resultado esperado.

Estas pruebas no prueban precisión general ni ahorro de cuota de ChatGPT. Los importes, márgenes y existencias siguen calculándose con código verificable.
