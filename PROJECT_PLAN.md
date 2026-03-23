# Outreach Engine — Project Plan

**Client:** Gustavo Cerdas / GCWARE
**Date:** 2026-03-20
**Updated:** 2026-03-22
**Status:** In Development
**Version:** 2.0

---

## 1. Project Overview

### Problem Statement
Gustavo ofrece servicios de desarrollo, automatización e IA (sitios web, apps, integraciones, sistemas custom) pero no tiene un canal activo de prospección para llegar a empresas en Costa Rica. Actualmente no hay forma sistemática de encontrar prospectos, contactarlos y hacer seguimiento de las conversaciones.

### Proposed Solution
Un sistema automatizado end-to-end que:
1. **Scrapea** múltiples fuentes de internet para encontrar empresas en Costa Rica y extraer sus emails de contacto + contexto
2. **Envía cold emails** personalizados según la información recopilada
3. **Hace follow-ups** automáticos (2-3 máximo)
4. **Notifica** cuando un prospecto responde
5. **Presenta métricas** en un dashboard web para analizar y optimizar la estrategia

### Success Metrics
- Tasa de respuesta > 2-5% (benchmark para cold outreach personalizado)
- Generación de al menos 1-2 reuniones por semana con prospectos interesados
- Base de datos creciente de empresas en Costa Rica
- Capacidad de identificar qué segmentos/industrias responden mejor

### Scope Boundaries
**Fuera del alcance:**
- CRM completo para gestión de clientes post-respuesta
- Automatización de respuestas a prospectos (se maneja manualmente)
- Campañas en redes sociales o LinkedIn
- Facturación o gestión de contratos
- Soporte multiusuario o autenticación

---

## 2. User Personas & Stories

### Persona 1: Gustavo (Operador del sistema)
- **Description:** AI Engineer & Automation Specialist, dueño de GCWARE, busca activamente nuevos clientes para sus servicios de desarrollo
- **Goals:** Llenar su pipeline de prospectos de forma automatizada, descubrir qué segmentos del mercado tienen más demanda
- **Pain points:** No tiene tiempo para buscar empresas una por una, no sabe cuál es su cliente ideal todavía, necesita volumen para testear
- **Key user stories:**
  - Como Gustavo, quiero que el sistema scrapee empresas automáticamente para no perder tiempo buscando manualmente
  - Como Gustavo, quiero ver un dashboard con métricas de mi outreach para saber qué está funcionando
  - Como Gustavo, quiero recibir una notificación cuando alguien responda para poder atenderlo rápido
  - Como Gustavo, quiero que los emails se adapten según el tipo de empresa para mejorar la tasa de respuesta

### Persona 2: Prospecto (Empresa en Costa Rica)
- **Description:** Persona de contacto en una empresa costarricense, puede ser gerente, encargado de TI, o administrador de una asociación solidarista
- **Goals:** Resolver problemas operativos, automatizar procesos manuales
- **Pain points:** Procesos manuales lentos, equipo pequeño sobrecargado, falta de soluciones tecnológicas accesibles
- **Key user stories:**
  - Como prospecto, quiero recibir un email relevante a mi situación para considerar los servicios ofrecidos
  - Como prospecto, quiero poder darme de baja fácilmente si no me interesa

---

## 3. Functional Requirements

### Must-Have (MVP)

| ID | Feature | Description | Acceptance Criteria |
|----|---------|-------------|---------------------|
| F1 | Scraper multi-fuente | Scrapea emails y contexto de empresas desde múltiples directorios y fuentes web | Extrae email + nombre empresa + industria/tipo + fuente de al menos 5 fuentes diferentes |
| F2 | Scraping recurrente | Los scrapers corren automáticamente múltiples veces al día | Cron jobs configurados y ejecutándose sin intervención manual |
| F3 | Deduplicación | El sistema no contacta dos veces la misma empresa | Validación por email y por nombre de empresa antes de insertar |
| F4 | Validación de emails | Verifica que los emails scrapeados son válidos antes de enviar | Formato válido, dominio existe, MX records presentes |
| F5 | Personalización de emails | Adapta el contenido del email según el contexto scrapeado (industria, tipo de empresa) | Emails varían según segmento/fuente del prospecto |
| F6 | Envío automático vía AWS SES | Envía emails sin aprobación manual | Emails se disparan automáticamente al detectar nuevos prospectos válidos |
| F7 | Warm-up gradual | El sistema arranca con pocos emails/día y sube gradualmente | Rampa configurable desde ~5 hasta 30 emails/día |
| F8 | Follow-ups automáticos | Envía 2-3 follow-ups si no hay respuesta | Follow-ups se envían con cadencia configurable, se detienen si hay respuesta |
| F9 | Detección de respuestas | Detecta cuando un prospecto responde | El sistema identifica respuestas y detiene follow-ups para ese prospecto |
| F10 | Notificación por email | Notifica a Gmail de Gustavo cuando hay una respuesta | Email de notificación enviado automáticamente con datos del prospecto |
| F11 | Unsubscribe | Texto sutil al final del email + sistema que respeta solicitudes de no contacto | Prospectos que piden baja nunca reciben otro email |
| F12 | Dashboard web | Interfaz web con métricas completas del outreach | Accesible vía URL de Railway, sin autenticación |
| F13 | Métricas del dashboard | Emails enviados, open rate, response rate, bounce rate, unsubscribes, pipeline por etapa, desglose por fuente e industria | Todas las métricas visibles y actualizadas |
| F14 | Almacenamiento de datos | Base de datos PostgreSQL con toda la información de prospectos y actividad | Datos persistentes, consultables, sin pérdida |
| F15 | Dominio secundario | Todos los emails salen desde gcwaresoluciones.com para proteger el dominio principal | SPF, DKIM, DMARC configurados correctamente |

### Nice-to-Have (Post-MVP)

| ID | Feature | Description | Target Phase |
|----|---------|-------------|--------------|
| N1 | A/B testing de emails | Probar diferentes versiones del email para optimizar respuestas | Phase 2 |
| N2 | Scoring de prospectos | Puntuar empresas por probabilidad de conversión según datos scrapeados | Phase 2 |
| N3 | Múltiples dominios de envío | Rotar entre varios dominios para aumentar volumen | Phase 3 |
| N4 | Exportación de datos | Exportar listas de prospectos y métricas a CSV/Excel | Phase 2 |
| N5 | Templates de email editables | Editar los templates de email desde el dashboard sin tocar código | Phase 2 |

### Future Considerations
- Integración con LinkedIn para prospección
- Integración con calendario para agendar reuniones directamente
- AI para analizar respuestas y sugerir acciones
- Expansión a mercados fuera de Costa Rica

---

## 4. Design & UX Requirements

### Brand Identity
- **Colors:** Alineado con la marca GCWARE (referencia: gcwarecr.com)
- **Typography:** Moderna, limpia, profesional
- **Tone of voice:** Profesional pero accesible — los emails deben sonar humanos, no robóticos

### Design References
- gcwarecr.com (sitio principal de Gustavo)
- Referencia funcional: dashboards de Instantly.ai o Smartlead para métricas de outreach

### UX Guidelines
- **Platform priority:** Desktop-first (dashboard de trabajo)
- **Accessibility:** Estándar
- **Multi-language:** Español (toda la interfaz y emails en español)

### Content Strategy
- **Email inicial:** Personalizado según contexto scrapeado, en español
- **Follow-up 1:** Recordatorio más corto
- **Follow-up 2-3:** Variación del ángulo o valor agregado
- **Unsubscribe:** Texto sutil al final, tono natural ("Si no deseas recibir más información, simplemente responde a este correo")

---

## 5. Legal & Compliance Requirements

- **Privacy:** Cumplimiento con Ley 8968 de Costa Rica (Protección de Datos Personales). Solo se recopilan datos públicos disponibles en sitios web
- **Unsubscribe:** Cada email incluye opción de darse de baja. El sistema respeta y registra permanentemente las solicitudes de no contacto
- **Anti-spam:** Configuración correcta de SPF, DKIM, DMARC en el dominio de envío. Volumen controlado con warm-up gradual
- **Contenido:** Emails transparentes — identifican claramente quién envía y por qué
- **Almacenamiento:** Datos de prospectos almacenados de forma segura en PostgreSQL

---

## 6. Phases & Milestones

### Phase 1: Infraestructura Base ✅
**Deliverables:**
- [x] Cuenta de AWS creada y configurada
- [x] AWS SES configurado y verificado
- [x] Proyecto en Railway creado con PostgreSQL
- [x] Esquema de base de datos diseñado e implementado (14 modelos, 3 migraciones)
- [x] Tech stack definido

**Cambios vs plan original:** Se usa Resend como email client activo en vez de AWS SES. Dominio de envío es gcwarecr.com (no gcwaresoluciones.com como se planeó originalmente).

### Phase 2: Sistema de Scraping ✅
**Deliverables:**
- [x] Scrapers para directorioscostarica.com, Merco, Pymes CR, asociaciones solidaristas (Crawl4AI crawlers, legacy)
- [x] Pipeline de limpieza y validación de emails (email_extractor.py con regex, TLD cleaning, blacklists)
- [x] Sistema de deduplicación (check por email antes de insertar)
- [x] Pipeline diario de scraping (`run_daily.py` con keyword rotation)
- [x] Almacenamiento de datos scrapeados con contexto (nombre empresa, industria, fuente via AI extraction)
- [x] Keyword bank con 30 industrias y 183 keywords (`seed_keywords.py` + `data/industries.json`)
- [x] Sistema de URLs visitadas para evitar re-scraping (90/120 días)

**Cambios vs plan original:** Se reemplazó Google Custom Search API por Serper.dev (organic + maps). LinkedIn no se implementó como fuente. Se agregó un sistema de keyword bank con rotación automática y búsqueda por industria. `run_daily.py` reemplazó a `main.py` como pipeline principal.

### Phase 3: Sistema de Email — Parcial 🔶
**Deliverables:**
- [x] Integración con Resend (cliente activo) y AWS SES (backup)
- [x] Sistema de límite diario (50 emails/día, sin warm-up gradual)
- [x] Templates de email personalizables por segmento ({{companyName}}, {{industry}}, etc.)
- [x] Cola de envío con rate limiting (mínimo 30s entre emails)
- [x] Sistema de follow-ups automáticos (3 follow-ups: 3, 5, 7 días)
- [x] Sistema de unsubscribe (texto en cada email + tabla de opt-out permanente)
- [ ] Tracking de aperturas (pixel tracking) — no implementado
- [ ] Manejo de bounces via webhooks — no implementado (schema listo, sin handler)

**Cambios vs plan original:** Se cambió AWS SES por Resend como email service principal. Scheduler implementado con node-cron (emails 8:05am CR, follow-ups 10am CR, lunes a viernes). Warm-up gradual eliminado — envía 50 emails/día desde día 1. Campaña "Una consulta rápida" creada y seeded con body + 2 follow-ups + firma HTML GCWARE.

### Phase 4: Detección de Respuestas y Notificaciones — Parcial 🔶
**Deliverables:**
- [ ] Detección de respuestas de prospectos — no implementado (schema `responses` listo, sin detection logic)
- [ ] Parada automática de follow-ups al recibir respuesta — no implementado
- [x] Notification service construido (envía alerta a gcerdas16@gmail.com)
- [x] Tabla de respuestas en base de datos (schema listo)

### Phase 5: Dashboard — Parcial 🔶
**Deliverables:**
- [x] Web app con React + Vite + Tremor desplegable
- [x] KPI cards: prospectos, emails enviados, respuestas, aperturas, rebotes, desuscritos
- [x] Pipeline visual por etapa (BarChart)
- [ ] Desglose por fuente — endpoint existe, falta UI
- [ ] Desglose por industria/tipo — endpoint existe, falta UI
- [ ] Tabla de prospectos recientes — endpoint existe, falta UI
- [ ] Gráficos de tendencia diaria — endpoint existe, falta UI
- [x] Deploy en Railway — deployado como static site con Caddy

---

## 7. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Emails caen en spam masivamente | Media | Alto | Warm-up gradual, SPF/DKIM/DMARC correctos, volumen controlado |
| Sitios web cambian estructura y rompen scrapers | Media | Bajo | Estrategia actual usa Serper.dev para búsqueda (no scraping de directorios), solo Crawl4AI para visitar sitios |
| Resend suspende la cuenta por quejas de spam | Baja | Alto | Mantener bounce rate < 5%, incluir unsubscribe, respetar solicitudes de baja |
| Baja tasa de respuesta (< 1%) | Media | Medio | Iterar sobre contenido de emails, segmentar mejor, A/B testing futuro |
| Datos scrapeados de baja calidad (emails inválidos) | Media | Medio | Validación implementada: regex, TLD cleaning, blacklists, dominios inválidos |
| Serper.dev llega al límite mensual (2,500 free) | Media | Medio | Keyword rotation prioriza menos buscados, visited_urls evita re-trabajo |
| Secrets en .env commiteados en el repo | Baja | Alto | ✅ RESUELTO — .gitignore excluye .env, secrets solo en Railway dashboard |
| Ley 8968 — queja formal de un prospecto | Baja | Alto | Unsubscribe funcional, solo datos públicos, transparencia en el email |

---

## 8. Open Questions

Items que necesitan resolución antes o durante el desarrollo:

- [x] **Tech stack exacto** — definido en TECH_STACK.md v2.0
- [x] **Contenido de los emails** — campaña "Una consulta rápida" creada con body + 2 follow-ups
- [x] **Gmail de notificaciones** — gcerdas16@gmail.com
- [x] **Horarios de envío** — lunes a viernes, emails a las 8:05am CR, follow-ups a las 10am CR
- [x] **Criterios de filtrado** — implementado en email_extractor.py: blacklisted patterns (noreply, admin, etc.), blacklisted domains, TLD validation, mínimo 3 caracteres en local part
- [x] **Cadencia de follow-ups** — follow-up 1 a los 3 días, follow-up 2 a los 5 días, follow-up 3 a los 7 días
- [x] **Credenciales AWS** — configuradas en api/.env
- [ ] **Dominio de envío** — actualmente se usa gcwarecr.com (no gcwaresoluciones.com como se planeó). Definir si se mantiene o se cambia

---

## 9. Glossary

| Term | Definition |
|------|-----------|
| Cold email | Email enviado a alguien que no te conoce ni ha solicitado información |
| Outreach | Proceso de contactar prospectos activamente |
| Warm-up | Proceso gradual de aumentar el volumen de envío para construir reputación del dominio |
| Bounce | Email que no se pudo entregar (dirección inválida, buzón lleno, etc.) |
| Open rate | Porcentaje de emails que fueron abiertos por el destinatario |
| Response rate | Porcentaje de emails que recibieron una respuesta |
| SPF/DKIM/DMARC | Protocolos de autenticación de email que prueban que el remitente es legítimo |
| Scraping | Extracción automatizada de datos de sitios web |
| Pipeline | Las etapas por las que pasa un prospecto (scrapeado → contactado → follow-up → respondió) |
| Asociación solidarista | Organización dentro de empresas en Costa Rica que maneja ahorros e inversiones de empleados |
| AWS SES | Amazon Simple Email Service — servicio de envío de emails de Amazon |
| Rate limiting | Control de velocidad para no enviar demasiados emails o requests a la vez |

---

## 10. Supporting Documents Log

| Document | Type | Key Insights Extracted |
|----------|------|----------------------|
| gcwarecr.com | Website | Portafolio de Gustavo: 7+ proyectos, AI Engineer & Automation Specialist, stack: React, Next.js, TS, Node, Python, PostgreSQL |
| directorioscostarica.com | Directory | Fuente de scraping — directorio de empresas y servicios en CR (crawler legacy) |
| merco.info/cr/ranking-merco-empresas | Ranking | Fuente de scraping — ranking de empresas grandes en CR (crawler legacy) |
| pymes.cr | Directory | Fuente de scraping — pequeñas y medianas empresas en CR (crawler legacy) |
| asouna.com | Asociación solidarista | Ejemplo de asociación solidarista — referencia para el vertical prioritario |
| aseimocr.net | Asociación solidarista | Fuente de información sobre asociaciones solidaristas en CR |
| serper.dev | API | Servicio de búsqueda activo — Google organic + Maps/Places para encontrar empresas |

---

*Generated with Project Planner Skill — 2026-03-20*
*Last synced: 2026-03-23*
