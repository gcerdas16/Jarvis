# Outreach Engine — Technical Stack

**Date:** 2026-03-20
**Updated:** 2026-03-22
**Status:** Active
**Version:** 2.0
**Based on:** PROJECT_PLAN.md v1.0

---

## 1. Stack Summary

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Frontend | React + Vite + Tremor + TailwindCSS | Dashboard de métricas desktop-first, Tremor diseñado para analytics, Vite por velocidad de build |
| Backend (API + Email) | Node.js + Express + TypeScript | Sirve la API del dashboard, maneja cola de emails, integración con Resend |
| Backend (Scrapers) | Python + Crawl4AI + Serper.dev | Serper.dev para búsqueda (organic + maps), Crawl4AI para visitar sitios y extraer emails |
| Database | PostgreSQL (Railway) | Relacional, robusto, ya familiar, ideal para datos estructurados de prospectos |
| ORM | Prisma | Type-safe con TypeScript, migraciones automáticas, schema como fuente de verdad |
| Email Service | Resend | Email client activo para envío de cold emails y follow-ups. AWS SES existe como backup |
| AI Extraction | Claude Haiku (Anthropic API) | Extracción de contexto de páginas web, bajo costo (~$0.001/página), buena calidad en español |
| Search | Serper.dev (Google Search + Maps) | Organic search + Maps/Places, 2,500 queries/mes gratis, resultados de calidad para CR |
| Job Scheduling | node-cron (API) + Python scheduler (scrapers) | node-cron para emails/follow-ups, Python zoneinfo scheduler para scrapers |
| Charts | Tremor | Diseñado para dashboards de métricas, integra con Tailwind |
| Hosting | Railway | Deploy fácil con git push, PostgreSQL incluido, buena DX |
| CI/CD | GitHub + GitHub Actions | Lint + type check antes del deploy, 2,000 min/mes gratis |
| Monitoring | Betterstack | Uptime monitoring 24/7, alertas si un servicio se cae, free tier |
| Domain | gcwarecr.com | Dominio actual de envío de emails |

---

## 2. Architecture Diagram

```
                        ┌─────────────────────────────┐
                        │        GITHUB REPO            │
                        │  (Monorepo)                   │
                        │  ├── /api      (Node.js)      │
                        │  ├── /scrapers (Python)        │
                        │  └── /dashboard (React+Vite)   │
                        └──────────┬────────────────────┘
                                   │ push to main
                                   ▼
                        ┌──────────────────────┐
                        │   GitHub Actions      │
                        │   - Lint + typecheck  │
                        │   - Deploy to Railway │
                        └──────────┬───────────┘
                                   │
                    ┌──────────────┼──────────────────┐
                    ▼              ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                          RAILWAY                                 │
│                                                                  │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │  Python Service      │  │  Node.js Service                 │  │
│  │                      │  │                                   │  │
│  │  Serper.dev:         │  │  Express + TypeScript:            │  │
│  │  ├─ Organic Search   │  │  ├─ REST API (dashboard)          │  │
│  │  ├─ Maps/Places      │  │  ├─ Email Engine (Resend)         │  │
│  │  │                   │  │  ├─ Warm-up manager               │  │
│  │  │  Crawl4AI:        │  │  ├─ Follow-up scheduler           │  │
│  │  │  ├─ Site Visitor   │  │  ├─ Template engine               │  │
│  │  │  │  (Playwright)   │  │  ├─ Notification service          │  │
│  │  │  ├─ AI Extractor   │  │  ├─ Unsubscribe handler           │  │
│  │  │  │  (Claude Haiku) │  │  └─ node-cron (scheduling)        │  │
│  │  │  ├─ Email regex    │  │                                   │  │
│  │  │  │  extractor      │  │  Prisma ORM                      │  │
│  │  │  └─ Deduplication  │  │                                   │  │
│  │  │                    │  │  AWS SES (backup email client)    │  │
│  │  │  Keyword Bank:     │  │                                   │  │
│  │  │  ├─ 30 industrias  │  │                                   │  │
│  │  │  └─ ~195 keywords  │  │                                   │  │
│  │  │                    │  │                                   │  │
│  │  │  Directory Crawlers│  │                                   │  │
│  │  │  (legacy/backup):  │  │                                   │  │
│  │  │  ├─ DirectorioCR   │  │                                   │  │
│  │  │  ├─ Pymes.cr       │  │                                   │  │
│  │  │  ├─ Solidaristas   │  │                                   │  │
│  │  │  └─ Merco          │  │                                   │  │
│  └──────────┬───────────┘  └──────────┬────────────────────────┘  │
│             │                          │                          │
│             │     ┌────────────────────┘                          │
│             ▼     ▼                                               │
│  ┌──────────────────────────┐                                    │
│  │      PostgreSQL           │                                    │
│  │                           │                                    │
│  │  Tables:                  │                                    │
│  │  ├─ prospects             │                                    │
│  │  ├─ emails_sent           │                                    │
│  │  ├─ email_events          │                                    │
│  │  ├─ campaigns             │                                    │
│  │  ├─ sources               │                                    │
│  │  ├─ unsubscribes          │                                    │
│  │  ├─ responses             │                                    │
│  │  ├─ scrape_logs           │                                    │
│  │  ├─ industry_categories   │                                    │
│  │  ├─ search_keywords       │                                    │
│  │  ├─ search_jobs           │                                    │
│  │  ├─ visited_urls          │                                    │
│  │  └─ warmup_state          │                                    │
│  └──────────────────────────┘                                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Frontend Service (React + Vite + Tremor)                 │    │
│  │                                                            │    │
│  │  Dashboard:                                                │    │
│  │  ├─ KPI Cards (enviados, abiertos, respondidos, bounces)  │    │
│  │  └─ Pipeline visual (etapas del prospecto)                 │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
        │              │                    │
        ▼              ▼                    ▼
┌──────────────┐ ┌──────────────┐  ┌───────────────────┐
│  Resend       │ │ Anthropic    │  │  Serper.dev        │
│               │ │ API          │  │                    │
│  - Envío      │ │              │  │  - Organic search  │
│  - Tracking   │ │  Claude      │  │  - Maps/Places     │
│               │ │  Haiku       │  │  - 2,500/mes free  │
└──────┬───────┘ └──────────────┘  └───────────────────┘
       │
       ▼
┌──────────────────┐    ┌───────────────────┐
│  Prospectos       │    │  Gmail (Gustavo)   │
│  (empresas CR)    │    │  gcerdas16@gmail   │
│                   │    │                    │
│  ← Cold emails    │    │  ← Notificaciones  │
│  ← Follow-ups     │    │    de respuestas   │
└──────────────────┘    └───────────────────┘

External Monitoring:
├── Betterstack → uptime checks + alertas
└── GitHub Actions → CI/CD pipeline
```

---

## 3. Detailed Decisions

### 3.1 Frontend: React + Vite + Tremor

**Why chosen:** Dashboard desktop-first de métricas sin auth. Vite es más ligero que Next.js (no necesitamos SSR). Tremor está diseñado específicamente para dashboards de analytics con KPI cards, gráficos y tablas listas para usar.

**Key packages/libraries:**
- `react` + `react-dom` — UI framework
- `vite` — build tool
- `@tremor/react` — componentes de dashboard (KPI cards, charts, pipeline)
- `tailwindcss` — utility-first CSS
- `react-router-dom` — routing del dashboard
- `fetch` — llamadas a la API (sin axios)

### 3.2 Backend (API + Email): Node.js + Express + TypeScript

**Why chosen:** Mismo lenguaje que el frontend (TypeScript), Gustavo ya tiene experiencia con Node.js, Express es maduro y simple.

**Key packages/libraries:**
- `express` — HTTP server
- `resend` — envío de emails (cliente activo)
- `@aws-sdk/client-ses` — envío de emails (backup)
- `@aws-sdk/client-sns` — notificaciones de bounces/respuestas (futuro)
- `prisma` + `@prisma/client` — ORM
- `node-cron` — job scheduling (emails 8:05am CR, follow-ups 10am CR, lunes a viernes)
- `zod` — validación de inputs en la API
- `cors` — permitir requests del frontend

### 3.3 Backend (Scrapers): Python + Crawl4AI + Serper.dev

**Why chosen:** Serper.dev reemplazó Google Custom Search API para búsquedas (organic + maps). Crawl4AI se usa para visitar los sitios encontrados y extraer emails + contexto con AI. Originalmente se usaba Crawl4AI para scraping directo de Google, pero Serper.dev es más confiable y no requiere Playwright para la búsqueda.

**Search strategy (Serper.dev):**
- **Organic search** — busca keywords por industria, devuelve URLs de empresas
- **Maps/Places** — busca negocios con dirección, teléfono, website
- **Keyword bank** — 30 industrias × ~6-7 keywords = ~195 keywords en DB con rotación automática

**Extraction strategy (Crawl4AI + AI):**
- **Site Visitor** — visita URLs de Serper, extrae markdown con Playwright
- **Email regex** — extrae emails del markdown (rápido, gratis)
- **AI Extractor (Claude Haiku)** — extrae company_name, industry, company_type, description
- **Visited URLs** — no re-visita sitios (revisit después de 90-120 días)

**Key packages/libraries:**
- `crawl4ai` — motor de scraping (visitar sitios, Playwright)
- `requests` — llamadas a Serper.dev API
- `asyncpg` — conexión directa a PostgreSQL
- `pydantic` — validación de datos scrapeados
- `anthropic` — cliente de Anthropic para Claude Haiku extraction
- `python-dotenv` — carga de variables de entorno

**Deployment:**
- `Dockerfile` — Python 3.13-slim + Playwright/Chromium para Railway
- `scheduler.py` — Scheduler con zoneinfo (7:42 AM CR, L-V), long-running process
- `PYTHONUNBUFFERED=1` — fuerza flush de logs en Docker/Railway

**Legacy (aún en el código pero no se usan activamente):**
- `main.py` — pipeline original con Crawl4AI directo (reemplazado por `run_daily.py`)
- Directory crawlers (`directorio_cr_crawler.py`, `pymes_crawler.py`, etc.) — usados por main.py

### 3.4 Database: PostgreSQL (via Railway)

**Data model (14 modelos, 3 migraciones aplicadas):**
- `sources` — fuentes de scraping (directorio, google, serper_search, serper_maps)
- `prospects` — empresas/contactos con email, status pipeline (9 estados)
- `campaigns` — templates de email (subject + body + 3 follow-ups)
- `emails_sent` — registro de cada email enviado
- `email_events` — opens, clicks, bounces, complaints (schema listo, sin webhook handler)
- `responses` — respuestas de prospectos (schema listo, sin detection logic)
- `unsubscribes` — lista permanente de opt-out
- `scrape_logs` — log de cada ciclo de scraping
- `industry_categories` — 30 industrias organizadas
- `search_keywords` — ~195 keywords con paginación y rotación
- `search_jobs` — log de cada búsqueda en Serper
- `visited_urls` — URLs ya visitadas con revisit scheduling (90/120 días)
- `warmup_state` — estado del warm-up de email

### 3.5 ORM: Prisma

**Why chosen:** Type-safe con TypeScript, schema declarativo legible, migraciones automáticas, genera cliente tipado.

### 3.6 Authentication: None

**Why chosen:** Dashboard accesible vía URL de Railway, solo para uso personal de Gustavo.

### 3.7 Hosting & Deployment: Railway

**Services in Railway:**

| Service | Type | Estimated Cost |
|---------|------|---------------|
| Node.js API + Email Engine | Web Service | ~$5-7/mes |
| Python Scrapers | Worker Service | ~$5-7/mes |
| React Dashboard | Static Site | ~$0-2/mes |
| PostgreSQL | Database | ~$5-7/mes |
| **Total Railway** | | **~$15-23/mes** |

### 3.8 Third-Party Services

| Service | Provider | Purpose | Cost |
|---------|----------|---------|------|
| Email sending | Resend | Envío de cold emails y follow-ups | Free tier: 3,000 emails/mes, luego $20/mes |
| Email sending (backup) | AWS SES | Backup email client | ~$0.10/1,000 emails |
| AI extraction | Anthropic (Claude Haiku) | Extraer contexto de páginas web | ~$1-3/mes |
| Google search + Maps | Serper.dev | Encontrar empresas en Google (organic + maps) | Free tier: 2,500 queries/mes |
| Uptime monitoring | Betterstack | Alertas si algún servicio se cae | $0 (free tier) |

**Total third-party: ~$2-5/mes** (con free tiers)

### 3.9 DevOps & CI/CD

**Pipeline:**
1. Push to GitHub (any branch)
2. GitHub Actions runs: lint + type check (api, dashboard, scrapers)
3. On merge to `main`: auto-deploy to Railway
4. Betterstack monitors uptime post-deploy

---

## 4. Integration Points

| Integration | Components | Risk Level | Notes |
|------------|-----------|-----------|-------|
| Python → PostgreSQL | Scrapers escriben prospectos a la DB | Bajo | Conexión directa con asyncpg, queries simples |
| Node.js → PostgreSQL | API lee/escribe via Prisma | Bajo | Prisma maneja conexión y tipos |
| Node.js → Resend | Envío de emails | Bajo | API key simple, SDK oficial |
| Node.js → AWS SES | Envío de emails (backup) | Medio | Requiere credenciales AWS |
| Python → Serper.dev | Búsqueda organic + maps | Bajo | API key simple, requests HTTP |
| Python → Anthropic API | Extracción de contexto con Claude Haiku | Bajo | API key, costo bajo, fallback a regex si falla |
| Python ↔ Node.js (via DB) | Scrapers alimentan datos que email engine consume | Medio | Se comunican via PostgreSQL, schema debe mantenerse sincronizado |
| Frontend → Node.js API | Dashboard consume métricas | Bajo | REST API estándar, proxy via Vite en dev |

---

## 5. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Schema desincronizado entre Prisma (Node.js) y Python | Queries de Python fallan silenciosamente | Prisma es fuente de verdad; Python usa las mismas tablas |
| Crawl4AI consume muchos recursos en Railway | Costos suben, servicio se vuelve lento | Rate limiting en scrapers, usar Serper para búsqueda (sin Playwright) |
| Serper.dev llega al límite mensual (2,500 free) | Se detiene el descubrimiento de nuevas empresas | Keyword rotation prioriza los menos buscados, visited_urls evita re-trabajo |
| API keys expuestas en .env commiteados | Cargos no autorizados | ✅ RESUELTO: .gitignore excluye .env, secrets en Railway dashboard |
| Railway cold starts en worker services | Scrapers tardan en arrancar | Configurar mínimo 1 replica siempre activa |

---

## 6. Development Environment Setup

### Prerequisites
- Node.js >= 20.x
- Python >= 3.10
- Git
- Railway CLI (`npm install -g @railway/cli`)

### Environment Variables

**API (api/.env):**
```
DATABASE_URL=postgresql://...
API_PORT=3001
NODE_ENV=development
RESEND_API_KEY=re_xxxxx
REPLY_TO_EMAIL=gustavocerdas@gcwarecr.com
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=us-east-1
NOTIFICATION_EMAIL=gcerdas16@gmail.com
OUTREACH_DOMAIN=gcwarecr.com
DAILY_EMAIL_LIMIT=50
```

**Scrapers (scrapers/.env):**
```
DATABASE_URL=postgresql://...
SERPER_API_KEY=xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### Getting Started
1. Clone the repo: `git clone https://github.com/gcerdas16/Jarvis.git`
2. Install Node.js dependencies: `cd api && npm install`
3. Install Python dependencies: `cd scrapers && pip install -r requirements.txt && crawl4ai-setup`
4. Setup database: `cd api && npx prisma migrate dev`
5. Seed keyword bank: `cd scrapers && python seed_keywords.py`
6. Start Node.js API: `cd api && npm run dev`
7. Run scrapers: `cd scrapers && python run_daily.py`
8. Start dashboard: `cd dashboard && npm run dev`

### Project Structure
```
outreach-engine/
├── api/                         # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── index.ts             # Entry point — Express app, routers, scheduler
│   │   ├── routes/
│   │   │   ├── health.ts        # GET /api/health
│   │   │   ├── prospects.ts     # GET /api/prospects, GET /api/prospects/:id
│   │   │   ├── metrics.ts       # GET /api/metrics/overview, /api/metrics/daily
│   │   │   └── campaigns.ts     # GET, POST, PATCH /api/campaigns
│   │   ├── services/
│   │   │   ├── resend-client.ts     # Email client ACTIVO (Resend)
│   │   │   ├── ses-client.ts        # Email client BACKUP (AWS SES)
│   │   │   ├── email-engine.ts      # Cola de envío + follow-ups automáticos
│   │   │   ├── warmup-manager.ts    # Límite diario fijo (sin warm-up)
│   │   │   ├── template-engine.ts   # Firma HTML GCWARE + unsubscribe
│   │   │   └── notification-service.ts  # Notifica a Gmail via Resend
│   │   ├── scripts/
│   │   │   ├── seed-campaign.ts # Seedea campaña activa
│   │   │   └── send-test.ts    # Email de prueba
│   │   ├── jobs/
│   │   │   └── scheduler.ts    # Cron: emails 8:05am CR, follow-ups 10am CR (L-V)
│   │   └── utils/
│   │       └── db.ts           # PrismaClient singleton
│   ├── prisma/
│   │   ├── schema.prisma       # 14 modelos — FUENTE DE VERDAD
│   │   └── migrations/         # 3 migraciones aplicadas
│   └── package.json
│
├── scrapers/                    # Python + Crawl4AI + Serper.dev
│   ├── scheduler.py             # Scheduler: 7:42 AM CR (L-V)
│   ├── Dockerfile               # Python 3.13 + Playwright/Chromium
│   ├── run_daily.py             # Pipeline diario ACTIVO (Serper → visit → extract)
│   ├── run_solidaristas.py      # Búsqueda enfocada en solidaristas
│   ├── seed_keywords.py         # Seed de 30 industrias × ~195 keywords
│   ├── main.py                  # LEGACY — pipeline Crawl4AI directo
│   ├── test_*.py                # 4 test scripts
│   ├── requirements.txt
│   └── src/
│       ├── serpapi/             # Serper.dev integration (ACTIVO)
│       │   ├── search.py        # Organic search
│       │   └── maps.py          # Maps/Places search
│       ├── crawlers/            # Crawl4AI crawlers (legacy, usados por main.py)
│       │   ├── base_crawler.py
│       │   ├── directorio_cr_crawler.py
│       │   ├── pymes_crawler.py
│       │   ├── solidaristas_crawler.py
│       │   └── merco_crawler.py
│       ├── google_bot/
│       │   ├── search.py        # LEGACY — Google scraping directo
│       │   └── site_visitor.py  # ACTIVO — visita URLs, extrae emails + AI
│       ├── extractors/
│       │   └── ai_extractor.py  # Claude Haiku extraction
│       └── utils/
│           ├── db.py            # Pool, dedup, insert, visited URLs, scrape logs
│           └── email_extractor.py  # Regex + TLD cleaning + blacklists
│
├── dashboard/                   # React + Vite + Tremor
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx              # Header + Routes
│   │   ├── pages/
│   │   │   └── DashboardPage.tsx  # KPI cards + pipeline chart
│   │   └── api/
│   │       └── client.ts        # API helper
│   ├── package.json
│   └── vite.config.ts
│
├── .github/workflows/
│   └── deploy.yml               # CI: typecheck + lint
│
├── PROJECT_PLAN.md
├── TECH_STACK.md
└── CLAUDE.md
```

---

## 7. Cost Summary

| Item | Monthly Cost |
|------|-------------|
| Railway (4 services) | ~$15-23 |
| Resend | $0 (free tier: 3,000 emails/mes) |
| Anthropic API (Claude Haiku) | ~$1-3 |
| Serper.dev | $0 (free tier: 2,500 queries/mes) |
| Betterstack | $0 |
| GitHub + Actions | $0 |
| **Total estimated** | **~$16-26/mes** |

---

*Last synced: 2026-03-23*
