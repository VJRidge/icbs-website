"""Export social scripts as large-print Word, PowerPoint, and HTML."""

from __future__ import annotations

import shutil
from html import escape
from pathlib import Path

from docx import Document
from docx.enum.text import WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor as DocxRGB
from docx.oxml import OxmlElement
from pptx import Presentation
from pptx.dml.color import RGBColor as PptRGB
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches as PInches, Pt as PPt

from generate_social_scripts_doc import SCRIPTS

HERE = Path(__file__).resolve().parent
DESKTOP = Path.home() / "Desktop"
DOCX_NAME = "VettaJimale-Tech-Social-Scripts-READABLE.docx"
PPTX_NAME = "VettaJimale-Tech-Social-Scripts.pptx"
HTML_NAME = "VettaJimale-Tech-Social-Scripts.html"

GREEN = DocxRGB(0x1A, 0x3A, 0x32)
INK = DocxRGB(0x1C, 0x1C, 0x1C)
MUTED = DocxRGB(0x3F, 0x3F, 0x3F)
CREAM = (0xF7, 0xF2, 0xE8)
PPT_GREEN = PptRGB(0x1A, 0x3A, 0x32)
PPT_INK = PptRGB(0x1C, 0x1C, 0x1C)
PPT_MUTED = PptRGB(0x4A, 0x4A, 0x4A)
PPT_CREAM = PptRGB(0xF7, 0xF2, 0xE8)
PPT_WHITE = PptRGB(0xFF, 0xFF, 0xFF)


def set_run(run, *, size=14, bold=False, italic=False, color=INK):
    run.font.name = "Calibri"
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.get_or_add_rFonts()
    rFonts.set(qn("w:eastAsia"), "Calibri")


def add_page_break(doc):
    p = doc.add_paragraph()
    run = p.add_run()
    br = OxmlElement("w:br")
    br.set(qn("w:type"), "page")
    run._element.append(br)


def para(doc, text, *, size=14, bold=False, italic=False, color=INK, after=10, before=0):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.line_spacing = 1.28
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    run = p.add_run(text)
    set_run(run, size=size, bold=bold, italic=italic, color=color)
    return p


def labeled(doc, label, body):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(12)
    p.paragraph_format.line_spacing = 1.28
    a = p.add_run(label + " ")
    set_run(a, size=14, bold=True, color=GREEN)
    b = p.add_run(body)
    set_run(b, size=14, color=INK)


def bullets(doc, items):
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        p.clear()
        run = p.add_run(item)
        set_run(run, size=14)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.28


def build_docx() -> Path:
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Inches(0.85)
    sec.bottom_margin = Inches(0.85)
    sec.left_margin = Inches(1.0)
    sec.right_margin = Inches(1.0)
    doc.styles["Normal"].font.name = "Calibri"
    doc.styles["Normal"].font.size = Pt(14)

    para(doc, "VettaJimale.Tech", size=16, bold=True, color=GREEN, after=4)
    para(doc, "Social media scripts — readable copy", size=26, bold=True, color=GREEN, after=8)
    para(
        doc,
        "Fifteen scripts. Each one shows the original short draft, then the full revision you can record from. Large type for reading on screen and for printing.",
        size=16,
        italic=True,
        color=MUTED,
        after=14,
    )
    para(doc, "How to use this file", size=20, bold=True, color=GREEN, before=8)
    para(
        doc,
        "Record from the Revision pages. Use the Original only if you need a short thumbnail line. Links go in the first comment, not in the last second of speech.",
    )
    para(doc, "If you only record five", size=20, bold=True, color=GREEN, before=8)
    para(
        doc,
        "Record scripts 2 (spelling), 5 (three live tools), 10 (literacy check), 11 (templates), and 15 (the pinned film).",
    )

    for s in SCRIPTS:
        add_page_break(doc)
        para(doc, f"Script {s['n']} of 15", size=14, bold=True, color=GREEN, after=4)
        para(doc, s["title"], size=24, bold=True, color=GREEN, after=10)
        labeled(doc, "Job.", s["job"])
        labeled(doc, "Audience.", s["meta"]["audience"])
        labeled(doc, "Platform.", s["meta"]["platform"])
        labeled(doc, "What to show.", s["meta"]["visual"])

        para(doc, "Original (first draft)", size=18, bold=True, color=GREEN, before=14, after=8)
        for line in s["original"]:
            para(doc, line, italic=True, after=8)
        labeled(doc, "Why that was too thin.", s["why_thin"])

        para(doc, "Revision — record this", size=18, bold=True, color=GREEN, before=16, after=8)
        labeled(doc, "Hook.", s["hook"])
        para(doc, "Spoken script", size=16, bold=True, color=GREEN, before=10, after=8)
        for line in s["spoken"]:
            para(doc, line, after=12)
        para(doc, "On-screen text", size=16, bold=True, color=GREEN, before=10, after=8)
        bullets(doc, s["onscreen"])
        para(doc, "Caption", size=16, bold=True, color=GREEN, before=10, after=8)
        para(doc, s["caption"], after=12)
        labeled(doc, "First comment.", s["first_comment"])
        labeled(doc, "Call to action.", s["cta"])
        labeled(doc, "Do not say.", s["dont"])

    out = HERE / DOCX_NAME
    doc.save(out)
    return out


def _blank(prs):
    return prs.slides.add_slide(prs.slide_layouts[6])


def _bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def _tb(slide, l, t, w, h, *, size=20, bold=False, color=PPT_INK, font="Calibri"):
    box = slide.shapes.add_textbox(PInches(l), PInches(t), PInches(w), PInches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    p = tf.paragraphs[0]
    p.font.name = font
    p.font.size = PPt(size)
    p.font.bold = bold
    p.font.color.rgb = color
    return tf


def _write(tf, lines, *, size=20, bold=False, color=PPT_INK, space=8):
    first = True
    for line in lines:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.text = line
        p.font.name = "Calibri"
        p.font.size = PPt(size)
        p.font.bold = bold
        p.font.color.rgb = color
        p.space_after = PPt(space)
        p.level = 0


def title_slide(prs, kicker, title, subtitle):
    slide = _blank(prs)
    _bg(slide, PPT_GREEN)
    tf = _tb(slide, 0.7, 1.6, 12, 0.5, size=16, bold=True, color=PPT_CREAM)
    _write(tf, [kicker], size=16, bold=True, color=PPT_CREAM)
    tf = _tb(slide, 0.7, 2.2, 12, 2.4, size=36, bold=True, color=PPT_WHITE)
    _write(tf, [title], size=36, bold=True, color=PPT_WHITE, space=6)
    tf = _tb(slide, 0.7, 5.0, 12, 1.6, size=20, color=PPT_CREAM)
    _write(tf, [subtitle], size=20, color=PPT_CREAM, space=8)
    return slide


def content_slide(prs, kicker, title, lines, *, size=20):
    slide = _blank(prs)
    _bg(slide, PPT_CREAM)
    tf = _tb(slide, 0.65, 0.28, 12, 0.4, size=14, bold=True, color=PPT_GREEN)
    _write(tf, [kicker], size=14, bold=True, color=PPT_GREEN)
    tf = _tb(slide, 0.65, 0.65, 12, 0.7, size=26, bold=True, color=PPT_GREEN)
    _write(tf, [title], size=26, bold=True, color=PPT_GREEN, space=4)
    tf = _tb(slide, 0.65, 1.45, 12.0, 5.7, size=size, color=PPT_INK)
    _write(tf, lines, size=size, color=PPT_INK, space=10)
    return slide


def chunk(items, n):
    for i in range(0, len(items), n):
        yield items[i : i + n]


def build_pptx() -> Path:
    prs = Presentation()
    prs.slide_width = Emu(12192000)
    prs.slide_height = Emu(6858000)

    title_slide(
        prs,
        "VettaJimale.Tech",
        "15 social scripts",
        "Original draft + full revision. Swipe in PowerPoint, or open the Word file to copy-paste captions.",
    )
    content_slide(
        prs,
        "Start here",
        "How to use this deck",
        [
            "Each script has: original, why it was thin, then the revision you record.",
            "Record scripts 2, 5, 10, 11, and 15 if you only shoot five.",
            "Put links in the first comment. Hold the URL on screen long enough to screenshot.",
            "Do not promise a newsletter. Stay curious is not open yet.",
            "Do not say “three free chapters.” Say “previews from three chapters.”",
        ],
        size=22,
    )
    content_slide(
        prs,
        "The five jobs",
        "What these 15 posts are for",
        [
            "1–3  Find it: what it is, how to spell it, the stance.",
            "4–8  What’s on it: map, live tools, kit vs book, essay, receipts.",
            "9–12  How to use it: first visit, literacy check, templates, tools.",
            "13–15  Why follow: filter, weekly habit, pinned film.",
        ],
        size=22,
    )

    for s in SCRIPTS:
        k = f"Script {s['n']} of 15"
        title_slide(prs, k, s["title"], s["job"])
        content_slide(
            prs,
            k,
            "Who it’s for, and how to shoot it",
            [
                "Audience: " + s["meta"]["audience"],
                "Platform: " + s["meta"]["platform"],
                "Show: " + s["meta"]["visual"],
            ],
            size=20,
        )
        content_slide(prs, k + " — original", "The first draft (too thin)", s["original"], size=22)
        content_slide(prs, k + " — original", "Why that was too thin", [s["why_thin"]], size=20)
        content_slide(prs, k + " — revision", "Hook", [s["hook"]], size=24)
        for part, i in zip(chunk(s["spoken"], 2), range(1, 10)):
            content_slide(prs, k + " — revision", f"Spoken script ({i})", part, size=20)
        content_slide(prs, k + " — revision", "On-screen text", s["onscreen"], size=20)
        content_slide(prs, k + " — revision", "Caption", [s["caption"]], size=18)
        content_slide(
            prs,
            k + " — revision",
            "Comment, CTA, and do not say",
            [
                "First comment: " + s["first_comment"],
                "Call to action: " + s["cta"],
                "Do not say: " + s["dont"],
            ],
            size=18,
        )

    title_slide(prs, "End", "That’s the full set.", "Word file has the same words in large type for copy-paste.")
    out = HERE / PPTX_NAME
    prs.save(out)
    return out


def build_html() -> Path:
    parts = [
        "<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'>",
        "<meta name='viewport' content='width=device-width, initial-scale=1'>",
        "<title>VettaJimale.Tech social scripts</title>",
        "<style>",
        "body{margin:0;background:#f7f2e8;color:#1c1c1c;font:20px/1.45 Calibri,Segoe UI,sans-serif;}",
        "main{max-width:44rem;margin:0 auto;padding:2rem 1.25rem 4rem;}",
        "h1{font-size:2rem;color:#1a3a32;line-height:1.2;}",
        "h2{font-size:1.55rem;color:#1a3a32;margin-top:2.5rem;}",
        "h3{font-size:1.2rem;color:#1a3a32;}",
        ".k{font-weight:700;color:#1a3a32;}",
        ".orig{font-style:italic;background:#fff;padding:1rem 1.1rem;border-left:4px solid #1a3a32;}",
        "hr{border:0;border-top:2px solid #1a3a32;margin:2.5rem 0;}",
        "a{color:#1a3a32;}",
        "</style></head><body><main>",
        "<p class='k'>VettaJimale.Tech</p>",
        "<h1>Social media scripts — readable copy</h1>",
        "<p>Fifteen scripts. Original draft, then the full revision. This page is for reading. Use the Word or PowerPoint files on your Desktop to download and edit.</p>",
        "<p><strong>Record 2, 5, 10, 11, and 15</strong> if you only shoot five.</p>",
    ]
    for s in SCRIPTS:
        parts.append("<hr>")
        parts.append(f"<h2>Script {s['n']}. {escape(s['title'])}</h2>")
        parts.append(f"<p><span class='k'>Job.</span> {escape(s['job'])}</p>")
        parts.append(f"<p><span class='k'>Audience.</span> {escape(s['meta']['audience'])}</p>")
        parts.append(f"<p><span class='k'>Platform.</span> {escape(s['meta']['platform'])}</p>")
        parts.append(f"<p><span class='k'>What to show.</span> {escape(s['meta']['visual'])}</p>")
        parts.append("<h3>Original (first draft)</h3><div class='orig'>")
        for line in s["original"]:
            parts.append(f"<p>{escape(line)}</p>")
        parts.append("</div>")
        parts.append(f"<p><span class='k'>Why that was too thin.</span> {escape(s['why_thin'])}</p>")
        parts.append("<h3>Revision — record this</h3>")
        parts.append(f"<p><span class='k'>Hook.</span> {escape(s['hook'])}</p>")
        parts.append("<h3>Spoken script</h3>")
        for line in s["spoken"]:
            parts.append(f"<p>{escape(line)}</p>")
        parts.append("<h3>On-screen text</h3><ul>")
        for line in s["onscreen"]:
            parts.append(f"<li>{escape(line)}</li>")
        parts.append("</ul>")
        parts.append(f"<h3>Caption</h3><p>{escape(s['caption'])}</p>")
        parts.append(f"<p><span class='k'>First comment.</span> {escape(s['first_comment'])}</p>")
        parts.append(f"<p><span class='k'>Call to action.</span> {escape(s['cta'])}</p>")
        parts.append(f"<p><span class='k'>Do not say.</span> {escape(s['dont'])}</p>")
    parts.append("</main></body></html>")
    out = HERE / HTML_NAME
    out.write_text("".join(parts), encoding="utf-8")
    return out


def copy_to_desktop(path: Path) -> Path:
    DESKTOP.mkdir(parents=True, exist_ok=True)
    dest = DESKTOP / path.name
    shutil.copy2(path, dest)
    return dest


if __name__ == "__main__":
    docx_path = build_docx()
    pptx_path = build_pptx()
    html_path = build_html()
    for p in (docx_path, pptx_path, html_path):
        dest = copy_to_desktop(p)
        print(f"project: {p}")
        print(f"desktop: {dest}")
