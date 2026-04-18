# Mission Control — Design Spec
**Date:** 2026-04-18  
**Project:** Outreach Engine — Jarvis  
**Scope:** Full rewrite of `dashboard/` (React + Vite + TailwindCSS)

---

## 1. Overview

A monitoring-only dashboard ("Mission Control") that gives full visibility into the outreach engine: scrapers, emails, jobs, and prospects. Nothing in this UI triggers or approves actions — everything is automatic and runs on schedule. The only manual interaction is prospect batch curation (Prospects section).

**Auto-refresh:** every 30 seconds (client-side polling).  
**Theme:** Light/Dark toggle (persisted in localStorage).  
**Stack:** React 18 + Vite + TailwindCSS + Phosphor Icons (`@phosphor-icons/react`).  
**Font:** Public Sans (Google Fonts).  
**No Tremor** — custom components using Tailwind only (Tremor adds too much overhead for this design).

---

## 2. Visual Design System

| Token | Value |
|---|---|
| Sidebar background | `#1e293b` |
| Active nav item | `#3b82f6` |
| Page background | `#f1f5f9` |
| Card background | `#ffffff` |
| Primary text | `#0f172a` |
| Secondary text | `#64748b` |
| Muted text | `#94a3b8` |
| Border | `#e2e8f0` |
| Success | `#10b981` |
| Warning | `#f59e0b` |
| Danger | `#ef4444` |
| Purple (scrapers) | `#8b5cf6` |

Icons: `@phosphor-icons/react` (regular weight). No emojis anywhere.

---

## 3. Layout

```
┌──────────────┬────────────────────────────────────┐
│              │  Header (title + controls)         │
│   Sidebar    ├────────────────────────────────────┤
│   (240px)    │                                    │
│              │  Main content (scrollable)         │
│              │                                    │
└──────────────┴────────────────────────────────────┘
```

**Sidebar nav items:**
- Overview (`House`)
- Scrapers (`Spider`)
- Emails (`Envelope`)
- Jobs (`ClockClockwise`)
- Prospects (`Users`)

**Sidebar footer:** Light/Dark toggle.

---

## 4. Section: Overview

**Purpose:** At-a-glance status of everything that happened today.

### Header
- Title: "Buenos días, Gustavo 👋" + date + "Auto-refresh en Xs"
- Status pills: API Online · Scrapers OK · Emails OK (green/yellow/red based on last health check)

### KPI Cards (4-column grid)
| Card | Value | Detail |
|---|---|---|
| Emails hoy | 42/50 | Progress bar + "X% del límite diario" |
| Leads hoy | 18 | "X nuevos · Y duplicados" |
| Respuestas | 3 | "Esta semana" |
| Bounces hoy | 2 | "De X enviados (Y%)" — red text |

### Area Chart — Últimos 7 días
- Three lines: Emails (blue solid), Leads (purple dashed), Respuestas (green dashed)
- X-axis: day labels (L M X J V S D Hoy)
- Legend inline in card header

### Activity Feed
Recent events list (right of chart):
- Email batch sent
- Respuesta recibida (highlighted green)
- Scraper result
- Bounces detected
- Follow-ups sent

Each item: icon chip + text + relative timestamp.

### Jobs Status (3-column grid)
Mini cards for each job: last run timestamp ✓, next run time.  
Border-left color: green = OK, yellow = warning, red = error.

**API endpoints used:**
- `GET /api/metrics/overview` — KPIs
- `GET /api/metrics/daily` — chart data (last 7 days)

---

## 5. Section: Scrapers

**Purpose:** What the scraper found today and its run history.

### Header
- Title: "Scrapers" + last/next run times
- Status pill: Activo / Error

### KPI Cards (4-column)
| Card | Value |
|---|---|
| Búsquedas hoy | 24 (organic + maps breakdown) |
| URLs visitadas | 87 |
| Leads encontrados | 18 |
| Nuevos (dedup) | 12 (green) — "X ya existían" |

### Main Content (2-column)
**Left — Run history table (last 10):**  
Columns: KEYWORD · TIPO (organic/maps) · ENCONTRADOS · NUEVOS · ESTADO · HORA  
Status badges: ✓ OK (green) · ⚠ 0 resultados (yellow) · ✗ Error (red)

**Right — Two stacked cards:**
1. Bar chart: Leads por día (last 7 days), today highlighted blue
2. Top industrias hoy: horizontal progress bars with count

**API endpoints used:**
- `GET /api/metrics/scraper/today` — KPIs + logs
- `GET /api/metrics/scraper/daily` — 7-day chart data

---

## 6. Section: Emails

**Purpose:** Full log of every email sent, filterable, with prospect detail on click.

### Header
- Title: "Emails" + last send / next send
- Date controls: preset chips (Hoy · 7 días · 30 días) + custom date range picker (start → end)
- Status pill: Activo

### KPI Cards (4-column)
| Card | Value |
|---|---|
| Enviados | 42/50 with progress bar |
| Follow-ups | 8 (FU1: X · FU2: Y breakdown) |
| Bounces | 2 — red, bounce rate % |
| Respuestas | 3 — green |

### Filter Tabs
Todos · Nuevos · Follow-ups · Bounces · Respondidos  
Each tab with count badge where relevant.

### Email Table + Search
Search bar (top right): filter by email address.  
Columns: ☐ · Email · Empresa · Industria · Tipo · Estado · Fecha · ›

**Tipo badges:** Inicial · Follow-up 1 · Follow-up 2 · Follow-up 3  
**Estado badges:** Delivered · Bounced · Respondido · Unsub

Row click → slide-out **Drawer** (right side):
- Company name + email
- Empresa details: Industria · Fuente · Keyword · Sitio web
- Historial de contacto (timeline):
  - Email inicial — date — status
  - Follow-up 1 — date — status
  - Upcoming follow-up (grayed out)
- Estado actual badge

**API endpoints used:**
- `GET /api/emails?from=&to=&status=&search=` — paginated email list
- `GET /api/prospects/:id` — drawer detail

---

## 7. Section: Jobs

**Purpose:** Status of the 3 scheduled jobs and their execution history.

### Header
- Title: "Jobs" + schedule note (L-V · UTC-6)
- Date controls: same preset chips + date range picker as Emails

### Job Status Cards (3-column)
One card per job:

| Job | Schedule |
|---|---|
| Email Send | 8:05am L-V |
| Follow-ups | 10:00am L-V |
| Scraper | 7:42am L-V |

Each card shows: icon · name · cron schedule · status pill (OK/Warning/Error)  
Row data: Último run · Resultado (N enviados / N leads) · Duración · Próximo run  
Top border color: green = OK, yellow = warning, red = error.

### Run History Table
Filter tabs: Todos · Emails · Follow-ups · Scraper

Columns: ● status dot · Job · Fecha · Hora · Resultado · Duración · Ver →  
"Ver →" opens a detail view/modal with the full log output for that run.

**API endpoints used:**
- `GET /api/jobs/status` — current status of all 3 jobs
- `GET /api/jobs/history?from=&to=&type=` — run history

---

## 8. Section: Prospects

**Purpose:** Complete email list with status, search, history, and manual batch curation.

### Layout: Full Table + Slide-out Drawer (Option A)
The table always uses full width. Clicking a row slides a detail drawer from the right.

### Header
- Title: "Prospects" + total count
- Search bar: filter by email address (magnifying glass icon)
- Filter: status dropdown

### Prospect Table
Columns: ☐ · Email · Empresa · Industria · Estado · Último contacto · ›

**Estado badges:** NEW · CONTACTED · FOLLOW UP 1/2/3 · REPLIED · BOUNCED · UNSUBSCRIBED

### Manual Batch Curation
- Checkboxes on each row for manual selection
- **Sticky bottom bar** (appears when ≥1 row selected):  
  "X seleccionados para hoy · quedan Y" + **"Confirmar batch →"** button
- Default: system auto-selects NEW + eligible follow-ups up to the daily limit (50)
- User can override: uncheck auto-selected, check specific ones
- Confirmed selection stores selected prospect IDs in a `daily_batch` table (or similar); the email engine reads from this table at 8:05am instead of the default auto-selection logic
- If no manual batch is confirmed by 8:05am, the engine falls back to auto-selection (NEW + eligible follow-ups, up to limit)

### Drawer Detail
Slides from right, table remains visible (drawer overlays right portion):
- Company name + email
- Source info: Fuente · Keyword · Sitio web · Industria · Fecha extracción
- **Full contact history timeline** — every email sent, status, date
- Current status badge

**API endpoints used:**
- `GET /api/prospects?search=&status=&page=` — paginated list
- `GET /api/prospects/:id` — drawer detail + history
- `PATCH /api/prospects/batch` — confirm manual batch selection

---

## 9. New API Endpoints Required

The following endpoints don't exist yet and must be built:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/metrics/overview` | Overview KPIs + activity feed |
| GET | `/api/metrics/daily` | 7-day chart data |
| GET | `/api/metrics/scraper/today` | Scraper KPIs + run logs |
| GET | `/api/metrics/scraper/daily` | Scraper 7-day bar chart |
| GET | `/api/emails` | Paginated email list with filters |
| GET | `/api/jobs/status` | Current job status (all 3) |
| GET | `/api/jobs/history` | Paginated job run history |
| PATCH | `/api/prospects/batch` | Set manual batch selection for today |

Existing endpoints used as-is:
- `GET /api/prospects` — list
- `GET /api/prospects/:id` — detail
- `GET /api/health` — status pills

---

## 10. Resend Webhook (Required for Email Events)

To populate `EmailEvent` table (DELIVERED, BOUNCED, CLICKED, COMPLAINED):

- New endpoint: `POST /api/webhooks/resend`
- Validates Resend webhook signature
- Writes events to `EmailEvent` table
- Must be registered in Resend dashboard

Without this, the Emails section will show sent emails but no delivery status.  
**This is a dependency for the Emails section to show real-time data.**

---

## 11. What Is NOT in Scope

- Manual email composition or sending
- Editing prospects
- Campaign configuration UI
- Response detection / inbox reading (separate project — Microsoft 365 migration)
- User authentication (single-user tool)
