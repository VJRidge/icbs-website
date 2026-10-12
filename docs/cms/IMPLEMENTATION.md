# VettaJimale.Tech Studio — implementation status and roadmap

Factual baseline for the current CMS and the roadmap approved in `PRODUCT.md`.
Update the **Status by phase** and **Milestones** sections when work lands. A visible
screen or an existing database column is not completion; status reflects connected,
verified behavior. Remaining checklist: [`docs/cms/TODO.md`](./TODO.md).

Live production: `https://vettajimale.tech`  
Repo: `https://github.com/VJRidge/icbs-website`  
Vercel project: `icbs-website`  
Supabase project: **ICallBS** (`gfilixqzkduuuwrktpjh`, region `ca-central-1`)

Do not replace the working funnel with an unfinished builder. Hardcoded kit pages remain the public fallback until a **published** CMS homepage exists.

---

## 1. Current implementation

| Area | Finding |
| --- | --- |
| Framework | Vite 7 + React 19 + TypeScript. `"type": "module"`. |
| Hosting | Vercel. Pages are a SPA (`vercel.json` rewrite to `index.html`). APIs in `/api/*.ts`. |
| Routing | React Router serves the Studio, CMS pages/posts, redirects, short links, preview, and public routes. Development-only brand routes remain separate from production routing. |
| Auth | Supabase Auth with password, magic-link, and open signup via `/api/staff-signup`. `/admin` requires confirmed email + auto-approved, non-disabled profile. |
| Styling | Public, brand, and Studio styles are separated. Existing public funnel styles remain intact. |
| Supabase | Browser Studio uses `@supabase/supabase-js` with the anon key and RLS. Server funnel APIs keep the service role server-only. |
| Storage | Studio media uses Supabase Storage `media-public`. Existing product images and downloads also remain under `public/`. |
| Email | Resend via `api/subscribe.ts` and `api/_emails.ts`. From `hello@vettajimale.tech`. |
| Secrets | `.env.local` is gitignored. Service credentials must never use a `VITE_` prefix or enter browser bundles. |
| Connected CMS areas | Dashboard counts, pages, posts, media, templates/reusable sections, social slides, header/footer, menus, SEO/redirects, users, and settings. |
| Connected funnel | Kit signup, subscriber storage, kit email, contact handling, and unsubscribe. |
| Not built | Welcome emails 2–6. Forms through Sales (incl. Stripe Checkout) are Open. See `docs/cms/GATES.md`. |

### Required configuration (do not invent values)

1. **Anon key** (browser-safe): Supabase → Project Settings → API → `anon` `public`. Add as `VITE_SUPABASE_ANON_KEY` in `.env.local` and Vercel. Also set `VITE_SUPABASE_URL` to the same project URL as `SUPABASE_URL`. Never put the service role in any `VITE_` variable.
2. **First administrator**: Supabase → Authentication → Add user (email you control). Then:

```sql
update public.profiles
set role = 'owner', staff_approved = true
where id = '<auth user uuid>';
```

Studio signup is open via `/api/staff-signup` (CAPTCHA, honeypot, disposable-email block, rate limit).
New profiles are auto-approved (`staff_approved = true`); `/admin` still requires a **confirmed email**
and a non-disabled profile. In Supabase Auth, **disable public “Allow new users to sign up”** so bots
cannot bypass the API with the anon key — only the service-role signup path creates users. Magic-link
sign-in uses `shouldCreateUser: false`.
3. Apply all versioned migrations under `supabase/migrations/` in order. Do not rerun content seed migrations against working drafts without checking their effects.
4. Confirm Storage buckets `media-public` and `media-private` exist after migration.

Existing funnel env vars stay as they are. Service role remains **server only**.

---

## 2. Architecture decisions

| Decision | Current choice | Status / rule |
| --- | --- | --- |
| CMS product | Custom `/admin` in the existing Vite app | Keep. A framework rewrite is not a prerequisite. |
| Visual metaphor | Familiar sidebar, canvas, inspector, and structure panel | Keep original UI; do not copy WordPress or Elementor assets/code. |
| Public site | CMS homepage assignment with established public fallbacks | Preserve working routes until an explicit publish action changes them. |
| Builder document | Existing blocks use `{ id, type, data }`, with columns providing one supported nesting level | Keep the stable shape; add schema versions and validation incrementally. |
| Draft vs live | Working `content_blocks`/`body`; public `published_document` snapshot | Authoritative. Legacy `draft_document` is unused by the app and must not be written. |
| Optimistic lock | `doc_version` on every page/post save | Connected. Stale concurrent writes fail with a refresh message. |
| Auth | Supabase Auth; approved profiles and role labels | Connected. Phase 2 capability helpers and profile owner policy applied. |
| Permissions | Browser writes use anon client + authenticated RLS | Content, profiles, media, chrome, templates, taxonomies, short links, revisions, activity, and forms policies use `has_staff_capability`. |
| Media | Storage plus `media` / `media_usages` tables | Upload still lists Storage; metadata upsert and usage helpers make the `media` table authoritative when present. |
| Schedule | `scheduled` + `scheduled_for` plus durable publish-due job | Editor can schedule a frozen snapshot; `/api/cms-publish-due` promotes due rows (Vercel cron). |
| Content | `page` / `post` plus `kind=custom` registry | Additive custom types with structured fields; only Tool Review publication is enabled. |
| Relationships | `content_relationships` + typed allow-lists | Schema prepared; studio helpers validate source/target combinations. |
| Forms | Kit `SignupForm`/`subscribers` unchanged; CMS lead-capture form + `/api/form-submit` with consent | Lead capture Open; kit replacement still deferred until staging proof. |
| Secure preview | Local `/preview` plus tokenized remote preview | Staff can mint a noindex token URL via `/api/cms-preview`; tokens expire. |

---

## 3. Data model (core)

Existing CMS tables live in `public` with RLS enabled.

- `profiles` — `id` = `auth.users.id`, `role` (`owner` \| `admin` \| `editor` \| `author`), `display_name`, `disabled_at`
- `contents` — pages and posts: slug, kind, status, parent_id, working blocks/body, `published_document`, `doc_version`, schedule, featured media, and taxonomies
- `content_revisions` — snapshots of documents
- `media` — metadata; `storage_bucket` + `storage_path`
- `media_usages` — which content IDs reference a file
- `menus` + `menu_items` — nested JSON or adjacency list
- `templates` — page/section/header/footer; `is_global`
- `redirects` — from_path, to_path, status
- `forms` + `form_submissions`
- `settings` — singleton row (site name, homepage id, blog id, timezone, logo media ids)
- `activity_log`
- global styles are stored under the settings document rather than a dedicated table

Current builder JSON:

```ts
type BlogBlock = {
  id: string
  type: string
  data: Record<string, unknown>
}
```

The defaults, labels, picker categories, editor representation, and public renderers live under
`src/studio/lib/blog/` and `src/studio/components/blog/`. The next safe extension is validation
and migration around this model, not replacement with a second tree.

Foundation additions approved for a later migration:

- `content_types` — stable key, labels, route behavior, field-schema version, editor sections,
  default template, and publication capabilities
- structured values on content entries, validated against the selected content type
- `content_relationships` — source, target, typed relationship, order, and bounded metadata
- initial controlled types: resource, tool review, event, interview, and sponsor profile
- initial tool-review fields: pricing checked date, platform tested, what was tried, limitations,
  affiliate disclosure, verdict, sources, and review/update dates

---

## 4. Security

- Browser: `@supabase/supabase-js` with **anon** key only.
- `subscribers`: keep RLS with no anon policies. There is no subscriber admin API or list today.
- Public routes use the `published_contents` projection so working columns are not selectable.
  Public title, slug, SEO, layout, date, and taxonomies are frozen into `_meta` inside the
  published document; autosave cannot change them. Apply the migration before deploying its
  matching public-query changes.
- Drafts, revisions, submissions, and private media remain staff-only.
- Profile updates require owner/capability enforcement in RLS; owner-only UI is not sufficient.
- Private bucket: no public read; staff mint short-lived signed URLs via `/api/cms-media-sign` (`media-private` only).
- Local preview remains available. Secure remote preview uses expiring tokens and noindex; see `/api/cms-preview`.
- Public form handlers use validation, honeypots, and an in-memory rate limiter. Durable distributed
  rate limiting remains future work.

---

## 5. App structure (current)

```
src/App.tsx                 public router + /admin mount
src/admin/                  authentication entry and login
src/studio/                 dashboard, publishing screens, builder, media, and settings
src/cms/                    public CMS routing and rendering
src/brand/                  VettaJimale brand renderer and draft design system
api/subscribe.ts            unchanged until forms phase
api/contact.ts              contact submission and notification
api/unsubscribe.ts          one-click unsubscribe
supabase/migrations/        versioned SQL
docs/cms/IMPLEMENTATION.md  this file
docs/cms/WORKFLOWS.md       everyday workflow maps
docs/cms/GATES.md           expansion prerequisites
PRODUCT.md                  CMS product register
```

Admin chrome: left sidebar, top toolbar (save state, preview, viewport), central workspace.

APIs:

- `api/cms-preview.ts` — staff-minted expiring preview tokens (GET public by token)
- `api/cms-publish-due.ts` — cron promote for scheduled rows (`CRON_SECRET`)
- `api/cms-health.ts` — staff-only integration presence checks (no secret values)
- `api/cms-media-sign.ts` — staff Bearer JWT → signed URL for `media-private` objects
- `api/form-submit.ts` — public lead-capture submit (consent stored; no kit email)

---

## 6. Status by phase

Status terms:

- **Complete** — connected behavior exists and its phase gate has been verified.
- **Partial** — useful behavior exists, but the phase gate is not yet met.
- **Missing** — schema, route, or UI may be planned, but the workflow is not operational.

### Phase 1 — Product context and truthful baseline

**Status: Complete for documentation.**

- CMS product register, users, purpose, anti-references, principles, and accessibility target are in `PRODUCT.md`.
- This document records current connected behavior separately from planned behavior.
- Existing Vite/React, Supabase, Studio, public site, and funnel paths remain unchanged.

### Phase 2 — Authorization and draft isolation

**Status: Deployed on ICallBS (2026-10-05); content + admin-table capability RLS live.**

- Present: Supabase Auth, approved-staff gate, role labels, public snapshot renderer via
  `published_contents`, Phase 2 SQL for owner-only profile updates and content capabilities,
  plus unit tests that mirror the capability matrix and draft-isolation projection.
- Applied: `20261008_phase2_security.sql`, `20261014_admin_capability_rls.sql`, and
  `20261015_admin_capability_rls_tighten.sql` on production project `gfilixqzkduuuwrktpjh`.
- Admin mapping: site chrome (menus/redirects/settings) → `content.publish`; media create →
  `content.create` with own-row update; templates/taxonomies/forms → `content.update_any`;
  authors keep own media and content↔taxonomy links.
- Gate: anonymous users can read only eligible published snapshots; each staff capability is
  enforced in the database or server boundary, not only in the UI.

### Phase 3 — Workflow and structured-content foundation

**Status: Deployed on ICallBS (2026-10-05); Tool Review publish gate enforced in studio.**

- Everyday flows are defined in `docs/cms/WORKFLOWS.md` with screen-level acceptance criteria.
- Applied: `kind=custom`, type registry, structured fields, relationships, media links,
  validators, RLS, seed types, and `published_contents` projection (`20261009` + `20261010`
  chunks + `20261013` EXECUTE revoke). Existing page/post rows, routes, and editors unchanged.
- Studio Reviews list/editor at `/admin/content/tool_review`. Other custom types stay unpublished.
- Seeded types: `resource`, `tool_review` (publication enabled), `event`, `interview`, `sponsor_profile`.
- Pre-publish checklist blocks publish until disclosure is affirmed, required evidence fields are
  present, and pricing verification is fresh; publish writes a frozen `/reviews/:slug` snapshot and
  records activity.
- Gate: a Tool Review uses shared publishing while enforcing disclosure and verification fields.

### Phase 4 — Publishing integrity

**Status: Deployed on ICallBS (2026-10-05); trash, lock, revisions, secure preview, durable schedule, and activity log wired.**

- Soft trash, `doc_version` optimistic locking, and revision restore are connected in page/post studio.
- Authoritative draft model: working `content_blocks`/`body`; live `published_document`. Do not write `draft_document`.
- Applied: `content_previews` (RLS on, no client policies — service-role API only) and
  `content_publish_jobs` plus `contents_scheduled_requires_time` (`20261011_phase4_preview_schedule.sql`).
- Secure token previews (`/api/cms-preview`, `/preview?token=`) are noindex and expire.
- Schedule freezes a snapshot; live pages stay published until `/api/cms-publish-due` promotes the pending snapshot.
- `activity_log` records publish, unpublish, schedule, trash, restore, revision restore, and secure preview.
- Dashboard shows recent activity plus integration status (`/api/cms-health` + storage probe) without fabricated metrics.
- Pending-review queue: authors/editors submit (pending_review); publish-capable staff approve via Publish. Multi-step approval chains remain future work.
- Gate: create → preview → publish → edit draft → republish → restore is reliable; stale writes fail.

### Phase 5 — Visual builder

**Status: Strong partial.**

- Present: broad widget registry, TipTap, drag/drop, hierarchy, undo/redo, responsive overrides,
  style copy/paste, reusable sections, column controls, shared public renderer.
- Incremental: versioned Zod schemas and accessibility contracts for core blocks with invalid-block
  fallbacks (`blockSchemas`, `blockAccessibility`). Structure panel and canvas expose Up/Down
  controls plus Alt+Arrow reorder; live a11y warnings cover missing alt text (image/gallery/carousel),
  empty button labels/links, heading-level skips, invalid blocks, and video/carousel autoplay.
  Sitewide WCAG 2.2 AA audit of public chrome remains open.
- Gate: a responsive landing page survives save/reload/revision restore; core actions are keyboard operable.

Studio data rules:

- Working copy uses `body`, `content_blocks`, featured-image fields, and SEO fields.
- Autosave does not update `published_document`.
- Explicit publish (or schedule freeze) writes the public snapshot; manual saves add `content_revisions`.
- `doc_version` is required on updates. Legacy `draft_document` is ignored.

### Phase 6 — Media, site structure, and discovery

**Status: Partial; settings draft + discovery feeds deployed (2026-10-05).**

- Present: Storage uploads/library/picker, menus, header/footer, templates, SEO/redirects, short links.
- Media uploads now upsert `media` rows (alt, credit, visibility, usage helpers).
- Applied: `settings.draft_document` + `settings_version` (`20261012_settings_draft.sql`).
- Settings use a pending `draft_document`; live columns change only on explicit Publish. Studio
  preview shows the pending snapshot without mutating public chrome.
- Content health on the dashboard derives actionable alerts from real content (missing alt text,
  stale tool-review verification dates, unused media rows, empty drafts, broken internal links)
  with links to the record.
- Discovery: `/sitemap.xml`, `/robots.txt`, `/feed.xml` (and `/rss.xml`) are served from
  `published_contents` only via `/api/sitemap`, `/api/robots`, `/api/rss`. Public title search
  is at `/search`. Broken internal links in published snapshots appear on content health —
  see `docs/cms/GATES.md`.
- Canonical, Open Graph, Twitter, and JSON-LD head tags are applied on public CMS routes from
  published SEO fields and snapshot featured images (`publishedSeo` / `applyPublicContentSeo`).
- Gate: uploaded assets have validated metadata and usage; only eligible published URLs enter discovery.

### Phase 7 — Audience capture and lead magnets

**Status: Partial; Forms + Contacts + Lead Magnets open (2026-10-05). Kit funnel unchanged.**

- Present: established kit signup, subscriber storage, Resend delivery, contact submission,
  unsubscribe, UTM capture, validation, honeypot, and per-instance rate limiting.
- Forms lead capture: published `lead-capture` form, studio `/admin/forms`, public `/updates`,
  `/api/form-submit` stores payload + marketing consent with durable `rate_limit_buckets` /
  `rate_limit_hit`. Does **not** write `subscribers` or send kit email.
- Contacts: `contacts` + `contact_consent_events` (first-consent lock, re-consent clears
  suppression), upsert from form-submit, `/api/contact-unsubscribe`, studio `/admin/contacts`.
  Separate from kit `subscribers`.
- Lead magnets: `lead_magnets` + `lead_magnet_versions` (media-private) + `delivery_jobs`
  outbox; form setting `leadMagnetId` enqueues on consent; `/api/lead-magnet-deliver` cron
  signs private URL and sends once with retries; studio `/admin/lead-magnets`.
- Campaign blueprints: `campaigns` + `campaign_steps` link pages/forms/lead magnets/newsletter
  issues; readiness checklist; Contacts eligibility snapshot; studio `/admin/campaigns`.
  No auto-send.
- Content track (no Forms required): Resources package + Literacy Check shipped as client-side
  tools (no Forms/CRM). Optional email-my-results still gated on consent + delivery jobs.
- Gate: a test resource request is stored, delivered once, attributed correctly, and never creates
  marketing eligibility without recorded consent.

### Phase 8 — Newsletter, analytics, and campaigns

**Status: Partial; Newsletter + Segments + Analytics + Campaigns + Imports + Stripe Checkout Open (2026-10-06).**

- Newsletter: `newsletter_issues` (+ `document` block tree + optional `segment_id`) +
  `newsletter_send_jobs` + `newsletter_provider_events`; studio `/admin/newsletter` uses the
  same block builder as pages/posts and compiles email-safe `body_html`/`body_text` on save;
  cron `/api/newsletter-send` freezes Contacts (all marketing or by segment), sends via Resend
  with List-Unsubscribe → `/api/contact-unsubscribe`; webhook `/api/newsletter-webhook`
  suppresses on bounce/complaint. Kit `subscribers` unused.
- Contact lists: `audience_segments` (`list_kind` dynamic|static) + `audience_segment_members`
  + `contact_tags` / links; rule match (tag, source form, lead magnet) or CSV membership;
  studio `/admin/segments`; CSV dry-run/commit via `/api/import-contact-list-csv` (consent
  checkbox required for new contacts; never re-opts-in suppressed); auto-tags from
  form-submit (`newsletter`), kit import (`kit`), Stripe (`buyer`), CSV (`csv-import`).
- Analytics: `conversion_events` + `metric_definitions`; public `/api/analytics-track`
  (page_view/form_start); server events for form_submit/contact_created/kit_subscribe/book_purchase;
  studio `/admin/analytics` aggregates stored rows only (empty state when none; bot filter labeled).
- Campaigns: blueprints link existing records with readiness + eligibility snapshot; no auto-send.
- Imports: `import_jobs` + `import_job_rows` + `import_applied_keys`; staff dry-run/commit
  kit `subscribers` → `contacts` via `/api/import-kit-subscribers`; studio `/admin/imports`;
  suppression preserved; kit table never mutated.
- Stripe: Checkout Session for book Price (`/api/checkout`); webhook fulfillment
  (`/api/stripe-webhook`) writes `purchases`, tags kit `subscribers` with `buyer`, emails
  `BOOK_DOWNLOAD_URL`; studio `/admin/sales`; success page `/buy/thanks` is not the fulfiller.
  Keys are runtime env only.
- Gate: eligible contacts receive scheduled issues; opt-outs honored; funnel counts reproducible;
  campaign Ready only when form + delivery path checks pass; import dry-run writes nothing and
  commit is idempotent; paid sessions fulfill once via webhook.


### Content growth track (separate from Forms)

Does not require Forms/CRM.

1. **Resources package — shipped (2026-10-05)** — `/resources/builder-quick-reference`,
   `/resources/templates`, `/resources/tools-and-updates`, `/book/updates` (empty notes state).
   Public downloads under `/downloads/resources/`. Kit funnel unchanged.
2. **Literacy Check — shipped (2026-10-05)** — `/resources/vibe-coding-literacy-check`
   (client-side 20Q quiz, sessionStorage, first-submit lock, score PNG + challenge link).
   Linked from kit thank-you and Resources library. Quiz copy still marked
   `editorial-review-before-publication` in `quiz-content.json`.

Optional later bridges: email-my-results (needs Forms consent) or gated private downloads (needs
lead-magnet jobs).

### Explicitly deferred

- Plugin marketplace, multitenancy, general automation canvas, arbitrary executable widgets,
  membership subscriptions, sponsor pipeline, AI auto-publish/send, and welcome emails 2–6.

---

## 7. Public URL map (eventual)

| Path | Source |
| --- | --- |
| `/` | CMS homepage or kit fallback |
| `/free` | Kit page (may stay hardcoded or become a CMS page) |
| `/free/thanks` | Thanks + upsell |
| `/blog`, `/blog/:slug` | Posts |
| `/reviews/:slug` | Published tool reviews |
| `/resources/builder-quick-reference` | Builder Quick Reference |
| `/resources/templates` | Editable starters |
| `/resources/tools-and-updates` | Tools by job |
| `/resources/vibe-coding-literacy-check` | Interactive literacy quiz (client-side) |
| `/book/updates` | Book companion notes (empty until real entries) |
| `/privacy` `/terms` `/refunds` | CMS pages |
| `/admin` | Staff only |

---

## 8. Milestones log

| Date | What |
| --- | --- |
| 2026-10-01 | Funnel live: kit, Resend, domain, Vercel, GitHub |
| 2026-10-01 | CMS plan written; Phase 1 studio shell + SQL + login |
| 2026-10-02 | Clubhouse block editor port: pages, media, short links, public block renderer |
| 2026-10-02 | `/free` rebuild: Brand blocks, landing layout, `kit-v2` draft, kit-page toggle (see `LANDING_REBUILD.md`) |
| 2026-10-02 | Blog posts: `/admin/posts`, categories, public `/blog` + `/blog/:slug` |
| 2026-10-02 | Site chrome: header/footer identity + header/footer menus (`/admin/appearance`, `/admin/menus`) |
| 2026-10-02 | About page (`/about`) + About in header/footer; post byline links to it |
| 2026-10-02 | CMS soon items live: Templates, SEO & redirects, Users & roles, Settings |
| 2026-10-02 | Sales page at `/` (studio landing `book`); kit stays at `/free` |
| 2026-10-05 | Product register and factual CMS status baseline established; security and workflow gates reordered ahead of audience modules |
| 2026-10-05 | Builder persistence guards and width normalization added; Phase 2 published-snapshot isolation and content capability migration prepared |
| 2026-10-05 | Additive Tool Review list/editor added beside existing page/post studio routes |
| 2026-10-05 | Phase 4 soft trash, optimistic locking, and revision restore wired into page/post studio |
| 2026-10-05 | Secure token previews, durable schedule cron, block schema/a11y contracts, media metadata upsert, and expansion gates documented |
| 2026-10-05 | Activity log + integration health surfaced on the studio dashboard |
| 2026-10-05 | Settings draft/publish path so live chrome no longer changes on Save |
| 2026-10-05 | Builder a11y warnings, structure-panel Up/Down, and Alt+Arrow reorder |
| 2026-10-05 | Content health dashboard checks wired from real content and media usage |
| 2026-10-05 | Applied CMS migrations on ICallBS through Phase 4 + settings draft; verified `published_contents` (4 live rows), `content_types`, `content_previews`, and settings draft columns |
| 2026-10-05 | Replaced remaining `is_staff()` admin-table RLS with `has_staff_capability` (`20261014` + `20261015` tighten) |
| 2026-10-05 | Discovery: sitemap, robots, RSS from `published_contents`; public `/search` |
| 2026-10-05 | Discovery link checks: broken internal hrefs on content-health dashboard |
| 2026-10-05 | Tool Review pre-publish checklist; disclosure must be affirmed to publish |
| 2026-10-05 | Relationship picker on structured content editor (content_relationships by ID) |
| 2026-10-05 | Pending-review status + dashboard queue; authors may submit without publish capability |
| 2026-10-05 | Builder a11y checks expanded: headings, empty labels/links, gallery/carousel alts |
| 2026-10-05 | Canonical/OG/JSON-LD head tags on public CMS pages, posts, reviews, and home |
| 2026-10-05 | Staff private-media signed URLs via `/api/cms-media-sign` (`media-private` only) |
| 2026-10-05 | Forms lead-capture Open: `/admin/forms`, `/updates`, `/api/form-submit` + durable rate limits |
| 2026-10-05 | Resources package pages + public downloads under `/downloads/resources/` |
| 2026-10-05 | Literacy Check: `/resources/vibe-coding-literacy-check` + kit thanks / Resources links |
| 2026-10-05 | Contacts Open: identity + consent events, form-submit upsert, `/api/contact-unsubscribe`, `/admin/contacts` |
| 2026-10-05 | Lead Magnets Open: versions + delivery outbox, `/api/lead-magnet-deliver`, `/admin/lead-magnets` |
| 2026-10-05 | Newsletter Open: issues + send jobs + provider webhook, `/api/newsletter-send`, `/admin/newsletter` |
| 2026-10-06 | Newsletter block builder: `document` jsonb + email serializer; editor reuses BlogBlockEditor |
| 2026-10-05 | Analytics Open: conversion_events + metric_definitions, `/api/analytics-track`, `/admin/analytics` |
| 2026-10-05 | Campaigns Open: blueprints + readiness checklist, `/admin/campaigns` (Stripe deferred) |
| 2026-10-05 | Imports Open: kit→Contacts dry-run/commit, `/admin/imports`, `/api/import-kit-subscribers` |
| 2026-10-05 | Stripe Checkout Open: `/api/checkout`, webhook fulfill, `purchases`, `/admin/sales` |
| 2026-10-06 | Audience segments Open: tags + rule segments, `/admin/segments`, newsletter `segment_id` freeze |
| 2026-10-06 | Contact lists CSV: static membership + `/api/import-contact-list-csv` dry-run/commit |
| 2026-10-06 | Newsletter templates: starter gallery + save-as-template, `/admin/newsletter/templates` |
| 2026-10-06 | Categories + Series + newsletter prefs: taxonomies fields, `series`/`content_series`, `newsletter_lists`/`contact_subscriptions`/`contact_interests`; studio `/admin/categories`, `/admin/series`, `/admin/newsletter/lists`; issue `list_id` freeze; public `/topics/:slug` |
| 2026-10-06 | Newsletter Management workflow: pick/create newsletter, then issue; editor steps Details → Audience → Design → Review → Schedule; chrome subtitle is the selected newsletter name |

---

## 9. Agent rules

- Preserve `api/subscribe.ts` behavior until a CMS form is proven on staging.
- Never commit `.env.local` or service role keys.
- After each phase: kit smoke test from README (`/free` signup still works).
- Prefer additive files. Do not rewrite `styles.css` for Studio work; use the scoped Studio styles.
- Do not mark a phase complete until its acceptance gate is exercised and recorded.
- Hide unfinished modules rather than adding nonfunctional navigation or fabricated metrics.
- Document every new env var in `.env.example` and this file.
- Expansion modules (discovery, forms, CRM, newsletter, analytics) require an Open gate in `docs/cms/GATES.md` before any nav or screen work.
