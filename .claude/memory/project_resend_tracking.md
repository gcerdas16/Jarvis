---
name: Resend Email Tracking Setup
description: State of Resend domain tracking and the gap with email open tracking reliability
type: project
originSessionId: 79b8b515-0bbc-4ac4-8acf-8e955729e1e9
---
## Current State (2026-04-18)
- **Active email client:** Resend (`resend-client.ts`). AWS SES exists as backup but unused.
- **Domain:** gcwarecr.com (outreach domain)
- **open_tracking and click_tracking:** Were disabled — activated via PATCH to Resend API during brainstorming session.
- **EmailEvent table** exists in Prisma schema with eventType enum: DELIVERED, OPENED, CLICKED, BOUNCED, COMPLAINED.

## Critical Gap: No Webhook Endpoint
There is NO `POST /api/webhooks/resend` endpoint in the API yet. Without it, zero events flow into `EmailEvent` table. This is a required build item.

## Open Tracking Reality (important)
Open tracking is fundamentally unreliable in 2025:
- Gmail proxies all images → shows as "opened" even if not read, or shows old open
- Apple Mail Privacy Protection pre-fetches → false positives
- Corporate email clients (Outlook/WWT) often block tracking pixels

**What IS reliable:** click tracking, bounce detection, reply detection, unsubscribe.
**Conclusion:** Don't show "open rate" as a primary metric. Show delivered/bounced/clicked/replied.

## IMPORTANT: Rotate API Key
The Resend API key `re_WCjyypbC_ARBF7dwbmTqixo6mv6wuAur7` was exposed in chat. User must rotate it at resend.com/api-keys.

**How to apply:** When building the Emails section or webhook, remind user to rotate the key first. When displaying email metrics, de-emphasize opens, emphasize bounces/clicks/replies.
