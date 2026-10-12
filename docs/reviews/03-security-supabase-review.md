# 03 — Security & Supabase review (VettaJimale.Tech / ICallBS)

**Date:** 2026-10-07  
**Mode:** Read-only. No code, migrations, policies, or production settings were modified.  
**Project reviewed (live advisors + read-only SQL):** Supabase project **ICallBS** (`ca-central-1`, Postgres 17).  
**Also reviewed:** Repository migrations under `supabase/migrations/`, server routes under `api/`, browser Supabase client, studio authorization, newsletter/Resend paths.  
**Skills / tools:** Supabase skill checklist, Postgres RLS guidance, Supabase MCP `get_advisors` (security) + limited `execute_sql` metadata queries, code-level security review.  
**Secrets:** No secret values or personal data are included in this report. Publishable/anon keys are treated as public client credentials; risk is evaluated via RLS and grants, not key visibility alone.

---

## Executive summary

| Class | Count (approx.) |
| --- | --- |
| Demonstrated issues (code and/or live DB metadata) | 8 |
| Potential / config-dependent concerns | 5 |
| Critical (validated remote exploit) | 0 in this pass |

**Strongest demonstrated risks**

1. Studio **auto-approve** of new Auth users as `author` (`handle_new_user`), combined with **`purchases` readable by `content.read`** — any approved author can read buyer emails via the Data API once they have a session.  
2. Live advisor: several **`SECURITY DEFINER` functions executable by `anon`**, including `handle_new_user` via RPC (should be trigger-only).  
3. Live advisor: **`published_contents` flagged as security-definer view** (RLS bypass class); confirm `security_invoker` posture.  
4. Newsletter webhook auth is shared Bearer secret (optional `CRON_SECRET` fallback), not provider signature verification.  
5. Auth **leaked-password protection disabled** (live advisor).

**Positive controls**

- Sensitive tables checked (`contacts`, `purchases`, `contents`, `profiles`, `conversion_events`, newsletter tables) have **RLS enabled** in the live project.  
- `subscribers` has RLS enabled with **zero policies** (deny-by-default for anon/authenticated via RLS; service role used by kit APIs). Same pattern for `rate_limit_buckets` / `content_previews` (advisor INFO).  
- Browser client uses **anon key only** (`VITE_SUPABASE_*`). Service role appears only in server/scripts paths.  
- `.env` / `.env.local` are gitignored; only `.env.example` is tracked.  
- Stripe webhook constructs events with signing secret; form-submit validates server-side and does not trust client `newsletterListIds`.  
- Kit and contact unsubscribe use **token** endpoints (separate lists).  
- Newsletter send jobs use **idempotency keys** + ignore-duplicates.  
- No Make/Zapier HTTP endpoints found under `api/` in the repo.

---

## Demonstrated findings

### SUP-001 — High — Auto-approved studio `author` can read purchases

| Field | Detail |
| --- | --- |
| **Severity** | High |
| **Affected component** | Auth signup trigger + `purchases` RLS |
| **Evidence** | Live/migration: `handle_new_user` sets `staff_approved = true`, `role = 'author'` (`20261033_staff_signup_auto_approve.sql`). Live policy: `purchases_staff` **SELECT** when `has_staff_capability('content.read')`. Authors typically receive `content.read`. |
| **Plausible impact** | Any confirmed studio user (including self-serve if Auth signup is open) can read **buyer emails and purchase rows** through Supabase client, bypassing “sales admin only” intent. |
| **Recommended fix** | (1) Default `staff_approved = false` until owner promotes. (2) Narrow `purchases` (and similar PII tables) to a dedicated capability (e.g. `sales.read`) not granted to `author`. (3) Disable public Auth signup in Dashboard. |
| **Safe verification** | Staging: create least-privilege author → confirm email → with that JWT, `select` on `purchases` should return **zero** rows after the fix. Do not use production buyer data. |
| **Class** | **Demonstrated** (policy + trigger in live/migrations). Exploitability of *open* signup depends on Auth Dashboard setting (**Unverified** here). |

---

### SUP-002 — High — `handle_new_user` and other SECURITY DEFINER RPCs executable by `anon`

| Field | Detail |
| --- | --- |
| **Severity** | High (for `handle_new_user`); Medium for probe helpers (`is_staff`, etc.) |
| **Affected component** | Postgres functions in `public` schema |
| **Evidence** | Supabase security advisor (`anon_security_definer_function_executable`): `handle_new_user`, `has_staff_capability`, `is_owner`, `is_staff`, `next_newsletter_issue_number`, `published_posts_for_topic`, `resolve_cms_short_link` executable by `anon` via `/rest/v1/rpc/...`. Remediation: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable |
| **Plausible impact** | Trigger functions should not be callable as RPCs. Extra surface for confusion or privilege probing. `resolve_cms_short_link` / topic RPC may be intentional public; `handle_new_user` is not. |
| **Recommended fix** | `REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;` keep ownership for trigger. Revoke non-public definer helpers from `anon`. Leave intentional public RPCs documented and minimized. |
| **Safe verification** | As anon (no JWT): `POST /rest/v1/rpc/handle_new_user` should return permission denied after revoke. |
| **Class** | **Demonstrated** (advisor on live project). |

---

### SUP-003 — Medium — `published_contents` security-definer view (advisor ERROR)

| Field | Detail |
| --- | --- |
| **Severity** | Medium |
| **Affected component** | `public.published_contents` view |
| **Evidence** | Advisor `security_definer_view` ERROR. Repo defines view with `security_barrier = true` and filters `status = 'published'` (`20261010_phase3_structured_content.sql`). Supabase guidance prefers `security_invoker = true` so RLS of the querying role applies. Remediation: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view |
| **Plausible impact** | View runs with definer rights and can bypass underlying `contents` RLS. Today the WHERE clause limits to published docs — intentional public read — but any future view change could leak drafts. |
| **Recommended fix** | Recreate with `security_invoker = true` **and** an explicit anon/authenticated SELECT policy on `contents` for published rows; or keep definer but lock view definition + add automated tests that drafts never appear. |
| **Safe verification** | As anon, select view: only published rows. As anon, select `contents` drafts: denied. After change, re-run security advisors. |
| **Class** | **Demonstrated** (advisor). Draft-leak not demonstrated. |

---

### SUP-004 — Medium — Newsletter webhook: shared secret, `CRON_SECRET` fallback, no Svix verify

| Field | Detail |
| --- | --- |
| **Severity** | Medium |
| **Affected component** | `api/newsletter-webhook.ts`, Resend integration |
| **Evidence** | Code accepts `Authorization: Bearer` matching `NEWSLETTER_WEBHOOK_SECRET` or `CRON_SECRET`; no Resend/Svix signature check on body. Bounce/complaint path can suppress contacts. |
| **Plausible impact** | Leaked cron/webhook secret → forged bounce/complaint → mass marketing suppression / event pollution. |
| **Recommended fix** | Dedicated webhook secret only; verify Resend signatures; never fall back to cron secret. |
| **Safe verification** | Staging: POST without auth → 401; POST with invalid signature → 401; valid Resend test event accepted. |
| **Class** | **Demonstrated** in code. Live Resend dashboard config **Unverified**. |

---

### SUP-005 — Medium — Stripe fulfillment lacks product/price binding

| Field | Detail |
| --- | --- |
| **Severity** | Medium |
| **Affected component** | `api/_stripe.ts` / `api/stripe-webhook.ts` |
| **Evidence** | Signature verification present; fulfillment path does not strictly require book `price_id` / `product_key` / amount match before emailing download. |
| **Plausible impact** | Other Checkout sessions on the same Stripe account hitting this webhook could trigger book fulfillment (operator misconfiguration; not forgeable without webhook secret). |
| **Recommended fix** | Require metadata/price/amount checks before fulfill. |
| **Safe verification** | Stripe CLI: non-book session event → rejected; book session → fulfilled once. |
| **Class** | **Demonstrated** in code. |

---

### SUP-006 — Medium — Shared `BOOK_DOWNLOAD_URL` for all buyers

| Field | Detail |
| --- | --- |
| **Severity** | Medium (High if URL is permanent public CDN) |
| **Affected component** | Stripe fulfillment email |
| **Evidence** | Env-driven single URL emailed to every buyer; contrast with lead-magnet signed URLs. |
| **Plausible impact** | Link sharing / leakage of paid PDF without purchase record. |
| **Recommended fix** | Per-purchase signed Storage URL or tokenized download bound to `purchases`. |
| **Safe verification** | Test-mode purchase: inspect whether URL is unique/expiring; do not publish the URL. |
| **Class** | **Demonstrated** path; severity **config-dependent** (**Unverified** env value). |

---

### SUP-007 — Medium — Auth leaked-password protection disabled

| Field | Detail |
| --- | --- |
| **Severity** | Medium |
| **Affected component** | Supabase Auth (ICallBS) |
| **Evidence** | Advisor `auth_leaked_password_protection` WARN. Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection |
| **Plausible impact** | Studio accounts can be created/reset with known-breached passwords. |
| **Recommended fix** | Enable leaked password protection in Supabase Auth settings. |
| **Safe verification** | Auth settings UI shows feature enabled; attempt known-breached password on staging signup → rejected. |
| **Class** | **Demonstrated** (live advisor). |

---

### SUP-008 — Medium — Honeypot field name exposed via public form schema

| Field | Detail |
| --- | --- |
| **Severity** | Medium (spam/abuse), not data breach |
| **Affected component** | `api/form-schema.ts`, lead capture client |
| **Evidence** | Schema response includes honeypot key used by the client. |
| **Plausible impact** | Bots skip honeypot; increased spam and rate-limit burn. |
| **Recommended fix** | Keep honeypot name server-constant; omit from public schema. |
| **Safe verification** | Fetch public schema JSON; honeypot key absent; bots filling random fields still blocked by other controls. |
| **Class** | **Demonstrated**. |

---

### SUP-009 — Low/Medium — RLS on tables with no policies (`subscribers`, etc.)

| Field | Detail |
| --- | --- |
| **Severity** | Low (info) if intentional; Medium if grants allow unexpected roles |
| **Affected component** | `subscribers`, `rate_limit_buckets`, `content_previews` |
| **Evidence** | Advisor INFO `rls_enabled_no_policy` (3 tables). Live: RLS enabled on `subscribers`; policy count 0. Kit APIs use service role. |
| **Plausible impact** | Intended deny-all for Data API is good. Residual risk if table GRANTs are overly broad and a future policy is added incorrectly. |
| **Recommended fix** | Keep RLS; explicitly `REVOKE ALL` on `subscribers` from `anon`/`authenticated`; document “service role only.” |
| **Safe verification** | Anon JWT: select `subscribers` → error/empty. Service role (server only): works. |
| **Class** | **Demonstrated** advisor + RLS state. |

---

### SUP-010 — Low — `citext` extension in `public` schema

| Field | Detail |
| --- | --- |
| **Severity** | Low |
| **Affected component** | Postgres extensions |
| **Evidence** | Advisor WARN `extension_in_public`. Remediation: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public |
| **Plausible impact** | Schema hygiene / namespace clutter; not a direct data leak. |
| **Recommended fix** | Move extension to `extensions` schema when practical. |
| **Safe verification** | Re-run advisors after move. |
| **Class** | **Demonstrated**. |

---

## Potential concerns (not fully demonstrated)

### SUP-P01 — High (potential) — Public Auth signup still enabled

| Field | Detail |
| --- | --- |
| **Severity** | High if enabled |
| **Evidence** | Docs require disabling “Allow new users to sign up”; auto-approve trigger means bypass of `/api/staff-signup` controls if public signup works. |
| **Impact** | Open studio registration → SUP-001 impact. |
| **Safe verification** | Staging/prod Dashboard check; attempt `signUp` with anon key without staff-signup API. |
| **Status** | **Unverified** (Dashboard Auth setting not readable via SQL in this pass). |

---

### SUP-P02 — Medium — Email confirmation not enforced inside `is_staff()`

| Field | Detail |
| --- | --- |
| **Severity** | Medium (potential) |
| **Evidence** | `is_staff()` checks `staff_approved`, `disabled_at`, role — not `email_confirmed_at`. Admin UI blocks unconfirmed users. |
| **Impact** | If Auth issues sessions before confirmation, RLS could allow staff access outside `/admin` UI. |
| **Safe verification** | Confirm Auth requires email confirmation before session; attempt API with unconfirmed user. |
| **Status** | **Potential** — Auth project setting **Unverified**. |

---

### SUP-P03 — Medium — Turnstile optional when secret unset

| Field | Detail |
| --- | --- |
| **Evidence** | `api/staff-signup.ts` skips CAPTCHA if secret blank. |
| **Impact** | Automated account creation if deployed without keys (rate limit remains). |
| **Status** | **Potential** — production env **Unverified**. |

---

### SUP-P04 — Medium — Newsletter HTML sanitizer weaker than studio OpEd sanitizer

| Field | Detail |
| --- | --- |
| **Evidence** | `serializeNewsletterEmail` regex strip vs DOMPurify for OpEd. |
| **Impact** | Malicious **staff** HTML in recipient inboxes. |
| **Status** | **Potential** (staff trust boundary). |

---

### SUP-P05 — Low — Duplicate book email if fulfill status update fails after send

| Field | Detail |
| --- | --- |
| **Evidence** | Email then mark fulfilled; reverse order failure → webhook retry may resend. |
| **Impact** | Duplicate emails, not charges. |
| **Status** | **Potential**. |

---

## Separation of data domains (assessment)

| Domain | Access model (repo + live spot checks) | Notes |
| --- | --- | --- |
| **Public content** | `published_contents` granted to anon/authenticated; filtered to published | Advisor flags definer view (SUP-003). |
| **Kit subscribers** | RLS on, no policies; server service role via `/api/subscribe` | Good isolation if grants revoked; SUP-009. |
| **Contacts / consent** | Staff policy requires `content.update_any` | Stricter than purchases — good. Authors should not have this. |
| **Purchases** | Staff **read** via `content.read` | **Too broad** for authors (SUP-001). |
| **Admin / drafts** | Capability RLS (`has_staff_capability`) | Depends on approval + role matrix. |
| **Private media** | `media-private` bucket; staff write; signed URLs via server | Spot-check storage policies in `20261002_cms_core.sql`; live storage policy matrix not fully enumerated. |
| **Contact messages** | `/api/contact` server path | Not exposed as anon table write in reviewed paths. |

---

## Frontend keys & tracked files

| Check | Result |
| --- | --- |
| Service role in `VITE_*` | Not found in client modules; `.env.example` documents ban. |
| Anon/publishable in client | Expected (`supabaseBrowser.ts`, studio client). Risk = RLS, not key secrecy. |
| `.env` tracked | Ignored by git; `.env.example` only. |
| Hardcoded live secrets in repo | No `sk_live` / private keys found in tracked sources (sample scan). Test files may contain placeholder strings. |

---

## Forms, HTML, uploads, URLs

| Area | Assessment |
| --- | --- |
| Form validation | Server-side on `form-submit` / contact / staff-signup; honeypot + durable rate limits on several paths. |
| Unsafe HTML | Public React mostly text-bound; CMS/blog uses sanitizers; newsletter email HTML weaker (SUP-P04). |
| Uploads | Private media sign path checks staff JWT + path containment (code review). |
| User URLs | External tool links are editorial/content; SSRF not fully audited on all fetchers. |

---

## Resend, preferences, unsubscribe

| Area | Assessment |
| --- | --- |
| Webhook verification | Shared secret only (SUP-004) — gap. |
| Duplicate send | `idempotency_key` + ignore-duplicates on send jobs — good. |
| Unsubscribe | Tokenized kit (`/api/unsubscribe`) and contacts (`/api/contact-unsubscribe`); no IDOR by contact id in reviewed handlers. |
| Preferences / unauthorized changes | Public preference center still TODO; unauthorized preference changes not fully tested. Marketing suppression via forged webhook is the main remote risk (SUP-004). |
| List membership from forms | List IDs taken from **published form settings** server-side, not client body — good. |

---

## Make / automation

| Check | Result |
| --- | --- |
| In-repo Make endpoints | **None found** under `api/`. |
| Live Make scenarios | **Unverified** (external). Ensure any Make→site webhook uses secrets + idempotency before enabling auto-post. |

---

## Dependencies & config

| Check | Result |
| --- | --- |
| Dependency CVE audit | **Not run** this pass (no `npm audit` executed). |
| Supabase security advisors | **Run** on ICallBS — findings folded above. |
| Auth leaked password protection | Disabled (SUP-007). |

---

## What remains untested

1. Whether Supabase Auth **“Allow new users to sign up”** is off in production.  
2. Full **Storage** policy matrix for all buckets (only core migration reviewed).  
3. End-to-end exploit of `handle_new_user` RPC (advisor indicates EXECUTE; not exercised).  
4. Live `BOOK_DOWNLOAD_URL` shape (signed vs permanent).  
5. Resend Dashboard webhook signing mode.  
6. Turnstile keys present in production.  
7. Preference-center authorization (feature incomplete).  
8. External Make/Zapier scenarios.  
9. `npm audit` / supply-chain review.  
10. Destructive or high-volume tests (intentionally not performed).  
11. Access to another person’s data (intentionally not performed).  
12. Sending real emails or live automation (intentionally not performed).

---

## Priority order (safe remediation)

1. ~~Revoke EXECUTE on `handle_new_user` from `anon`/`authenticated`/`PUBLIC` (SUP-002).~~ **Done** (migration on ICallBS).  
2. ~~Stop auto-approve; narrow `purchases` away from `content.read` for authors (SUP-001).~~ **Done**.  
3. Confirm Auth public signup disabled + enable leaked-password protection (SUP-P01, SUP-007) — **Dashboard still required**.  
4. ~~Harden newsletter webhook signatures (SUP-004).~~ **Done** in code (dedicated secret + Svix; deploy + set `NEWSLETTER_WEBHOOK_SECRET`).  
5. ~~Address `published_contents` invoker/definer posture (SUP-003).~~ **Done** (`security_invoker` + anon column grants).  
6. ~~Bind Stripe fulfillment to book price/product (SUP-005).~~ **Done** in code. Signed book downloads (SUP-006) — **still open**.  
7. ~~Fail closed on Turnstile in production (SUP-P03); honeypot schema hygiene (SUP-008).~~ **Done** in code.

---

## Methodology notes

- **Migrations ≠ production:** Advisors and SQL metadata on ICallBS were used to avoid assuming migrations alone prove live state.  
- **Anon key:** Not classified as a secret; evaluated with RLS/grants.  
- **Remediation (2026-10-07):** Migrations + API/code fixes applied after this review; Auth Dashboard items remain manual.
