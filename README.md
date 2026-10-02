# I Call BS site

The lead-capture funnel for *I Call BS: AI Vibe Coding Myths Dispelled*.
Vite + React on Vercel, Supabase for subscribers (and the CMS underway), Resend for email.
Server funnel functions still call Supabase and Resend with plain `fetch`. The studio uses the
anon key only.

## What's here

| Path | What it is |
| --- | --- |
| `src/pages/Free.tsx` | `/free` — the Free Starter Kit signup page (also the home page for now) |
| `src/pages/FreeThanks.tsx` | `/free/thanks` — download, one book offer, share buttons |
| `src/pages/Legal.tsx` | `/privacy`, `/terms`, `/refunds` — placeholders, still to be written |
| `src/components/SignupForm.tsx` | The form (name, email, hidden honeypot, UTM source) |
| `api/subscribe.ts` | Saves the subscriber, sends email 1 with the kit |
| `api/unsubscribe.ts` | One-click unsubscribe |
| `api/_emails.ts` | Email 1 wording (draft — review before launch) |
| `supabase/schema.sql` | The `subscribers` table, RLS on, no public access |
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

- [ ] Write the privacy, terms and refunds pages
- [ ] Review the email 1 wording in `api/_emails.ts`
- [ ] Set `BOOK_URL` in `FreeThanks.tsx` to the sales page or Stripe Checkout link
- [ ] Confirm the sending address in `EMAIL_FROM` (currently hello@vettajimale.tech)

## CMS (in progress)

Staff studio at `/admin`. Plan and phases: [`docs/cms/IMPLEMENTATION.md`](docs/cms/IMPLEMENTATION.md).
The public kit funnel stays hardcoded until a published CMS homepage is assigned.

## Not built yet

Sales page (`/`), Stripe Checkout + webhook (`buyer` tag), purchase thank-you (`/thanks`),
link-in-bio page (`/start`), welcome emails 2–6 (scheduled job).
