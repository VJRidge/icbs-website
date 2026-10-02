# I Call BS — CMS implementation plan

Shared plan for Cursor and Claude Code. Update the **Milestones** section when a phase lands.

Live production: `https://vettajimale.tech`  
Repo: `https://github.com/VJRidge/icbs-website`  
Vercel project: `icbs-website`  
Supabase project: **ICallBS** (`gfilixqzkduuuwrktpjh`, region `ca-central-1`)

Do not replace the working funnel with an unfinished builder. Hardcoded kit pages remain the public fallback until a **published** CMS homepage exists.

---

## 1. Inspection (current app)

| Area | Finding |
| --- | --- |
| Framework | Vite 7 + React 19 + TypeScript. `"type": "module"`. |
| Hosting | Vercel. Pages are a SPA (`vercel.json` rewrite to `index.html`). APIs in `/api/*.ts`. |
| Routing | Path switch in `src/App.tsx` — no React Router. Home and `/free` are the kit page. `/free/thanks`, `/privacy`, `/terms`, `/refunds`. |
| Auth | None. |
| Styling | Single `src/styles.css`. Book tokens: cover green `#072A1B`, yellow `#FDC20F`, cream `#F4EFE3`. |
| Supabase | Server-only. `api/_lib.ts` uses **service role** + REST `fetch`. No JS SDK. `subscribers` has RLS on and **zero** policies (anon cannot read). |
| Storage | Local files in `public/downloads` and `public/img`. Not Supabase Storage. |
| Email | Resend via `api/subscribe.ts` and `api/_emails.ts`. From `hello@vettajimale.tech`. |
| Secrets | `.env.local` gitignored. Server: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL`. **No anon key yet.** |
| Not built | Sales page, Stripe, blog, `/admin`, welcome emails 2–6. |

### Required configuration (do not invent values)

1. **Anon key** (browser-safe): Supabase → Project Settings → API → `anon` `public`. Add as `VITE_SUPABASE_ANON_KEY` in `.env.local` and Vercel. Also set `VITE_SUPABASE_URL` to the same project URL as `SUPABASE_URL`. Never put the service role in any `VITE_` variable.
2. **First administrator**: Supabase → Authentication → Add user (email you control). Then:

```sql
update public.profiles
set role = 'owner', staff_approved = true
where id = '<auth user uuid>';
```

New Auth users get a profile with `staff_approved = false` and cannot open `/admin` until approved.
3. Run CMS SQL in the ICallBS SQL editor (or `supabase db push` if CLI is used later). File: `supabase/migrations/20261002_cms_core.sql`.
4. Confirm Storage buckets `media-public` and `media-private` exist after migration.

Existing funnel env vars stay as they are. Service role remains **server only**.

---

## 2. Architecture decisions

| Decision | Choice | Why |
| --- | --- | --- |
| CMS product | Custom `/admin` on this same Vite app | One domain, one deploy, already on Vercel + Supabase. |
| Visual metaphor | Original UI inspired by WP admin + Elementor (sidebar, canvas, inspector) | Prompt requirement; do not copy WP/Elementor assets or trademarks. |
| Public site | Keep current React pages until CMS `settings.homepage_page_id` points at a **published** page | Funnel must not go down. |
| Builder document | Versioned JSON (`document_version` + node tree). Never HTML-only. | Prompt; revisions and validation. |
| Tree | Page → Section → Container/Columns → Module | Prompt hierarchy. |
| Draft vs live | `draft_document` and `published_document` on the same row | Editing published pages does not go live until Publish. |
| Optimistic lock | `doc_version` integer; stale save rejected | Concurrent editors. |
| Auth | Supabase Auth (email magic link + password). Roles on `profiles`. | Prompt. |
| Permissions | RLS + Vercel `/api/cms/*` using the user JWT (not service role for CMS writes from the browser). Service role only for subscribe, cron, signed admin jobs. | Hiding UI is not enough. |
| Media | Supabase Storage; native `<video>` / `<audio>` | No YouTube required. |
| Schedule | Vercel Cron → `GET/POST /api/cms/publish-scheduled` | Compatible with this host. |
| Blog | Same `contents` table with `kind = 'post'` | One builder, two listings. |
| Forms | CMS forms later; **keep** current kit `SignupForm` + `subscribers` until Forms phase wires a drop-in module | Do not break lead gen. |

---

## 3. Data model (core)

All new tables in `public`, RLS on.

- `profiles` — `id` = `auth.users.id`, `role` (`owner` \| `admin` \| `editor` \| `author`), `display_name`, `disabled_at`
- `contents` — pages and posts: slug, kind, status, parent_id, SEO jsonb, `draft_document`, `published_document`, `doc_version`, schedule, featured media, taxonomies
- `content_revisions` — snapshots of documents
- `media` — metadata; `storage_bucket` + `storage_path`
- `media_usages` — which content IDs reference a file
- `menus` + `menu_items` — nested JSON or adjacency list
- `templates` — page/section/header/footer; `is_global`
- `redirects` — from_path, to_path, status
- `forms` + `form_submissions`
- `settings` — singleton row (site name, homepage id, blog id, timezone, logo media ids)
- `activity_log`
- `global_styles` — brand tokens JSON

Builder JSON (minimum):

```ts
type BuilderDocument = {
  schemaVersion: 1
  title: string
  nodes: BuilderNode[]
}
type BuilderNode = {
  id: string
  type: string
  moduleVersion: number
  props: Record<string, unknown>
  style?: Record<string, unknown>
  responsive?: { tablet?: object; mobile?: object }
  children?: BuilderNode[]
}
```

Module registry lives in `src/cms/modules/` (schema, defaults, validate, AdminPreview, PublicRender).

---

## 4. Security

- Browser: `@supabase/supabase-js` with **anon** key only.
- `subscribers`: keep RLS with no anon policies. Admin list of subscribers goes through `/api/cms/subscribers` (session JWT checked; handler uses service role).
- Public `select` on `contents` only where `status = 'published'` and `published_document` is not null.
- Drafts, revisions, submissions, users, private media: staff only (`is_staff()`).
- Private bucket: no public read; signed URLs from an API route after auth.
- Preview unpublished: `/api/cms/preview?id=&token=` or authenticated `/admin/preview/:id`.
- Rate-limit public form posts (existing honeypot stays).

---

## 5. App structure (target)

```
src/App.tsx                 public router + /admin mount
src/admin/                  dashboard shell, screens
src/cms/modules/            module registry
src/cms/render/             public renderer
api/subscribe.ts            unchanged until forms phase
api/cms/*                   preview, schedule, subscriber CSV, signed uploads if needed
supabase/migrations/        versioned SQL
docs/cms/IMPLEMENTATION.md  this file
```

Admin chrome: left sidebar, top toolbar (save state, preview, viewport), central workspace.

---

## 6. Phases

### Phase 1 — Foundation (this increment)

- [x] Inspection + this plan
- [x] Core SQL migration + RLS + storage buckets
- [x] `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env.example`
- [x] `@supabase/supabase-js` client (anon only)
- [x] `/admin` login (magic link + password)
- [x] Admin shell: sidebar with all named sections, overview dashboard, empty states
- [x] Public kit pages **unchanged**

### Phase 2 — Pages CRUD (no canvas yet)

- [x] Contents list: search, filter, trash, bulk
- [x] Edit title, slug, SEO, status, parent
- [x] Save draft JSON (validated empty document)
- [x] Publish / unpublish copies draft → published
- [x] Revisions list + restore
- [x] Optimistic `doc_version`
- [x] Public renderer: if homepage published in settings, render it; else current `Free.tsx`
  Plain-text body replaced by the visual builder in the same increment.

### Phase 3 — Media library

- [x] Upload (device), library grid, insert-from-library in image blocks
- [x] Images, video, audio, other
- Progress, type/size validation (later)
- [x] Public bucket (`media-public`)
- Alt/caption metadata (later)

### Phase 4 — Visual builder (starter modules)

- [x] Document canvas (Clubhouse-style): title, format toolbar, in-place blocks, + Add block picker
- [x] Module inspector + page settings
- Desktop / tablet / mobile (later)
- Drag-drop, undo/redo, autosave (later; Up/Down + Save draft now)
- [x] Blocks: Paragraph, Heading, Quote, Callout, Image, Divider, Spacer, Button, CTA, Kit signup

### Phase 5 — Blog + templates

- Posts, categories, tags, authors
- Rich-text mode + builder mode
- Listing, post, category, tag, author routes
- Header/footer templates

### Phase 6 — Menus, forms, SEO, redirects, settings

- Nav builder
- Form builder + submissions + CSV + Resend notify
- Redirects on slug change
- Settings singleton
- Activity log

### Phase 7 — Remaining modules

- Galleries, carousels, video/audio players, FAQ, pricing, post grid, etc. per product prompt
- Global vs reusable sections
- Import / export
- Vercel cron for scheduled publish

### Later (explicitly out of scope until asked)

- In-dashboard recording, AI video, Stripe checkout, welcome emails 2–6

---

## 7. Public URL map (eventual)

| Path | Source |
| --- | --- |
| `/` | CMS homepage or kit fallback |
| `/free` | Kit page (may stay hardcoded or become a CMS page) |
| `/free/thanks` | Thanks + upsell |
| `/blog`, `/blog/:slug` | Posts |
| `/privacy` `/terms` `/refunds` | CMS pages |
| `/admin` | Staff only |

---

## 8. Milestones log

| Date | What |
| --- | --- |
| 2026-10-01 | Funnel live: kit, Resend, domain, Vercel, GitHub |
| 2026-10-01 | CMS plan written; Phase 1 studio shell + SQL + login |

---

## 9. Agent rules

- Preserve `api/subscribe.ts` behavior until a CMS form is proven on staging.
- Never commit `.env.local` or service role keys.
- After each phase: kit smoke test from README (`/free` signup still works).
- Prefer additive files. Do not rewrite `styles.css` for admin; use `src/admin/admin.css`.
- Document every new env var in `.env.example` and this file.
