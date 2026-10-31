# Preparación de Windows para Systech

Preparado el 11/oct/2026. Este mecanismo prepara la laptop; NO inicia una conversación ni sustituye una tarea programada en la app.

## Componentes

- `Preparar-Systech.ps1`: verifica el proyecto, opcionalmente solicita abrir la app instalada y mantiene el equipo despierto un tiempo limitado. No mantiene encendida la pantalla, guarda contraseñas, cambia el plan de energía o desbloquea Windows. La solicitud de abrir la app no verifica que haya sesión, conexión o uso disponible.
- `Programar-Preparacion-Systech.ps1`: registra una tarea de Windows para el usuario actual con sesión iniciada, permisos normales y WakeToRun. No sustituye tareas existentes. Prefiere PowerShell 7 ya instalado y conserva su política de ejecución; si no existe usa PowerShell de Windows. Ventana oculta. El modo Prueba solo ejecuta diagnóstico una vez al minuto siguiente: no abre la app ni suspende el equipo.
- Registro local: `.tools/windows-preparacion/ultimo-resultado.json`.

## Resultado de inspección de esta laptop

Modern Standby S0 e hibernación disponibles; suspensión S3 no disponible. Temporizadores de reactivación habilitados con corriente, deshabilitados en batería. App identificada por Windows: `OpenAI.Codex_2p2nqsd0c76g0!App`. No se alteraron estos ajustes.

La ejecución con WakeToRun estando despierta no demuestra reanudación desde hibernación ni control de navegador con Windows bloqueado. Para depender de eso hay que hacer una prueba controlada aparte. Mantener conectada la alimentación. La tarea no enciende una laptop completamente apagada y no fuerza reconexión de red ni reinicio de la app si falla.

## Prueba realizada

El 11/oct/2026 a las 04:18:22 de Mexico, Windows ejecuto por horario la tarea temporal de diagnostico. Resultado del Programador: 0 (correcto). El registro del script a las 04:18:23 confirmo proyecto disponible y estado completado. La primera prueba con Windows PowerShell 5 fue bloqueada por su politica de ejecucion; se resolvio usando PowerShell 7 instalado, sin cambiar politicas. Se retiro la tarea temporal al terminar.

Esta prueba no abrio la app, no mantuvo el equipo despierto durante un desarrollo ni suspendio/hiberno la laptop. Esas capacidades siguen sin ensayo fisico. No hay tarea definitiva de Windows ni tarea de chat a las 08:00.

Segunda prueba, 11/oct/2026: Windows registro entrada a Modern Standby S0 a las 04:23:16 y 04:23:17. La tarea se inicio a las 04:23:59 y el script registro preparacion_iniciada a las 04:24:00, con solicitud de apertura de app y cinco minutos de actividad. A las 04:24:09 Windows registro salida de Modern Standby por Input Touchpad. A las 04:25 la tarea seguia ejecutandose, conforme al periodo de cinco minutos; LastTaskResult 267009 indica tarea en ejecucion, no un fallo.

Conclusion de esta segunda prueba: ejecucion programada comprobada durante un intervalo de Modern Standby; no se encontro evidencia de hibernacion S4 ni de reanudacion desde S4. La apertura solicitada no demuestra que la app estuviera lista, y no se programo ninguna actividad del chat. La pantalla no se activo por la tarea en la evidencia disponible: la salida visible registrada fue por touchpad. No equiparar ejecucion en S0 con despertar desde hibernacion.

## Uso futuro (no ejecutado automáticamente por este documento)

Desde la raíz del proyecto, en PowerShell:

```powershell
# Ver tareas existentes
& '.\scripts\windows\Programar-Preparacion-Systech.ps1' -Modo Consultar

# Prueba única para el minuto siguiente
& '.\scripts\windows\Programar-Preparacion-Systech.ps1' -Modo Prueba

# Prueba física: hibernar manualmente después de registrar esta tarea.
# No ejecuta tarde si la hora prevista se pierde; verificar luego el registro
# y los eventos de reactivación antes de afirmar que despertó automáticamente.
& '.\scripts\windows\Programar-Preparacion-Systech.ps1' -Modo Prueba -RetrasoPruebaMinutos 3 -AbrirAppPrueba -MinutosDespierta 5 -SoloHoraPrevista

# Fecha de EJEMPLO: cambiarla a la fecha/hora local realmente acordada.
# Mantiene la laptop despierta hasta aproximadamente 08:40.
& '.\scripts\windows\Programar-Preparacion-Systech.ps1' -Modo Programar -Fecha '2026-10-12T07:55:00' -MinutosDespierta 45

# Retirar solo las dos tareas con los nombres usados por estos scripts
& '.\scripts\windows\Programar-Preparacion-Systech.ps1' -Modo Retirar
```

El equipo utiliza hora local de Windows; confirmar America/Mexico_City antes de programar. La ejecución de 45 minutos no basta para un desarrollo más largo: usar un periodo explícito apropiado, como máximo 120 minutos, y planificar cómo mantener activo un trabajo que lo exceda. Una vez termina el periodo se retira la solicitud de energía y vuelven a regir los ajustes normales.

El Programador de tareas puede necesitar permisos fuera del entorno restringido para registrar/consultar tareas. No se desactiva la política de ejecución: si Windows bloquea el script, revisar el mensaje y autorizar el archivo concreto de forma apropiada; no bajar globalmente las protecciones.

Antes de registrar la tarea definitiva falta acordar la fecha y crear, por separado, la tarea de este chat que ejecutaría el plan de reservas a las 08:00. No se ha creado esa programación.
