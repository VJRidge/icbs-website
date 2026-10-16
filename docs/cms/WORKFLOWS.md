# CMS everyday workflows

These workflows define product behavior before new screens are built. They preserve the
existing page/post editor, visual builder, public site, and signup funnel.

Status legend for screens: **Connected** (operable today) · **Specified** (accepted, not built) · **Gated** (blocked until prerequisites pass).

---

## 1. Publish an article or structured editorial record

**Start (article):** Studio → Blog posts → Add post. **Connected**

**Start (structured):** Studio → Reviews → Add. **Connected** (other custom types stay unpublished)

### Click path

1. Choose Posts or an approved content type → Add.
2. Enter required structured fields (tool review) or post metadata (title, excerpt, categories, SEO).
3. Compose the flexible body in the visual builder; attach featured media.
4. Attach related records by ID when relationship UI is available (**Connected** on structured editors).
5. Run pre-publish checks: required fields, missing alt text, disclosure, stale verification date.
6. Preview the exact snapshot (local `/preview` or secure token URL).
7. Save for review, **Schedule**, or **Publish** according to capability.

### Fields and decisions

| Decision | Who | Outcome |
| --- | --- | --- |
| Required structured fields valid? | Editor | Block publish until Zod/DB validation passes |
| Capability `content.publish`? | Author vs editor+ | Authors keep draft/trash only |
| Preview vs publish | Editor | Preview never changes the public snapshot |
| Schedule vs publish now | Editor | Schedule freezes snapshot; cron promotes at `scheduled_for` |

### Success

- The intended revision is public (or scheduled with a frozen snapshot).
- Relationships resolve to shared records (no copied titles/URLs).
- An activity-ready audit trail exists via revisions + status transitions.
- Later draft edits do not change the live page until republish.

### Recovery

- Failed save stays dirty; local backup may offer restore.
- Failed publish leaves the previous `published_document` unchanged.
- Soft trash → restore to draft; revision restore replaces working copy only.

### Acceptance (screens)

- [x] Post/page editor with autosave, preview, publish, trash, revisions, schedule.
- [x] Reviews list/editor with structured fields and private drafts.
- [x] Relationship picker UI (schema + helpers ready; attached on structured content editor).
- [x] Automated pre-publish disclosure/verification checklist panel (tool reviews).

---

## 2. Replace a downloadable guide

**Start:** Media or Resources → select guide → Replace version. **Specified / Gated**

### Click path

1. Select the existing resource identity (not a duplicated URL in five pages).
2. Upload a new private asset version; preserve the prior original.
3. Review file validation and every `media_usages` / relationship row.
4. Enter version notes; preview landing page, thank-you page, and delivery email against the pending version.
5. Publish the replacement atomically.

### Success

- New requests receive the new version; historical requests keep an auditable version record.
- Dependent pages need no manual URL edits.
- Rollback to the prior version remains available.

### Recovery

- Until publish, delivery continues on the prior version.
- A failed replacement never deletes the current file when usages exist.

### Acceptance

- [x] Media metadata upsert + usage/safe-delete helpers (foundation).
- [x] Lead magnet versions + private delivery jobs (**Open** — Phase 7).

---

## 3. Send a newsletter to Creative Tools readers

**Start:** Marketing → Newsletter → New issue. **Connected**

### Click path

1. (Optional) Marketing → Contact lists: create a rule list or uploaded list (CSV dry-run → commit).
2. Compose the issue in the same block builder as pages/posts; Save compiles email-safe HTML.
3. Choose audience: all marketing contacts or a saved contact list.
4. Set subject + preview text; schedule send (or keep as draft).
5. Cron freezes the recipient snapshot (segment applied at freeze) and delivers with dedupe + retries.
6. Provider bounce/complaint webhook suppresses Contacts.

### Success

- Only eligible recipients in the chosen audience receive the issue.
- Delivery failures are visible with counts (pending / sent / failed / skipped).
- Opt-outs are honored at execution time.

### Acceptance

- [x] Newsletter nav + schedule/send jobs + provider suppress webhook (**Open**).
- [x] Block document editor + email compile on save (**Open**).
- [x] Contact lists (rule + CSV upload) + tags + newsletter list picker (**Open**).

---

## 4. See which article produced subscribers

**Start:** Analytics → Content performance → choose article. **Specified / Gated**

### Click path

1. Select period, timezone, and attribution window.
2. Show funnel: attributed visits → form starts → successful requests → confirmed eligible subscribers.
3. Display denominator, bot-filtering status, and unknown/approximate data labels.
4. Drill through to landing page, form, lead magnet, and campaign without exposing unnecessary PII.

### Success

- The number is reproducible from stored events.
- Never inferred from fabricated dashboard cards.

### Acceptance

- [x] Analytics nav + funnel/attribution from stored conversion_events (**Open**).

---

## Shared workflow rules

- Every record has one stable identity; other records reference it rather than copying values.
- Draft and published data remain separate (`content_blocks`/`body` vs `published_document`).
- Destructive actions require impact information and a recoverable path (soft trash first).
- Permissions are enforced in the database or server boundary, not only in controls.
- Drag-and-drop actions need keyboard alternatives (structure Up/Down, Alt+Arrow reorder, live a11y warnings).
- Empty or disconnected modules stay out of navigation (`AdminCmsNav`).

---

## 5. Capture a marketing lead (no kit delivery)

**Start:** Public `/updates` or embedded lead form → submit. **Open (Forms gate)**

### Success

- Submission stored with marketing consent text and timestamp.
- Kit signup and download paths are unchanged.
- Staff can review submissions under `/admin/forms`.

### Acceptance

- [x] Lead-capture form + `/api/form-submit` with durable rate limiting.
- [x] Contacts identity + consent log + `/api/contact-unsubscribe` (**Open**).

---

## 6. Which URL is the public site

**Production visitors** see `https://vettajimale.tech` — CMS HomeV2 (`settings.homepage_content_id`), published pages, and the Vite SPA fallbacks for `/privacy`, `/terms`, `/refunds`, `/copyright`, `/faq`, `/prefs`.

**Local `npm run dev`** uses `HomeOrKit` on `/`. Brand draft (`/api/dev-brand-draft`) is preview only; it is not what production visitors get.

**Launch QA** uses production (or a Vercel preview of this repo), not the Vite brand chrome. `/api/checkout` must exist on that host (not a static-only deploy).

