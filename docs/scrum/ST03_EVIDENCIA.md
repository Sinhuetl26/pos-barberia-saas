# ST-03 · Recuperar acceso y proteger sesiones

Fecha: 5 de octubre de 2026. Estado: implementación local para revisión. [Actividad en Notion](https://app.notion.com/p/3f02035ac0d081099aaaf27e6e4e15d3).

## Resultado

El usuario puede solicitar recuperación, verificar su correo, aceptar una invitación con su propia contraseña y cerrar sesiones desde Seguridad de mi cuenta. El dueño invita personas sin asignarles una contraseña. Se preservan negocio, sucursales, rol y perfil del barbero de ST-02.

| Trabajo | Resultado |
| --- | --- |
| ST-03.1 Modelo y migración | Versión de sesión por usuario; acciones de seguridad y contadores persistentes; esquemas SQLite/PostgreSQL equivalentes |
| ST-03.2 Recuperación y verificación | Tokens de 256 bits, hash SHA-256, propósito específico, caducidad y consumo atómico |
| ST-03.3 Invitaciones | Solo propietario; contraseña elegida por la persona; reenvío y cancelación revocan enlaces anteriores |
| ST-03.4 Revocación | Cambio y recuperación de contraseña, cierre de sesiones y modificación de permisos invalidan JWT y permisos de impresión previos |
| ST-03.5 Interfaz | Recuperación pública, página de seguridad y formulario de invitaciones; enlace público funciona con sesión anterior vencida |
| ST-03.6 Seguridad y evidencia | Pruebas de abuso, expiración, concurrencia, revocación, revisión de dependencias y capturas |

## Política de acceso

- Recuperación: 30 minutos; verificación: 24 horas; invitación: 48 horas. Los enlaces son de un solo uso. Recuperar contraseña no inicia sesión automáticamente.
- Cambiar contraseña requiere la contraseña actual y cierra todas las sesiones, incluida la actual. Cerrar sesión desde la navegación aplica también a todos los dispositivos. Cambiar permisos revoca sesiones aunque el rol continúe igual.
- Contraseñas nuevas: mínimo 12 caracteres, máximo 72 bytes UTF-8 para evitar truncamiento de bcrypt. Las contraseñas de demostración antiguas siguen sirviendo para entrar; no se aceptan para altas nuevas si no cumplen esta política.
- Las cuentas nuevas requieren correo verificado para operar. En producción también se exige a las cuentas anteriores: la migración no inventa fechas de verificación ni declara correos históricos como verificados. La excepción de cuentas antiguas solo permite conservar la demostración local.
- Verificación y recuperación no reactivan usuarios deshabilitados. La invitación valida al aceptar que sucursales y perfil continúan disponibles; no permite cambiar rol ni negocio desde el enlace.
- Respuesta de solicitud de enlace idéntica para correos existentes y ausentes; procesamiento del proveedor separado mediante una bandeja de salida persistente. Piso de respuesta de 350 ms; no constituye garantía matemática de tiempo constante bajo carga.
- Límites persistentes por IP y correo: cinco solicitudes por cuenta y 30 por IP cada 15 minutos. Los alias comparten contadores. El encabezado `x-test-suite` ya no amplía límites en producción.

## Correo y secretos

Las acciones guardan solo el hash del token y una copia cifrada AES-256-GCM para el envío pendiente. La clave de cifrado se deriva de JWT_SECRET con un propósito separado. El texto cifrado se elimina al aceptar el proveedor, consumir, cancelar o vencer el enlace. La rotación de JWT_SECRET invalida los JWT y los envíos cifrados pendientes; se deben pedir enlaces nuevos.

El enlace usa un dominio configurado en APP_URL, HTTPS en producción y el token en el fragmento, no en la consulta de la URL. La interfaz elimina el fragmento tras leerlo y mantiene el token en memoria. No se imprime el enlace en logs ni se devuelve en la API. El correo escapa el nombre del destinatario y añade una clave de idempotencia por acción para los reintentos de Resend.

La bandeja guarda estados QUEUED, SENDING, RETRY, ACCEPTED, NOT_CONFIGURED, FAILED, CANCELED, CONSUMED y EXPIRED. Reintenta hasta tres intentos, con reserva temporal de dos minutos; retoma pendientes después de reiniciar el proceso. ACCEPTED significa aceptación por el proveedor, no entrega al buzón. El dueño consulta el estado y puede reenviar. No se envió correo externo durante las pruebas.

## Verificación

- Ocho suites de regresión en SQLite aislado; nueva suite `scripts/test_account_security.js` con 14 escenarios de seguridad. Regresión previa de ST-01/ST-02 preservada.
- Recuperación uniforme, límites durables incluso con cabecera de prueba, tokens fuera de respuestas, cifrado pendiente y borrado después de aceptación del proveedor.
- Propósito incorrecto, enlace malformado, vencido y reutilizado rechazados. Dos consumos simultáneos generan un éxito y un rechazo.
- JWT y permiso de impresión previos rechazados tras reset; login anterior falla y el nuevo funciona. Cambio de contraseña y logout revocan enlaces y sesiones.
- Invitación solo del propietario, sucursal ajena rechazada, contraseña suministrada por el dueño ignorada, aceptación con contraseña propia, reenvío y cancelación efectivos.
- Registro normal y asistente generan verificación; eliminado el asistente con contraseña fija. Usuarios históricos sin correo verificado bloqueados en producción.
- Compilación API y TypeScript web correctas; compilación Vite correcta. Aviso de tamaño del paquete web (>500 kB) queda como optimización de rendimiento, no un fallo de compilación.
- Esquema PostgreSQL validado sintácticamente; la ejecución y concurrencia reales en PostgreSQL corresponden a ST-04.
- Navegador: recuperación con correo ficticio, login al panel, sección de seguridad e invitaciones sin campo de contraseña inicial. Corregido el cierre del modal que enviaba al inicio tras un login exitoso.
- Exploración de 95 archivos fuente/versionados: sin patrones de claves privadas, Stripe live o tokens GitHub en esa selección. No es un escaneo completo del historial Git ni de cada archivo local.

## Dependencias

[Informe de auditoría](ST03_DEPENDENCIAS.json). Vite actualizado a 6.4.3 y React Router a 7.18.4, con complemento React compatible y archivo de versiones actualizado. Auditoría de dependencias de producción: cero avisos reportados al ejecutar `npm audit --omit=dev` en esta fecha. Auditoría total: seis avisos altos, cero críticos, en herramientas de desarrollo derivadas de braces; no hay versión corregida de braces en el aviso consultado.

Mitigación: patrones de Tailwind/observación definidos por el repositorio, sin patrones suministrados por clientes; servidores Vite vinculados a loopback y prohibición de usar servidores de desarrollo en producción. El contenedor actual todavía copia dependencias de desarrollo: reducir la imagen y revisar la exposición de herramientas en ST-04/ST-14. Estos avisos no se presentan como resueltos.

Fuentes consultadas: [OWASP: recuperación de contraseña](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), [React Router](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6), [Vite en Windows](https://github.com/advisories/GHSA-fx2h-pf6j-xcff), [braces sin parche disponible](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

## Datos y migración

Migración aditiva `20261005_account_security` aplicada a la base local mediante `scripts/apply_account_security_sqlite.js`. Respaldo consistente previo: `C:\Users\Sinhue\AppData\Local\Temp\systech-before-st03-1791236540825.db`. Se comprobaron conteos de usuarios, clientes y ventas antes/después. No se reinició ni sembró la base de trabajo. La demostración del navegador usa una base separada.

## Capturas

- [Recuperación](../screenshots/ST03_recuperacion.jpg).
- [Seguridad de la cuenta](../screenshots/ST03_seguridad.jpg).
- [Invitaciones del equipo](../screenshots/ST03_invitaciones.jpg).

## Pendientes para validar el lanzamiento

1. ST-08: dominio y remitente reales, SPF/DKIM/DMARC, entrega, rebotes y supresión; configurar APP_URL HTTPS, EMAIL_FROM y RESEND_API_KEY. Las pruebas actuales usan un proveedor controlado.
2. ST-04: aplicar migraciones y repetir las pruebas de aislamiento/concurrencia en PostgreSQL. Revisar que la cadena de migraciones crea una base limpia; esta historia no sustituye esa validación.
3. Sinhue: revisar el recorrido de invitación y la política de cierre de todas las sesiones. Seguridad de mi cuenta está disponible para todos los roles.

ST-03 queda En revisión por la implementación comprobada. No se declara entrega real de correo ni aprobación para producción.

## Actualización de integración · 7 de octubre de 2026

19 escenarios de cuenta por motor; petición cifrada idéntica al reintentar, reserva y respuesta antigua protegidas, intentos atascados resueltos. Regresión actual: 9/9 suites SQLite y 9/9 PostgreSQL. Este resultado actualiza los pendientes técnicos de PostgreSQL descritos en la evidencia histórica anterior. Estado conservado: En revisión. Detalle, límites y capturas en [revisión ST-01 a ST-04](ST01_04_REINTEGRACION.md).

Entrega y dominio reales en ST-08; conservar revisión de dependencias previa. Siguiente desarrollo ST-06.
