# To-Do plan — step-by-step (novice guide)

This plan matches every **open** checkbox in [`TODO.md`](./TODO.md).  
Already-checked items in `TODO.md` are **done** — you do not need to redo them.

**How to use this document**

1. Open `TODO.md` and this file side by side.
2. Pick one section (start with **Launch blockers** if you want the public site safe for email/sales).
3. Follow the numbered steps exactly. Check the box in `TODO.md` only when the “Done when” test passes.
4. If a step asks for a password, API key, or paid account you do not have, stop and get that access first — do not invent secrets.

**Words you will see**

| Word | Meaning |
| --- | --- |
| **Repo** | The project folder `F:\ICBS-Website` (or wherever you cloned it). |
| **Local / DEV** | The site running on your computer (`npm run dev`), often `http://127.0.0.1:5173`. |
| **Staging** | A non-production deploy used for safe tests (same as production setup, fake data OK). |
| **Production / live** | The real public site visitors use. |
| **Env / `.env`** | Secret config file on the server (never commit real secrets to Git). Copy shapes from `.env.example`. |
| **Supabase** | Database + Auth host for this project. |
| **Resend** | Email sending service. |
| **Stripe** | Payment service for the $17 book. |
| **Studio / admin** | `/admin` — the CMS for owners/editors. |
| **ADV-Fxx** | Finding ID from the 2026-10-06 adversarial public-site review. |

**Suggested order for a novice who wants to launch safely**

1. Launch blockers (ADV-F01 → F05, then F02/F04 security).  
2. Ops / environment (Auth off, Turnstile, Stripe, Resend webhook, crons).  
3. Staging smokes (contact, kit, checkout).  
4. Everything else in `TODO.md` as product priorities allow.

---

## Part 1 — Launch blockers (adversarial review)

### ADV-F01 — Real Privacy and Terms pages

**Why:** The site asks for email (kit, contact) but Privacy and Terms currently say “This page is being written.” That is not safe or honest for launch.

**Done when:** Visiting `/privacy` and `/terms` on the **live** site shows real policy text (not the placeholder), and kit/contact footers still link to those URLs.

**Steps**

1. Decide whether Privacy/Terms live as:
   - **A)** CMS pages in Studio (preferred if production uses CMS), or  
   - **B)** Hardcoded copy in `src/pages/Legal.tsx` (fallback when CMS has no published page).
2. Draft Privacy (what you collect, why, email providers, unsubscribe, contact). Draft Terms (acceptable use, digital goods, no courses claim if you want it explicit).
3. If using CMS: open Studio → Pages → create or edit Privacy and Terms → fill content → **Publish**.
4. If using code fallback: edit `src/pages/Legal.tsx` and replace the “This page is being written.” branch with your real paragraphs for `privacy` and `terms`. Keep the refunds section as-is unless legal review changes it.
5. Deploy or publish.
6. Test in an incognito window: open `/privacy`, `/terms`, and click Privacy from the kit signup fine print.

---

### ADV-F02 — Lock studio signup (no open admin)

**Why:** If anyone can create a studio account and get auto-approved as `author`, they may read drafts and purchase-related data.

**Done when:** (1) Supabase Auth does **not** allow public self-signup. (2) New studio accounts are **not** auto-approved until you promote them. (3) You can still create staff via the intended `/api/staff-signup` + approval path.

**Steps**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your **ICallBS** project.
2. Go to **Authentication → Providers → Email** (wording may be “Sign up” / “Allow new users to sign up”).
3. **Turn OFF** “Allow new users to sign up” (or equivalent). Save.
4. In the repo, find the migration or trigger that sets `staff_approved = true` on new users (see `supabase/migrations/` files mentioning auto-approve / `handle_new_user`). Plan a change so new profiles start with `staff_approved = false` (or ask a developer to apply that change).
5. Until code is fixed: do not advertise `/admin` signup publicly; only invite people you trust.
6. Test: try creating a random account from the public internet — it should fail or remain unapproved with no studio access.
7. Check the box in `TODO.md` under Security **and** ADV-F02 when both Auth setting and approval behavior are correct.

---

### ADV-F03 — Kit PDF access model

**Why:** The free kit PDF is currently at a public URL. Anyone can download it without signing up, while the page implies signup delivers the PDF.

**Done when:** You have chosen A or B below and the kit page + email match that choice.

**Option A — Keep PDF public (simplest)**

1. Keep file at `public/downloads/I-Call-BS-Free-Starter-Kit.pdf`.
2. Edit kit page copy so it does **not** imply the file is email-gated (e.g. “Sign up for updates; the PDF is also available on the thank-you page”).
3. Optional: add a direct “Download the PDF” link for people who refuse email.

**Option B — Gate the PDF (stricter)**

1. Move the PDF out of public web root into a **private** Supabase Storage bucket (or similar).
2. After successful `/api/subscribe`, generate a **signed** short-lived download URL for email + thanks page.
3. Remove or block the old public `/downloads/I-Call-BS-Free-Starter-Kit.pdf` path.
4. Smoke-test: subscribe with a test email → get link → confirm link expires or cannot be guessed.

Pick A or B; do not leave the current mismatch.

---

### ADV-F04 — Paid book download must not be a forever-public link

**Why:** If `BOOK_DOWNLOAD_URL` is one permanent public URL emailed to every buyer, the link can be shared and the $17 product leaks.

**Done when:** Buyers get a private or time-limited URL; the raw file is not guessable on the open web.

**Steps**

1. Open production env (Vercel/hosting → Environment Variables).
2. Find `BOOK_DOWNLOAD_URL`.
3. If it points to a public CDN/Drive link anyone can open without buying → **replace** the process:
   - Upload the paid PDF to a **private** Storage bucket.
   - At Stripe webhook fulfillment, create a **signed URL** (hours/days TTL) and put that in the purchase email.
4. Buy once with a real card in **test mode** (or a controlled live test), confirm email link works, confirm a random stranger URL does not.
5. Check ADV-F04 in `TODO.md`.

---

### ADV-F05 — Remove Home/About placeholders before publish

**Why:** “Project placeholder,” “YOUR PHOTO,” and “YOUR INTRODUCTION VIDEO” make the site look unfinished and contradict a receipts-driven brand.

**Done when:** Live Home and About show real media/projects **or** those sections are removed/hidden.

**Steps (DEV brand draft — local)**

1. Run the site locally (`npm install` once if needed, then `npm run dev`).
2. Open `/` and `/about`. Note placeholder text.
3. In Studio (or brand draft editor used by `/api/dev-brand-draft`), replace placeholders with real titles/text/images, **or** delete the empty project cards and media pieces.
4. Hard-refresh the browser. Confirm placeholders are gone.

**Steps (production CMS homepage)**

1. In Studio, open the page assigned as homepage (`settings.homepage_content_id` / Public site hub).
2. Edit the same placeholder blocks → Publish.
3. Open the live domain in incognito and confirm.

---

### ADV-F06 — Newsletter stays closed until prefs exist

**Why:** Homepage honestly says “Not open yet.” Opening it without unsubscribe/preferences creates support pain.

**Done when:** Either newsletter stays closed, **or** preference center + confirm/unsubscribe work (see Newsletter section below).

**Steps**

1. Leave the disabled “Not open yet” UI until Part 3 Newsletter items are done.
2. When ready to open: complete Preference center + Resend webhook + a test subscribe/unsubscribe, then enable the form.

---

### ADV-F07 — Kit thanks page when email fails

**Why:** Code can accept signup even if Resend fails; visitors may wait forever for an email.

**Done when:** Thanks page (or email failure path) clearly says to use the on-page download if the email does not arrive.

**Steps**

1. Open kit thank-you UI (`FreeThanks.tsx` and/or brand thanks blocks in `pages.ts`).
2. Add clear copy: “If the email does not arrive in a few minutes, use the download button on this page and check spam.”
3. Optionally log/alert yourself when `kit email failed` in `api/subscribe.ts`.
4. Deploy and read the thanks page as a visitor.

---

### ADV-F08 — One canonical book title

**Why:** Marketing brief and on-site title disagree (“Vibe Coding” vs “AI Vibe Coding”).

**Done when:** Cover, homepage, kit, product page, checkout metadata, and Stripe product name use the **same** title string you approve.

**Steps**

1. Write the final title on one line (example from brief: `I Call BS: Vibe Coding Myths Dispelled`).
2. Search the repo and Studio content for `AI Vibe Coding` / `Vibe Coding` / `I Call BS`.
3. Update brand seed (`src/brand/pages.ts`), cover alt text, kit graphics text if needed, and any CMS blocks.
4. Update Stripe product name in Stripe Dashboard if it differs.
5. Spot-check Home, Kit, Book page.

---

### ADV-F09 — Legal breadcrumb “← The book”

**Why:** On Privacy, “← The book” feels like you came from checkout even when you came from the footer.

**Done when:** Legal pages link back to Home or Resources (or use the site Back button only).

**Steps**

1. Open `src/pages/Legal.tsx`.
2. Change the link labeled `← The book` to `← Home` (`href="/"`) or `← Resources`.
3. Deploy; open `/privacy` and confirm.

---

### ADV-F10 — Newsletter webhook security

**Why:** A shared Bearer secret (especially reusing `CRON_SECRET`) can let an attacker forge bounce events and suppress contacts.

**Done when:** Resend signs webhooks; the API verifies that signature; a dedicated secret is used.

**Steps**

1. In Resend Dashboard → Webhooks → add endpoint `https://YOUR_DOMAIN/api/newsletter-webhook`.
2. Create a **dedicated** secret in env: `NEWSLETTER_WEBHOOK_SECRET=...` (long random string). Do **not** reuse cron secrets long-term.
3. Have a developer (or follow Resend docs) verify **Svix/Resend signatures** on the raw body in `api/newsletter-webhook.ts`.
4. Enable events: delivered, opened, clicked, bounced (and complaint if available).
5. Send a test newsletter; confirm Analytics → Newsletters shows events.

---

### ADV-F11 — Turnstile required in production for staff signup

**Why:** If CAPTCHA secret is missing, bots can hammer signup.

**Done when:** Production `/api/staff-signup` rejects requests when Turnstile is not configured/verified.

**Steps**

1. Create a Cloudflare Turnstile site; copy Site Key + Secret Key.
2. Set `VITE_TURNSTILE_SITE_KEY` (frontend) and `TURNSTILE_SECRET_KEY` (server) in production env.
3. Redeploy.
4. Ask a developer to make production **fail closed** if the secret is missing (no skip).
5. Test staff signup UI shows the widget and rejects empty tokens.

---

### ADV-F12 — DEV vs production surfaces

**Why:** Local DEV often shows `BrandPage` seeds; production may show CMS (`HomeOrKit`). Fixing only local seed does not fix live.

**Done when:** You have a short written list of “what URL serves what” and launch QA uses the **production** URLs.

**Steps**

1. Read `src/App.tsx`: note routes inside `if (import.meta.env.DEV)` vs the production branches.
2. Write a one-page checklist: Home, About, Contact, Kit, Book, Privacy, Resources — for each, “DEV = … / PROD = …”.
3. Run launch QA on the production (or staging) domain, not only `localhost`.

---

### ADV-F13 — Contact honeypot accessibility

**Why:** A field named “COMPANY” can confuse screen-reader users; honeypots should be hidden from everyone except bots.

**Done when:** Sighted users and screen readers do not treat the honeypot as a real field.

**Steps**

1. Find the honeypot in the contact form (brand contact block / `Contact.tsx` / `BrandBlocks.tsx`).
2. Ensure it is visually hidden **and** marked `aria-hidden="true"` / `tabIndex={-1}` (or `autocomplete="off"` + not in tab order). Do **not** put a visible “Company” label for humans if it is the trap field.
3. Tab through the form with a keyboard; honeypot must not receive focus.

---

### ADV-F14 — Header current page state

**Why:** Homepage incorrectly announced “The book” as the current nav item.

**Done when:** Only the real current route has `aria-current="page"`.

**Steps**

1. Open `src/brand/BrandChrome.tsx` (and any other header that sets `aria-current`).
2. Fix `active()` so `/` does not mark The book/Starter Kit current unless you are on that path.
3. Load `/`, `/about`, `/free-kit`; confirm the underline/current state matches.

---

### Staging smokes (still Unverified)

**Contact delivery**

1. Use a real inbox you control.
2. Submit Contact with topic + message.
3. Confirm you receive the message (or your configured destination).
4. Confirm a second spammy submit is rate-limited.

**Kit subscribe → unsubscribe**

1. Subscribe with a test email.
2. Confirm thanks page download and/or email.
3. Click unsubscribe in the email; confirm you are not marketed again.

**Book checkout**

1. Use Stripe **test mode** keys first.
2. Complete checkout → land on `/buy/thanks`.
3. Confirm webhook row in `/admin/sales` and purchase email.
4. Only then use live keys with a tiny real purchase if needed.

**Responsive**

1. Chrome DevTools → device toolbar.
2. Check 320, 390, 768, 1440 widths on Home, Kit, Tools, Templates form.
3. Note clipped CTAs, horizontal scroll, tiny buttons; fix or file follow-ups.

---

## Part 2 — Ops / environment

### Resend webhook → newsletter events

1. Complete **ADV-F10** steps above.
2. In Resend, point the webhook at `https://YOUR_DOMAIN/api/newsletter-webhook`.
3. Send a test issue; open and click a link in the test email.
4. In Studio → Analytics → Newsletters, confirm delivered/opened/clicked appear within a few minutes.

### Cloudflare Turnstile (production)

1. Complete **ADV-F11** steps.
2. Confirm kit/staff/forms that use Turnstile show the widget in production.

### Disable Supabase public signup

1. Complete **ADV-F02** step 1–3 (Auth setting).
2. Recheck after any Supabase project restore — settings can reset.

### Stripe keys + smoke-test

1. In Stripe Dashboard, create/get **Secret key**, **Publishable key** (if used), **Webhook signing secret**.
2. Set env vars listed in `.env.example` (`STRIPE_*`, price id, `BOOK_DOWNLOAD_URL` / signed flow).
3. Add webhook endpoint to `/api/stripe-webhook` for `checkout.session.completed` (and whatever the code expects).
4. Run test-mode purchase → `/buy/thanks` → `/admin/sales`.
5. Then go live carefully.

### Confirm cron jobs

1. In your host (Vercel cron, GitHub Action, or external cron), ensure scheduled HTTP calls hit:
   - `/api/newsletter-send`
   - `/api/lead-magnet-deliver`
   - `/api/cms-publish-due`
2. Each call must send the auth header/secret your code expects (often `CRON_SECRET` / `Authorization: Bearer …`).
3. Check function logs after a scheduled window; fix 401/500s before relying on them.

---

## Part 3 — Contacts (CRM)

### Filter (marketing OK, suppressed, tag, newsletter list)

1. Open Studio → Contacts.
2. If filters are missing, this is a **development task**: add UI filters that query contacts by consent, `suppressed`, tags, and list membership.
3. As owner: write acceptance tests — “show only marketing-OK,” “show suppressed,” “show tag X,” “show list Y.”
4. Check the box when those filters work on staging data.

### Bulk tag / bulk subscribe

1. Select multiple contacts in the list UI (after multi-select exists).
2. Apply tag or subscribe to a newsletter list in one action.
3. Confirm each contact updated; confirm consent rules still respected (no marketing without consent).

### Merge duplicate contacts

1. Export or search for the same email twice.
2. Prefer a built-in merge tool when available; otherwise manually keep one contact, move tags/subscriptions, delete the duplicate.
3. Backup before bulk merges on production.

---

## Part 4 — Newsletter

### Staging smoke (create → design → test → schedule → cron)

1. Studio → Newsletter → create issue.
2. Design body; attach list/segment.
3. **Test send** to yourself.
4. Schedule for a few minutes ahead.
5. Confirm cron/send job runs; you receive the issue.
6. Check no duplicate sends.

### Open/click stats after webhook

1. Finish Resend webhook (Part 2).
2. Open/click the test email.
3. Analytics → Newsletters shows counts.

### Default forms → `newsletterListIds`

1. Studio → Forms → open the public signup form(s) you care about (e.g. `/updates`).
2. Set newsletter list IDs to the correct list(s).
3. Submit a test signup; confirm the contact appears on that list.

### Preference center (public)

1. Build or enable a public page where contacts can change list interests / unsubscribe (ties to ADV-F06).
2. Link it from newsletter footer.
3. Test tokenized unsubscribe still works.

---

## Part 5 — Analytics / growth

### Author breakdown on Site analytics

1. Development task: group page views / conversions by content author.
2. Verify with two authors’ posts on staging.
3. Check box when the chart/table is accurate.

### Coarse geo (country)

1. Ensure hosting forwards country headers (e.g. Cloudflare `CF-IPCountry`).
2. Store country on analytics events if product wants it.
3. Display country breakdown without storing precise location you do not need.

### Welcome / nurture emails 2–6

1. Write the sequence copy (welcome is often email 1 already).
2. Implement as campaign steps or Resend automations — **only after** Contacts + consent + unsubscribe work.
3. Test with a seed contact; confirm delays and stop-on-unsubscribe.

### Social auto-post on publish

1. Decide networks (Facebook / LinkedIn / X).
2. Connect Make/Zapier or native API with an **approval** step if possible (avoid surprise posts).
3. Publish a staging post; confirm one post per network, no duplicates.
4. Do not enable on production until approval path exists.

---

## Part 6 — Campaigns

### Campaign step auto-send

1. Today blueprints exist without automatic execution — treat as a feature build.
2. Requirements: respect consent, suppression, quiet hours, idempotency (no double send).
3. Staging: enroll a test contact; confirm only intended steps fire.

### Campaign readiness smoke

1. Open a campaign in Studio.
2. Confirm readiness checklist flags missing form / newsletter / lead magnet.
3. Fix blockers; re-run checklist until green; do a dry send.

---

## Part 7 — Content & site

### Studio editors for resource prose

1. Today Builder Quick Reference, Templates, Tools body are largely **code** layouts.
2. Product decision: which fields become CMS-editable.
3. Developer implements studio fields; you edit copy in Studio afterward.
4. Check box when you can change that prose without a code deploy.

### Studio editor for Literacy Check questions

1. Questions live in `src/literacy/quiz-content.json`.
2. Developer builds an admin UI **or** you edit JSON carefully and redeploy.
3. Run the quiz end-to-end after edits.

### Studio editor for Tools catalog

1. Data lives in `tools-content.json` / related model files.
2. Same pattern: CMS UI later, or careful JSON edits + review of experience labels and official URLs.
3. Re-read ADV tools rules: do not invent “Used by VJ”; keep docs links official.

### Book Updates card on Resources library (optional)

1. Add the first real Book Update (Part 8).
2. Only then add a library card linking to `/book/updates`.

### Push/deploy growth-track commit

1. Ensure resource + literacy routes are on the branch you deploy.
2. `git status` / PR / merge per your workflow.
3. Deploy production; open `/resources/templates`, `/resources/tools-and-updates`, literacy URL on the **live** domain.

### Sitewide WCAG 2.2 AA audit

1. Use axe DevTools or Lighthouse accessibility on key pages.
2. Fix contrast, focus, labels, headings systematically.
3. Recheck after major UI changes.

### Kit funnel replacement

1. **Do not** replace `/api/subscribe` until Contacts + forms path is proven on staging.
2. When ready: migrate with dual-run or feature flag; keep unsubscribe working.

---

## Part 8 — Resources package gaps

### First real Book Update

1. Studio → Public site → Book updates (`/admin/public-site/book-updates`).
2. Add one real Correction / Link update / Tool change with edition + chapter/page.
3. Publish; open `/book/updates` publicly.
4. Until you have a real entry, leave the public list empty (do not fake updates).

### Email gate on templates

1. **Default:** leave templates free (current design).
2. Only if you want leads: add a form, marketing consent, and optional lead-magnet delivery — then test unsubscribe.

### Owner editorial pass

1. Read as a stranger:
   - `/resources/builder-quick-reference`
   - `/resources/templates` (+ one form)
   - `/resources/tools-and-updates`
   - Literacy Check
2. Fix unclear jargon; keep beginner-friendly tone.
3. If publishing after Oct 5, 2026, refresh tool documentation review dates / SOURCE_NOTES.
4. Check `editorial-review-before-publication` notes inside `quiz-content.json`.

---

## Part 9 — Imports

### Kit subscribers → Contacts

1. **Backup** production data first (Supabase backup or export).
2. Studio → Imports → Kit subscribers → **dry-run**.
3. Read the dry-run report (creates/updates/skips).
4. Only then **commit**.
5. Spot-check contacts; confirm kit `subscribers` table was not corrupted (import should not destroy the legacy list).

### Document CSV column map

1. Write a short doc (in `docs/cms/` or IMPORTS section) listing CSV headers → contact fields.
2. Include required columns, optional tags, and an example row.
3. Link that doc from the Imports UI help text if possible.

---

## Part 10 — Security / access (ongoing)

### Owner Disable kill switch

1. Studio → Users.
2. Practice disabling a test account; confirm they cannot use `/admin`.
3. Keep this as your emergency response for a compromised editor.

### Periodic review of roles

1. Calendar reminder monthly: open Users list.
2. Remove unused accounts; confirm roles match reality (`owner` / `admin` / `author`).
3. Confirm nobody is approved who should not be (ties to ADV-F02).

---

## Part 11 — Docs hygiene

### GATES.md

1. Open `docs/cms/GATES.md`.
2. Mark a module **Complete** only after that module’s staging smoke passes — not when UI merely exists.
3. Keep Status column honest.

### IMPLEMENTATION.md changelog

1. When a slice ships, add a dated note (what shipped, migrations, env vars).
2. Keep it short; link PRs if you use them.

---

## Part 12 — From browser journey pass (2026-10-07)

Report: [`docs/reviews/04-browser-journey-tests.md`](../reviews/04-browser-journey-tests.md).  
Agent can fix DB grants / repo code; you must do Dashboard + deploy + product decisions.

### BJ-01 — Deploy current site to production (required)

**Why:** Production 404s `/resources/tools-and-updates`, `/api/checkout`, `/api/form-schema`. Local DEV has tools; live does not.

**Steps**
1. Commit (or confirm) the branch you want live includes resource routes + `api/checkout.ts` + `api/form-schema.ts`.
2. Push to the branch Vercel uses for **production** (usually `main`).
3. Open [Vercel Dashboard](https://vercel.com) → this project → Deployments → confirm a new Production deploy is **Ready**.
4. Visit `https://vettajimale.tech/resources/tools-and-updates` — expect Tools page, not “Page not found”.
5. Visit `https://vettajimale.tech/api/checkout` — expect redirect/JSON from Stripe config, **not** Vercel `NOT_FOUND`.
6. Check off when tools + checkout entry respond.

### BJ-02 — Supabase Auth Dashboard (security leftovers)

**Why:** Code no longer auto-approves; Dashboard can still allow open signup / weak passwords.

**Steps**
1. Open [Supabase](https://supabase.com/dashboard) → **ICallBS**.
2. **Authentication → Providers → Email** → turn **OFF** “Allow new users to sign up” (staff use `/api/staff-signup` only).
3. **Authentication → Attack Protection** (or Password settings) → enable **Leaked password protection** (HaveIBeenPwned).
4. Save. Optional: try signup via Supabase client `signUp` in a private window — it should fail; `/admin` login page should still load.
5. Check ADV-F02 / SUP-007 items in `TODO.md`.

### BJ-03 — Production env vars after deploy

**Why:** Staff signup fails closed without Turnstile; newsletter webhook needs its own secret; Stripe needs keys.

**Steps**
1. Vercel → Project → Settings → Environment Variables → **Production**.
2. Set `VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (Cloudflare Turnstile widget).
3. Set `NEWSLETTER_WEBHOOK_SECRET` to the Resend webhook signing secret (`whsec_…`). Do **not** reuse `CRON_SECRET`.
4. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_BOOK_PRICE_ID`, `BOOK_DOWNLOAD_URL`.
5. Redeploy Production so Vite public env vars bake in.
6. Resend → Webhooks → endpoint `https://vettajimale.tech/api/newsletter-webhook` with events delivered/opened/clicked/bounced/complained.

### BJ-04 — Phone overflow check after deploy

**Why:** Journey pass flagged horizontal overflow at 390px / 320px.

**Steps**
1. After BJ-01 deploy, open Chrome DevTools → device toolbar → 390 and 320 widths.
2. Check `/` and `/resources/tools-and-updates` for sideways scroll.
3. If still broken, file a fix task (CSS) — do not ignore on launch surfaces.

### BJ-05 — Admin authorized-access smoke (needs a test account)

**Steps**
1. Create or pick a **staging/test** staff user (not a personal password in chat).
2. Owner approves them on `/admin` → Users (`staff_approved`).
3. Sign out → sign in → confirm shell (Analytics / content) loads.
4. Optional automation: set `JOURNEY_ADMIN_EMAIL` + `JOURNEY_ADMIN_PASSWORD` and re-run `scripts/browser-journey-pass.mjs`.

### Already fixed from the agent side (do not re-do)

- Studio auto-approve stopped; purchases RLS tightened; webhook/Turnstile/honeypot/Stripe bind in **repo** (still need **deploy** + env).
- Anon `contents` grants restored on ICallBS after journey 401s (draft columns still revoked). Re-check Production pages after refresh.

---

## Part 13 — Social launch (VettaJimale.Tech)

Not a site-launch blocker. Do this before you post the script deck. Full spoken copy is in `docs/marketing/SOCIAL-SCRIPTS.md`. The shot list is in `docs/marketing/SOCIAL-SHOT-LIST.md`.

### SM-01 — Shoot five, not fifteen

**Why:** Fifteen videos in a row will feel like “go to my website.” Five videos cover find / use / follow.

**Done when:** You have recorded (or scheduled recording of) scripts 2, 5, 10, 11, and 15 only. Scripts 13 and 14 are planned as end cards. The rest of the deck is not on the calendar as a backlog binge.

**Steps**

1. Open `docs/marketing/SOCIAL-SCRIPTS.md` (or the readable Word on the Desktop).
2. Print or keep open scripts **2, 5, 10, 11, 15**.
3. Put **13** and **14** in a note labeled “end cards” — last line only, stuck on 10 and 11 if you need a follow ask.
4. Leave 1, 3, 4, 6–9, and 12 in a “sequel” folder. Use them only when a post earns them (kit vs book, lost on the site, “AI is smarter,” adding a vendor).
5. Put the five on a two- or three-week calendar (see SM-07 / the shot list). Do not post all five in five days.

### SM-02 — Fix the door before you post

**Why:** A good video that sends people to a magazine homepage, a closed newsletter, or a vague bio will bounce.

**Done when:** Every profile you will post from has the one-line bio, Resources as the primary link, optional `/free-kit`, and no Stay curious / newsletter link.

**Steps**

1. Set bio to: `I test the claim, then I keep what works. VettaJimale.Tech`
2. Name field: `Vetta Jimale (VJ)` (or your usual public name plus VJ).
3. Primary link: the **Resources** URL (`/resources`), not the homepage.
4. If the app allows a second link: `/free-kit`.
5. Remove any link to Stay curious / a newsletter waitlist. That list is not open yet.
6. Repeat on Instagram, TikTok, YouTube, LinkedIn (and X if you use it) before the first post.

### SM-03 — Pin 15; bumper from 2

**Why:** Strangers need one “who is this” video. The name is easy to mis-hear, so the URL must sit on screen.

**Done when:** Script 15 is pinned on each profile you use. The end card holds `VettaJimale.Tech` for eight seconds. Script 2’s last three seconds exist as a reusable bumper.

**Steps**

1. Record script 15 last in the batch (see SM-07).
2. End card: full-screen `VettaJimale.Tech`, **eight seconds**, no extra words.
3. Watch once with sound off. If you cannot screenshot the URL, recut the end.
4. Pin that video. Do not replace it with a 20-second trailer.
5. Export the last **three seconds** of script 2. Append that bumper to any later video that says the name out loud.

### SM-04 — Film the real site

**Why:** Honesty is the brand. Empty shelves dressed as a full library will read as vapor.

**Done when:** Your B-roll is screen recordings of live pages: Resources, literacy check (first question only), one template download, kit-versus-book table. Creative Tools is either skipped or clearly unpublished.

**Steps**

1. Open a clean browser (logged out, no bookmarks bar).
2. Record the B-roll list in `SOCIAL-SHOT-LIST.md` (4–6 seconds per shot, slow mouse).
3. Pause on every **SAMPLE** label so it is readable.
4. Do not film a fake Creative Tools archive. Skip that shelf or say it is not published yet.
5. Pause the kit-versus-book table on “previews from 3 chapters.”

### SM-05 — One action per post

**Why:** Two spoken calls-to-action bounce people. Links belong in the first comment.

**Done when:** Each of the five videos has one spoken door, on-screen URL held 3 seconds (8 on the pin), and extra paths only in the first comment.

**Steps**

1. For each video, copy the “Call to action” and “First comment” from the script / shot list.
2. Spoken close = one door only.
3. Paste extra URLs in the first comment after the post is up.
4. Click those paths in a private window. If anything 404s, fix the comment before you boost.

### SM-06 — Record anyway; update later

**Why:** Waiting for a welcome video or an open newsletter delays the only posts that can ship now.

**Done when:** The five videos are recorded without those assets. A reminder exists to update scripts 4, 9, 13, and 15 when Stay curious opens or a welcome video exists.

**Steps**

1. Record without a welcome video and without promising a live newsletter.
2. Put a calendar reminder (or leave this checkbox open until the update): when Stay curious opens or a welcome video is uploaded, edit scripts **4, 9, 13, and 15** and recut the pin if it still says “not open yet.”

### SM-07 — Batch in one afternoon

**Why:** Same shirt, light, and type will look more finished than another round of copy.

**Done when:** All five talking-head takes plus silent B-roll are recorded in one session, in batch order (not posting order).

**Steps**

1. Thirty minutes of setup: bio (SM-02), on-screen type (cream on dark green), pages open as in the shot list.
2. Film silent B-roll first (SM-04).
3. Then talking head, shortest to longest: **2 → 10 → 11 → 5 → 15**.
4. Same shirt, same light, same seat.
5. Edit 2 and 10 the same day if you can. Pin 15 only after a sound-off watch.

### SM-08 — Five-video shot list (done)

**Why:** The useful next artifact was a shot list, not a 16th script.

**Done when:** The shot list exists with camera / screen / on-screen words / first comment / post date.

**Status:** Done. Use `docs/marketing/SOCIAL-SHOT-LIST.md` and the Desktop Word / PowerPoint / PDF (`VettaJimale Tech - Five Video Shot List`).

---

## Quick “I am overwhelmed” path

Do only this weekend checklist:

1. **BJ-01** Deploy production (unblocks tools + APIs)  
2. **BJ-02** Auth signup off + leaked-password on  
3. **BJ-03** Turnstile + newsletter webhook + Stripe env  
4. ADV-F01 Privacy + Terms  
5. ADV-F05 Remove placeholders on the surface you will publish  
6. ADV-F03 Decide kit PDF public vs gated  
7. ADV-F04 Confirm book download is not a permanent public URL  
8. Stripe test purchase + kit subscribe + contact form smokes  

Then return to `TODO.md` for the rest.

---

## After you finish items

- Check the matching box in [`TODO.md`](./TODO.md).
- If the adversarial report finding is done, keep the `ADV-Fxx` id in the checkbox text for traceability.
- Re-run `/impeccable critique` or a short adversarial pass on changed pages before calling the site launch-ready.
