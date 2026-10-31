# Revisión funcional limitada de BLUM SYSTEMS — 11 octubre 2026

Pruebas mediante navegador en la cuenta nueva del usuario, perfil «pepe», y en el flujo público de reservas. No es una auditoría de seguridad, arquitectura ni del POS local. Las observaciones no prueban quién desarrolló el producto ni su modelo comercial.

## Resultados comprobados

- La reserva pública muestra catálogo con servicios, paquetes, precios y duraciones. Seleccionar Corte carga fechas y horarios y permite llegar al resumen previo a confirmar, con servicio, barbero, fecha y total coherentes.
- Un teléfono de tres dígitos muestra «Faltan 7 dígitos» y el botón Confirmar cita permanece deshabilitado. No se confirmó ninguna reserva ni se envió un mensaje.
- El formulario interno de nueva cita rechaza guardar sin cliente mediante validación de campo obligatorio.
- Se creó en la cuenta nueva un servicio ficticio «PRUEBA QA — NO USAR — 11 OCT», precio $200, duración 30 minutos. Aparece en el catálogo y continúa visible después de recargar y volver a Servicios. Esto verifica persistencia al recargar, no identifica dónde se almacena ni prueba aislamiento entre cuentas.
- La sesión se recupera después de recargar, aunque durante la carga aparece brevemente el formulario de login.
- Se revisaron vistas de equipo, servicios, productos, ventas, reportes, perfil, reactivación y Agenda web. No apareció un control de pago, plan o suscripción en estas vistas. Esto no demuestra ausencia de cobro por otros canales o límites posteriores.
- Cierre de caja abre una alerta con efectivo esperado, digital, vendido, propinas y ganancia; no se observó un proceso de conteo físico, diferencia y cierre trazable en esta interacción. La alerta se cerró sin registrar ventas.

## Problemas de experiencia observados

1. Mientras carga la disponibilidad, el calendario muestra inicialmente toda la semana como cerrada; después aparecen espacios. Falta distinguir carga de cierre real.
2. La cuenta nueva permite abrir Nueva cita sin equipo ni servicios y no ofrece una guía de preparación en las pantallas revisadas. Los selectores inicialmente vacíos dificultan saber por dónde empezar.
3. Agenda web mezcla «Vista previa segura», «En esta vista no se modifica producción», «Ventas del periodo Demo» y «Conexión en producción». Muestra tres productos sincronizados en esa sección mientras el inventario de la cuenta nueva no mostraba productos. El origen de esos números no está claro; no constituye prueba de acceso a datos ajenos.
4. Cierre de caja presenta una alerta informativa de navegador; el flujo observado no permite comprobar un arqueo completo.

## Límites y estado de los datos

No se probaron cobros reales, app POS local, envío de invitaciones, mensajes, creación de citas, renovaciones, vencimiento de licencias, aislamiento entre negocios o seguridad. El servicio ficticio quedó guardado, claramente rotulado; no se eliminó porque no se comprobó una opción de recuperación. No se accedió a registros de otros negocios.

Evidencia: servicio-persistente.png y demo-produccion.png. No se reproducen correo, teléfono o credenciales del usuario en este informe.

Conclusión: el panel tiene funciones operativas comprobadas; no es correcto describirlo como una maqueta vacía. Hay carencias visibles de incorporación de negocios, explicación comercial y separación entre demo y producción. La calidad de su operación completa sigue sin verificarse.
