# Launch TODO (updated 16 October 2026)

This is not legal advice. Do these in order. A box is done only when the **Done when** line is true.

Production today can still be behind this repo until you **deploy**.

---

## How to replace fonts (no Google Fonts)

The public site no longer loads fonts from Google. CSS still *names* Newsreader, Anton, and IBM Plex Mono. Browsers that do not have those files fall back to Georgia, Impact, and system mono.

**Keep the look (self-host):**

1. Get a license that allows web embedding (Google Fonts OFL is fine *if you host the files yourself*; do not hotlink fonts.googleapis.com).
2. Download `.woff2` files for the weights you actually use (Anton 400; Newsreader 400/700; IBM Plex Mono 400/700 is typical).
3. Put them in `public/fonts/` (example names):
   - `Newsreader-Regular.woff2`
   - `Anton-Regular.woff2`
   - `IBMPlexMono-Regular.woff2`
4. Add `@font-face` at the **top** of `src/styles.css` (kit/legal chrome) and `src/brand/brand.css` (brand pages). Those files already name Newsreader, Anton, and IBM Plex Mono.

```css
@font-face {
  font-family: Newsreader;
  src: url("/fonts/Newsreader-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

5. Repeat for Anton and IBM Plex Mono. Keep the existing `font-family: Newsreader, Georgia, serif` rules — they will pick up the local files.
6. Studio editor presets live in `src/studio/lib/editorFontChoices.ts`. After self-hosting Inter/Lato/Playfair (or dropping those names), update that list so the inspector does not promise fonts you do not ship.
7. Confirm in DevTools → Network that there is **no** request to `fonts.googleapis.com` / `fonts.gstatic.com`.
8. Deploy.

**Change the look:** pick new families, self-host the same way, then change the `font-family` stacks in `src/brand/brand.css` and `src/styles.css`. Do not add a Google Fonts `<link>` in `index.html`.

---

## You only (accounts and live site)

### 1. [LAUNCH] Deploy this repo to Vercel production

**Done when:** `https://vettajimale.tech/api/checkout` is **not** a Vercel 404. `/privacy` and `/terms` show real copy. `/faq` and `/copyright` load.

1. Vercel → project → Root Directory = repo root, Vite, Node for `/api/*.ts`.
2. Deploy **main** (this push) to Production.
3. Incognito: `/`, `/privacy`, `/terms`, `/refunds`, `/copyright`, `/faq`, `/prefs` (expect “missing token” on `/prefs` without a query).
4. Probe: `GET /api/checkout` → 503 (no keys) or redirect to Stripe — never 404.

### 2. [LAUNCH] Vercel environment variables

**Done when:** Production env matches `.env.example` with real secrets (nothing committed).

Set at least:

- `POSTAL_ADDRESS` = `Manifest, Media, Marketing, & Events (MMME) · 20 Adelphi Street · Brooklyn, NY 11205`
- `SITE_URL` = `https://vettajimale.tech`
- `EMAIL_FROM` = existing `hello@vettajimale.tech`
- Supabase URL + service role + anon (`VITE_` anon only)
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_BOOK_PRICE_ID`
- `BOOK_PRIVATE_PATH` = object key in `media-private` (example `books/i-call-bs.pdf`) after you upload the paid PDF
- Leave `BOOK_DOWNLOAD_URL` empty once private path works
- Turnstile: `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
- `NEWSLETTER_WEBHOOK_SECRET` (Resend `whsec_…`, never reuse `CRON_SECRET`)
- `CRON_SECRET`

Redeploy after saving env.

### 3. [LAUNCH] Paid PDF in private storage

**Done when:** A guessed URL does not serve the $17 book. A test purchase email has a time-limited link.

1. Studio → Media (or Supabase Storage) → bucket `media-private`.
2. Upload the paid PDF. Note the object path.
3. Put that path in `BOOK_PRIVATE_PATH`. Do **not** put the paid file in `/public/downloads`.
4. Kit PDF may stay public (`/downloads/I-Call-BS-Free-Starter-Kit.pdf`) — copy already says signup is for emails.

### 4. [LAUNCH] Stripe live/test smoke

**Done when:** Test card → webhook → row in `/admin/sales` → email with signed download. Strangers cannot open the file.

1. Stripe product $17, copy `price_…` into `STRIPE_BOOK_PRICE_ID`.
2. Webhook `https://vettajimale.tech/api/stripe-webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
3. Restricted key preferred (`rk_…`).
4. Buy once in test mode. If the email fails, use Sales → **Resend download**.
5. Decide tax with counsel. Do **not** enable Stripe Tax until a registration exists. Record “not collecting tax yet” if that is the choice.

### 5. [LAUNCH] Supabase Auth dashboard

**Done when:** Random public email cannot create a studio session. Leaked-password protection is on.

1. Authentication → Providers → Email → **Allow new users to sign up = OFF** (staff still use `/api/staff-signup`).
2. Attack protection → **leaked password protection ON**.
3. Keep email confirmation required.
4. Try a public signup; it should fail. Unapproved staff cannot open studio.

### 6. [LAUNCH] Turnstile

**Done when:** `/admin` signup shows the widget and a missing secret still fails closed.

1. Cloudflare Turnstile → add `vettajimale.tech`.
2. Paste site + secret keys into Vercel Production (and Preview).
3. Redeploy. Complete CAPTCHA once.

### 7. [LAUNCH] Resend webhook + crons + mail footer

**Done when:** A Resend test event hits `/api/newsletter-webhook`. Cron jobs run. Emails show the Brooklyn postal line.

1. Resend → Webhooks → `https://vettajimale.tech/api/newsletter-webhook` (delivered, opened, clicked, bounced, complained).
2. Confirm Vercel crons from `vercel.json` are actually enabled.
3. Send a test newsletter to yourself only after prefs work (item 12 below is already in code; list still “Not open yet”).

### 8. [LAUNCH] Staging smokes (your inboxes, not real buyers)

**Done when:** Each path works once.

1. Contact form → you receive it.
2. Kit subscribe → thanks PDF → unsubscribe → if they sign up again, they must confirm to rejoin the list.
3. Book checkout test card → webhook → email → `/admin/sales`.
4. Viewports 320 / 390 / 768 / 1440: no clipped CTAs, no sideways scroll.
5. Admin login with the designated test account.

### 9. [LAUNCH] Homepage / About leftovers

**Done when:** Live HomeV2 and About have no “YOUR PHOTO” / placeholder strings.

1. Incognito `/` and `/about` after deploy.
2. Studio → Pages → HomeV2 / About → delete dummy blocks.
3. Confirm `hello@vettajimale.tech` receives Privacy Request and Copyright/DMCA mail (alias `privacy@` if you want).

### 10. [SOON] Printed book title

**Done when:** Cover, alt text, brand pages, and legal pages match the PDF cover.

Current code uses **I Call BS: AI Vibe Coding Myths Dispelled**. If the printed cover is different, say so and it can be replaced in one pass (`src/brand/pages.ts`, thanks pages, legal copy).

### 11. [SOON] Optional Maryland venue county

Governing law is **Maryland**. Venue is **Kings County, New York** (where you are). If you want both in Maryland, send the **registered-agent county**.

### 12. [SOON] Newsletter still closed

**Done when:** Homepage Stay curious stays “Not open yet” until you point a real list at `/prefs`.

Public prefs page: `/prefs?token=` (token from contacts unsubscribe). Do not enable the public newsletter form until you have used prefs on a throwaway inbox.

### 13. [LATER] You, not code

- First real Book Update in studio.
- Editorial read of resources + literacy quiz.
- Social videos (shot list in `docs/marketing/SOCIAL-SHOT-LIST.md`). Link-in-bio → Resources, not Stay curious.
- Monthly Users review (disabled accounts, roles).
- Optional: register DMCA agent with the U.S. Copyright Office.
- Counsel review of Terms / Privacy if you want a lawyer’s stamp.

---

## Already in this repo (no redo after deploy confirms them)

Privacy, Terms, Refunds, Copyright, FAQ, Maryland law + Kings County venue, hashed-IP privacy copy, checkout kit-mail opt-in, kit re-subscribe confirm, branded unsubscribe pages, `/prefs`, signed book path + Sales resend, Google Fonts off `index.html` and studio CSS, postal address in `.env.example`, FAQ/Copyright in footer and Pages inventory.

---

## Do not

- Collect more marketing list mail or take **live** cards until items 1–8 are true.
- Put the paid book PDF in `/public/downloads`.
- Turn Stay curious on before a list is wired and `/prefs` is tested.
- Add Google Fonts `<link>` tags back to `index.html`.
