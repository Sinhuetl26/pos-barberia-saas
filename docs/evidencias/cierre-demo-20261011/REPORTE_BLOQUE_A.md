# Inicio del cierre de demo — bloque A

El heartbeat se ejecutó el 11/oct/2026 a las 13:10. Se inició el plan, no se ejecutaron las veinte tareas ni se aceptó el producto para producción.

## Trabajo realizado

- Lectura del plan, estado Git, rutas, esquema, scripts de fixtures y evidencia anterior.
- Matriz de brechas y riesgos en CD01_MATRIZ.md. Revisión visual completa pendiente.
- Nueva base desechable creada con `scripts/prepare_closure_demo.cjs --create`, sin resetear dev.db ni las demos previas. Comprobación SHA-256 de dev.db antes/después de preparación coincidente.
- Dataset: dos negocios; dueño, barbero y dueño de otro negocio; tres profesionales, tres servicios, tres productos, tres clientes y tres citas iniciales con estados distintos. Stock inicial respaldado por tres entradas de Kardex; un producto bajo mínimo.
- API3102 y web5190 separados de API3101/web5179. Primero los procesos aislados no eran accesibles; reiniciados con permisos locales adecuados, la verificación HTTP pasó. No se debilitaron protecciones ni se modificó firewall.
- Reserva pública ficticia creada por API, repetida con la misma clave y encontrada en agenda. Solo una cita nueva persistida.
- Nueve comprobaciones HTTP/datos aprobadas; resultados en CD02_RESULTADOS.json. No sumarlas a pruebas históricas como si fueran una nueva regresión completa.
- Navegador: página pública abre, dueño inicia sesión y llega a Operación de hoy. Recarga vuelve a cargar el panel autenticado. Capturas 01-portada.jpg y 02-panel-dueno.jpg.

## Estado real

CD-01 tiene revisión inicial y matriz entregada; faltan recorridos visuales por pantalla. CD-02 tiene fixture base y verificaciones de acceso/persistencia; faltan reserva de extremo a extremo desde UI, acceso móvil del barbero, ventas históricas transaccionales y fixtures de conteo/recetas cuando se implementen ST-41/42. No se inventaron esas funciones ni resultados.

CD-03 a CD-20 siguen pendientes en esta ejecución. No se editaron interfaces ni lógica de producto durante este primer bloque. Ninguna historia cambió a completada. No hubo mensajes externos, cargos, contratación ni despliegue.

## Inicio reproducible

Desde la raíz del proyecto, ejecutar en terminales separadas:

```powershell
node scripts/start_closure_demo.cjs
$env:VITE_API_URL='http://127.0.0.1:3102/api'
npm run dev --workspace apps/web -- --host 127.0.0.1 --port 5190 --strictPort
```

El primer comando usa el manifiesto existente, no prepara ni resetea datos. El frontend requiere la variable en su propia terminal. Compilar API antes si cambia su código; el arranque actual usa dist existente.

Verificar: `node scripts/verify_closure_demo.cjs`. La reserva de verificación conserva su intención en el fixture; repetir la prueba no crea otra. Requiere API accesible. Preparar otra demo con `--create` genera otra base, mantiene la previa y conserva su manifiesto junto a ella; no ejecutar como un reset diario ni con servidores anteriores aún activos.

URL pública: http://127.0.0.1:5190/b/cierre-demo

Panel: http://127.0.0.1:5190/app/inicio

Cuentas exclusivamente ficticias: dueno-cierre@fixture.invalid, barbero-cierre@fixture.invalid y otro-cierre@fixture.invalid. Contraseña local de todas: CierreDemoLocal2026! No reutilizar en producción.

Continuación exacta en docs/scrum/CONTINUACION_CIERRE_DEMO.md. El entorno funciona; no hay bloqueo externo activo al finalizar este bloque.
