"""Build real Word + PowerPoint shot lists (tables, not markdown) and open them."""

from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from pptx import Presentation
from pptx.dml.color import RGBColor as PptRGB
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import nsmap
from pptx.util import Emu, Inches as PInches, Pt as PPt

DESKTOP = Path.home() / "Desktop"
DOCX = DESKTOP / "VettaJimale Tech - Five Video Shot List.docx"
PPTX = DESKTOP / "VettaJimale Tech - Five Video Shot List.pptx"

GREEN = RGBColor(0x1A, 0x3A, 0x32)
INK = RGBColor(0x1C, 0x1C, 0x1C)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
P_GREEN = PptRGB(0x1A, 0x3A, 0x32)
P_CREAM = PptRGB(0xF7, 0xF2, 0xE8)
P_WHITE = PptRGB(0xFF, 0xFF, 0xFF)
P_INK = PptRGB(0x1C, 0x1C, 0x1C)

VIDEOS = [
    {
        "id": "2",
        "title": "How to find it (spelling)",
        "runtime": "15 to 25 seconds",
        "job": "They can find the site tomorrow.",
        "picture": "You, to camera. Search bar spelling. Frozen URL card.",
        "rows": [
            ["0 to 3s", "Face", "If you only remember one thing, remember how to find the site.", "VettaJimale.Tech already on screen"],
            ["3 to 8s", "You plus type", "The person is Vetta Jimale. Two words spoken. One word typed.", "Vetta Jimale becomes VettaJimale.Tech"],
            ["8 to 14s", "Letters appearing", "V-E-T-T-A-J-I-M-A-L-E dot T-E-C-H.", "Do not rush the letters"],
            ["14 to 20s", "Homepage, Resources", "Library, templates, check, free kit, book.", "One word. Dot tech."],
            ["20 to 25s", "Frozen URL card", "Save this. Screenshot the last frame.", "Hold VettaJimale.Tech for 3 seconds"],
        ],
        "comment": "Spelling: VettaJimale.Tech — V-E-T-T-A-J-I-M-A-L-E . T-E-C-H",
        "caption": "How to find it: Vetta Jimale is the person. VettaJimale.Tech is the site. One word, then dot tech. Resources, templates, literacy check, free kit, book. Save this so you are not hunting later.",
        "thumb": "The spelled URL, not your face.",
        "dont": "Do not overlay five other lines. This post has one job: retrieval.",
    },
    {
        "id": "10",
        "title": "Vibe Coding Literacy Check",
        "runtime": "40 to 55 seconds",
        "job": "They take the check the same day, then repair one miss.",
        "picture": "You. Check page. First question and one explanation. Never the whole quiz.",
        "rows": [
            ["0 to 4s", "Face", "The model says done. That is a claim, not a test passing.", "It is a claim. Not a pass."],
            ["4 to 15s", "Check page", "Twenty questions. Reading, safety, verification. Instant feedback. No signup.", "20 questions. Instant feedback. No signup."],
            ["15 to 28s", "One question plus explanation", "Not a credential. Answer how you actually work.", "Reading, safety, verification"],
            ["28 to 42s", "Face, then template or kit", "Keep two items that stung. Repair with a template, Tools, or the kit smoke test.", "A score is not a certificate."],
            ["42 to 55s", "URL card", "Diagnosis, then one repair, then back to the project.", "Hold the literacy-check URL 3 seconds"],
        ],
        "comment": "Direct link: /resources/vibe-coding-literacy-check — then Templates if “done” is your weak spot.",
        "caption": "Take the Vibe Coding Literacy Check on VettaJimale.Tech before you trust the next “it’s done.” Twenty questions, instant feedback, no signup. It is about reading, safety, and verification — not a badge. When you finish, keep the two misses that stung and repair them. Diagnosis, then one repair.",
        "thumb": "20 questions. No signup.",
        "dont": "Do not stitch scores. Do not say certified.",
    },
    {
        "id": "11",
        "title": "Three templates, in order",
        "runtime": "70 to 90 seconds",
        "job": "They fill one form for work already on the desk, export, then prompt.",
        "picture": "You for hook and close. Fill real fields. Show Markdown and PDF downloads.",
        "rows": [
            ["0 to 6s", "Face", "If the first artifact is a chat log, you already handed over the wheel.", "Don’t start in the chat."],
            ["6 to 14s", "Templates page", "Three fillable forms. Same method as the kit and the book.", "Templates"],
            ["14 to 32s", "ROADMAP, two real lines", "Destination, who it is for, next milestone.", "1 ROADMAP — destination"],
            ["32 to 50s", "Project Rules", "The fence: what the tool may touch, must not touch, how you verify.", "2 Project Rules — the fence"],
            ["50 to 70s", "Before You Accept Done", "Name the claim. Click the stranger path. Keep the receipt.", "3 Before You Accept Done"],
            ["70 to 82s", "Downloads", "Repo = Markdown. Hand to a person = PDF. Then prompt.", "Export, then prompt"],
            ["82 to 90s", "URL card", "Mid-incident? Jump to number three.", "Hold /resources/templates 3 seconds"],
        ],
        "comment": "Templates: /resources/templates   Tutorial (sample): /resources/before-you-accept-done   Kit: /free-kit",
        "caption": "Do not start a build in the chat window. On VettaJimale.Tech, open Templates. ROADMAP, Project Rules, Before You Accept Done. Download Markdown or PDF. Then prompt. Mid-incident? Jump to number three.",
        "thumb": "1 Roadmap   2 Rules   3 Don’t accept done",
        "dont": "Do not demo all three forms at novel length. Show the order, fill a few real lines, export, stop.",
    },
    {
        "id": "5",
        "title": "Three live tools (no account)",
        "runtime": "45 to 70 seconds",
        "job": "They pick one tool and finish it in twenty minutes.",
        "picture": "You as the switchboard. Reuse screen from videos 10 and 11. Film Tools and Updates fresh.",
        "rows": [
            ["0 to 5s", "Face", "Three things you can use today. No account. Here is which to pick.", "No account required"],
            ["5 to 22s", "Tools and Updates plus limits", "About to add software? Tools by job. Read the limits.", "1 Tools by job"],
            ["22 to 40s", "Templates (reuse 11)", "About to prompt? The forms are the fence. Chat is not.", "2 Templates"],
            ["40 to 58s", "Literacy check (reuse 10)", "Habits unclear? Twenty questions. No signup.", "3 Literacy check"],
            ["58 to 70s", "URL card", "Pick the one that matches the next hour of work.", "Hold VettaJimale.Tech/resources 3 seconds"],
        ],
        "comment": "Direct paths: /resources/tools-and-updates   /resources/templates   /resources/vibe-coding-literacy-check",
        "caption": "Three things on VettaJimale.Tech you can use today without an account. Tools by job. Fillable templates. Vibe Coding Literacy Check. Pick one. Do it on the project you already have.",
        "thumb": "Three numbered tiles.",
        "dont": "Do not call it a suite or a community. Do not imply the quiz stores a score in an account.",
    },
    {
        "id": "15",
        "title": "The pin (who is this)",
        "runtime": "90 to 120 seconds",
        "job": "A stranger knows the person, the site, the offers, the method, who should leave, and the first action.",
        "picture": "Mostly you. Homepage, Resources, kit versus book, one SAMPLE label, URL for 8 seconds.",
        "rows": [
            ["0 to 8s", "Face", "What you get. What you don’t.", "What you get. What you don’t."],
            ["8 to 20s", "Face", "Vetta Jimale. VJ. Writer, marketer, creator, AI builder.", "Vetta Jimale / VJ"],
            ["20 to 40s", "Resources plus SAMPLE", "Public workbench. Samples labeled. At least one shelf not published yet.", "Workbench, not a course mill"],
            ["40 to 55s", "Kit table", "Free kit is previews from three chapters, not three full chapters.", "Free kit = previews"],
            ["55 to 68s", "Book cover", "I Call BS. Thirteen chapters. Digital PDF. Seventeen dollars. Optional.", "I Call BS · $17 PDF"],
            ["68 to 85s", "Templates flash", "Name it. Try it. Keep it. Then prompt.", "Name. Try. Keep. Prompt."],
            ["85 to 100s", "Face", "Useful pieces, not a daily dopamine feed. Newsletter is not open yet.", "Not daily dopamine"],
            ["100 to 110s", "Face, still", "Not for you if you want secrets or theater.", "No secrets. No theater."],
            ["110 to 120s", "Frozen URL", "Resources, one tool, then follow so they can find the door again.", "Hold VettaJimale.Tech for 8 seconds"],
        ],
        "comment": "Pin companion links: /resources   /free-kit   /products/i-call-bs   Spelling: VettaJimale.Tech",
        "caption": "The deal if you follow VJ. Site: VettaJimale.Tech, a workbench. Free resources and kit. Book is $17 PDF, optional. Method: name the claim, try the path, keep the receipt. Newsletter not open yet. First action: open Resources and do one thing.",
        "thumb": "Your face plus VettaJimale.Tech.",
        "dont": "Do not cut the empty-shelf line. Do not replace this with a 20-second trailer.",
    },
]


def font(run, size=13, bold=False, color=INK, italic=False):
    run.font.name = "Calibri"
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.get_or_add_rFonts()
    rFonts.set(qn("w:eastAsia"), "Calibri")


def p(doc, text, *, size=13, bold=False, color=INK, after=8, before=0, italic=False):
    para = doc.add_paragraph()
    para.paragraph_format.space_after = Pt(after)
    para.paragraph_format.space_before = Pt(before)
    para.paragraph_format.line_spacing = 1.15
    para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    font(para.add_run(text), size=size, bold=bold, color=color, italic=italic)
    return para


def shade(cell, hex_color: str, font_color=None):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = tcPr.find(qn("w:shd"))
    if shd is None:
        from docx.oxml import OxmlElement

        shd = OxmlElement("w:shd")
        tcPr.append(shd)
    shd.set(qn("w:fill"), hex_color)
    shd.set(qn("w:val"), "clear")
    for paragraph in cell.paragraphs:
        for run in paragraph.runs:
            if font_color is not None:
                run.font.color.rgb = font_color


def add_table(doc, headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    table.autofit = True
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ""
        run = cell.paragraphs[0].add_run(h)
        font(run, size=11, bold=True, color=WHITE)
        shade(cell, "1A3A32", WHITE)
    for r, row in enumerate(rows):
        for c, val in enumerate(row):
            cell = table.rows[r + 1].cells[c]
            cell.text = ""
            run = cell.paragraphs[0].add_run(str(val))
            font(run, size=11, color=INK)
            if r % 2 == 1:
                shade(cell, "F7F2E8")
    doc.add_paragraph()
    return table


def labeled(doc, label, body):
    para = doc.add_paragraph()
    para.paragraph_format.space_after = Pt(8)
    a = para.add_run(label + " ")
    font(a, size=13, bold=True, color=GREEN)
    b = para.add_run(body)
    font(b, size=13, color=INK)


def build_docx() -> Path:
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Inches(0.8)
    sec.bottom_margin = Inches(0.8)
    sec.left_margin = Inches(0.85)
    sec.right_margin = Inches(0.85)

    p(doc, "VettaJimale.Tech", size=14, bold=True, color=GREEN, after=2)
    p(doc, "Five-video shot list", size=26, bold=True, color=GREEN, after=6)
    p(
        doc,
        "This is a Word document for filming. It is not a code file. Open it in Microsoft Word. Full spoken scripts are in the other Word file on your Desktop: VettaJimale-Tech-Social-Scripts-READABLE.docx",
        size=13,
        italic=True,
        after=14,
    )

    p(doc, "1. Before you press record", size=18, bold=True, color=GREEN, before=8)
    p(doc, "Profile", size=14, bold=True, color=GREEN)
    for item in [
        "Bio: I test the claim, then I keep what works. VettaJimale.Tech",
        "Name: Vetta Jimale (VJ)",
        "Link: Resources page. Second link, if allowed: free kit.",
        "Do not send people to a newsletter. Stay curious is not open yet.",
    ]:
        doc.add_paragraph(item, style="List Bullet")
    p(doc, "On-screen type", size=14, bold=True, color=GREEN, before=8)
    for item in [
        "Heavy sans font. Cream on dark green, or dark green on cream.",
        "URL large enough to screenshot on a phone.",
        "Hold every URL card 3 seconds. On the pin, hold 8 seconds.",
        "Same shirt, same light, same seat for all five talking-head takes.",
    ]:
        doc.add_paragraph(item, style="List Bullet")

    p(doc, "2. Film in this order (one afternoon)", size=18, bold=True, color=GREEN, before=16)
    p(doc, "Do not record in posting order. Film B-roll first, then shortest talk to longest.", size=13)
    add_table(
        doc,
        ["Order", "What", "Time", "Why"],
        [
            ["A", "Silent B-roll", "20 minutes", "You will cut this into later videos"],
            ["B", "Video 2 — spelling", "15 to 25 seconds", "Fast. Last frame is reused"],
            ["C", "Video 10 — literacy check", "40 to 55 seconds", "Screen is already open"],
            ["D", "Video 11 — templates", "70 to 90 seconds", "Longest how-to"],
            ["E", "Video 5 — three tools", "45 to 70 seconds", "Reuses 10 and 11"],
            ["F", "Video 15 — the pin", "90 to 120 seconds", "Last, when you sound like a person"],
        ],
    )

    p(doc, "3. Silent B-roll (capture once)", size=18, bold=True, color=GREEN, before=8)
    p(doc, "Hold each shot 4 to 6 seconds. No talking. Slow mouse. If Creative Tools is empty, do not fake a full shelf.", size=13)
    broll = [
        "Homepage hero: Tech is moving. Let’s make sense of it.",
        "Type VettaJimale.Tech letter by letter",
        "Click Explore Resources",
        "Slow scroll of Resources. Pause on SAMPLE labels",
        "Literacy check: first question only",
        "One answer and the explanation (not a score)",
        "Templates: ROADMAP, Project Rules, Before You Accept Done",
        "Fill two real ROADMAP lines",
        "Download Markdown, then PDF",
        "Tools and Updates: one job row, limitations, official reference",
        "Kit versus book table. Pause on previews from 3 chapters",
        "Book cover and $17. Kit cover and Free",
        "End card: VettaJimale.Tech on dark green, nothing else",
    ]
    for i, item in enumerate(broll, 1):
        doc.add_paragraph(f"{i}. {item}", style="List Number")

    p(doc, "4. When to post (three weeks)", size=18, bold=True, color=GREEN, before=16)
    p(doc, "Start the Monday after you film. The dates below assume Monday 13 October 2026. Shift the whole grid if you film later.", size=13)
    add_table(
        doc,
        ["When", "Video", "Where", "Pin?"],
        [
            ["Week 1 Monday", "2 Spelling", "Reels, TikTok, Shorts, plus a Story of the last frame", "No"],
            ["Week 1 Thursday", "10 Literacy check", "Reels, TikTok, LinkedIn native video", "No"],
            ["Week 2 Monday", "11 Templates", "Reels, TikTok (the saveable one)", "No"],
            ["Week 2 Thursday", "5 Three live tools", "Reels, plus a 3-tile Instagram carousel", "No"],
            ["Week 3 Monday", "15 The pin", "All profiles, then pin it", "Yes"],
        ],
    )
    p(doc, "Whenever another video says the name out loud, append the last 3 seconds of video 2.", size=13)

    for v in VIDEOS:
        doc.add_page_break()
        p(doc, f"Video {v['id']}", size=14, bold=True, color=GREEN, after=2)
        p(doc, v["title"], size=22, bold=True, color=GREEN, after=8)
        labeled(doc, "Runtime.", v["runtime"])
        labeled(doc, "Job.", v["job"])
        labeled(doc, "What to show.", v["picture"])
        p(doc, "Run of show", size=16, bold=True, color=GREEN, before=10)
        add_table(doc, ["Time", "Picture", "You say", "On screen"], v["rows"])
        labeled(doc, "First comment (paste this).", v["comment"])
        labeled(doc, "Caption (paste this).", v["caption"])
        labeled(doc, "Thumbnail.", v["thumb"])
        labeled(doc, "Do not.", v["dont"])

    p(doc, "Edit checklist", size=18, bold=True, color=GREEN, before=12)
    for item in [
        "Watch once with sound off. If you cannot tell the job from the on-screen words, fix the words. Do not add more talk.",
        "Watch once with sound on. If the URL is not held long enough to screenshot, it failed.",
        "Click every first-comment path in a private window before you boost the post.",
    ]:
        doc.add_paragraph(item, style="List Bullet")

    doc.save(DOCX)
    return DOCX


def ppt_bg(slide, color):
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = color


def ppt_text(slide, l, t, w, h, lines, *, size=20, bold=False, color=P_INK):
    box = slide.shapes.add_textbox(PInches(l), PInches(t), PInches(w), PInches(h))
    tf = box.text_frame
    tf.word_wrap = True
    first = True
    for line in lines:
        para = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        para.text = line
        para.font.name = "Calibri"
        para.font.size = PPt(size)
        para.font.bold = bold
        para.font.color.rgb = color
        para.space_after = PPt(8)


def ppt_table(slide, headers, rows, top=1.35):
    data = [headers] + rows
    n_rows = len(data)
    n_cols = len(headers)
    height = min(0.42 * n_rows, 5.6)
    shape = slide.shapes.add_table(n_rows, n_cols, PInches(0.4), PInches(top), PInches(12.5), PInches(height))
    table = shape.table
    widths = [1.3, 2.4, 4.8, 4.0] if n_cols == 4 else [3.1] * n_cols
    if n_cols == 4:
        for i, w in enumerate(widths):
            table.columns[i].width = PInches(w)
    for r, row in enumerate(data):
        for c, val in enumerate(row):
            cell = table.cell(r, c)
            cell.text = str(val)
            for para in cell.text_frame.paragraphs:
                para.font.size = PPt(11 if r else 12)
                para.font.bold = r == 0
                para.font.name = "Calibri"
                para.font.color.rgb = P_WHITE if r == 0 else P_INK
            fill = cell.fill
            fill.solid()
            fill.fore_color.rgb = P_GREEN if r == 0 else (P_CREAM if r % 2 else P_WHITE)


def build_pptx() -> Path:
    prs = Presentation()
    prs.slide_width = Emu(12192000)
    prs.slide_height = Emu(6858000)
    blank = prs.slide_layouts[6]

    s = prs.slides.add_slide(blank)
    ppt_bg(s, P_GREEN)
    ppt_text(s, 0.7, 1.8, 12, 0.5, ["VettaJimale.Tech"], size=18, bold=True, color=P_CREAM)
    ppt_text(s, 0.7, 2.4, 12, 1.6, ["Five-video shot list"], size=40, bold=True, color=P_WHITE)
    ppt_text(s, 0.7, 4.4, 12, 1.6, ["Open this file in Microsoft PowerPoint.", "Film 2, 10, 11, 5, then 15. Post over three weeks."], size=20, color=P_CREAM)

    s = prs.slides.add_slide(blank)
    ppt_bg(s, P_CREAM)
    ppt_text(s, 0.4, 0.25, 12, 0.5, ["Film in this order"], size=26, bold=True, color=P_GREEN)
    ppt_table(
        s,
        ["Order", "What", "Time", "Why"],
        [
            ["A", "Silent B-roll", "20 min", "Cut into later videos"],
            ["B", "2 Spelling", "15–25s", "Last frame reused"],
            ["C", "10 Literacy check", "40–55s", "Screen already open"],
            ["D", "11 Templates", "70–90s", "Longest how-to"],
            ["E", "5 Three tools", "45–70s", "Reuses 10 and 11"],
            ["F", "15 The pin", "90–120s", "Last talking-head"],
        ],
    )

    s = prs.slides.add_slide(blank)
    ppt_bg(s, P_CREAM)
    ppt_text(s, 0.4, 0.25, 12, 0.5, ["Post over three weeks"], size=26, bold=True, color=P_GREEN)
    ppt_table(
        s,
        ["When", "Video", "Where", "Pin?"],
        [
            ["Week 1 Monday", "2 Spelling", "Reels / TikTok / Shorts + Story", "No"],
            ["Week 1 Thursday", "10 Literacy check", "Reels / TikTok / LinkedIn", "No"],
            ["Week 2 Monday", "11 Templates", "Reels / TikTok", "No"],
            ["Week 2 Thursday", "5 Three tools", "Reels + carousel", "No"],
            ["Week 3 Monday", "15 The pin", "All profiles", "Yes"],
        ],
    )

    s = prs.slides.add_slide(blank)
    ppt_bg(s, P_CREAM)
    ppt_text(s, 0.5, 0.3, 12, 0.5, ["Silent B-roll — 4 to 6 seconds each"], size=26, bold=True, color=P_GREEN)
    ppt_text(
        s,
        0.5,
        1.1,
        12,
        5.8,
        [
            "1 Homepage hero    2 Type the URL    3 Explore Resources",
            "4 Resources scroll (pause on SAMPLE)    5 First quiz question",
            "6 One explanation    7 Templates page    8 Two real ROADMAP lines",
            "9 Markdown then PDF    10 Tools row + limits",
            "11 Kit vs book table    12 Covers    13 End card URL",
            "Do not film a fake full Creative Tools shelf.",
        ],
        size=18,
        color=P_INK,
    )

    for v in VIDEOS:
        s = prs.slides.add_slide(blank)
        ppt_bg(s, P_GREEN)
        ppt_text(s, 0.7, 2.0, 12, 0.4, [f"Video {v['id']}"], size=18, bold=True, color=P_CREAM)
        ppt_text(s, 0.7, 2.5, 12, 1.6, [v["title"]], size=32, bold=True, color=P_WHITE)
        ppt_text(s, 0.7, 4.5, 12, 1.6, [v["runtime"], v["job"]], size=18, color=P_CREAM)

        s = prs.slides.add_slide(blank)
        ppt_bg(s, P_CREAM)
        ppt_text(s, 0.4, 0.18, 12, 0.4, [f"Video {v['id']} — run of show"], size=22, bold=True, color=P_GREEN)
        ppt_table(s, ["Time", "Picture", "You say", "On screen"], v["rows"], top=0.7)

        s = prs.slides.add_slide(blank)
        ppt_bg(s, P_CREAM)
        ppt_text(s, 0.5, 0.25, 12, 0.4, [f"Video {v['id']} — paste this"], size=22, bold=True, color=P_GREEN)
        ppt_text(
            s,
            0.5,
            0.9,
            12.3,
            6.0,
            [
                "First comment:",
                v["comment"],
                "",
                "Caption:",
                v["caption"],
                "",
                "Thumbnail: " + v["thumb"],
                "Do not: " + v["dont"],
            ],
            size=16,
            color=P_INK,
        )

    prs.save(PPTX)
    return PPTX


if __name__ == "__main__":
    print(build_docx())
    print(build_pptx())
