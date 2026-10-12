# CMS remaining work

Check items off as they ship. Prefer finishing ops wiring before new features that depend on live data.

**Related:** step-by-step how-to for every open item → [`TODO-PLAN.md`](./TODO-PLAN.md) (written for a complete novice). Word copy (open in Microsoft Word, not Cursor): Desktop `ICBS-Website-TODO-STEPS.docx` and [`TODO-STEPS.docx`](./TODO-STEPS.docx).

## Ops / environment

- [ ] **[BJ-01]** Deploy current repo to Vercel Production (tools routes, `/api/checkout`, `/api/form-schema` — see `TODO-PLAN.md` Part 12)
- [ ] Resend webhook → `POST /api/newsletter-webhook` with `NEWSLETTER_WEBHOOK_SECRET` (not `CRON_SECRET`); enable delivered / opened / clicked / bounced
- [ ] Cloudflare Turnstile: set `VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (production)
- [ ] Supabase Auth → Email: **disable** “Allow new users to sign up” (force `/api/staff-signup` only)
- [ ] Supabase Auth → enable leaked-password protection (HIBP)
- [ ] Stripe keys in env + smoke-test `/buy` → webhook → `/admin/sales`
- [ ] Confirm cron hits: `/api/newsletter-send`, `/api/lead-magnet-deliver`, `/api/cms-publish-due`
- [ ] **[BJ-04]** Re-check phone overflow 320/390 after deploy
- [ ] **[BJ-05]** Admin login smoke with a designated test account

## Contacts (CRM)

- [x] Add / import / export / delete / send email from Contacts list UI
- [x] Search by email / name on Contacts list
- [ ] Filter (marketing OK, suppressed, tag, newsletter list)
- [ ] Bulk tag / bulk subscribe to newsletter list
- [ ] Merge duplicate contacts by email (if any legacy dupes appear)

## Newsletter

- [ ] Staging smoke: create → design → test send → schedule → cron send
- [ ] Confirm open/click stats appear on Analytics → Newsletters after Resend webhook
- [ ] Default form(s) wired to the right `newsletterListIds`
- [ ] Preference center page for contacts (public list subscribe/unsubscribe UI)

## Analytics / growth

- [x] Charts/graphs on Analytics (Site time series, pie/bar newsletter stats, funnel bars)
- [ ] Author breakdown on Site analytics
- [ ] Coarse geo (country) from CF / request headers
- [ ] Welcome / nurture email sequence (welcome emails 2–6 still not built)
- [ ] Social auto-post on publish (Facebook / LinkedIn / X as chosen)

## Campaigns

- [ ] Campaign step auto-send (blueprints exist; no automatic execution yet)
- [ ] Campaign ↔ newsletter / form / lead-magnet readiness smoke on staging

## Content & site

- [x] Admin **Public site** hub (`/admin/public-site`) — catalog of hardcoded public surfaces + View links
- [x] Admin **Templates** (`/admin/templates`) — Resource starters tab + Layout templates tab; public page `/resources/templates`
- [x] Site PDFs in **Media → Docs** filter (same grid as other media)
- [x] Legacy `/admin/public-site/downloads` redirects to Media
- [x] Admin **Book updates** editor (`/admin/public-site/book-updates`) — publish real entries to `/book/updates`
- [x] Apply migration `20261035_site_managed_content.sql` on Supabase (ICallBS)
- [x] Seed resource surfaces as CMS **Pages** + Dashboard “Public resources” cards (Edit/View/Manage)
- [x] Apply migration `20261036_seed_managed_public_pages.sql` on Supabase (ICallBS)
- [ ] Studio editors for resource page prose (Builder Quick Reference, Templates, Tools body copy) — still code layouts
- [ ] Studio editor for Literacy Check questions (`quiz-content.json`)
- [ ] Studio editor for Tools catalog (`toolsCatalog.ts` / `tools-content.json`)
- [ ] Add Book Updates card to Resources library only after first real entry (optional)
- [ ] Push/deploy growth-track commit so production serves resource + literacy routes
- [ ] Sitewide WCAG 2.2 AA audit of public chrome
- [ ] Kit funnel (`/free`, `/api/subscribe`) replacement only after Contacts path proves out in staging

## Resources package — close intentional gaps

- [ ] **Book Updates:** add first real Correction / Link update / Tool change via `/admin/public-site/book-updates` (edition + chapter/page); keep empty until then
- [ ] **Email gate on templates:** leave off unless you want lead capture — package intentionally free; if adding later, wire form + consent + lead-magnet delivery
- [ ] **Owner editorial pass:** read the four resource pages + Literacy Check (`editorial-review-before-publication` in `quiz-content.json`); fix wording before calling final; verify SOURCE_NOTES tool docs dates if publishing later than Oct 5, 2026

## Imports

- [ ] Kit subscribers → Contacts dry-run + commit on production data (backup first)
- [ ] Document CSV column map for contact-list uploads

## Security / access

- [ ] Owner Disable remains the kill switch for bad studio accounts
- [ ] Periodic review of `disabled_at` / role changes under Users
- [x] **[ADV-F02]** Revert or lock studio auto-approve: new signup must stay `staff_approved = false` until owner promotes; confirm Auth “Allow new users to sign up” is off in production *(code/migration done 2026-10-07; Auth Dashboard signup toggle still verify manually)*
- [x] **[ADV-F11]** Fail closed on missing Turnstile in production for `/api/staff-signup` (no silent CAPTCHA skip)

## Docs hygiene

- [ ] Mark gates Complete in `GATES.md` only after staging smoke for that module
- [ ] Keep `IMPLEMENTATION.md` changelog dated when a slice ships

---

## Launch blockers — adversarial public-site review (2026-10-06)

From the site-wide adversarial review. IDs match that report (`F01`…). Do these before treating the public site as launch-ready for email collection / sales.

### Critical / High (before launch)

- [ ] **[ADV-F01]** Write and publish real **Privacy** and **Terms** pages (replace “This page is being written.”). Do not collect kit/contact email on a surface that still links to unfinished legal pages.
- [x] **[ADV-F02]** Lock studio access (see Security / access above): no open Auth signup + no auto-approved `author` with broad draft/purchase read. *(auto-approve + purchases RLS fixed; Auth public signup Dashboard still verify)*
- [ ] **[ADV-F03]** Decide kit PDF access model: either (A) keep `/downloads/I-Call-BS-Free-Starter-Kit.pdf` public and stop implying signup is required for the file, or (B) move kit PDF behind private/signed delivery after subscribe.
- [ ] **[ADV-F04]** Confirm paid book `BOOK_DOWNLOAD_URL` is **not** a permanent public CDN link; use private Storage + time-limited signed URL (or equivalent) at Stripe fulfillment.
- [ ] **[ADV-F05]** Remove or replace Home/About placeholders before publish: “Project placeholder,” “YOUR PHOTO,” “YOUR INTRODUCTION VIDEO.” Clean **published** CMS homepage if prod uses `HomeOrKit`, and clean **dev brand draft** (`/api/dev-brand-draft`) so local preview matches intent.

### Medium (before or immediately after launch)

- [ ] **[ADV-F06]** Newsletter: keep “Not open yet” until Preference center + confirm path exist (ties to Newsletter section).
- [ ] **[ADV-F07]** Kit thanks UX: if Resend fails, tell the visitor clearly to use the on-page download (do not only promise email).
- [ ] **[ADV-F08]** Canonical book title everywhere (brief: “I Call BS: Vibe Coding Myths Dispelled” vs current “AI Vibe Coding…”).
- [ ] **[ADV-F09]** Legal fallback breadcrumb: replace “← The book” with a neutral site back / Home / Resources link.
- [x] **[ADV-F10]** Newsletter webhook: dedicated `NEWSLETTER_WEBHOOK_SECRET` + Resend/Svix signature verification (do not rely on `CRON_SECRET` alone).
- [ ] **[ADV-F12]** Document and smoke-test **DEV brand routes vs production CMS routes** so launch checks the surface visitors actually see.
- [ ] **[ADV-F13]** Contact honeypot: hide from assistive tech (`aria-hidden` / visually hidden, not a visible “COMPANY” field).
- [ ] **[ADV-F14]** Header `aria-current`: only the true current page should be marked current (homepage incorrectly marked “The book”).

### Staging smokes still Unverified in review

- [ ] Contact form → inbox delivery (synthetic)
- [ ] Kit subscribe → email and/or download → unsubscribe token
- [ ] Book checkout → Stripe webhook → purchase email → `/admin/sales`
- [ ] Mobile pass: 320px, 390px, 768px, 1440px (clipped text, overflow, touch targets)

---

## Social launch (VettaJimale.Tech)

Do this before posting the script deck. These matter more than writing a 16th script.

**Copy:** [`docs/marketing/SOCIAL-SCRIPTS.md`](../marketing/SOCIAL-SCRIPTS.md)  
**Shot list:** [`docs/marketing/SOCIAL-SHOT-LIST.md`](../marketing/SOCIAL-SHOT-LIST.md)

- [ ] **[SM-01]** Shoot five, not fifteen: record **2** (spelling), **5** (three live tools), **10** (literacy check), **11** (templates), and **15** (the pin). Post over two or three weeks. Use 13 and 14 as end cards only — not extra “please follow” videos. Keep 1, 3, 4, 6–9, 12 as sequel inventory
- [ ] **[SM-02]** Fix the door before you post: bio `I test the claim, then I keep what works. VettaJimale.Tech`; link in bio → **Resources** (not the homepage); second link `/free-kit` if the platform allows two; do not send people to Stay curious (list is not open)
- [ ] **[SM-03]** Pin **15** as the only “who is this” video. Hold **VettaJimale.Tech** on screen for eight seconds at the end. Use script **2** as a three-second bumper on every other video that says the name out loud
- [ ] **[SM-04]** Film the real site: screen-record Resources, the literacy check, one template download, and the kit-versus-book table. Do not mock up empty shelves. If Creative Tools is unpublished, skip it or say so
- [ ] **[SM-05]** One action per post: spoken close = one door; extra links in the first comment only. Two spoken CTAs bounce people
- [ ] **[SM-06]** Do not wait on missing pieces (no welcome video; Stay curious not open). Record anyway. When those go live, update scripts **4, 9, 13, and 15** so the pin does not stay stale
- [ ] **[SM-07]** Batch film in one afternoon: spelling bumper, check, templates, tools, pin. Same shirt, same light, same on-screen type
- [x] **[SM-08]** Five-video shot list (camera, screen, on-screen words, first comment, post date) — `docs/marketing/SOCIAL-SHOT-LIST.md` plus Desktop Word / PowerPoint / PDF
