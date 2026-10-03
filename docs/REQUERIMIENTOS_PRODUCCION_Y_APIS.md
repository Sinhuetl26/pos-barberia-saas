# 📋 CHECKLIST MAESTRO DE REQUERIMIENTOS PARA SALIR A PRODUCCIÓN
## SYSTECH STUDIO — Configuración de Servicios, APIs y Despliegue Comercial

Este documento detalla **absolutamente todo** lo necesario para poner la plataforma en internet con tu propio dominio, cobrar a las barberías en pesos mexicanos (MXN) y automatizar los recordatorios por WhatsApp.

---

## 📑 ÍNDICE DE REQUERIMIENTOS

1. [Dominio Web y DNS](#1-dominio-web-y-dns)
2. [Hosting e Infraestructura](#2-hosting-e-infraestructura)
3. [Base de Datos PostgreSQL Gestionada](#3-base-de-datos-postgresql-gestionada)
4. [Pasarela de Pagos Recurrentes (Stripe Billing México)](#4-pasarela-de-pagos-recurrentes-stripe-billing-méxico)
5. [WhatsApp Business Platform (Meta Cloud API)](#5-whatsapp-business-platform-meta-cloud-api)
6. [Correo Transaccional (Resend o SendGrid)](#6-correo-transaccional-resend-o-sendgrid)
7. [Monitoreo y Alertas (Sentry)](#7-monitoreo-y-alertas-sentry)
8. [Datos Fiscales y Legales (México)](#8-datos-fiscales-y-legales-méxico)
9. [📋 PLANTILLA FINAL: "Copia, llena y entrégame esto"](#9-plantilla-final-copia-llena-y-entrégame-esto)

---

## 1. Dominio Web y DNS

Necesitas un dominio propio para dar imagen profesional a las barberías.

### ¿Dónde comprarlo?
- **Opciones recomendadas**: Cloudflare Registrar, Namecheap, GoDaddy o Google Domains (Squarespace).
- **Ejemplo de dominio sugerido**: `systech.mx`, `systechbarber.com`, `barberpos.mx`.

### Subdominios requeridos:
- `systech.mx` o `app.systech.mx` → Frontend Web (donde entran los usuarios).
- `api.systech.mx` → Backend REST API (donde se conectan las apps).

### ¿Qué se necesita de esto?
| Requerimiento | Descripción | Para qué sirve |
|---|---|---|
| **Nombre de dominio** | Ej. `systech.mx` | Dirección web comercial de tu SaaS. |
| **Acceso a registros DNS** | Acceso a Cloudflare o tu registrador | Para apuntar el frontend, backend y correos. |

---

## 2. Hosting e Infraestructura

El sistema está dividido en dos partes: el **Frontend** (React estático ultrarrápido) y el **Backend API** (Node.js/Express).

### A) Frontend Web (Gratis en planes iniciales)
- **Proveedor recomendado**: **Vercel** o **Cloudflare Pages**.
- **Ventajas**: CDN mundial ultrarrápida, SSL (HTTPS) automático gratuito y despliegue con 1 clic desde tu repositorio de GitHub `Sinhuetl26/pos-barberia-saas` (rama `production`).

### B) Backend API (Costo aprox. $5 a $7 USD/mes)
- **Proveedor recomendado**: **Railway.app**, **Render.com** o **Fly.io**.
- **Ventajas**: Detecta el `Dockerfile` automáticamente, soporta Node 20, SSL automático y monitoreo de salud.

### ¿Qué se necesita de esto?
| Requerimiento | Descripción |
|---|---|
| **Cuenta en Vercel o Cloudflare Pages** | Conectada con tu usuario de GitHub. |
| **Cuenta en Railway o Render** | Para desplegar el contenedor del backend API. |

---

## 3. Base de Datos PostgreSQL Gestionada

Para producción se requiere un PostgreSQL administrado con copias de seguridad automáticas diarias.

### Proveedores recomendados (Capa gratuita o $5 USD/mes):
- **Neon.tech** (Recomendado: arquitectura Serverless Postgres, respaldos instantáneos, capa gratuita generosa).
- **Supabase** (Postgres administrado con interfaz visual).
- **Railway Postgres** (Se crea con un clic dentro del mismo proyecto de Railway).

### ¿Qué se necesita de esto?
| Variable | Formato / Ejemplo | Cómo obtenerla |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:password@ep-host.neon.tech/systech_db?sslmode=require` | Panel del proveedor de BD -> "Connection Details" / "Prisma Connection String". |

---

## 4. Pasarela de Pagos Recurrentes (Stripe Billing México)

Stripe gestiona el cobro automático mensual ($499 MXN Básico / $999 MXN Pro), los 14 días de prueba y las cancelaciones.

### Requisitos previos en Stripe:
1. Crear cuenta en [https://stripe.com/mx](https://stripe.com/mx).
2. Activar tu cuenta proporcionando tu RFC (Persona Física con Actividad Empresarial, RESICO o Persona Moral) y tu cuenta CLABE bancaria mexicana para recibir transferencias.
3. Crear 2 Productos en el catálogo de Stripe:
   - **Plan Básico**: $499.00 MXN mensual recurrente.
   - **Plan Pro**: $999.00 MXN mensual recurrente.
4. Configurar un Webhook apuntando a: `https://api.tudominio.mx/api/suscripcion/webhook-stripe`.
   - Eventos a escuchar: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`.

### ¿Qué llaves ocupas recabar de Stripe?
| Clave / Secreto | Dónde encontrarlo | Ejemplo |
|---|---|---|
| **Stripe Secret Key (Live)** | Dashboard Stripe -> Desarrolladores -> Claves de API -> Clave secreta | `sk_live_51...` |
| **Stripe Webhook Secret** | Dashboard Stripe -> Desarrolladores -> Webhooks -> Clic en tu webhook -> "Secreto de firma" | `whsec_...` |
| **Price ID Plan Básico** | Catálogo de productos -> Plan Básico -> ID de precio | `price_1P...` |
| **Price ID Plan Pro** | Catálogo de productos -> Plan Pro -> ID de precio | `price_1P...` |

---

## 5. WhatsApp Business Platform (Meta Cloud API)

Para el envío de recordatorios automáticos (24h y 2h antes), confirmación de cita y enlace seguro de cancelación.

> **💡 Nota de arranque ágil**: Si mientras completas los trámites de Meta quieres empezar a vender **de inmediato**, el software ya incluye el botón de enlace directo con mensaje pre-armado (`wa.me`) que funciona sin costo alguno. Cuando quieras automatización en segundo plano con la API oficial de Meta, requieres lo siguiente:

### Requisitos previos en Meta (Facebook):
1. Tener cuenta de **Meta Business Suite** (Administrador Comercial).
2. Un número de teléfono celular exclusivo (que no esté registrado en una app normal de WhatsApp en el celular, o que se dé de baja de la app para transferirlo a la API).
3. Crear una App tipo "Negocio" en [developers.facebook.com](https://developers.facebook.com).
4. Agregar el producto **WhatsApp**.
5. Dar de alta las 3 plantillas de mensaje en el administrador de WhatsApp de Meta:
   - `confirmacion_cita_barberia`
   - `recordatorio_cita_24h`
   - `recordatorio_cita_2h`

### ¿Qué llaves ocupas recabar de Meta?
| Clave / Parámetro | Dónde encontrarlo | Ejemplo |
|---|---|---|
| **Phone Number ID** | Developers Meta -> WhatsApp -> Configuración de la API | `102938475610293` |
| **WABA ID (WhatsApp Business Account ID)** | Developers Meta -> WhatsApp -> Configuración de la API | `109283746501928` |
| **Permanent System User Token** | Configuración del negocio -> Usuarios del sistema -> Generar token con permisos `whatsapp_business_messaging` | `EAAG...` (Token permanente sin expiración) |
| **Webhook Verify Token** | Un texto secreto inventado por ti para validar la conexión | `systech_meta_verify_2026` |

---

## 6. Correo Transaccional (Resend o SendGrid)

Para enviar correos de bienvenida, avisos de cuenta, recibos digitales y restablecimiento de contraseña.

### Proveedor recomendado: **Resend** ([resend.com](https://resend.com))
- Es el proveedor más moderno, confiable y tiene un plan gratuito de hasta 3,000 correos al mes.
- Requiere agregar 3 registros DNS (SPF, DKIM, DMARC) en tu dominio para garantizar que los correos no caigan en Spam.

### ¿Qué se necesita de esto?
| Clave / Parámetro | Dónde encontrarlo | Ejemplo |
|---|---|---|
| **Resend API Key** | Dashboard de Resend -> API Keys -> Create API Key | `re_123456789_abcdef` |
| **Remitente verificado** | Dominio configurado en Resend | `SYSTECH Studio <notificaciones@systech.mx>` |

---

## 7. Monitoreo y Alertas (Sentry)

Para enterarte en tiempo real si algún barbero tiene un error en el POS o en el servidor, con detalle exacto de línea y dispositivo.

### Proveedor: **Sentry.io** ([sentry.io](https://sentry.io))
- Plan gratuito permanente (Developer Tier: 5,000 errores/mes).

### ¿Qué se necesita de esto?
| Variable | Formato |
|---|---|
| `SENTRY_DSN` | `https://xxxx@o0.ingest.sentry.io/0` |

---

## 8. Datos Fiscales y Legales (México)

Para colocar tus datos reales en el **Aviso de Privacidad (LFPDPPP)** y los **Términos y Condiciones** que ya dejamos montados en `/privacidad` y `/terminos`:

| Dato Legal | Descripción | Ejemplo |
|---|---|---|
| **Razón Social / Nombre Legal** | Nombre de tu empresa o tu nombre como Persona Física con Actividad Empresarial | *Sinhue Olaf [Apellidos] / SYSTECH Soluciones S.A.S.* |
| **RFC** | Registro Federal de Contribuyentes para el encabezado legal | *OAFS901002XXX* |
| **Domicilio Fiscal** | Ciudad y Estado de operación | *Colima, Colima, México* |
| **Correo de Privacidad (ARCO)** | Correo al que los usuarios pueden solicitar rectificación o baja de datos | `privacidad@systech.mx` |
| **Correo de Soporte General** | Correo público de atención al cliente | `soporte@systech.mx` |
| **Teléfono Oficial de Soporte WhatsApp** | Número mexicano con lada a donde llegarán las dudas | `+52 312 XXX XXXX` |

---

## 9. PLANTILLA FINAL: "Copia, llena y entrégame esto"

Cuando tengas listas las cuentas o quieras que procedamos con el despliegue final, **solo copia el siguiente bloque de texto, rellena tus valores y pégalo en el chat**:

```ini
# ========================================================
# DATOS DE PRODUCCIÓN PARA SYSTECH STUDIO
# ========================================================

# 1. DOMINIO Y URLs PÚBLICAS
DOMINIO_PRINCIPAL="systech.mx"
URL_FRONTEND="https://app.systech.mx"
URL_BACKEND="https://api.systech.mx/api"

# 2. BASE DE DATOS POSTGRESQL (Neon / Supabase / Railway)
DATABASE_URL="postgresql://usuario:password@host.neon.tech/systech_db?sslmode=require"

# 3. STRIPE BILLING (MÉXICO)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_BASICO="price_..."
STRIPE_PRICE_ID_PRO="price_..."

# 4. WHATSAPP BUSINESS CLOUD API (META)
# Si aún no tienes Meta API, escribe: WHATSAPP_PROVIDER="WA_ME_DIRECT"
WHATSAPP_PROVIDER="META_CLOUD"
META_WA_PHONE_NUMBER_ID="1029384756..."
META_WA_ACCESS_TOKEN="EAAG..."
META_WA_VERIFY_TOKEN="systech_token_seguro_2026"

# 5. CORREO ELECTRÓNICO (RESEND)
RESEND_API_KEY="re_..."
EMAIL_FROM="SYSTECH Studio <notificaciones@systech.mx>"

# 6. MONITOREO SENTRY (Opcional)
SENTRY_DSN="https://...@o0.ingest.sentry.io/0"

# 7. DATOS LEGALES Y DE SOPORTE (MÉXICO)
NOMBRE_LEGAL_O_RAZON_SOCIAL="Sinhue Olaf..."
RFC="OAF..."
DOMICILIO_CIUDAD="Colima, Colima, México"
TELEFONO_SOPORTE_WHATSAPP="+52 312 000 0000"
CORREO_SOPORTE="soporte@systech.mx"
CORREO_PRIVACIDAD="privacidad@systech.mx"
```

---

Con estos datos en mano, configurar el despliegue en vivo en tu dominio toma menos de 20 minutos y el sistema queda listo para recibir a sus primeras barberías suscriptoras.
