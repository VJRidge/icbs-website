# 04 — Browser journey tests (VettaJimale.Tech)

**Date:** 2026-10-07  
**Primary base URL:** `https://vettajimale.tech` (production)  
**Also probed:** `http://localhost:5173` (local Vite DEV brand surface — was answering HTTP 200)  
**Preview :4173:** not serving  
**Tooling:** Playwright Chromium via `scripts/browser-journey-pass.mjs` + Cursor browser snapshot for production tools 404  
**App code:** not modified  
**Safety:** No real contact/kit/newsletter production writes; no Stripe payment; no admin credentials (`JOURNEY_ADMIN_*` unset)

---

## URL identification

| Candidate | Probe | Used as |
| --- | --- | --- |
| `http://localhost:5173` | 200 — Vite DEV; `/api/*` returns raw TS handlers, not Vercel functions | Secondary (DEV brand journeys / tools UI) |
| `http://localhost:4173` | timeout / not up | — |
| `https://vettajimale.tech` | 200 | **Primary** (named production site) |

Production homepage title observed: **“I Call BS: Free Starter Kit”** (kit-as-home / CMS surface).  
Local DEV homepage title: **“VettaJimale.Tech”** (brand draft surface). These are not the same composition.

---

## API / download probes

| Path | Local `:5173` | Production |
| --- | --- | --- |
| `/api/form-schema?slug=lead-capture` | 200 **but** `text/javascript` raw handler source | **404** `NOT_FOUND` |
| `/api/checkout` | 200 raw handler source (not a Stripe redirect) | **404** `NOT_FOUND` |
| `/downloads/I-Call-BS-Free-Starter-Kit.pdf` | 200 `application/pdf` | 200 `application/pdf` (`Content-Disposition: inline; filename="I-Call-BS-Free-Starter-Kit.pdf"`) |

Email layers (kept distinct; none claimed equivalent):

| Layer | This pass |
| --- | --- |
| Request accepted | Not claimed for kit/contact/newsletter (live posts skipped) |
| Provider delivery event | Unverified |
| Message received | Unverified |

---

## Journey results

### 1. Homepage → About → Contact

| Field | Detail |
| --- | --- |
| **Status** | **Pass** (production) |
| **Steps** | Open `/` → click About → browser Back → direct `/about` + refresh → `/contact` → confirm form present → empty submit for browser validation only (no live send) |
| **Expected** | Nav + direct routes work; contact form visible; no production email send |
| **Actual** | Production: home title kit landing; `/about` and `/contact` OK; form present; focus reached `TEXTAREA` after Tab. Local DEV: same nav works but **placeholder copy** still present (`YOUR PHOTO` / project placeholders) — tracked under coverage / ADV-F05, not used to fail production Pass |
| **Evidence** | Local placeholders: `docs/reviews/browser-journey-evidence/j1-placeholders.png` |

### 2. Starter Kit → thank-you → download

| Field | Detail |
| --- | --- |
| **Status** | **Pass** (download artifact) / subscribe path **Blocked** |
| **Steps** | Open `/free-kit` → open `/free-kit/thank-you` → resolve PDF via on-page link or known public path → `HEAD` PDF |
| **Expected** | Thanks reachable; PDF `200 application/pdf` with usable filename; kit email not required for this check |
| **Actual** | PDF **200** `application/pdf`, filename `I-Call-BS-Free-Starter-Kit.pdf` (production disposition). Document type PDF confirmed via `Content-Type`. File **opens as PDF** at HTTP layer (inline). Kit **form submit / request accepted / provider delivery / inbox** intentionally **not** exercised. Production thanks page did not expose an obvious download link in automation (CMS thin page); public `/downloads/…` path still serves the file |
| **Evidence** | Probe table above |

### 3. Starter Kit → book page → checkout entry point

| Field | Detail |
| --- | --- |
| **Status** | **Blocked** (production) / **Fail** entry-shape on local DEV |
| **Steps** | Kit → book CTA or direct `/products/i-call-bs` → locate checkout → `GET /api/checkout` without completing payment |
| **Expected** | Book surface + checkout entry that can start Stripe; stop before pay |
| **Actual** | **Production:** `/api/checkout` returns **404**; `/products/i-call-bs` CMS fetch hits Supabase **401** (see console section); no live Stripe session URL obtained. **Local DEV:** book page renders (~3.9k chars) but CTAs observed as `#buy` / `/book#buy`, **not** `/api/checkout`; Playwright count of `a[href*=checkout]` = 0 |
| **Evidence** | `docs/reviews/browser-journey-evidence/j3-no-checkout.png`, `docs/reviews/browser-journey-evidence/local-book-checkout.png` |

### 4. Resources → published essay, tutorial, or download

| Field | Detail |
| --- | --- |
| **Status** | **Pass** (weak) |
| **Steps** | Open `/resources` → follow first available content link |
| **Expected** | Reach a published essay, tutorial, or downloadable resource with real body copy |
| **Actual** | Production: clicked through to `/blog` (221 chars; empty-shelf hint true — thin index, not a full essay). Hardcoded resource routes such as `/resources/tools-and-updates` and `/resources/builder-quick-reference` are **404 Page Not Found** on production (deploy lag vs local). Local DEV: tools + builder reference render with substantial content |
| **Evidence** | `docs/reviews/browser-journey-evidence/prod-tools-404.png`, `docs/reviews/browser-journey-evidence/local-tools.png` |

### 5. Tools page → category → details → official links

| Field | Detail |
| --- | --- |
| **Status** | **Fail** on production (404) / **Pass** on local DEV |
| **Steps** | Open `/resources/tools-and-updates` → change job category → expand details → note official external link → `?job=` direct + Back |
| **Expected** | Category state, expanded details, official links, no broken route |
| **Actual** | **Production:** **PAGE NOT FOUND** (“That page doesn't exist or isn't published yet.”) — Cursor browser + Playwright agree. Title still kit chrome. **Local DEV:** `<select>` present; job → `?job=builders`; details expand; external link sample `https://resend.com/docs`; Back/query exercised |
| **Evidence** | `docs/reviews/browser-journey-evidence/prod-tools-404.png`, `docs/reviews/browser-journey-evidence/local-tools.png` |

### 6. Newsletter signup → topic preferences → confirmation → unsubscribe

| Field | Detail |
| --- | --- |
| **Status** | **Blocked** |
| **Steps** | `/updates` → inspect form → invalid/empty client attempts only → fake unsubscribe token |
| **Expected** | Signup → topic preferences → confirmation → unsubscribe with test services |
| **Actual** | Production `/updates` had **no form** in this pass; `/api/form-schema` **404**; `/api/contact-unsubscribe?token=invalid-test-token` **404**. No preference-center UI found. **Request accepted / provider delivery / message received** all **unverified**. Local `/updates` shows form but API is not executable under Vite |
| **Evidence** | `docs/reviews/browser-journey-evidence/j6-updates.png` |

### 7. Admin login → authorized access

| Field | Detail |
| --- | --- |
| **Status** | **Blocked** |
| **Steps** | Open `/admin` → observe login UI → stop (no designated test account env) |
| **Expected** | Login with test account → authorized admin shell |
| **Actual** | Login UI present. `JOURNEY_ADMIN_EMAIL` / `JOURNEY_ADMIN_PASSWORD` not provided — authorized access **unverified** |
| **Evidence** | `docs/reviews/browser-journey-evidence/j7-admin-login-boundary.png` |

---

## Cross-cutting checks

### Viewport matrix (1440 / 768 / 390 / 320)

| Field | Detail |
| --- | --- |
| **Status** | **Fail** (phones) |
| **Expected** | No horizontal overflow; keyboard focus moves |
| **Actual** | Production: overflow flagged on **phone-390** (tools route, which 404s) and **phone-320** (home and/or tools). Desktop/tablet: no overflow flagged. Focus moves (`A` / brand link) at all sizes |
| **Evidence** | `docs/reviews/browser-journey-evidence/viewport-overflow-phone-390.png`, `…/viewport-overflow-phone-320.png` |

### Console / failed requests (production desktop session)

| Field | Detail |
| --- | --- |
| **Status** | **Fail** |
| **Actual** | Repeated **401** from Supabase REST on `contents` (pages: about, free-kit, products/i-call-bs, resources, blog posts, tools slug). Also **404** on `/api/contact-unsubscribe` test URL. This is stronger than a cosmetic console warning: public CMS reads via `contents` are failing authorization in production during this pass |
| **Note** | Likely interaction with recent column-privilege hardening on `public.contents` (anon limited to `id, status, published_document`) while the deployed client still `select`s other columns — **verify separately**; not fixed in this test-only pass |

### Keyboard / focus

Observed Tab focus landing on interactive controls (contact `TEXTAREA`, header links). Full WCAG focus-visible audit not completed.

### Refresh / Back / direct routes

About Back → home OK (production). Tools `?job=` / Back OK **only on local DEV** (production tools 404).

---

## Summary counts (production-primary scoring)

| Pass | Fail | Blocked |
| --- | --- | --- |
| 2 | 3 | 3 |

Scoring notes: Journey 2 counted Pass for PDF artifact only (subscribe email Blocked). Journey 4 counted Pass weak (blog index only). Journey 5 Fail (prod 404). Viewport Fail. Console Fail.

---

## Coverage gaps

1. **Deploy gap:** Production build does not serve current resource routes (`/resources/tools-and-updates`, builder reference, etc.) — 404 while local DEV has them.  
2. **API gap:** Production `/api/checkout`, `/api/form-schema`, `/api/contact-unsubscribe` returned **404** in this pass — checkout and newsletter APIs unverified on live.  
3. **CMS read 401s:** Supabase `contents` selects returning **401** for anon during production browsing — public CMS path unhealthy; root cause not remediated in this pass.  
4. **Kit subscribe → email:** request accepted / Resend delivery event / inbox received — not tested (safety).  
5. **Contact → inbox:** not sent.  
6. **Newsletter preferences + confirmation:** product path missing / blocked.  
7. **Stripe payment + webhook fulfill + purchase email:** stopped before pay; `/api/checkout` missing on prod.  
8. **Admin authorized shell:** needs `JOURNEY_ADMIN_*` test credentials.  
9. **DEV vs production surface:** local brand draft ≠ production kit/CMS home — launch checks must name which surface.  
10. **Empty / invalid / duplicate / failed-request form UI** under live API — skipped to avoid production writes.  
11. **Accordion scroll-jump** beyond local tools expand.  
12. **Full essay deep-read** and template PDF download open-in-reader beyond HEAD content-type.  
13. A screenshot alone is not treated as pass proof; statuses above require matching steps/actuals.

---

## How to re-run

```bash
# Production (default preference in script when BASE_URL unset after latest script update)
BASE_URL=https://vettajimale.tech npx -p playwright node scripts/browser-journey-pass.mjs

# Local DEV brand surface
BASE_URL=http://localhost:5173 JOURNEY_PREFER_LOCAL=1 npx -p playwright node scripts/browser-journey-pass.mjs

# Optional admin (staging only)
JOURNEY_ADMIN_EMAIL=... JOURNEY_ADMIN_PASSWORD=... BASE_URL=... npx -p playwright node scripts/browser-journey-pass.mjs
```

Script: `scripts/browser-journey-pass.mjs`  
Evidence directory: `docs/reviews/browser-journey-evidence/`
