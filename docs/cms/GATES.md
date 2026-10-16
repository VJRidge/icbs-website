# CMS expansion gates

Audience-growth and discovery modules stay **hidden and unimplemented** until their
prerequisite gates pass. Do not add navigation entries or placeholder dashboards for
gated work.

See also: `PRODUCT.md`, `docs/cms/WORKFLOWS.md`, `docs/cms/IMPLEMENTATION.md`.

## Gate checklist

| Module | Prerequisites | Status |
| --- | --- | --- |
| Discovery (sitemap, RSS, robots, public search, link checks) | Phase 2 draft isolation applied; published URLs only from `published_contents`; canonical fields stable | **Complete** — sitemap/robots/RSS/search live; broken internal links on content health; canonical/OG/JSON-LD on public CMS routes |
| Forms builder | Existing kit funnel preserved; server validation + durable rate limit design; consent separated from delivery | **Open** — Build it canvas + field settings (`/admin/forms`); publish/submit live (`/updates`, `/api/form-submit`, `/api/form-schema`); kit `/api/subscribe` unchanged |
| Contacts / preferences / suppression | Forms gate; identity model; consent event log; unsubscribe parity with `api/unsubscribe.ts` | **Open** — `contacts` + `contact_consent_events` + `contact_tags` / links; `newsletter_lists` + `contact_subscriptions` + `contact_interests` (interest ≠ subscription); upsert from `/api/form-submit`; `/api/contact-unsubscribe`; studio `/admin/contacts` + `/admin/newsletter/lists`; kit `subscribers` unchanged |
| Contact lists | Contacts + tags; rule lists and uploaded CSV membership; newsletter freeze by list | **Open** — `audience_segments` (`dynamic`/`static`) + `audience_segment_members`; studio `/admin/segments`; CSV via `/api/import-contact-list-csv`; `newsletter_issues.segment_id` or `list_id`; send freezes matching Contacts only |
| Categories / Series / Topics | Taxonomies extended; public topic archives | **Open** — `taxonomies` (description/image/order) + `content_taxonomies.is_primary`; `series` + `content_series`; studio Content → Categories / Series; public `/topics/:slug` |
| Lead-magnet delivery jobs | Media metadata authoritative; private delivery; versioned assets; retry/idempotency outbox | **Open** — `lead_magnets` / versions / `delivery_jobs`; enqueue from form-submit; `/api/lead-magnet-deliver` cron; studio `/admin/lead-magnets`; kit `subscribers` unchanged |
| Newsletter issues | Contacts + consent + suppression + provider webhooks + dedupe + unsubscribe | **Open** — `newsletter_issues.document` block builder + compiled `body_html`; newsletters belong to `newsletter_lists` (`list_id`) with optional `segment_id`; studio Newsletter Management (picker → Details/Audience/Design/Review + Schedule action); form signup can subscribe to lists; test send + review checklist; `/admin/newsletter` + `/templates`; kit `subscribers` unchanged |
| Analytics / attribution | First-party conversion events + metric definitions; no fabricated charts | **Open** — `conversion_events` + sitewide page views; `/admin/analytics` tabs (Site / Newsletters / Funnel); newsletter jobs + Resend webhook events (delivered/opened/clicked/bounced); kit `subscribers` unchanged |
| Campaign blueprints | Pages, forms, lead magnets, email drafts, consent, and jobs all operational | **Open** — `campaigns` + `campaign_steps`; readiness checklist; eligibility snapshot from Contacts; studio `/admin/campaigns`; no auto-send |
| Content health dashboard | Relationships + media usage + verification dates available | **Complete** — dashboard checks for missing alt, stale tool-review verification, unused media, and empty drafts |
| Global settings draft preview | Versioned settings snapshot publish path (`draft_document` + explicit publish) | **Complete** |
| Import/migration jobs | Dry-run, mapping, idempotent batches, suppression preserved | **Open** — `import_jobs` / rows / `import_applied_keys`; kit→Contacts dry-run + commit via `/api/import-kit-subscribers`; studio `/admin/imports`; kit `subscribers` never mutated |
| Stripe Checkout (book PDF) | Price + secret + webhook secret + private PDF path or download URL; webhook fulfillment; buyer tag | **Open** — `/api/checkout`, `/api/stripe-webhook`, `purchases` ledger, `/admin/sales` resend, `/buy/thanks`; prefer `BOOK_PRIVATE_PATH` signed URLs |

## Navigation policy

`AdminCmsNav` only lists connected modules. Forms through Sales are Open.

## Funnel preservation

Keep `api/subscribe.ts`, `api/contact.ts`, and `api/unsubscribe.ts` as the live audience
path until a CMS replacement has passed staging smoke tests.

## Open only when

1. The prerequisite phase gates in `IMPLEMENTATION.md` are Complete (not merely Partial).
2. Automated tests cover the new write path (auth, isolation, idempotency as applicable).
3. Failure recovery and success states from `WORKFLOWS.md` are implemented, not sketched.
