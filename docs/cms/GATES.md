# CMS expansion gates

Audience-growth and discovery modules stay **hidden and unimplemented** until their
prerequisite gates pass. Do not add navigation entries or placeholder dashboards for
gated work.

See also: `PRODUCT.md`, `docs/cms/WORKFLOWS.md`, `docs/cms/IMPLEMENTATION.md`.

## Gate checklist

| Module | Prerequisites | Status |
| --- | --- | --- |
| Discovery (sitemap, RSS, robots, public search, link checks) | Phase 2 draft isolation applied; published URLs only from `published_contents`; canonical fields stable | **Complete** — sitemap/robots/RSS/search live; broken internal links on content health; canonical/OG/JSON-LD on public CMS routes |
| Forms builder | Existing kit funnel preserved; server validation + durable rate limit design; consent separated from delivery | **Open** — lead-capture publish/submit live (`/admin/forms`, `/updates`, `/api/form-submit`); kit `/api/subscribe` unchanged |
| Contacts / preferences / suppression | Forms gate; identity model; consent event log; unsubscribe parity with `api/unsubscribe.ts` | **Open** — `contacts` + `contact_consent_events`; upsert from `/api/form-submit`; `/api/contact-unsubscribe`; studio `/admin/contacts`; kit `subscribers` unchanged |
| Lead-magnet delivery jobs | Media metadata authoritative; private delivery; versioned assets; retry/idempotency outbox | **Open** — `lead_magnets` / versions / `delivery_jobs`; enqueue from form-submit; `/api/lead-magnet-deliver` cron; studio `/admin/lead-magnets`; kit `subscribers` unchanged |
| Newsletter issues | Contacts + consent + suppression + provider webhooks + dedupe + unsubscribe | **Open** — `newsletter_issues` / send jobs / provider events; `/api/newsletter-send` cron; `/api/newsletter-webhook` suppress; studio `/admin/newsletter`; kit `subscribers` unchanged |
| Analytics / attribution | First-party conversion events + metric definitions; no fabricated charts | **Open** — `conversion_events` + `metric_definitions`; `/api/analytics-track`; form/kit server events; studio `/admin/analytics` funnel + attribution from stored rows only |
| Campaign blueprints | Pages, forms, lead magnets, email drafts, consent, and jobs all operational | **Open** — `campaigns` + `campaign_steps`; readiness checklist; eligibility snapshot from Contacts; studio `/admin/campaigns`; no auto-send; Stripe deferred |
| Content health dashboard | Relationships + media usage + verification dates available | **Complete** — dashboard checks for missing alt, stale tool-review verification, unused media, and empty drafts |
| Global settings draft preview | Versioned settings snapshot publish path (`draft_document` + explicit publish) | **Complete** |
| Import/migration jobs | Dry-run, mapping, idempotent batches, suppression preserved | **Blocked** |

## Navigation policy

`AdminCmsNav` only lists connected modules. Forms through Campaigns are Open. Import/migration
jobs stay hidden until Open. Stripe remains deferred until connected.

## Funnel preservation

Keep `api/subscribe.ts`, `api/contact.ts`, and `api/unsubscribe.ts` as the live audience
path until a CMS replacement has passed staging smoke tests.

## Open only when

1. The prerequisite phase gates in `IMPLEMENTATION.md` are Complete (not merely Partial).
2. Automated tests cover the new write path (auth, isolation, idempotency as applicable).
3. Failure recovery and success states from `WORKFLOWS.md` are implemented, not sketched.
