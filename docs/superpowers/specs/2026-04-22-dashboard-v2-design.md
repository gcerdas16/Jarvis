# Dashboard v2 — Spec de diseño
**Fecha:** 2026-04-22  
**Estado:** Aprobado por usuario — listo para implementación

---

## Resumen

20 mejoras al dashboard agrupadas en 3 sub-proyectos. Diseños aprobados en visual companion (mockups en `.superpowers/brainstorm/776-1776838812/content/`).

---

## Sub-proyecto A — Dashboard polish (14 cambios de UI, sin migraciones)

### A1. Date picker en Overview
- Agregar selector de fecha arriba de los KPI cards en `/` (OverviewPage)
- Presets: Hoy / 7 días / 30 días + rango custom
- Al cambiar la fecha, los 4 KPI cards y el área chart se actualizan con datos del período seleccionado
- Default: Hoy

### A2. "Cómo se selecciona" más compacto en /semana
- Ya resuelto en el rediseño del A4 (/semana). El sidebar existente se mantiene pero ahora es el sidebar de la nueva vista acordeón.

### A3. Rediseño /semana — acordeón vertical
- **Diseño aprobado:** `semana-final.html`
- Layout: acordeón vertical, un `<div>` colapsable por día
- Arranca desde **hoy** (no mañana) — el API `/queue/week` debe incluir el día actual
- Hoy aparece **abierto por defecto**, los otros 4 días colapsados
- Dentro de cada día: sección azul "Iniciales" + sección ámbar "Follow-ups", cada una con su conteo
- Cada fila muestra: email, empresa, industria, score, tier badge (con tooltip hover), tipo FU si aplica, días desde último contacto, indicador de atraso
- Click en **cualquier fila** abre drawer con datos completos del prospect
- Header de cada día muestra: nombre del día, conteo de iniciales, conteo de FUs, barra de capacidad mini, total/límite
- Sidebar derecho compacto con: reglas de selección, cadencia, pool actual, leyenda de iconos

### A4. Tooltip en tier badges (N1/N2/N3)
- Aplica en todas las páginas que muestren tier badges: /semana, /queue, /prospects, /emails
- Tooltip oscuro (`#1e293b`) al hacer hover, posicionado arriba del badge
- **N1 (Score 80–100):** Sitio web activo, email directo, industria objetivo, tech stack compatible
- **N2 (Score 50–79):** Información parcial, industria secundaria o mixta
- **N3 (Score 0–49):** Datos mínimos, industria fuera del target, sin tech stack detectado
- Sin leyenda en página — solo tooltip

### A5. Banco de keywords — separar de historial de runs
- En `/scrapers` (ScrapersPage), el banco de keywords y el historial de runs están juntos y confunden
- Separar en **dos secciones claramente diferenciadas** con títulos propios
- Sección 1: "Historial de runs de hoy" (con date picker existente)
- Sección 2: "Banco de keywords" — separada visualmente (divider o card propia debajo)

### A6. Banco de keywords — explicar columnas
- Columna **"Progreso" (ej: 4/5):** significa `currentPage / maxPage` — cuántas páginas de resultados se han buscado para ese keyword. Cuando llega a 5/5 rotó completo.
- Columna **"Todas / Activo / Inactivo":** viene del campo `isActive` en `SearchKeyword`. Activo = `true`, Inactivo = `false`. No hay otro estado posible hoy.
- Agregar tooltips o notas explicativas en los headers de estas columnas

### A7. Eliminar página /unsubscribes
- Quitar la ruta `/unsubscribes` y el ítem del nav
- **Los datos se conservan en la tabla `unsubscribes` de la BD** — son necesarios para el email engine (compliance). Solo se elimina la vista.

### A8. Scrapers — explicar columnas "encontrados" y "nuevos"
- En el historial de runs, las columnas `encontrados` y `nuevos` no son claras
- Agregar tooltips en los headers:
  - **Encontrados** (`prospectsFound`): URLs/negocios que aparecieron en la búsqueda antes de deduplicar
  - **Nuevos** (`prospectsNew`): los que se insertaron en BD después de deduplicación (email no existía antes)

### A9. Emails — date picker actualiza KPI headers
- En `/emails` (EmailsPage), al cambiar el date picker el encabezado de los KPIs dice "ENVIADOS HOY" aunque el período sea otro
- El label debe cambiar dinámicamente: "ENVIADOS HOY" → "ENVIADOS (7 días)" / "ENVIADOS (30 días)" / "ENVIADOS (rango)"

### A10. Emails — contadores por tab
- Cada tab de filtro (Todos / Iniciales / Follow-ups / Bounces / Respondidos) debe mostrar el total de registros
- Ejemplo: `Follow-ups (23)`, `Bounces (4)`
- El conteo viene del API; puede ser una llamada separada o incluirse en la respuesta de `/api/emails`

### A11. Timezone CR en Jobs
- En `/jobs`, el campo "Próximo run" calcula incorrectamente porque usa UTC
- Todos los `next run` deben mostrarse en **America/Costa_Rica (UTC-6)**, sin ajuste de DST (CR no usa horario de verano)
- Afecta las 3 tarjetas de job: Email Send (8:05am), Follow-ups (10:00am), Scraper (7:42am)

### A12. Jobs — drill-down en historial de 7 días
- En `/jobs`, el filtro "7 días" del historial de ejecuciones debe mostrar información adicional respecto a "Hoy"
- Agregar columnas o sección de resumen para el período: total de emails enviados (EMAIL_SEND), total de follow-ups (FOLLOW_UPS), total de prospects encontrados (SCRAPER)
- Puede ser un resumen encima de la tabla o columnas adicionales en la tabla de historial

### A13. Prospects — click en fila completa abre drawer
- Actualmente solo la primera columna es clickeable
- Toda la fila debe ser clickeable para abrir el drawer
- Mantener los checkboxes de selección de batch (click en checkbox no abre el drawer, solo selecciona)

### A14. Eliminar /new-prospects — reforzar filtros en /prospects
- Eliminar la ruta `/new-prospects` y su ítem del nav
- Agregar los siguientes filtros adicionales a `/prospects`:
  - **Industria** (`prospect.industry`) — dropdown con las industrias disponibles
  - **Tipo de empresa** (`prospect.companyType`) — dropdown: solidarista, pyme, corporacion, etc.
  - **Fecha de scrape** (`prospect.createdAt`) — rango de fechas (desde / hasta)
- El endpoint `GET /api/prospects/filter-options` ya existe — extenderlo para incluir `industries` y `companyTypes`
- El endpoint `GET /api/prospects` ya acepta query params — agregar `industry`, `companyType`, `createdFrom`, `createdTo`

---

## Sub-proyecto B — Cola, cadencias y control de envío

### B1. Rediseño Cola de mañana
- **Diseño aprobado:** `queue-final-v3.html`
- **Header:** título + subtítulo con fecha y hora exacta de envío
- **Toggle kill switch** (ver B3) integrado en el header a la derecha
- **Banner de confirmación** debajo del header: azul cuando activo ("X emails confirmados — salen mañana a las 8:05 a.m."), amarillo cuando pausado
- **Barra de límite diario:** `X / 60` con desglose "Y iniciales · Z follow-ups" y overflow al día siguiente
- **Dos listas card lado a lado:**
  - Iniciales: email, empresa, industria, score, tier badge con tooltip hover, chevron clickeable
  - Follow-ups: email, empresa, tipo de FU (FU1/FU2/FU3), días desde último contacto (rojo si atrasado), tier badge con tooltip
- Click en cualquier fila abre drawer completo del prospect
- Tooltip hover en N1/N2/N3 igual que en A4

### B2. Nueva cadencia de follow-ups
- Cambiar en `email-engine.ts`:
  - `CONTACTED → FOLLOW_UP_1`: **9 días** (antes 3)
  - `FOLLOW_UP_1 → FOLLOW_UP_2`: **15 días** (antes 5)
  - `FOLLOW_UP_2 → FOLLOW_UP_3`: mantener en **7 días** (sin cambio)
- El sidebar de `/semana` ya muestra estas cadencias dinámicamente desde el API — actualizar el endpoint `/queue/week` para retornar los nuevos valores

### B3. Kill switch de envíos
- Agregar campo `emailsPaused Boolean @default(false)` al modelo `WarmupState` en Prisma
- Migración: `add_emails_paused_to_warmup_state`
- Nuevo endpoint: `PATCH /api/settings/emails-pause` — toggle del campo
- En `email-engine.ts`: al inicio de `processEmailQueue()` y `processFollowUps()`, verificar `emailsPaused`. Si es `true`, loggear y retornar sin enviar.
- UI: toggle en header de `/queue` (diseñado en B1). Solo afecta envíos; scrapers continúan.

### B4. Documentar criterio de selección de envíos
- El criterio actual (hardcoded en `email-engine.ts`):
  - Iniciales: `take: 50` del pool `NEW`, orden por `createdAt` ASC (FIFO)
  - Follow-ups: `take: 20` por cada nivel (FU1, FU2, FU3), capped por `canSendEmail()`
  - El total está limitado por `DAILY_EMAIL_LIMIT` (env var, default 60)
- Este criterio se muestra en el sidebar de `/semana` y en el banner de `/queue` — no es un split fijo sino el resultado del límite diario
- No se cambia el código; solo se documenta mejor en la UI (ya cubierto por los diseños de B1 y A3)

---

## Sub-proyecto C — Status workflow y follow-up condicional

### C1. Nuevos status manuales en el schema

Agregar al enum `ProspectStatus` en `schema.prisma`:
```
REUNION_AGENDADA
REUNION_REALIZADA
PROPUESTA_ENVIADA
CLIENTE
NO_INTERESADO
REVISITAR
```

Migración: `add_manual_prospect_statuses`

**Regla crítica en email-engine.ts:** Los prospects con cualquier status manual **no reciben follow-ups automáticos**. La lista de statuses "elegibles para FU" pasa a ser explícita: `[CONTACTED, FOLLOW_UP_1, FOLLOW_UP_2]`.

### C2. Tabla ProspectStatusHistory

Nueva tabla para registrar cada cambio de status con quién lo hizo y cuándo:

```prisma
model ProspectStatusHistory {
  id          String          @id @default(cuid())
  prospectId  String          @map("prospect_id")
  prospect    Prospect        @relation(fields: [prospectId], references: [id], onDelete: Cascade)
  fromStatus  ProspectStatus? @map("from_status")   // null si es el primer estado
  toStatus    ProspectStatus  @map("to_status")
  changedBy   String          @default("system")    // "system" o "gustavo"
  note        String?         // nota opcional al cambiar status manualmente
  createdAt   DateTime        @default(now())        @map("created_at")

  @@index([prospectId])
  @@map("prospect_status_history")
}
```

Migración: `add_prospect_status_history`

Backfill: para prospects existentes, insertar un registro inicial con `fromStatus=null`, `toStatus=<status actual>`, `changedBy="system"`.

### C3. API endpoints nuevos

- `PATCH /api/prospects/:id/status` — cambiar status manualmente
  - Body: `{ status: ProspectStatus, note?: string }`
  - Solo acepta los 6 statuses manuales (valida con Zod)
  - Inserta en `ProspectStatusHistory`
  - Retorna el prospect actualizado
- `GET /api/prospects/:id/history` — historial de cambios de status
  - Retorna array de `ProspectStatusHistory` ordenado por `createdAt` DESC

### C4. UI — Dropdown de status en tabla /prospects

- **Diseño aprobado:** `status-workflow.html`
- Columna "Status" en la tabla de /prospects muestra un badge clickeable
- Click abre un dropdown con dos secciones:
  1. **Estados manuales** (los 6): Reunión agendada, Reunión realizada, Propuesta enviada, Cliente, No interesado, Revisitar — clickeables
  2. **Estados automáticos** (CONTACTED, FU1, FU2, FU3, BOUNCED, UNSUBSCRIBED) — visibles pero deshabilitados con nota "El sistema gestiona estos estados"
- Al seleccionar un estado manual, se puede agregar una nota opcional (input inline o mini modal)
- Llama a `PATCH /api/prospects/:id/status`

### C5. UI — Timeline en drawer de prospect

- **Diseño aprobado:** `status-workflow.html`
- En el drawer de /prospects, reemplazar/extender la sección de "historial de contactos" con una línea de tiempo
- Cada evento muestra: status, tag "Automático" o "Manual", fecha y hora, nota si existe
- Los eventos automáticos (email enviado, FU enviado) usan dot gris
- Los eventos manuales (status cambiado por Gustavo) usan dot azul
- El evento más reciente aparece arriba
- Banner naranja "Follow-ups detenidos" cuando el status actual es manual

### C6. Sección /prospects — nueva pestaña para leads activos
- Junto con los filtros existentes, agregar un filtro rápido "Activos" que muestre solo prospects con status manual activo (los 6 nuevos)
- Esto reemplaza la necesidad de una sección separada para "otros statuses" (item 18)

---

## Cambios de routing y nav

| Cambio | Tipo |
|--------|------|
| Eliminar `/unsubscribes` | Eliminar ruta y nav item |
| Eliminar `/new-prospects` | Eliminar ruta y nav item |
| `/semana` rediseñada | Misma ruta, nueva implementación |
| `/queue` rediseñada | Misma ruta, nueva implementación |

---

## Migraciones Prisma requeridas

1. `add_emails_paused_to_warmup_state` — campo `emailsPaused` en WarmupState
2. `add_manual_prospect_statuses` — nuevos valores en enum ProspectStatus
3. `add_prospect_status_history` — nueva tabla ProspectStatusHistory

---

## Archivos principales a modificar

**API:**
- `api/prisma/schema.prisma` — 3 migraciones
- `api/src/services/email-engine.ts` — cadencias + status manuals excluidos de FU + kill switch
- `api/src/routes/prospects.ts` — PATCH status, GET history, filtros nuevos
- `api/src/routes/settings.ts` — nuevo (PATCH emails-pause)
- `api/src/routes/metrics.ts` — date range en overview
- `api/src/routes/campaigns.ts` — cadence values en /queue/week response

**Dashboard:**
- `dashboard/src/pages/WeekPage.tsx` — rediseño acordeón
- `dashboard/src/pages/QueuePage.tsx` — rediseño + kill switch
- `dashboard/src/pages/ProspectsPage.tsx` — dropdown status, filtros nuevos, click fila, timeline en drawer
- `dashboard/src/pages/EmailsPage.tsx` — KPI labels dinámicos, contadores por tab
- `dashboard/src/pages/OverviewPage.tsx` — date picker
- `dashboard/src/pages/ScrapersPage.tsx` — separar secciones, tooltips
- `dashboard/src/pages/JobsPage.tsx` — timezone CR, drill-down 7 días
- `dashboard/src/App.tsx` — eliminar rutas /unsubscribes y /new-prospects
- `dashboard/src/components/TierBadge.tsx` — nuevo componente reutilizable con tooltip
- `dashboard/src/lib/api.ts` — nuevos tipos y endpoints
