# Project Guidelines — Outreach Engine

## Stack
- **Hosting:** Railway (4 services)
- **Database:** PostgreSQL (via Railway)
- **ORM:** Prisma (source of truth for DB schema)
- **Frontend:** React + Vite + Tremor + TailwindCSS
- **Backend (API + Email):** Node.js + Express + TypeScript
- **Backend (Scrapers):** Python + Crawl4AI + Serper.dev
- **Email Service:** Resend (activo), AWS SES (backup)
- **AI Extraction:** Claude Haiku (Anthropic API)
- **Search:** Serper.dev (Google organic + Maps/Places)
- **Scheduling:** node-cron
- **CI/CD:** GitHub Actions → Railway auto-deploy
- **Monitoring:** Betterstack

## Project Structure
```
outreach-engine/
├── api/                         # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── index.ts             # Entry point — Express app, routers, scheduler
│   │   ├── routes/
│   │   │   ├── health.ts        # GET /api/health
│   │   │   ├── prospects.ts     # GET /api/prospects, GET /:id
│   │   │   ├── metrics.ts       # GET /api/metrics/overview, /daily
│   │   │   └── campaigns.ts     # GET, POST, PATCH /api/campaigns
│   │   ├── services/
│   │   │   ├── resend-client.ts     # Email client ACTIVO
│   │   │   ├── ses-client.ts        # Email client BACKUP (no se usa en prod)
│   │   │   ├── email-engine.ts      # Cola de envío + follow-ups
│   │   │   ├── warmup-manager.ts    # Límite diario fijo (sin warm-up gradual)
│   │   │   ├── template-engine.ts   # Firma GCWARE + unsubscribe text
│   │   │   └── notification-service.ts  # Alerta a Gmail via Resend
│   │   ├── scripts/
│   │   │   ├── seed-campaign.ts # Seedea campaña activa en BD
│   │   │   └── send-test.ts    # Envía email de prueba
│   │   ├── jobs/
│   │   │   └── scheduler.ts    # Cron: emails 8:05am, follow-ups 10am (L-V)
│   │   └── utils/
│   │       └── db.ts           # PrismaClient singleton
│   ├── prisma/
│   │   ├── schema.prisma       # 14 modelos — FUENTE DE VERDAD
│   │   └── migrations/         # 3 migraciones aplicadas
│   └── package.json
│
├── scrapers/                    # Python + Crawl4AI + Serper.dev
│   ├── scheduler.py             # Scheduler: corre run_daily a las 7:42 AM CR (L-V)
│   ├── Dockerfile               # Python 3.13 + Playwright/Chromium para Railway
│   ├── run_daily.py             # Pipeline diario ACTIVO (Serper → visit → extract)
│   ├── run_solidaristas.py      # Búsqueda enfocada solidaristas
│   ├── seed_keywords.py         # Seed: carga industrias desde data/industries.json
│   ├── data/
│   │   └── industries.json      # 30 industrias × 183 keywords
│   ├── main.py                  # LEGACY — pipeline Crawl4AI directo
│   ├── test_*.py                # 4 test scripts
│   ├── requirements.txt
│   └── src/
│       ├── serpapi/             # Serper.dev integration (ACTIVO)
│       │   ├── search.py        # Organic search
│       │   └── maps.py          # Maps/Places search
│       ├── crawlers/            # Crawl4AI crawlers (legacy)
│       │   ├── base_crawler.py
│       │   ├── directorio_cr_crawler.py
│       │   ├── pymes_crawler.py
│       │   ├── solidaristas_crawler.py
│       │   └── merco_crawler.py
│       ├── google_bot/
│       │   ├── search.py        # LEGACY — Google scraping directo
│       │   └── site_visitor.py  # ACTIVO — visita URLs + AI extraction
│       ├── extractors/
│       │   └── ai_extractor.py  # Claude Haiku extraction
│       └── utils/
│           ├── db.py            # Pool, dedup, insert, visited URLs, logs
│           └── email_extractor.py  # Regex + TLD cleaning + blacklists
│
├── dashboard/                   # React + Vite + Tremor
│   ├── src/
│   │   ├── main.tsx, App.tsx
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

## Conventions
- Use environment variables for ALL configuration — never hardcode secrets, API keys, or URLs
- Database connection via `DATABASE_URL` from Railway
- Use Prisma migrations for ALL database changes — never modify schema manually
- File names: kebab-case for files, PascalCase for React components
- Max 300 lines per file — split if larger
- TypeScript strict mode enabled in all Node.js/React code
- Python code follows PEP 8, type hints required

## Railway Deployment
- Push to `main` branch triggers automatic deployment via GitHub Actions
- Environment variables are set in Railway dashboard — NEVER in code
- Use `railway run` for local development with production env vars
- Health check endpoint: `GET /api/health`
- Four services: `api`, `scrapers`, `dashboard`, `postgresql`

## Database
- **Prisma is the source of truth** for the database schema (14 modelos, 3 migraciones)
- Python scrapers use the same tables via direct queries (asyncpg) — keep in sync with Prisma schema
- Always use parameterized queries — never concatenate user input
- Create migrations: `cd api && npx prisma migrate dev --name description`
- Seed keywords: `cd scrapers && python seed_keywords.py`
- Index on: `email` (deduplication), `status` (pipeline), `source` (analytics), `company_type`, `revisit_after`
- Soft deletes for unsubscribed prospects — never hard delete, never re-contact

## API Patterns
- RESTful endpoints: `GET /api/resource`, `POST /api/resource`
- Always return consistent response format:
  ```json
  { "success": true, "data": {...} }
  { "success": false, "error": "message" }
  ```
- Validate all inputs at the API boundary with Zod
- Use proper HTTP status codes (200, 201, 400, 404, 500)

## Email Engine Rules
- Email client activo: **Resend** (`resend-client.ts`). AWS SES existe como backup (`ses-client.ts`)
- NEVER exceed `DAILY_EMAIL_LIMIT` environment variable (default: 50)
- No warm-up — envía el límite completo desde día 1
- All emails sent from `OUTREACH_DOMAIN` (gcwarecr.com)
- Every email MUST include unsubscribe text at the bottom (added by template-engine.ts)
- Stop all follow-ups immediately when a prospect responds
- Check unsubscribe list before EVERY send
- Rate limit: minimum 30 seconds between emails
- Follow-up cadence: 3 days → 5 days → 7 days
- Schedule: emails at 8:05am CR, follow-ups at 10am CR, Monday-Friday only

## Scraper Rules
- **Active pipeline:** `run_daily.py` — uses Serper.dev for search + Crawl4AI SiteVisitor for extraction
- **Legacy pipeline:** `main.py` — uses Crawl4AI directory crawlers directly (not actively used)
- Serper.dev for search: organic + maps, keyword rotation from DB (30 industries, 183 keywords)
- Crawl4AI SiteVisitor for visiting URLs and extracting emails + AI context
- AI extraction (Claude Haiku) only for sites where emails are found — extracts company context
- Always check deduplication before inserting a new prospect
- Check visited_urls before re-visiting a site (revisit after 90-120 days)
- Rate limit: minimum 5 seconds between requests to the same domain
- Log every scrape attempt in `scrape_logs` table (success or failure)

## Environment Variables

**API (api/.env):**
```
DATABASE_URL                # PostgreSQL connection string (Railway)
API_PORT                    # API port (default: 3001)
NODE_ENV                    # development | production
RESEND_API_KEY              # Resend API key for email sending
REPLY_TO_EMAIL              # Reply-to address (gustavocerdas@gcwarecr.com)
NOTIFICATION_EMAIL          # Gmail for response alerts (gcerdas16@gmail.com)
OUTREACH_DOMAIN             # Email sending domain (gcwarecr.com)
DAILY_EMAIL_LIMIT           # Max emails per day (default: 50)
```

**Scrapers (scrapers/.env):**
```
DATABASE_URL                # PostgreSQL connection string (Railway)
SERPER_API_KEY              # Serper.dev API key (Google search + Maps)
ANTHROPIC_API_KEY           # Claude Haiku for AI extraction
```

## Git Workflow
- Branch naming: `feature/description`, `fix/description`, `hotfix/description`
- Commit messages: imperative mood ("Add feature", not "Added feature")
- Never push directly to `main` — use pull requests
- GitHub Actions runs lint + type check before merge

## Git Repository
- **Repo:** github.com/gcerdas16/Jarvis.git
- **Remote:** origin → main

## Known Issues
- No known issues at this time

## What NOT to do
- Don't hardcode URLs, secrets, or API keys — use environment variables
- Don't use `console.log` in production — use a proper logger
- Don't skip error handling
- Don't create files over 300 lines
- Don't modify the database schema without a Prisma migration
- Don't send emails to prospects in the unsubscribe list
- Don't exceed the daily email limit
- Don't scrape without rate limiting
- Don't store API keys in the repository
- Don't re-visit URLs that are in the visited_urls table (check revisit_after date)
- Don't use Google Custom Search API — use Serper.dev instead
- Don't use `main.py` for scraping — use `run_daily.py`
