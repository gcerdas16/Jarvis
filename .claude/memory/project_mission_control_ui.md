---
name: Mission Control UI — Design APPROVED
description: Complete monitoring dashboard for Outreach Engine. Design fully approved, spec written. NEXT: invoke writing-plans to create implementation plan.
type: project
originSessionId: 79b8b515-0bbc-4ac4-8acf-8e955729e1e9
---
## Status
**Design brainstorming: COMPLETE.** Spec committed to `docs/superpowers/specs/2026-04-18-mission-control-design.md`.
Next step: invoke `writing-plans` skill to create implementation plan.

**Why:** User had zero visibility into scraper runs, email delivery, cron job execution. Pure monitoring dashboard — no manual approval buttons, everything runs automatically.

**How to apply:** Resume by invoking the `writing-plans` skill. Do NOT re-brainstorm — design is locked.

---

## Key Decisions

### Template & Stack
- **Template chosen:** Raple Analytics Admin Dashboard (Figma: `xnhExFkKrjtpone4u1JPHw`)
- **Full rewrite** of `dashboard/` — not extending existing code
- **Stack:** React 18 + Vite + TailwindCSS + `@phosphor-icons/react`
- **No Tremor** — pure Tailwind custom components
- **Font:** Public Sans (Google Fonts)
- **Icons:** Phosphor Icons only — NO emojis anywhere (user hates emojis in UI)

### Design System
- Sidebar: `#1e293b` | Active nav: `#3b82f6` | Page bg: `#f1f5f9`
- Primary text: `#0f172a` | Secondary: `#64748b` | Muted: `#94a3b8`
- Success: `#10b981` | Warning: `#f59e0b` | Danger: `#ef4444` | Purple: `#8b5cf6`

### Behavior
- Auto-refresh every 30 seconds
- Light/Dark toggle (persisted in localStorage)
- Everything automatic — no manual approval/trigger buttons anywhere
- Scrapers run automatically L-V 7:42am
- Emails send automatically 8:05am (initial) + 10:00am (follow-ups), L-V

---

## 5 Sections

### 1. Overview
Header (greeting + date + auto-refresh + status pills) → 4 KPI cards (Emails hoy, Leads hoy, Respuestas, Bounces) → Area chart last 7 days (Emails/Leads/Respuestas) → Activity feed → Jobs status mini-cards (3 jobs).

### 2. Scrapers
Header (last/next run + status) → 4 KPIs (Búsquedas, URLs visitadas, Leads encontrados, Nuevos dedup) → Table of run logs (keyword, tipo, encontrados, nuevos, estado, hora) + right panel (bar chart + top industrias).

### 3. Emails
Header + **date picker** (presets: Hoy/7días/30días + custom range) → 4 KPIs (Enviados/Follow-ups/Bounces/Respuestas) → Filter tabs (Todos/Nuevos/Follow-ups/Bounces/Respondidos) → Table (Email, Empresa, Industria, Tipo, Estado, Fecha) + search → **Slide-out drawer** on row click (company info + full contact timeline).

### 4. Jobs
Header + **date picker** (same as Emails) → 3 job cards (Email Send · Follow-ups · Scraper, each: last run, result, duration, next run) → Run history table (filter by job type) with "Ver →" link per row.

### 5. Prospects
**Layout A: Full table + slide-out drawer.**
Table (Email, Empresa, Industria, Estado, Último contacto) + search bar + status filter.
**Checkboxes** for manual batch curation → sticky bottom bar "X seleccionados · Y restantes + Confirmar batch →".
Batch logic: confirmed selection stored in DB; email engine reads it at 8:05am. Falls back to auto-selection if nothing confirmed.
Drawer: company info, source/keyword, full contact history timeline.

---

## New API Endpoints Required (don't exist yet)
- `GET /api/metrics/overview`
- `GET /api/metrics/daily`
- `GET /api/metrics/scraper/today`
- `GET /api/metrics/scraper/daily`
- `GET /api/emails` (paginated, filterable)
- `GET /api/jobs/status`
- `GET /api/jobs/history`
- `PATCH /api/prospects/batch`
- `POST /api/webhooks/resend` (for EmailEvent table — delivery/bounce/click tracking)

---

## Critical Dependency: Resend Webhook
Without `POST /api/webhooks/resend`, the Emails section shows sent emails but NO delivery status (delivered/bounced/clicked). This endpoint must be built and registered in Resend dashboard before email status data is meaningful.

---

## What Is Out of Scope
- Manual email composition
- Editing prospects
- Campaign configuration UI
- Response detection / inbox reading (separate project — Microsoft 365 migration)
- User authentication

---

## Mockup Files (visual companion server)
Session dir: `C:\Users\cerdascg\12.Gustavo\1. Jarvis\.superpowers\brainstorm\3489-1776527965\content\`
- `design-overview-v4.html` — Overview final
- `design-scrapers-v2.html` — Scrapers final
- `design-emails-jobs.html` — Emails + Jobs final (includes date pickers)
- `design-prospects-options.html` — Prospects Option A selected
