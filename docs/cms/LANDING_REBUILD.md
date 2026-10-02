# Rebuild `/free` with the studio builder — plan

Status: **built.** Draft page `kit-v2` exists in the studio. `/free` keeps showing the hardcoded
`src/pages/Free.tsx` until `kit-v2` is published **and** "Use as kit page (/free)" is ticked.

### What shipped
- Brand tab blocks: `kit_hero` (receipts strip built in), `kit_contents`, `kit_gallery`, `kit_closing`,
  `kit_text`, `kit_signup`. Views in `src/studio/components/blog/blocks/brand/KitBlocks.tsx`,
  fields in `KitBlockFields.tsx`. The canvas shows a scaled 1280px desktop render.
- `contents.layout` (`article` | `landing`) + Page settings "Layout" select; stored in `published_document.layout`.
- `settings.kit_content_id` + "Use as kit page (/free)" toggle. `/free` → `HomeOrKit slot="kit_content_id"`.
- Pages made only of brand blocks render through `KitLandingView` (≈6 KB chunk, no studio CSS).
  Mixed landing pages render non-brand blocks in a centered cream column.
- Verified: published `kit-v2` markup is identical to `Free.tsx` (form ids aside).
- Migration: `supabase/migrations/20261004_landing_layout.sql`.

### Go-live steps
1. `/admin/pages` → open "Free Starter Kit" (`kit-v2`) → edit → Publish.
2. Check `/kit-v2` on desktop and phone; do one real signup.
3. Tick "Use as kit page (/free)". Untick (or unpublish) to fall back to the built-in page instantly.

## Goal

Edit the kit landing page from `/admin` (copy, images, numbers, sections) without a deploy, while keeping it
visually identical and keeping the signup funnel working exactly as today.

## Current page (`src/pages/Free.tsx`)

| # | Section | Content | Styles (`src/styles.css`) |
|---|---|---|---|
| 1 | Top bar (green) | Tag "Free Starter Kit", tagline | `.green .nav .k .tag` |
| 2 | Hero | Tilted cover `/img/kit-cover.png`, Anton headline with yellow highlight word, italic subhead, signup form | `.hero .cov .an .y .sub` |
| 3 | Receipts strip | 4 number/label pairs | `.strip` |
| 4 | Inside the kit (cream) | Label, H2, lede with `<mark>`, 10-row two-column contents list | `.sec.cream .k.o .lede .toc` |
| 5 | Look inside (white) | Label, H2, 3 preview images, caption | `.sec.white .pv .cap` |
| 6 | Closing (green) | H2 with highlight phrase, label, signup form | `.sec.green .close` |
| 7 | Footer | Shared component | `Footer.tsx` |

Signup form (`SignupForm.tsx`) posts to `/api/subscribe` with first name, email, honeypot `company`,
and `captureUtm()`; on success redirects to `/free/thanks`. **Must be reused as-is.**

## Why not generic Clubhouse blocks

- No working signup form (Newsletter block is a disabled placeholder).
- Public pages render as a 768px article with the title printed on top; landing needs full-width sections.
- Anton display type, tilted cover, yellow highlight, red-ruled receipts strip, and numbered TOC have no equivalent.

## Build plan

### 1. Page layout option
- Add `layout: 'article' | 'landing'` (store in `published_document` and a `contents.layout` column).
- Page settings: "Layout" select. Landing = no title header, no max-width wrapper, blocks render edge to edge.

### 2. Brand blocks (new "Brand" tab in + Add block)
Each block renders with the existing kit classes so output matches today. All fields editable in the
left panel Content tab; Style tab exposes background tone (green / cream / white) where relevant.

| Block | Fields |
|---|---|
| `kit_hero` | tag, tagline, cover image + alt, headline, highlight phrase, subhead, show signup form |
| `kit_receipts` | repeatable { number, label } |
| `kit_section` | tone, label, label color (orange/default), heading, centered, lede (rich text with highlight) |
| `kit_contents` | repeatable { number, title, kind } |
| `kit_image_row` | repeatable { image, alt }, caption |
| `kit_closing` | tone, headline, highlight phrase, label, show signup form |
| `kit_signup` | form id, button label (default "Send me the free kit") — wraps `SignupForm` |

Implementation notes:
- Register in `src/studio/lib/blog/blogBlockTypes.ts` (types + defaults + picker category).
- Renderer components under `src/studio/components/blog/blocks/brand/`, used by `BlogBlockRenderer`
  for both editor preview and public render.
- Public render must load `styles.css` classes (already global) — brand blocks sit outside `.studio-public`
  resets, or the reset is skipped for landing layout.
- Inspector panels in `BlogBlockInspectorTabContent` for each block's fields.
- `serializeBlogBlocksToHtml` gets a fallback for brand blocks (HTML mode / previews).

### 3. Starter page
- Seed a draft page `kit-v2` with every section pre-filled from `Free.tsx` (same copy, images, numbers).
- Compare `/kit-v2` and `/free` side by side (desktop + mobile).
- Do one real signup from `/kit-v2`; confirm Supabase row, Resend email, redirect to `/free/thanks`.

### 4. Switch-over
- Setting "Kit page" (`settings.kit_content_id`). `/free` renders that page when it is published.
- `Free.tsx` stays in code as the automatic fallback (unpublished, missing, or load error).
- Unpublishing or clearing the setting instantly restores the hardcoded page.

## Acceptance checks
- Visual match at 1440px and 390px widths.
- Signup works from both forms; honeypot and UTM still sent; thanks redirect intact.
- Lighthouse performance on `/free` not worse than today (lazy chunks only load for CMS pages).
- Kit fallback verified by unpublishing.

## After this
Blog posts are live: `/admin/posts`, categories, `/blog`, `/blog/:slug`. Next CMS slices are templates, appearance, menus, and forms.

## Limits worth knowing
- Uploads: video 50 MB, image 15 MB (editor check; Supabase free plan also caps files at 50 MB).
  Use YouTube or a hosted video URL for larger files.
