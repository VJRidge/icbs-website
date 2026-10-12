# VettaJimale.Tech and I Call BS

The VettaJimale.Tech public site, the *I Call BS: AI Vibe Coding Myths Dispelled*
lead-capture funnel, and the VettaJimale.Tech Studio CMS.

Vite + React runs on Vercel. Supabase provides authentication, CMS data, Storage, and
subscriber data. Resend delivers the existing kit email. Server funnel functions keep
service credentials server-only; the Studio browser client uses the anon key with RLS.

## What's here

| Path | What it is |
| --- | --- |
| `src/pages/Free.tsx` | `/free` — the Free Starter Kit signup page (also the home page for now) |
| `src/pages/FreeThanks.tsx` | `/free/thanks` — download, one book offer, share buttons |
| `src/pages/Legal.tsx` | `/refunds` is all sales final. `/privacy` and `/terms` are still placeholders |
| `src/components/SignupForm.tsx` | The form (name, email, hidden honeypot, UTM source) |
| `src/studio/` | `/admin` — authenticated Studio, publishing, builder, media, and settings |
| `src/cms/` | Public CMS page/post routing and rendering |
| `src/brand/` | VettaJimale brand renderer and design system |
| `api/subscribe.ts` | Saves the subscriber, sends email 1 with the kit |
| `api/contact.ts` | Saves and sends contact requests |
| `api/unsubscribe.ts` | One-click unsubscribe |
| `api/_emails.ts` | Email 1 wording (draft — review before launch) |
| `supabase/schema.sql` | The `subscribers` table, RLS on, no public access |
| `supabase/migrations/` | Versioned CMS schema, RLS, settings, and content migrations |
| `public/downloads/` | The Free Starter Kit PDF |

## Setup

1. `npm install`
2. Supabase: in the **ICallBS** project, run `supabase/schema.sql` in the SQL editor.
3. Resend: add and verify your sending domain (SPF, DKIM, DMARC).
4. Copy `.env.example` to `.env.local` and fill it in.
5. `npx vercel dev` runs the pages and the `/api` functions together locally.
   (`npm run dev` runs the pages only; the form needs the API.)
6. Push to GitHub, import the repo in Vercel, add the same environment variables, add your domain.

## Smoke test (after every change)

- [ ] `/free` loads on desktop and on a phone
- [ ] Sign up with a real address: lands on `/free/thanks`
- [ ] A row appears in `subscribers` with the right `utm_source` (try `/free?utm_source=test`)
- [ ] Email 1 arrives (check Gmail, Outlook, iCloud) and the download button works
- [ ] The unsubscribe link sets `unsubscribed_at`
- [ ] Signing up twice with the same email does not create a second row
- [ ] An anon-key `select` on `subscribers` returns nothing (RLS)
- [ ] No secrets in the git diff

## Before launch

- [ ] Write the privacy and terms pages. Refunds: all sales final.
- [ ] Review the email 1 wording in `api/_emails.ts`
- [x] Sales page + Stripe Checkout path (`/api/checkout`). Paste `STRIPE_*` + `BOOK_DOWNLOAD_URL` to go live.
- [ ] Confirm the sending address in `EMAIL_FROM` (currently hello@vettajimale.tech)

## CMS status

Approved staff use the Studio at `/admin`. Pages, posts, the visual builder, media,
templates, site chrome, navigation, SEO/redirects, users, and settings are connected.

The factual status, security gaps, and phased roadmap are in
[`docs/cms/IMPLEMENTATION.md`](docs/cms/IMPLEMENTATION.md). Product principles are in
[`PRODUCT.md`](PRODUCT.md). Everyday workflows are in
[`docs/cms/WORKFLOWS.md`](docs/cms/WORKFLOWS.md). Expansion prerequisites are in
[`docs/cms/GATES.md`](docs/cms/GATES.md).

`/` uses the assigned published homepage. `/free` remains the established kit route.

## Not built yet

Welcome emails 2–6 remain deferred. Forms through Sales (including Stripe Checkout) are
Open in `docs/cms/GATES.md`. Soft trash, revision restore, optimistic locking, secure token
previews, and scheduled publish (cron) are connected in studio; apply pending Supabase
migrations before relying on them in production.
