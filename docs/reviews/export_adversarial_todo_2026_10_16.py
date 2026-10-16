"""Export 2026-10-16 adversarial review + remaining-work checklist as Word."""

from __future__ import annotations

import shutil
from pathlib import Path

from docx import Document
from docx.enum.text import WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

HERE = Path(__file__).resolve().parent
OUT = HERE / "ICBS-Adversarial-Review-TODO.docx"
DESKTOP = Path.home() / "Desktop" / "ICBS-Adversarial-Review-TODO.docx"
DESKTOP2 = Path.home() / "Desktop" / "ICBS-Adversarial-Review-TODO-copy.docx"

GREEN = RGBColor(0x1A, 0x3A, 0x32)
INK = RGBColor(0x1C, 0x1C, 0x1C)
MUTED = RGBColor(0x4A, 0x4A, 0x4A)
DONE = RGBColor(0x2E, 0x6B, 0x4A)
ALERT = RGBColor(0x8B, 0x2E, 0x1A)

def font(run, *, size=12, bold=False, italic=False, color=INK):
    run.font.name = "Calibri"
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.get_or_add_rFonts()
    rFonts.set(qn("w:eastAsia"), "Calibri")
    rFonts.set(qn("w:ascii"), "Calibri")
    rFonts.set(qn("w:hAnsi"), "Calibri")


def P(doc, text, *, size=12, bold=False, italic=False, color=INK, after=8, before=0):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    r = p.add_run(text)
    font(r, size=size, bold=bold, italic=italic, color=color)
    return p


def H(doc, text, size=16):
    return P(doc, text, size=size, bold=True, color=GREEN, before=16, after=8)


def check_line(doc, title: str, body: str, *, checked: bool, alert: bool = False):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.left_indent = Inches(0.05)
    mark = p.add_run("[x]  " if checked else "[ ]  ")
    font(mark, size=12, bold=True, color=DONE if checked else (ALERT if alert else GREEN))
    r = p.add_run(title)
    font(r, size=12, bold=True, color=DONE if checked else (ALERT if alert else GREEN))
    if body:
        p2 = doc.add_paragraph()
        p2.paragraph_format.left_indent = Inches(0.4)
        p2.paragraph_format.space_after = Pt(6)
        rr = p2.add_run(body)
        font(rr, size=11, color=MUTED)


def step(doc, n: str, text: str):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.4)
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run(f"{n}  {text}")
    font(r, size=11, color=INK)


def build() -> Path:
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Inches(0.85)
    sec.bottom_margin = Inches(0.85)
    sec.left_margin = Inches(1.0)
    sec.right_margin = Inches(1.0)

    P(doc, "I Call BS  ·  VettaJimale.Tech  ·  ICallBS (gfilixqzkduuuwrktpjh)", size=11, bold=True, color=GREEN, after=2)
    P(doc, "Adversarial review + remaining work", size=24, bold=True, color=GREEN, after=4)
    P(
        doc,
        "Date of this pass: 16 October 2026. Open this file in Microsoft Word (not Cursor). "
        "Check items off by changing [ ] to [x]. This is not legal advice; it is an operator checklist "
        "from code, live Supabase advisors, production HTTP probes, and prior written reviews.",
        size=11,
        italic=True,
        color=MUTED,
        after=12,
    )

    H(doc, "How to use this file", 16)
    P(
        doc,
        "Work the open boxes in order. Launch-blockers (items 1–16) come before growth work. "
        "A box is done only when the “Done when” test is true. Do not collect more email or take "
        "live card payments until items 1, 2, 4, 5, and 6 are done.",
    )

    H(doc, "Reviews compared", 16)
    P(
        doc,
        "This pass was checked against: (1) Launch blockers ADV-F01–F14 in docs/cms/TODO.md "
        "(2026-10-06 public-site adversarial review); (2) docs/reviews/03-security-supabase-review.md "
        "(2026-10-07, SUP-001–010 and SUP-P01–P05); (3) docs/reviews/04-browser-journey-tests.md "
        "(2026-10-07 production Playwright, BJ-01–05); (4) docs/cms/TODO.md remaining product work; "
        "(5) live ICallBS security advisors on 2026-10-16; (6) production HTTPS probes of "
        "vettajimale.tech on 2026-10-16.",
    )
    P(
        doc,
        "Verdict vs prior reviews: several database findings from 7 October are fixed in live Postgres. "
        "The original launch blockers that visitors actually feel (empty Privacy/Terms, public kit PDF "
        "mismatch, unpaid book link model, production /api/checkout 404, Auth Dashboard toggles) are "
        "still open. Stripe code in the repo is further along than production.",
    )

    H(doc, "What is there vs missing", 16)
    P(doc, "There (code and/or live database)", size=13, bold=True, color=GREEN, before=4)
    P(
        doc,
        "• Public CMS pages: HomeV2, About, Book, Starter Kit, Resources (templates, tools, literacy check, builder reference), Book Updates shell, several posts.\n"
        "• Kit funnel in code: POST /api/subscribe, honeypot + rate limit, unsubscribe token, kit email template, thanks page with on-page PDF download.\n"
        "• Contact form in code: POST /api/contact, honeypot off-screen with aria-hidden.\n"
        "• Stripe in repo: Checkout Session create, webhook signature verify, product/price bind, purchases ledger, buyer tag, /buy/thanks. API version 2026-09-30.endive. Fulfillment is webhook-driven, not the success page.\n"
        "• Contacts CRM, consent event log, newsletter lists, issue builder, test send, cron send route, Resend webhook with dedicated secret + Svix verify (no CRON_SECRET fallback).\n"
        "• Lead-magnet private signed URLs (media-private bucket, TTL clamp).\n"
        "• Studio staff-signup via /api/staff-signup; new profiles staff_approved=false; purchases SELECT requires content.update_any (not author).\n"
        "• published_contents is security_invoker=true. handle_new_user is not executable by anon.\n"
        "• Refunds page copy exists (all sales final for the digital book).\n"
        "• First-party analytics beacon (page_view / form_start) with IP stored server-side.",
    )
    P(doc, "Missing or unsafe for launch", size=13, bold=True, color=ALERT, before=8)
    P(
        doc,
        "• Privacy and Terms still say “This page is being written.” No CMS pages for privacy/terms (confirmed empty in contents). Kit/contact still collect email and link to those URLs.\n"
        "• Production https://vettajimale.tech/api/checkout and /api/form-schema return Vercel 404 NOT_FOUND (same as 7 October BJ-01). You cannot sell the book on the live domain until this is deployed.\n"
        "• Kit PDF is still a public unguessable-but-known URL: /downloads/I-Call-BS-Free-Starter-Kit.pdf (HTTP 200 application/pdf on production).\n"
        "• Paid book still uses one BOOK_DOWNLOAD_URL for every buyer (not a per-purchase signed URL).\n"
        "• Stripe keys, webhook endpoint, Turnstile keys, Resend webhook, and crons are not verified live. Leaked-password protection still disabled (advisor 16 October).\n"
        "• Public Auth “Allow new users to sign up” Dashboard setting still unverified.\n"
        "• No public preference center. Newsletter stays “Not open yet” (correct until prefs exist).\n"
        "• No cookie / tracking notice despite storing IP on analytics and subscribe.\n"
        "• No Stripe Tax / VAT registrations. Digital $17 PDF sold without tax configuration.\n"
        "• POSTAL_ADDRESS in .env.example is still a placeholder; CAN-SPAM requires a real physical address in every commercial email.\n"
        "• Purchase fulfillment records consent_at on a kit subscriber row for buyers who never opted into marketing.\n"
        "• Kit re-subscribe silently clears unsubscribed_at.\n"
        "• Canonical book title still “AI Vibe Coding Myths Dispelled” in brand copy (ADV-F08).\n"
        "• Header default marks “The book” current on every homepage visit because its href is “/”.\n"
        "• Welcome sequence, campaign auto-send, social auto-post, WCAG AA audit, and several studio editors still not built.",
    )

    H(doc, "Part A — Completed since prior reviews (do not redo)", 16)
    P(
        doc,
        "These were open in the 6–7 October reviews and are done in code and/or live ICallBS. "
        "Boxes are pre-checked. Uncheck only if a later probe fails.",
        size=11,
        italic=True,
        color=MUTED,
    )

    completed = [
        (
            "ADV-F02 / SUP-001 code: studio auto-approve removed",
            "Live handle_new_user inserts staff_approved=false. Do not flip approval on conflict. Owner still promotes in Site Users.",
        ),
        (
            "SUP-001 purchases RLS narrowed",
            "Live policy purchases_staff requires has_staff_capability('content.update_any'). Authors with only content.read cannot read buyer emails via the Data API.",
        ),
        (
            "SUP-002 handle_new_user not callable by anon",
            "Advisor no longer lists handle_new_user for anon. Remaining anon SECURITY DEFINER RPCs are published_posts_for_topic and resolve_cms_short_link (intentional public).",
        ),
        (
            "SUP-003 published_contents security_invoker",
            "Live view options: security_invoker=true and security_barrier=true. Advisor security_definer_view ERROR is gone.",
        ),
        (
            "ADV-F10 / SUP-004 newsletter webhook auth",
            "NEWSLETTER_WEBHOOK_SECRET only. Svix signature verify implemented. CRON_SECRET is not accepted. Dashboard wiring still open in Part B.",
        ),
        (
            "ADV-F11 / SUP-P03 production Turnstile fail-closed",
            "/api/staff-signup returns 503 in production if TURNSTILE_SECRET_KEY is missing. Keys themselves still must be set (Part B).",
        ),
        (
            "SUP-005 Stripe product/price bind (code)",
            "Fulfillment requires book product_key / client_reference_id and expected STRIPE_BOOK_PRICE_ID when line items are present.",
        ),
        (
            "SUP-008 honeypot key omitted from public form schema",
            "/api/form-schema no longer returns honeypotKey. Kit and contact honeypots use a server-side constant.",
        ),
        (
            "ADV-F13 contact honeypot a11y (code)",
            "Contact and kit forms wrap the company field in .hp with aria-hidden. CSS parks it off-screen. Confirm visually after the next production deploy.",
        ),
        (
            "ADV-F07 kit thanks download (code)",
            "FreeThanks already says the kit is on the page and offers Download. Email failure in /api/subscribe still counts the signup. Confirm wording after deploy.",
        ),
        (
            "CMS public-site / resources / media / book-updates studio hubs",
            "Items marked done in TODO.md: Public site hub, Templates admin, Media docs, Book updates editor, migrations 20261035 and 20261036 applied.",
        ),
        (
            "Contacts list: add / import / export / delete / send / search",
            "CRM basics exist. Filters, bulk tag, and merge remain open.",
        ),
        (
            "Analytics charts exist in studio",
            "Site time series and newsletter charts exist. Sample-data numbers (e.g. 352) must stay labeled sample — never show them as live.",
        ),
        (
            "SM-08 five-video shot list written",
            "docs/marketing/SOCIAL-SHOT-LIST.md plus Desktop Word / PowerPoint / PDF.",
        ),
        (
            "DEV homepage can serve HomeV2",
            "Local / now uses HomeOrKit (settings.homepage_content_id → HomeV2). Production still depends on the next deploy.",
        ),
    ]
    for title, body in completed:
        check_line(doc, title, body, checked=True)

    H(doc, "Part B — Still left to do (click boxes as you finish)", 16)
    P(
        doc,
        "Numbered. Each item has a Done-when test and steps. Severity: Launch = do before email/sales; "
        "Soon = immediately after; Later = product, not a legal/security gate.",
        size=11,
        italic=True,
        color=MUTED,
    )

    items = [
        {
            "n": "1",
            "sev": "LAUNCH",
            "title": "ADV-F01 — Publish real Privacy and Terms",
            "done": "https://vettajimale.tech/privacy and /terms show real policy text (not “This page is being written.”). Kit and contact still link there. No CMS rows for these slugs exist today.",
            "steps": [
                "Decide counsel vs owner-draft. Minimum: what you collect (name, email, message, kit list, purchase email, IP/user-agent on analytics and subscribe), why, processors (Supabase Canada, Resend, Stripe, Vercel, Cloudflare Turnstile), retention, unsubscribe, how to ask deletion, PIPEDA/CASL contact, that the book is a digital good.",
                "Draft Terms: license to the PDF, no courses claim, acceptable use, all-sales-final pointer to /refunds, governing law, limitation of liability.",
                "Preferred: Studio → Pages → New page slug privacy and terms → write → Publish. Fallback: replace the placeholder branch in src/pages/Legal.tsx.",
                "Keep Refunds as-is unless counsel changes “all sales are final.”",
                "Deploy. Incognito: open /privacy, /terms, click Privacy from the kit fine print.",
            ],
        },
        {
            "n": "2",
            "sev": "LAUNCH",
            "title": "ADV-F21 / CAN-SPAM / CASL — Real postal address and honest consent",
            "done": "POSTAL_ADDRESS in production env is a real street or PO Box. Kit fine print matches what you actually send. Buyers are not silently added to marketing lists.",
            "steps": [
                "Set POSTAL_ADDRESS on Vercel to a real address (PO Box is enough).",
                "Stop writing consent_at on kit subscribers created only because they bought the book (api/_stripe.ts addBuyerTag). Tag buyer on contacts if needed; do not imply newsletter consent from a card payment.",
                "Stop clearing unsubscribed_at on a repeat kit signup without a clear “subscribe again” confirmation (api/subscribe.ts).",
                "Confirm kit copy: “a few emails about building with AI” is true only if you will send them.",
            ],
        },
        {
            "n": "3",
            "sev": "LAUNCH",
            "title": "ADV-F18 — Privacy notice for IP / analytics (no silent tracking)",
            "done": "Privacy policy names first-party analytics and IP storage. Either you disclose it, hash/drop IP, or you do not collect it.",
            "steps": [
                "Include in Privacy: POST /api/analytics-track stores path, referrer, session id, user-agent, and IP for page_view and form_start.",
                "Optional: stop storing raw IP; keep coarse country from CF-IPCountry later (TODO geo item).",
                "No cookie banner is required if you stay first-party and disclose; adding Google Fonts on production currently loads fonts.googleapis.com (third party). Production index.html still preconnects Google Fonts — remove that from the live template or disclose it.",
            ],
        },
        {
            "n": "4",
            "sev": "LAUNCH",
            "title": "BJ-01 — Deploy current repo so production APIs exist",
            "done": "GET https://vettajimale.tech/api/checkout is not Vercel 404. On 16 Oct 2026 it was 404 NOT_FOUND. /api/form-schema was also 404. Kit PDF and SPA still 200.",
            "steps": [
                "In Vercel: confirm Root Directory is the repo root, Framework Preset Vite, Output as configured, and Serverless/Node for /api/*.ts.",
                "Set all env vars from .env.example (no secrets in git).",
                "Deploy the current main (or this working branch) to Production.",
                "Probe: /api/checkout (503 until Stripe keys, or 303 to Stripe if keys exist — never 404), /api/form-schema, /api/subscribe OPTIONS/POST on staging first.",
                "Hard-refresh the live site. Confirm HomeV2, resources, literacy check, and /buy path.",
            ],
        },
        {
            "n": "5",
            "sev": "LAUNCH",
            "title": "Stripe live setup + smoke (ADV-F04, GATES Stripe, SUP-006)",
            "done": "Test-mode purchase: Checkout → webhook → row in /admin/sales → email with a time-limited private download. Strangers cannot open the paid PDF. Production /api/checkout no longer 404.",
            "steps": [
                "Create a Stripe sandbox (not shared test mode if you can avoid it). Product = the $17 book. Copy price_… to STRIPE_BOOK_PRICE_ID.",
                "Use a restricted key (rk_…) with Checkout Sessions + webhooks, not a full sk_ live key, in Vercel.",
                "Set STRIPE_WEBHOOK_SECRET from a webhook endpoint URL https://YOUR-DOMAIN/api/stripe-webhook for events checkout.session.completed and checkout.session.async_payment_succeeded (and async_payment_failed).",
                "Upload the paid PDF to the private media-private bucket (or equivalent). Do not put it in /public/downloads.",
                "Change fulfillment so BOOK_DOWNLOAD_URL is not one forever public CDN: generate a signed URL per purchase (reuse parsePrivateMediaSignRequest / lead-magnet signing; TTL hours not months).",
                "Buy once in test mode. Confirm email, sales row, and that a guessed URL 403s.",
                "Decide Stripe Tax with counsel. Do not set automatic_tax enabled until a registration is active. US digital goods / VAT for EU buyers is a product decision — record the decision even if the answer is “not collecting tax yet.”",
            ],
        },
        {
            "n": "6",
            "sev": "LAUNCH",
            "title": "ADV-F03 — Kit PDF access model (pick A or B)",
            "done": "Copy and delivery match. Today production serves /downloads/I-Call-BS-Free-Starter-Kit.pdf to anyone (200 PDF) while signup implies email delivers the kit.",
            "steps": [
                "Option A (simplest): keep the public PDF. Change kit copy so signup is for updates, not “the only way to get the file.” Keep the thanks-page download.",
                "Option B: move the PDF to media-private, signed URL after /api/subscribe, block or remove the public /downloads path, 404 the old URL.",
                "Do not leave the mismatch. Pick one, deploy, test subscribe + thanks + direct URL.",
            ],
        },
        {
            "n": "7",
            "sev": "LAUNCH",
            "title": "Supabase Auth Dashboard (ADV-F02 leftover, SUP-P01, SUP-007)",
            "done": "“Allow new users to sign up” is OFF. Leaked-password protection (HIBP) is ON. Random email cannot create a studio session except via /api/staff-signup + owner approval + confirmed email.",
            "steps": [
                "Supabase Dashboard → ICallBS → Authentication → Providers → Email → disable public signup.",
                "Authentication → Attack protection / password → enable leaked password protection.",
                "Confirm email confirmations are required before a session is usable.",
                "Try creating an account from the public internet without staff-signup; it should fail.",
                "Create one test staff via /admin signup with Turnstile, leave unapproved, confirm they cannot open studio.",
            ],
        },
        {
            "n": "8",
            "sev": "LAUNCH",
            "title": "Turnstile keys on production",
            "done": "VITE_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY set on Production. Studio signup shows a widget. Missing secret already fails closed (item already coded).",
            "steps": [
                "Cloudflare Dashboard → Turnstile → add vettajimale.tech.",
                "Paste site key (VITE_) and secret (server) into Vercel Production + Preview.",
                "Redeploy. Open /admin signup and complete a CAPTCHA once.",
            ],
        },
        {
            "n": "9",
            "sev": "LAUNCH",
            "title": "Resend webhook + crons + postal footer",
            "done": "POST /api/newsletter-webhook accepts a Resend test event (Svix). Cron hits newsletter-send, lead-magnet-deliver, cms-publish-due with CRON_SECRET. Emails show the real postal address.",
            "steps": [
                "Resend → Webhooks → https://vettajimale.tech/api/newsletter-webhook with delivered, opened, clicked, bounced, complained. Paste whsec_ into NEWSLETTER_WEBHOOK_SECRET (never CRON_SECRET).",
                "Vercel Cron already listed in vercel.json; confirm they run in the Vercel project (Hobby limits apply).",
                "Send a test newsletter to yourself. Confirm Analytics → Newsletters records the event.",
            ],
        },
        {
            "n": "10",
            "sev": "LAUNCH",
            "title": "ADV-F05 — Placeholders gone on the live homepage and About",
            "done": "Live HomeV2 and About have no “Project placeholder,” “YOUR PHOTO,” or “YOUR INTRODUCTION VIDEO.” Those strings are gone from src; still verify published HomeV2 and any leftover brand draft.",
            "steps": [
                "Incognito https://vettajimale.tech/ and /about after deploy. Scroll the whole page.",
                "Studio → Pages → HomeV2 and About. Delete leftover dummy blocks.",
                "If /api/dev-brand-draft still holds old placeholders, clear or ignore it so local preview matches.",
            ],
        },
        {
            "n": "11",
            "sev": "LAUNCH",
            "title": "Staging smokes: contact, kit, checkout, mobile",
            "done": "Each path proven once with a synthetic address you control. No production buyer data in tests.",
            "steps": [
                "Contact form → you receive the message.",
                "Kit subscribe → thanks download works → unsubscribe token sets unsubscribed_at.",
                "Book checkout test card → webhook → purchase email → /admin/sales.",
                "Viewports 320, 390, 768, 1440: no clipped CTAs, no horizontal overflow (BJ-04).",
                "Admin login with the designated test account (BJ-05).",
            ],
        },
        {
            "n": "12",
            "sev": "SOON",
            "title": "ADV-F06 + preference center before opening Stay curious",
            "done": "Either the newsletter button stays “Not open yet,” or a public preference/unsubscribe page works for contacts lists.",
            "steps": [
                "Do not enable the homepage newsletter form until this is done.",
                "Build a public page (token from email) to subscribe/unsubscribe per list, mirroring /api/contact-unsubscribe.",
                "Wire default lead-capture form newsletterListIds to the real list.",
                "Staging: subscribe → email → prefs → unsubscribe → suppressed.",
            ],
        },
        {
            "n": "13",
            "sev": "SOON",
            "title": "ADV-F08 — One canonical book title",
            "done": "Cover, alt text, brand pages, thanks page, and metadata use the same title you print on the PDF.",
            "steps": [
                "Pick the printed title (prior brief: “I Call BS: Vibe Coding Myths Dispelled”).",
                "Replace “AI Vibe Coding Myths Dispelled” in src/brand/pages.ts, BrandBlocks, FreeThanks, and any CMS copy.",
                "Deploy and spot-check cover alt text.",
            ],
        },
        {
            "n": "14",
            "sev": "SOON",
            "title": "ADV-F09 + ADV-F14 — Legal back link and header aria-current",
            "done": "Legal/contact fallback is not “← The book.” Homepage does not mark “The book” as the current page unless that nav item is truly Home.",
            "steps": [
                "In Legal.tsx and Contact.tsx change the crumb to Home or Resources.",
                "In DEFAULT_SITE_CHROME, either set the first item href to a real book URL (not “/”) or label it Home.",
                "isActive already treats “/” as home only; the bug is the book item pointing at “/”.",
            ],
        },
        {
            "n": "15",
            "sev": "SOON",
            "title": "ADV-F12 — Document which URL is the public site",
            "done": "A one-pager states: production = vettajimale.tech CMS HomeV2; local / = HomeOrKit after the 15 Oct change; brand draft is not what visitors see.",
            "steps": [
                "Add a short note to docs/cms/WORKFLOWS.md or GATES.md: launch QA uses production, not Vite brand chrome.",
                "After deploy, repeat the 04 browser journeys against production only.",
            ],
        },
        {
            "n": "16",
            "sev": "SOON",
            "title": "Remaining advisor hygiene (SUP-009, SUP-010, public RPCs)",
            "done": "Advisors reviewed. citext move is optional. subscribers stays RLS on, no policies, REVOKE from anon/authenticated documented.",
            "steps": [
                "REVOKE ALL on subscribers, rate_limit_buckets, content_previews from anon and authenticated if not already.",
                "Keep published_posts_for_topic and resolve_cms_short_link public only if they cannot leak drafts (spot-check with anon SQL).",
                "Schedule moving citext to extensions schema when you have a maintenance window.",
            ],
        },
        {
            "n": "17",
            "sev": "LATER",
            "title": "Contacts CRM leftovers",
            "done": "Filter by marketing OK / suppressed / tag / list. Bulk tag and bulk list subscribe. Merge duplicate emails if they appear.",
            "steps": [
                "Design filters on /admin/contacts from existing columns.",
                "Bulk actions with a confirm step; write consent events.",
                "Merge: keep the oldest id, union tags, keep any suppression.",
            ],
        },
        {
            "n": "18",
            "sev": "LATER",
            "title": "Newsletter staging smoke and list wiring",
            "done": "Create → design → test send → schedule → cron send on staging. Open/click stats after webhook. Default forms have the right newsletterListIds.",
            "steps": [
                "Use a throwaway inbox.",
                "Confirm idempotent send jobs do not double-email.",
                "Do not open the public form until item 12 is done.",
            ],
        },
        {
            "n": "19",
            "sev": "LATER",
            "title": "Analytics / growth extras",
            "done": "Author breakdown, optional coarse geo, welcome emails 2–6, social auto-post — each only after the matching gate.",
            "steps": [
                "Author breakdown from published posts + page_view paths.",
                "Geo: CF-IPCountry header only, not a third-party tracker.",
                "Welcome sequence: write 2–6 only with unsubscribe + postal address.",
                "Social auto-post is optional; do not block launch.",
            ],
        },
        {
            "n": "20",
            "sev": "LATER",
            "title": "Campaigns auto-send",
            "done": "Blueprints can execute steps only after newsletter + consent + suppression are proven.",
            "steps": [
                "Keep auto-send off until item 12 and 18 pass.",
                "Then add a job that respects suppressed_at and marketing_ok.",
            ],
        },
        {
            "n": "21",
            "sev": "LATER",
            "title": "Studio editors still in code files",
            "done": "Optional: Builder Quick Reference, Templates, Tools copy, Literacy Check questions, tools catalog editable in Studio.",
            "steps": [
                "Do not rewrite working public layouts. Add editors beside them.",
                "Literacy Check stays JSON until an editor exists.",
            ],
        },
        {
            "n": "22",
            "sev": "LATER",
            "title": "Resources package editorial + first Book Update",
            "done": "Owner read of the four resource pages + literacy check. First real Book Updates entry when you have one. Templates stay free unless you later add a consented gate.",
            "steps": [
                "Read quiz-content.json editorial-review-before-publication notes.",
                "Add one Correction/Link/Tool change with edition + page.",
                "Keep email-gate off unless you want lead capture.",
            ],
        },
        {
            "n": "23",
            "sev": "LATER",
            "title": "Imports",
            "done": "Kit subscribers → Contacts dry-run then commit on a backup. CSV column map documented.",
            "steps": [
                "Backup contacts and subscribers first.",
                "Dry-run /admin/imports. Confirm unsubscribed kit rows become suppressed contacts.",
                "Write the CSV map in IMPLEMENTATION.md or a Contacts help note.",
            ],
        },
        {
            "n": "24",
            "sev": "LATER",
            "title": "Access hygiene + docs gates",
            "done": "Owner Disable is the kill switch. Periodic Users review. GATES.md marked Complete only after staging smoke. IMPLEMENTATION.md dated when a slice ships.",
            "steps": [
                "Calendar a monthly Users pass (disabled_at, roles).",
                "Do not mark Stripe or Forms gates Complete until the smokes in item 11 pass.",
            ],
        },
        {
            "n": "25",
            "sev": "LATER",
            "title": "WCAG 2.2 AA public chrome",
            "done": "Keyboard, contrast, names, focus on header, kit, book, contact, resources. Not a legal substitute for a full audit.",
            "steps": [
                "Tab through HomeV2, kit, book, contact, literacy check.",
                "Fix contrast and target size on the public CSS you already have; do not restyle working sections unasked.",
            ],
        },
        {
            "n": "26",
            "sev": "LATER",
            "title": "Social launch SM-01 to SM-07",
            "done": "Five videos shot (2, 5, 10, 11, 15). Bio and link-in-bio point at Resources, not Stay curious. Pin is 15.",
            "steps": [
                "Follow docs/marketing/SOCIAL-SHOT-LIST.md.",
                "Do not send people to the newsletter until item 12 is done.",
            ],
        },
        {
            "n": "27",
            "sev": "LATER",
            "title": "Replace kit funnel with Contacts path (only after staging)",
            "done": "/free and /api/subscribe stay as the live audience path until Contacts + prefs pass smoke. Then a cutover plan, not a surprise rewrite.",
            "steps": [
                "Keep api/subscribe.ts until item 11 and 12 pass.",
                "Cut over with a dual-write then a freeze, never a silent drop of the kit list.",
            ],
        },
    ]

    for item in items:
        check_line(
            doc,
            f"{item['n']}. [{item['sev']}] {item['title']}",
            f"Done when: {item['done']}",
            checked=False,
            alert=item["sev"] == "LAUNCH",
        )
        P(doc, "Steps", size=11, bold=True, color=GREEN, before=2, after=2)
        for i, s in enumerate(item["steps"], 1):
            step(doc, f"{item['n']}.{i}", s)

    H(doc, "Part C — New findings this pass (not in the 6 Oct ADV list)", 16)
    news = [
        (
            "Production APIs still missing after a 15 Oct static deploy",
            "Privacy HTML is a 1251-byte SPA shell dated 15 Oct 2026 14:43 UTC; /api/checkout remains 404. Deploying the front-end alone does not enable Stripe.",
        ),
        (
            "Production still loads Google Fonts",
            "Live index.html preconnects fonts.googleapis.com / fonts.gstatic.com. Local rules forbid that; production has not caught up. Also a third-party request for privacy disclosure.",
        ),
        (
            "Buyer tagged as consented subscriber",
            "addBuyerTag inserts subscribers with consent_at for people who only paid. Fix under item 2.",
        ),
        (
            "No Stripe Tax decision recorded",
            "Checkout has no automatic_tax. That is safer than enabling tax with no registration. Record the choice.",
        ),
        (
            "is_staff() still ignores email_confirmed_at (SUP-P02)",
            "Admin UI blocks unconfirmed users; RLS helpers do not. Keep Auth confirmation required.",
        ),
        (
            "Fulfill-then-email order (SUP-P05 leftover)",
            "Purchase email failure is logged; row still marked fulfilled. Staff must be able to resend from Sales.",
        ),
        (
            "Newsletter HTML sanitizer weaker than OpEd (SUP-P04)",
            "Staff-trust boundary. Tighten before untrusted designers get newsletter access.",
        ),
    ]
    for title, body in news:
        check_line(doc, title, body, checked=False)

    H(doc, "Part D — Suggested order if you only have two days", 16)
    P(
        doc,
        "Day 1: items 1, 2, 3 (legal + consent), 4 (deploy APIs), 7 (Auth toggles), 8 (Turnstile). "
        "Day 2: items 5 (Stripe test purchase + signed book URL), 6 (kit PDF model), 9 (Resend/cron), 11 (smokes). "
        "Do not open the newsletter or run paid ads until 1–11 are checked.",
    )

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    r = p.add_run(
        "Sources: docs/cms/TODO.md; docs/cms/TODO-PLAN.md; docs/reviews/03-security-supabase-review.md; "
        "docs/reviews/04-browser-journey-tests.md; live advisors ICallBS 2026-10-16; production probes "
        "vettajimale.tech 2026-10-16; repo Legal.tsx, api/_stripe.ts, api/subscribe.ts, api/staff-signup.ts, "
        "api/newsletter-webhook.ts, api/form-schema.ts."
    )
    font(r, size=10, italic=True, color=MUTED)

    doc.save(OUT)
    for dest in (DESKTOP, DESKTOP2):
        try:
            shutil.copy2(OUT, dest)
        except OSError:
            pass
    return OUT


if __name__ == "__main__":
    path = build()
    print(path)
    print(DESKTOP)
