# 💈 SYSTECH STUDIO — SUITE INTEGRAL PARA BARBERÍAS (SaaS MULTI-TENANT)

SYSTECH STUDIO es una plataforma SaaS de alto rendimiento diseñada específicamente para la operación comercial, punto de venta (POS), agenda pública y administración de barberías en México y Latinoamérica.

---

## 🌟 Características Principales

- **Punto de Venta (POS) Ultra Rápido**: Cobro en menos de 30 segundos, pagos divididos (efectivo, tarjeta, transferencia SPEI), propinas por barbero, cálculo exacto de cambio e impresión térmica en 58mm y 80mm con apertura automática de gaveta.
- **Agenda Multicanal & Portal Público `/b/:slug`**: URLs limpias sin hashes, selección de múltiples servicios simultáneos, tiempos de buffer entre turnos, lista de espera automática y cancelación por token criptográfico de 64 caracteres.
- **WhatsApp Cloud API & Fallback Directo**: Recordatorios automáticos a las 24h y 2h antes, confirmación de cita, enlace de cancelación segura, horario de silencio nocturno y opt-out (`BAJA`) conforme a la LFPDPPP.
- **Facturación SaaS con Stripe Billing**: Suscripción mensual y anual con periodo de prueba de 14 días sin tarjeta obligatoria, webhooks idempotentes, dunning automatizado de 3 días y cupones de lanzamiento (`FUNDADOR`).
- **Control Financiero & Arqueo Ciego**: Cortes de caja por turno con bitácora de descuadres, registro de gastos menores/retiros con evidencia y exportación de reportes a CSV/Excel para contabilidad.
- **Nómina & Comisiones Flexibles**: Porcentajes diferenciados por barbero para servicios y retail de productos, liquidación periódica con recibo imprimible.
- **Aislamiento Multi-Tenant Estricto**: Inyección forzosa de `tenantId` en capa de datos, tokens firmados con JWT (HS256) y validación de esquemas con Zod.
- **Cumplimiento Legal (México)**: Aviso de Privacidad y Términos y Condiciones conformes con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).

---

## 🏗️ Arquitectura del Monorepo

```text
POS Barberia/
├── apps/
│   ├── api/                      # Backend REST API modular (Node.js + Express + TypeScript)
│   │   ├── src/
│   │   │   ├── controllers/      # Controladores HTTP desacoplados
│   │   │   ├── middleware/       # requireAuth (JWT), requireRole, zodValidator, rateLimit
│   │   │   ├── routes/           # Enrutamiento modular por dominio (auth, pos, citas, crm...)
│   │   │   ├── services/         # Servicios puros y testeables (cálculo de ventas, caja, stripe, whatsapp...)
│   │   │   └── index.ts          # Servidor Express con Helmet, CORS seguro y healthcheck
│   │   └── package.json
│   │
│   └── web/                      # Frontend SPA React 18 + Vite + TailwindCSS + Lucide Icons
│       ├── src/
│       │   ├── components/       # Componentes visuales (Navbar, POS, Modales)
│       │   ├── views/            # Vistas SPA (Landing, Agenda, Pos, CRM, Barberos, Legal, Portal `/b/:slug`)
│       │   ├── utils/            # Formateadores monetarios MXN y fechas es-MX
│       │   └── api.ts            # Cliente API tipado con autenticación Bearer
│       └── package.json
│
├── packages/
│   └── database/                 # Prisma ORM 5 (Modelado relacional, Decimales exactos y migraciones)
│       └── prisma/
│           └── schema.prisma
│
├── scripts/                      # Batería de pruebas automatizadas y utilerías operativas
│   ├── test_phase0_security.js   # 22 tests de seguridad, bcrypt, RBAC y aislamiento tenant
│   ├── test_phase1_financial_and_concurrency.js # 15 tests de comisiones, arqueo y concurrencia
│   ├── test_phase2_integrations.js # 24 tests de Stripe, WhatsApp y tickets térmicos
│   ├── test_phase3_product_suite.js # 18 tests de multi-servicio, no-show, folios y CRM
│   ├── run_all_tests.js          # Ejecutor unificado (79/79 tests)
│   ├── backup_restore.ps1        # Respaldo y restauración en Windows
│   └── backup_restore.sh         # Respaldo y restauración en Linux/macOS
│
├── Dockerfile                    # Multi-stage build Node 20 Alpine para producción
├── docker-compose.yml            # Stack orquestado (PostgreSQL 16 + Redis 7 + API)
├── .env.example                  # Plantilla documentada de variables de entorno
└── package.json                  # Scripts globales de compilación, prueba y desarrollo
```

---

## 🚀 Inicio Rápido en Desarrollo Local

### Requisitos Previos
- **Node.js** v18 o v20 LTS
- **npm** v9 o superior

### 1. Clonar e Instalar Dependencias
```bash
npm install
```

### 2. Configurar Variables de Entorno
Copia el archivo de ejemplo para configurar tus variables locales:
```bash
cp .env.example .env
```
*(Por defecto, el entorno local utiliza una base de datos SQLite lista para usar en `packages/database/prisma/dev.db`)*.

### 3. Generar el Cliente de Base de Datos
```bash
npm run db:generate
```

### 4. Iniciar los Servidores de Desarrollo
En una terminal:
```bash
npm run dev:api     # Backend en http://localhost:3001
```
En otra terminal:
```bash
npm run dev:web     # Frontend en http://localhost:5173
```

---

## 🧪 Pruebas Automatizadas (CI / Calidad)

El proyecto cuenta con **79 pruebas automatizadas** de extremo a extremo que cubren todas las áreas críticas de seguridad, transacciones financieras y concurrencia.

Para ejecutar toda la batería de pruebas:
```bash
npm test
# o: node scripts/run_all_tests.js
```

Para ejecutar suites individuales:
```bash
npm run test:phase0   # Seguridad, JWT, bcrypt y aislamiento multi-tenant (22 tests)
npm run test:phase1   # Finanzas, comisiones, arqueo ciego y carreras de concurrencia (15 tests)
npm run test:phase2   # Stripe webhooks, WhatsApp Cloud API y tickets térmicos (24 tests)
npm run test:phase3   # Multi-servicio, tokens criptográficos, CRM y nómina (18 tests)
```

---

## 🐳 Despliegue con Docker y Docker Compose

Para levantar el entorno completo con **PostgreSQL 16**, **Redis 7** y la **API de SYSTECH**:

```bash
docker compose up -d --build
```

El servidor backend responderá de inmediato en `http://localhost:3001/api/health`.

Para detener el stack:
```bash
docker compose down
```

---

## 📦 Construcción para Producción

Para compilar todos los paquetes con TypeScript y Vite:
```bash
npm run build
```
- El frontend compilado y optimizado se genera en `apps/web/dist/` (listo para servir en Cloudflare Pages, Vercel o CDN).
- El backend compilado se genera en `apps/api/dist/` (listo para ejecutar con `node apps/api/dist/index.js`).

---

## 💾 Respaldos de Base de Datos

### En Windows (PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup_restore.ps1 -Action backup
```

### En Linux / Servidores de Producción:
```bash
chmod +x scripts/backup_restore.sh
./scripts/backup_restore.sh
```

---

## ⚖️ Cumplimiento Legal y Privacidad (LFPDPPP)

- **Aviso de Privacidad**: Disponible públicamente en `/privacidad` con detalles de finalidades primarias y secundarias, medidas de seguridad de datos y correo para ejercicio de derechos ARCO (`privacidad@systech.mx`).
- **Términos y Condiciones**: Disponibles públicamente en `/terminos` detallando el acuerdo de software SaaS, disponibilidad del 99.5% y propiedad inalienable de los datos de cada barbería.
- **Consentimiento del Cliente Final**: Casilla explícita y obligatoria antes de confirmar reservaciones en el portal público `/b/:slug`.

---

© 2026 SYSTECH STUDIO. Todos los derechos reservados.
