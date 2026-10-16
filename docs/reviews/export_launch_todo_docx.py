"""Export the 16 Oct 2026 launch operator checklist as Word."""

from __future__ import annotations

import shutil
from pathlib import Path

from docx import Document
from docx.enum.text import WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

HERE = Path(__file__).resolve().parent
OUT = HERE / "ICBS-Launch-TODO.docx"
DESKTOP = Path.home() / "Desktop" / "ICBS-Launch-TODO.docx"
DESKTOP2 = Path.home() / "Desktop" / "ICBS-Launch-TODO-copy.docx"
DOWNLOADS = Path.home() / "Downloads" / "ICBS-Launch-TODO.docx"

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


def copy_out(src: Path) -> None:
    for dest in (DESKTOP, DESKTOP2, DOWNLOADS):
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
        except OSError:
            pass


def build() -> Path:
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Inches(0.85)
    sec.bottom_margin = Inches(0.85)
    sec.left_margin = Inches(1.0)
    sec.right_margin = Inches(1.0)

    P(doc, "I Call BS  ·  VettaJimale.Tech  ·  ICallBS (gfilixqzkduuuwrktpjh)", size=11, bold=True, color=GREEN, after=2)
    P(doc, "Launch TODO + how to replace fonts", size=24, bold=True, color=GREEN, after=4)
    P(
        doc,
        "Updated 16 October 2026 after git push c111771 on main. Open this file in Microsoft Word (not Cursor). "
        "Check items off by changing [ ] to [x]. A box is done only when the “Done when” line is true. "
        "This is not legal advice; it is an operator checklist. Production stays behind this repo until you deploy.",
        size=11,
        italic=True,
        color=MUTED,
        after=12,
    )

    H(doc, "How to use this file", 16)
    P(
        doc,
        "Work the open boxes in order. Launch items 1–8 come before taking live cards or collecting more marketing mail. "
        "Items 10–13 are Soon / Later and do not block a careful staging smoke. "
        "Do not add Google Fonts <link> tags back to index.html.",
    )

    H(doc, "How to replace fonts (no Google Fonts)", 16)
    P(
        doc,
        "The public site no longer loads fonts from Google. CSS still names Newsreader, Anton, and IBM Plex Mono. "
        "Browsers that do not have those files fall back to Georgia, Impact, and system mono.",
    )
    P(doc, "Keep the look (self-host)", size=13, bold=True, color=GREEN, before=4)
    for i, s in enumerate(
        [
            "Get a license that allows web embedding (Google Fonts OFL is fine if you host the files yourself; do not hotlink fonts.googleapis.com).",
            "Download .woff2 files for the weights you actually use (Anton 400; Newsreader 400/700; IBM Plex Mono 400/700 is typical).",
            "Put them in public/fonts/ (example names: Newsreader-Regular.woff2, Anton-Regular.woff2, IBMPlexMono-Regular.woff2).",
            "Add @font-face at the top of src/styles.css (kit/legal chrome) and src/brand/brand.css (brand pages). Those files already name Newsreader, Anton, and IBM Plex Mono.",
            "Repeat @font-face for Anton and IBM Plex Mono. Keep the existing font-family: Newsreader, Georgia, serif rules — they will pick up the local files.",
            "Studio editor presets live in src/studio/lib/editorFontChoices.ts. After self-hosting Inter/Lato/Playfair (or dropping those names), update that list so the inspector does not promise fonts you do not ship.",
            "Confirm in DevTools → Network that there is no request to fonts.googleapis.com / fonts.gstatic.com.",
            "Deploy.",
        ],
        1,
    ):
        step(doc, str(i), s)
    P(
        doc,
        "Example CSS (repeat per family/weight):",
        size=11,
        italic=True,
        color=MUTED,
        before=8,
        after=4,
    )
    P(
        doc,
        '@font-face { font-family: Newsreader; src: url("/fonts/Newsreader-Regular.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: swap; }',
        size=11,
        italic=True,
        color=INK,
    )
    P(doc, "Change the look", size=13, bold=True, color=GREEN, before=8)
    P(
        doc,
        "Pick new families, self-host the same way, then change the font-family stacks in src/brand/brand.css and src/styles.css. "
        "Do not add a Google Fonts <link> in index.html.",
    )

    H(doc, "Part A — Already in this repo (do not redo after deploy confirms them)", 16)
    P(
        doc,
        "These shipped in commit c111771. Boxes are pre-checked. Uncheck only if a later production probe fails.",
        size=11,
        italic=True,
        color=MUTED,
    )
    completed = [
        (
            "Privacy, Terms, Refunds, Copyright, FAQ",
            "Code routes show real copy. Maryland governing law. Venue is Kings County, New York. Hashed-IP privacy copy. No 30-day SLA claim.",
        ),
        (
            "Checkout kit-mail opt-in",
            "Buyers are not silently added to marketing. Kit re-subscribe requires a confirm checkbox.",
        ),
        (
            "Branded unsubscribe + /prefs",
            "GET unsubscribe redirects to /unsubscribed or /unsubscribe-error. One-click POST stays 200 (no redirect). Preference center at /prefs?token=.",
        ),
        (
            "Signed book path + Sales resend",
            "BOOK_PRIVATE_PATH preferred over a forever public BOOK_DOWNLOAD_URL. Staff can Resend download from /admin/sales.",
        ),
        (
            "Google Fonts off index.html and studio CSS",
            "No fonts.googleapis.com / fonts.gstatic.com links. Self-host files if you want Newsreader/Anton/Plex to actually load (see How to replace fonts).",
        ),
        (
            "Postal address in .env.example",
            "Manifest, Media, Marketing, & Events (MMME) · 20 Adelphi Street · Brooklyn, NY 11205. You still must set POSTAL_ADDRESS on Vercel.",
        ),
        (
            "FAQ and Copyright in footer and Pages inventory",
            "Do not put FAQ into the public CMS editor as a blank page; the live page is the code route.",
        ),
        (
            "Studio canvas widgets (same commit)",
            "Brand/studio editor work (column gutters, widget tray, fade carousel, marquee, media crop, etc.) is on main with the legal/launch work.",
        ),
    ]
    for title, body in completed:
        check_line(doc, title, body, checked=True)

    H(doc, "Part B — You only (accounts and live site)", 16)
    P(
        doc,
        "Numbered. Each item has a Done-when test and steps. Severity: Launch = do before email/sales; Soon = immediately after; Later = you, not code.",
        size=11,
        italic=True,
        color=MUTED,
    )

    items = [
        {
            "n": "1",
            "sev": "LAUNCH",
            "title": "Deploy this repo to Vercel production",
            "done": "https://vettajimale.tech/api/checkout is not a Vercel 404. /privacy and /terms show real copy. /faq and /copyright load.",
            "steps": [
                "Vercel → project → Root Directory = repo root, Vite, Node for /api/*.ts.",
                "Deploy main (commit c111771) to Production.",
                "Incognito: /, /privacy, /terms, /refunds, /copyright, /faq, /prefs (expect “missing token” on /prefs without a query).",
                "Probe: GET /api/checkout → 503 (no keys) or redirect to Stripe — never 404.",
            ],
        },
        {
            "n": "2",
            "sev": "LAUNCH",
            "title": "Vercel environment variables",
            "done": "Production env matches .env.example with real secrets (nothing committed).",
            "steps": [
                "Set POSTAL_ADDRESS = Manifest, Media, Marketing, & Events (MMME) · 20 Adelphi Street · Brooklyn, NY 11205.",
                "Set SITE_URL = https://vettajimale.tech and EMAIL_FROM = existing hello@vettajimale.tech.",
                "Set Supabase URL + service role + anon (VITE_ anon only).",
                "Set Stripe: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_BOOK_PRICE_ID.",
                "Set BOOK_PRIVATE_PATH = object key in media-private (example books/i-call-bs.pdf) after you upload the paid PDF. Leave BOOK_DOWNLOAD_URL empty once private path works.",
                "Set Turnstile: VITE_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY.",
                "Set NEWSLETTER_WEBHOOK_SECRET (Resend whsec_…, never reuse CRON_SECRET) and CRON_SECRET.",
                "Redeploy after saving env.",
            ],
        },
        {
            "n": "3",
            "sev": "LAUNCH",
            "title": "Paid PDF in private storage",
            "done": "A guessed URL does not serve the $17 book. A test purchase email has a time-limited link.",
            "steps": [
                "Studio → Media (or Supabase Storage) → bucket media-private.",
                "Upload the paid PDF. Note the object path.",
                "Put that path in BOOK_PRIVATE_PATH. Do not put the paid file in /public/downloads.",
                "Kit PDF may stay public (/downloads/I-Call-BS-Free-Starter-Kit.pdf) — copy already says signup is for emails.",
            ],
        },
        {
            "n": "4",
            "sev": "LAUNCH",
            "title": "Stripe live/test smoke",
            "done": "Test card → webhook → row in /admin/sales → email with signed download. Strangers cannot open the file.",
            "steps": [
                "Stripe product $17, copy price_… into STRIPE_BOOK_PRICE_ID.",
                "Webhook https://vettajimale.tech/api/stripe-webhook for checkout.session.completed and checkout.session.async_payment_succeeded.",
                "Restricted key preferred (rk_…).",
                "Buy once in test mode. If the email fails, use Sales → Resend download.",
                "Decide tax with counsel. Do not enable Stripe Tax until a registration exists. Record “not collecting tax yet” if that is the choice.",
            ],
        },
        {
            "n": "5",
            "sev": "LAUNCH",
            "title": "Supabase Auth dashboard",
            "done": "Random public email cannot create a studio session. Leaked-password protection is on.",
            "steps": [
                "Authentication → Providers → Email → Allow new users to sign up = OFF (staff still use /api/staff-signup).",
                "Attack protection → leaked password protection ON.",
                "Keep email confirmation required.",
                "Try a public signup; it should fail. Unapproved staff cannot open studio.",
            ],
        },
        {
            "n": "6",
            "sev": "LAUNCH",
            "title": "Turnstile",
            "done": "/admin signup shows the widget and a missing secret still fails closed.",
            "steps": [
                "Cloudflare Turnstile → add vettajimale.tech.",
                "Paste site + secret keys into Vercel Production (and Preview).",
                "Redeploy. Complete CAPTCHA once.",
            ],
        },
        {
            "n": "7",
            "sev": "LAUNCH",
            "title": "Resend webhook + crons + mail footer",
            "done": "A Resend test event hits /api/newsletter-webhook. Cron jobs run. Emails show the Brooklyn postal line.",
            "steps": [
                "Resend → Webhooks → https://vettajimale.tech/api/newsletter-webhook (delivered, opened, clicked, bounced, complained).",
                "Confirm Vercel crons from vercel.json are actually enabled.",
                "Send a test newsletter to yourself only after prefs work (item 12). List still “Not open yet.”",
            ],
        },
        {
            "n": "8",
            "sev": "LAUNCH",
            "title": "Staging smokes (your inboxes, not real buyers)",
            "done": "Each path works once.",
            "steps": [
                "Contact form → you receive it.",
                "Kit subscribe → thanks PDF → unsubscribe → if they sign up again, they must confirm to rejoin the list.",
                "Book checkout test card → webhook → email → /admin/sales.",
                "Viewports 320 / 390 / 768 / 1440: no clipped CTAs, no sideways scroll.",
                "Admin login with the designated test account.",
            ],
        },
        {
            "n": "9",
            "sev": "LAUNCH",
            "title": "Homepage / About leftovers",
            "done": "Live HomeV2 and About have no “YOUR PHOTO” / placeholder strings.",
            "steps": [
                "Incognito / and /about after deploy.",
                "Studio → Pages → HomeV2 / About → delete dummy blocks.",
                "Confirm hello@vettajimale.tech receives Privacy Request and Copyright/DMCA mail (alias privacy@ if you want).",
            ],
        },
        {
            "n": "10",
            "sev": "SOON",
            "title": "Printed book title",
            "done": "Cover, alt text, brand pages, and legal pages match the PDF cover.",
            "steps": [
                "Current code uses I Call BS: AI Vibe Coding Myths Dispelled.",
                "If the printed cover is different, say so and it can be replaced in one pass (src/brand/pages.ts, thanks pages, legal copy).",
            ],
        },
        {
            "n": "11",
            "sev": "SOON",
            "title": "Optional Maryland venue county",
            "done": "Governing law is Maryland. Venue is Kings County, New York (where you are).",
            "steps": [
                "If you want both in Maryland, send the registered-agent county.",
            ],
        },
        {
            "n": "12",
            "sev": "SOON",
            "title": "Newsletter still closed",
            "done": "Homepage Stay curious stays “Not open yet” until you point a real list at /prefs.",
            "steps": [
                "Public prefs page: /prefs?token= (token from contacts unsubscribe).",
                "Do not enable the public newsletter form until you have used prefs on a throwaway inbox.",
            ],
        },
        {
            "n": "13",
            "sev": "LATER",
            "title": "You, not code",
            "done": "Owner work that does not belong in a deploy.",
            "steps": [
                "First real Book Update in studio.",
                "Editorial read of resources + literacy quiz.",
                "Social videos (shot list in docs/marketing/SOCIAL-SHOT-LIST.md). Link-in-bio → Resources, not Stay curious.",
                "Monthly Users review (disabled accounts, roles).",
                "Optional: register DMCA agent with the U.S. Copyright Office.",
                "Counsel review of Terms / Privacy if you want a lawyer’s stamp.",
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

    H(doc, "Do not", 16)
    P(
        doc,
        "• Collect more marketing list mail or take live cards until items 1–8 are true.\n"
        "• Put the paid book PDF in /public/downloads.\n"
        "• Turn Stay curious on before a list is wired and /prefs is tested.\n"
        "• Add Google Fonts <link> tags back to index.html.",
        color=ALERT,
    )

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    r = p.add_run(
        "Sources: docs/reviews/LAUNCH-TODO.md; commit c111771 on main; Legal.tsx, privacyPolicy.ts, termsOfUse.ts, "
        "api/_stripe.ts, api/subscribe.ts, src/styles.css, src/brand/brand.css."
    )
    font(r, size=10, italic=True, color=MUTED)

    doc.save(OUT)
    copy_out(OUT)
    return OUT


if __name__ == "__main__":
    path = build()
    print(path)
    print(DESKTOP)
    print(DOWNLOADS)
