"""Generate the VettaJimale.Tech social scripts Word document."""

from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.shared import Inches, Pt, RGBColor


OUT = Path(__file__).with_name("VettaJimale-Tech-Social-Scripts.docx")
GREEN = RGBColor(0x1A, 0x3A, 0x32)
INK = RGBColor(0x1C, 0x1C, 0x1C)
MUTED = RGBColor(0x4A, 0x4A, 0x4A)
RULE = RGBColor(0xC5, 0xC0, 0xB3)


def set_run(run, *, size=11, bold=False, italic=False, color=INK, name="Calibri"):
    run.font.name = name
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color
    r = run._element
    rPr = r.get_or_add_rPr()
    rFonts = rPr.get_or_add_rFonts()
    rFonts.set(qn("w:eastAsia"), name)


def add_horizontal_line(paragraph):
    p = paragraph._p
    pPr = p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "12")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "1A3A32")
    pBdr.append(bottom)
    pPr.append(pBdr)


def heading(doc, text, level=1):
    p = doc.add_heading(text, level=level)
    for run in p.runs:
        run.font.color.rgb = GREEN
        run.font.name = "Calibri"
    return p


def para(doc, text, *, size=11, bold=False, italic=False, color=INK, space_after=8, space_before=0):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    set_run(run, size=size, bold=bold, italic=italic, color=color)
    return p


def labeled(doc, label, body, *, italic_body=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.15
    a = p.add_run(label + " ")
    set_run(a, size=11, bold=True, color=GREEN)
    b = p.add_run(body)
    set_run(b, size=11, italic=italic_body, color=INK)
    return p


def bullets(doc, items):
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        p.clear()
        run = p.add_run(item)
        set_run(run, size=11)
        p.paragraph_format.space_after = Pt(4)


def quote_block(doc, title, lines):
    heading(doc, title, 3)
    for line in lines:
        para(doc, line, italic=True, size=11, space_after=6)


SCRIPTS = [
    {
        "n": 1,
        "title": "What it is (name + door)",
        "job": "Tell a stranger, in one sitting, who this is for, what the site is, and the exact URL.",
        "original": [
            "If you search “AI tips” you get a thousand people shouting.",
            "VettaJimale.Tech is VJ’s place for the opposite: test the claim, keep what actually works.",
            "Writer. Marketer. Creator. Hands-on AI builder.",
            "Type VettaJimale.Tech. Start at Resources.",
        ],
        "why_thin": "The original names the contrast but never proves it. A stranger still does not know whether this is a blog, a shop, a course, or a personal brand. There is no first action besides “type the URL,” and no picture of what happens after they arrive.",
        "meta": {
            "audience": "People drowning in AI advice who have never heard the name Vetta Jimale.",
            "platform": "Reel / TikTok / Shorts, 35–50 seconds. Also usable as a pinned “who is this” video.",
            "visual": "Talking head, then cut to the homepage hero (“Tech is moving. Let’s make sense of it.”), then Resources. End on the URL as a full-screen card. Spell the name on screen the whole time — VettaJimale is easy to mis-hear.",
        },
        "hook": "Most AI pages want your email before they have earned a minute of your time. This one is built the other way around.",
        "spoken": [
            "If you search AI tips, you get a thousand people shouting the same five tools at you.",
            "VettaJimale.Tech is the opposite of that feed. It is Vetta Jimale’s working site — VJ — a writer, marketer, creator, and hands-on AI builder. The job of the site is simple: make sense of technology that is moving too fast, then hand you something you can use on a real project.",
            "You will not find a membership wall on the front door. You will find Resources: essays, a short literacy check, fillable templates, and a tools shelf organized by the job, not by the hype cycle. You will also find a free starter kit for building with Claude Code and Cursor, and a full book — I Call BS: AI Vibe Coding Myths Dispelled — if you want the complete how. The kit stays free either way.",
            "Here is the door. Type VettaJimale.Tech. One word, then dot tech. Open Explore Resources. Pick one thing. Do it on the project you already have, not on a fantasy app you will start “someday.”",
            "That is what this place is. Not a guru funnel. A public workbench.",
        ],
        "onscreen": [
            "0–3s: “Not another AI tips page”",
            "3–12s: “VettaJimale.Tech” + “VJ — writer, marketer, creator, AI builder”",
            "12–28s: three tiles — Resources / Free kit / Book",
            "28–end: URL card — VettaJimale.Tech → Explore Resources",
        ],
        "caption": "VettaJimale.Tech is VJ’s working site for people who are tired of AI advice that never gets checked. Writer, marketer, creator, hands-on builder. Resources you can use without buying. A free kit if you are starting with Claude Code and Cursor. A $17 book if you want the full argument. Type the name. Start at Resources.",
        "first_comment": "URL: https://vettaJimale.tech  — start at Resources. Free kit is a separate door if you want the PDF.",
        "cta": "Type VettaJimale.Tech. Tap Explore Resources. Do one thing today.",
        "dont": "Do not call it a community, a newsletter, or a course. The Stay curious list is not open yet. Do not promise daily posts.",
    },
    {
        "n": 2,
        "title": "How to find it (spelling and search)",
        "job": "Make the name unforgettable and searchable so a spoken video actually converts.",
        "original": [
            "The name is Vetta Jimale. One word on the web: VettaJimale.Tech.",
            "Not a course mill. A working site: articles, tools, templates, a free kit, and a book when you want the full how.",
            "Save this. Search it once. Bookmark it.",
        ],
        "why_thin": "Spelling is the right insight, but the original is a mnemonic without a reason to save it. People remember names when they attach them to a job (“the site where you check ‘done’”) and a visual spelling, not when they are told to bookmark.",
        "meta": {
            "audience": "Anyone who heard the name in a video, a conversation, or a live and will lose it in an hour.",
            "platform": "15–25s Reel plus a Story with a link sticker. Repeat this as a B-roll bumper on longer videos.",
            "visual": "Full-screen kinetic type: VETTA / JIMALE / .TECH. Show a search bar being typed. Show the homepage loading. Hold the last frame for three seconds so people can screenshot it.",
        },
        "hook": "If you only remember one thing from this video, remember how to find the site.",
        "spoken": [
            "The person is Vetta Jimale. Two words when you say it. One word when you type it.",
            "V-E-T-T-A-J-I-M-A-L-E dot T-E-C-H. VettaJimale.Tech.",
            "If you Google “vibe coding myths” or “before you accept done,” you should land in the same place. If a search goes sideways, type the name. Do not hunt for a handle and hope.",
            "What you are looking for is not a course mill and not a link-in-bio dump. It is a working site: a resource library, fillable templates, a literacy check, a free starter kit, and a book if you want the complete how.",
            "Save this video. Screenshot the last frame. Search it once. Bookmark it. The next time an AI tells you something is done, you will know where to go.",
        ],
        "onscreen": [
            "Hold “VettaJimale.Tech” for the full runtime.",
            "Second line: “One word. Dot tech.”",
            "Last three seconds: frozen URL card, high contrast, no music swell that drowns the type.",
        ],
        "caption": "How to find it: Vetta Jimale is the person. VettaJimale.Tech is the site. One word, then dot tech. Resources, templates, literacy check, free kit, book. Save this so you are not hunting later.",
        "first_comment": "Spelling: VettaJimale.Tech — V-E-T-T-A-J-I-M-A-L-E . T-E-C-H",
        "cta": "Screenshot the last frame. Open the URL once so it sits in your history.",
        "dont": "Do not rush the spelling. Do not overlay too many other words. This post has one job: retrieval.",
    },
    {
        "n": 3,
        "title": "What it is, in one line — with proof",
        "job": "Turn the site’s headline into a complete argument, not a quote card with no body.",
        "original": [
            "Tech is moving. Let’s make sense of it.",
            "That’s the site. Practical notes from someone who actually builds with the tools.",
            "VettaJimale.Tech",
        ],
        "why_thin": "A slogan without evidence is wallpaper. The line is strong; it needs the three proofs the homepage already offers (explore, test, keep receipts) and a next step.",
        "meta": {
            "audience": "Scrollers who will give a static post four seconds, or a carousel twenty.",
            "platform": "Carousel (preferred) or a quote card with a long caption. LinkedIn-friendly.",
            "visual": "Slide 1 is the headline on the dark green field. Slides 2–4 are the three proofs. Slide 5 is the URL and the first action.",
        },
        "hook": "“Tech is moving. Let’s make sense of it.” That is not a mood. It is the editorial rule.",
        "spoken": [
            "The homepage opens with one sentence: Tech is moving. Let’s make sense of it.",
            "Making sense, on this site, has a method. First, name what the tool actually does — not what the landing page promised. Second, try the path yourself. Third, keep what you saw, including the part that failed.",
            "That is why the library is split the way it is. Ideas: AI and technology, where claims fall apart. Practice: writing, design, and the workflows around them. Work: receipts from real projects — wins, dead ends, and what changed.",
            "If you only remember the line, you will forget the site. If you remember the method, you will come back when the next demo tries to sell you certainty.",
            "VettaJimale.Tech. Read the headline. Then open Resources and use the method on the thing you are building this week.",
        ],
        "onscreen": [
            "Slide 1: “Tech is moving. Let’s make sense of it.”",
            "Slide 2: “Name what the tool actually does.”",
            "Slide 3: “Try the path yourself.”",
            "Slide 4: “Keep the receipt — including the failure.”",
            "Slide 5: VettaJimale.Tech → Resources",
        ],
        "caption": "The headline on VettaJimale.Tech is the whole point of the site: technology is moving; VJ’s job is to make sense of it in public. Not theory. A method — name the claim, try the path, keep what you saw. Resources is the door.",
        "first_comment": "Method in four words: name it, try it, keep it, then prompt again.",
        "cta": "Open the homepage. Read the hero. Go to Resources with one current project in mind.",
        "dont": "Do not treat this as brand poetry. If you post only the quote with no method, you are back to flimsy.",
    },
    {
        "n": 4,
        "title": "What you’ll find — the map of the library",
        "job": "Give a complete tour of the three lanes so a first-time visitor is not lost, and be honest about what is thin.",
        "original": [
            "VettaJimale.Tech is a library, not a dump of hot takes.",
            "Ideas — AI and technology: what the tools do, where the claims fall apart.",
            "Practice — creative tools and workflows.",
            "Work — building in public: wins, dead ends, what changed.",
            "Open Resources. Pick one lane.",
        ],
        "why_thin": "A map with empty rooms is misleading. Creative Tools is not ready. Building in Public is started but thin. Honesty is the brand. The revision keeps the map and tells people exactly what is live so they do not bounce and decide the whole site is vapor.",
        "meta": {
            "audience": "First-time visitors who need orientation, and returning visitors who missed a shelf.",
            "platform": "Carousel, 6 slides. Can be a 45–60s walkthrough with screen recording.",
            "visual": "Screen record Resources. Zoom each lane. Label SAMPLE where the site labels sample. Do not fake a full Creative Tools archive.",
        },
        "hook": "If a resource site does not tell you what is actually published, it is performing abundance. This one will not.",
        "spoken": [
            "VettaJimale.Tech is a library. It is organized on purpose, because a pile of posts is how people hide that they have nothing specific to say.",
            "Three lanes. Ideas: AI and Technology — what the tools actually do, and where the claims fall apart. That shelf already has a real essay, AI is not smarter than you, and the vibe coding literacy check.",
            "Practice: Creative Tools — writing, design, and the workflows around them. I will say this cleanly: that shelf is not ready yet. No posts are published there. When they are, they will be labeled like everything else. I will not pretend a calendar is a body of work.",
            "Work: Building in Public — receipts from real projects. Wins, dead ends, and what changed. What is live today includes a sample tutorial, Before You Accept Done, plus the free starter kit and the templates and tools that came out of the same builds.",
            "Samples are labeled. That is not a disclaimer in six-point type. It is the point. You should always know whether you are looking at a finished piece or a starter.",
            "How to use the map: open Resources, pick the lane that matches the problem you have today, and ignore the other two until you need them. Do not binge the site. Use it.",
        ],
        "onscreen": [
            "Slide 1: “A library, not a dump”",
            "Slide 2: Ideas — live: essay + literacy check",
            "Slide 3: Practice — Creative Tools: not published yet",
            "Slide 4: Work — sample tutorial + kit + templates",
            "Slide 5: “Samples are labeled. On purpose.”",
            "Slide 6: Resources → pick one lane",
        ],
        "caption": "What you will find on VettaJimale.Tech, said without inflation. Ideas (AI & Technology) is live. Creative Tools is not published yet. Building in Public has a sample tutorial, the free kit, templates, and tools from real work. Samples are labeled. Open Resources. Pick one lane. Ignore the rest until you need it.",
        "first_comment": "I would rather tell you a shelf is empty than fill it with filler. That is the standard for the whole site.",
        "cta": "Go to /resources. Choose Ideas, Practice, or Work. If Practice is empty, that is the honest answer — use Ideas or Work today.",
        "dont": "Do not show stock “coming soon” energy. Do not imply a weekly show. Do not hide the sample labels.",
    },
    {
        "n": 5,
        "title": "What you’ll find — the useful shelf (three live tools)",
        "job": "Sell the three no-account tools with enough instruction that someone could finish one in a sitting.",
        "original": [
            "Three things you can use today, no account required.",
            "One: Tools by job — start with the work, then the tool.",
            "Two: Fillable templates — roadmap, project rules, before you accept “done.” Download Markdown or PDF.",
            "Three: the vibe coding literacy check — a short quiz on claims, checks, and when to trust a “done” answer.",
            "All on VettaJimale.Tech → Resources.",
        ],
        "why_thin": "A list of product names is a menu. People need why each exists, when to choose it, and what “done using it” looks like. The original also skipped that the literacy check is twenty questions with instant feedback.",
        "meta": {
            "audience": "Builders who will try one interactive thing if you remove friction.",
            "platform": "45–70s Reel with screen capture. Also a three-card carousel.",
            "visual": "Split: face for the why, screen for the where. Show the quiz submitting. Show a template downloading. Show a tool row with limitations visible — the limitations are the brand.",
        },
        "hook": "You can use three of the best things on this site without creating an account. Here is which one to pick.",
        "spoken": [
            "If you only have twenty minutes, do not wander. VettaJimale.Tech has three working tools on the Resources shelf, and they do different jobs.",
            "If you are about to add software to a project, open Tools and Updates. It is organized by the job — newsletter, forms, checkout — not by whoever is trending. You will see what I use, what I researched, and the limits. Read the limits. That is the useful part.",
            "If you are about to prompt, stop and open Templates. There are three fillable forms: ROADMAP, Project Rules, and Before You Accept Done. Fill them in the browser. Download Markdown if you want them in the repo. Download PDF if you want them in your hands. Then prompt. The form is the fence. The chat is not.",
            "If you are not sure whether you even have the right habits yet, take the Vibe Coding Literacy Check. Twenty questions. Instant feedback. No signup. It covers reading, safety, and verification — including when not to trust a model that says “done.”",
            "All three live under Resources. Tools. Templates. Literacy check. Pick the one that matches the next hour of your work, not the one that looks nicest in a screenshot.",
        ],
        "onscreen": [
            "“No account required”",
            "1 Tools by job — when you are adding software",
            "2 Templates — when you are about to prompt",
            "3 Literacy check — 20 questions, instant feedback",
            "URL: VettaJimale.Tech/resources",
        ],
        "caption": "Three things on VettaJimale.Tech you can use today without an account. Tools by job: start with the work, then the tool, and read the limits. Fillable templates: ROADMAP, Project Rules, Before You Accept Done — Markdown or PDF. Vibe Coding Literacy Check: twenty questions, instant feedback, no signup. Pick one. Do it on the project you already have.",
        "first_comment": "Direct paths: /resources/tools-and-updates  /resources/templates  /resources/vibe-coding-literacy-check",
        "cta": "Choose one of the three. Set a twenty-minute timer. Finish it.",
        "dont": "Do not say “free community tools” or “suite.” Do not imply the quiz stores a score in an account. It does not require signup.",
    },
    {
        "n": 6,
        "title": "What you’ll find — free kit versus complete book",
        "job": "Explain the two products with exact contents, price, and the rule that the kit stays free.",
        "original": [
            "If you want the starter: free kit. Chapter previews, copy-and-paste prompts, a pocket glossary.",
            "If you want the how: I Call BS: AI Vibe Coding Myths Dispelled. Thirteen chapters. Digital PDF. $17.",
            "Same project. Different depth. Compare them on the site before you buy.",
        ],
        "why_thin": "The comparison is right but under-specified. The kit is not three full chapters; it is previews from three. The book is a digital PDF, not a print run. Buyers bounce when they feel bait-and-switched. This post should over-specify on purpose.",
        "meta": {
            "audience": "People who will pay $17 if they trust the contents, and people who should take the free kit and not be upsold in the first breath.",
            "platform": "Carousel comparison, or a 50s talking-head with the comparison table on screen.",
            "visual": "Use the site’s own comparison: kit vs complete book. Show covers. Show the line “The PDF is free. The book is optional.”",
        },
        "hook": "There are only two things for sale energy on this site, and one of them is not for sale.",
        "spoken": [
            "On VettaJimale.Tech, the catalog is small on purpose. The book and the free kit. Nothing else is for sale. More later, when it is real.",
            "The free starter kit is a useful kit, not a teaser dressed up as a gift. Inside: previews from three chapters — not three complete chapters. Six copy-and-paste prompts. Three checklist resources. A pocket glossary in plain language. Three lessons from actual builds. Clickable contents so you can jump.",
            "You sign up, the next page has the download, and the email has the same link. You do not need to buy the book. If the file does not open, use the thank-you page button or write through Contact.",
            "The complete book is I Call BS: AI Vibe Coding Myths Dispelled. A practical guide for building real apps with Claude Code and Cursor. Thirteen complete chapters, fifteen prompts, ten selected lessons, expanded reference. Digital PDF. Seventeen dollars. One author. One stack.",
            "Same project. Different depth. The site puts them next to each other so you can compare before you pay. Start free if you are still sniffing it out. Buy the book when you want the how, not because a timer is running.",
        ],
        "onscreen": [
            "“Only two offers. One is free.”",
            "Kit: 3 chapter previews · 6 prompts · checklists · glossary · $0",
            "Book: 13 chapters · 15 prompts · 10 lessons · $17 PDF",
            "“The kit stays free either way.”",
        ],
        "caption": "VettaJimale.Tech sells one thing: I Call BS, $17 digital PDF, 13 chapters. The free starter kit is separate and stays free — previews from 3 chapters (not 3 full chapters), 6 prompts, checklists, pocket glossary, 3 lessons. Compare them on the site. Do not buy to “unlock” the kit. It is already yours if you want it.",
        "first_comment": "Free kit: /free-kit   Book: /products/i-call-bs   The comparison table is on both pages.",
        "cta": "If you have not touched the work yet, take the kit. If you already know you want the full method, buy the book. Do not do both in a panic.",
        "dont": "Do not say “three free chapters.” Do not say paperback unless it exists. Do not invent a discount window.",
    },
    {
        "n": 7,
        "title": "What you’ll find — the essay as a door, not a teaser",
        "job": "Use the published essay to demonstrate tone, then send people to act, not only to read.",
        "original": [
            "One piece to start with: AI is not smarter than you.",
            "The gap is experience, not intelligence.",
            "That’s the tone of the whole site. Read it, then use a template on your own project.",
        ],
        "why_thin": "It cites the thesis and then shrugs. A complete post teaches one idea from the essay, shows how it changes behavior, and names the next artifact (template or check) so reading is not the end of the loop.",
        "meta": {
            "audience": "People who still think the problem with AI is that they are “not technical enough.”",
            "platform": "60–90s talking-head. LinkedIn text post variant included in the caption.",
            "visual": "Open on the essay title in the library. Close on Templates or the literacy check — reading then doing.",
        },
        "hook": "The most expensive AI mistake I see is not picking the wrong model. It is treating the model like it is smarter than you.",
        "spoken": [
            "There is a published essay on VettaJimale.Tech called AI is not smarter than you. The subtitle is the whole argument: the gap is experience, not intelligence.",
            "That sentence is how the site thinks. A model can sound certain while being wrong about your file, your user, your payment flow, your actual button. Certainty is not competence. Fluency is not a test passing.",
            "If you believe the machine is smarter than you, you will accept “done” because it was confident. If you believe the gap is experience, you will go look. You will click the path a stranger would click. You will keep a receipt of what you saw.",
            "So do not only read the essay and nod. Read it, then open Before You Accept Done — it is a sample tutorial, and it is labeled that way — or fill the template with the same name. Write the claim in a sentence a skeptic could check. Then try it. Then keep what you saw, especially if it failed.",
            "That loop is the site. Essay for the stance. Template for the habit. Kit and book when you want more of the how. Start with the essay if you need the language. Start with the template if you already have a mess in production.",
        ],
        "onscreen": [
            "Title card: “AI is not smarter than you”",
            "“The gap is experience, not intelligence.”",
            "Then: Name the claim → Click it yourself → Keep the receipt",
            "End: essay URL + “then open the template”",
        ],
        "caption": "Start here: AI is not smarter than you, on VettaJimale.Tech. The gap is experience, not intelligence. Read it for the stance. Then do not stop at reading — open the Before You Accept Done tutorial (it is labeled sample) or the fillable template. Write the claim. Click the path. Keep the receipt. That is the whole method of the site, in one sitting.",
        "first_comment": "Essay: /blog/ai-is-not-smarter-than-you-iecg  Tutorial: /resources/before-you-accept-done  Template: /resources/templates",
        "cta": "Read the essay once. Fill one Before You Accept Done form on a live task before the day ends.",
        "dont": "Do not summarize the essay as “AI is dumb.” That is not the claim. The claim is about experience and verification.",
    },
    {
        "n": 8,
        "title": "What you’ll find — receipts, including dead ends",
        "job": "Define “building in public” as evidence, and set expectations so people do not come for a highlight reel.",
        "original": [
            "I don’t post “10 tools that will change your life.”",
            "I post what I tried, what failed, and what I would repeat.",
            "If you want receipts from real builds, that’s the Building in Public lane.",
            "VettaJimale.Tech / resources",
        ],
        "why_thin": "Anti-listicle energy is cheap on social. Completeness means defining a receipt, giving an example from the actual site (this site, this kit, this stack), and telling people what is not there yet so “building in public” is not a slogan covering an empty log.",
        "meta": {
            "audience": "Builders who have been burned by gurus who never show the broken localhost.",
            "platform": "40–60s talking-head. Optional B-roll of the actual studio, the comparison table, a failed overlay — only real artifacts.",
            "visual": "Show the Building in Public page as it is, including the sample label. Show Templates and Tools as the durable receipts if the log is still short.",
        },
        "hook": "A receipt is not a vibe. A receipt is something you could hand a skeptic.",
        "spoken": [
            "I do not post “ten tools that will change your life.” That format is how you avoid saying what you actually shipped.",
            "On VettaJimale.Tech, Building in Public means receipts from real projects: wins, dead ends, and what changed. A receipt looks like this. I used Claude Code and Cursor to build a working site — this one — with a free kit, a paid book, templates you can fill, a tools shelf with limitations written down, and a literacy check. Some of that is polished. Some of it is labeled sample. Some shelves are empty on purpose.",
            "The free kit itself is a receipt. I built, tested, made mistakes, and then wrote a practical place to start. The comparison table is a receipt: it will not pretend the kit contains thirteen chapters.",
            "What is not here: a fake six-month streak of daily build vlogs, and a Creative Tools archive I have not published. If you follow for a highlight reel, you will be bored. If you follow to watch someone keep the notes so the next attempt starts clearer, you are in the right place.",
            "Open the Work lane. Read Before You Accept Done. Steal the habit even if you never buy the book.",
        ],
        "onscreen": [
            "“A receipt is something a skeptic could check.”",
            "This site · the kit · the book · the templates · the check",
            "“Samples labeled. Empty shelves admitted.”",
            "Building in Public → Resources",
        ],
        "caption": "Building in public on VettaJimale.Tech is not a content pillar. It is a standard: wins, dead ends, and what changed, from real projects. The site you are looking at is one of the receipts. So is the free kit, the $17 book, the fillable templates, and the literacy check. Samples are labeled. Empty shelves are admitted. If you want a highlight reel, this will feel slow. If you want notes you can reuse, start in the Work lane.",
        "first_comment": "Work lane: /resources/building-in-public",
        "cta": "Open Building in Public. Read one labeled sample. Write down what you would keep for your own log.",
        "dont": "Do not invent a failure story that did not happen. Do not show other people’s dashboards. Do not promise a daily vlog.",
    },
    {
        "n": 9,
        "title": "How to use it — first visit, start to finish",
        "job": "A complete onboarding script: arrival, choice, action, stop rule.",
        "original": [
            "Go to VettaJimale.Tech.",
            "Skip the noise. Hit Explore Resources.",
            "Pick one: literacy check, templates, or tools by job.",
            "Do the thing on your project, not as a spectator.",
            "Come back when you have a new claim to test.",
        ],
        "why_thin": "The steps are correct and still too skeletal. A first visit needs time estimates, a stop rule (do not binge), what to ignore (newsletter if it is closed, empty shelves), and what “done with the first visit” means.",
        "meta": {
            "audience": "Someone who clicked from social and will bounce if the homepage feels like a magazine.",
            "platform": "Screen-record tutorial, 60–90s, voiceover. Save as “Start here.”",
            "visual": "Real walkthrough: homepage → Explore Resources → one tool → back to their project. No stock cursor demos.",
        },
        "hook": "Your first visit to VettaJimale.Tech should take twenty minutes, not an afternoon. Here is the exact path.",
        "spoken": [
            "Step one. Go to VettaJimale.Tech. You will see the headline, a short statement from me, and doors into Resources, the book, and the free kit. Do not sign up for anything yet unless you already know you want the PDF kit.",
            "Step two. Tap Explore Resources. That is the library. You will see essays, the literacy check, templates, tools, and a sample tutorial. Samples are marked. If a shelf looks thin, it is thin.",
            "Step three. Pick only one. If you are unsure of your habits, take the literacy check — about twenty questions, instant feedback, no account. If you are about to prompt, open Templates and fill one form. If you are about to add a vendor, open Tools and Updates and read the row for that job, including the limits.",
            "Step four. Leave the site. This is the part people skip. Take whatever you just made — a score in your head, a downloaded Markdown file, a limitation you highlighted — and apply it to the project that was already open on your machine. If you stay and browse, you will feel productive and change nothing.",
            "Step five. Come back when you have a new claim to test, not when you are bored. The site is a workbench. Workbenches are not feeds.",
            "Ignore, for now: any newsletter module that says the list is not open yet. Ignore empty topic shelves. Ignore the urge to buy the book on the first visit unless you already know you want thirteen chapters. The kit will still be free tomorrow.",
        ],
        "onscreen": [
            "1 Open VettaJimale.Tech",
            "2 Explore Resources",
            "3 Pick ONE (check / template / tools)",
            "4 Leave. Apply it to a live project.",
            "5 Return when you have a new claim",
            "Timer: 20 minutes",
        ],
        "caption": "First visit protocol for VettaJimale.Tech. Twenty minutes. Homepage, then Explore Resources, then one tool only — literacy check, a template, or tools by job. Then leave the site and use it on work you already have. Do not binge. Do not wait for a newsletter that is not open yet. Do not buy on panic. Come back when you have a new claim to test.",
        "first_comment": "If you only do one thing: literacy check, no signup, twenty questions.",
        "cta": "Start the timer. Finish one tool. Close the tab.",
        "dont": "Do not record a five-minute homepage tour that never clicks a tool. The point is departure.",
    },
    {
        "n": 10,
        "title": "How to use it — the Vibe Coding Literacy Check",
        "job": "Full instructions for the quiz: who it is for, what it covers, how to interpret a result, what to do next.",
        "original": [
            "Before you trust the next “it’s done” from an AI, take the vibe coding literacy check.",
            "Twenty questions. Instant feedback. No signup.",
            "It’s on the Resources page. Takes a few minutes. Tells you where your habits are soft.",
        ],
        "why_thin": "It sells the quiz and skips the pedagogy. People need to know it is about reading, safety, and verification; that a high score is not a certificate; and that a miss should send them to a specific template or kit page, not to shame.",
        "meta": {
            "audience": "Anyone shipping with Claude, Cursor, Copilot, or a chat window who has felt that fake-done feeling.",
            "platform": "Screen recording, 40–55s, plus a static “no signup” card.",
            "visual": "Show the first question, an explanation after an answer, the end state. Do not leak every question — preserve the check.",
        },
        "hook": "If a model tells you it is done, that is a claim. It is not a test passing. This check exists for that moment.",
        "spoken": [
            "The Vibe Coding Literacy Check on VettaJimale.Tech is twenty questions on reading, safety, and verification. Instant feedback after each item, so you learn while you answer. No signup. No waitlist.",
            "It is not a personality quiz and it is not a credential. It will not certify you as a senior engineer. It will show you whether you have the habit of checking claims — secrets that should never be in a browser, “done” that was never clicked, answers that sound right because they are fluent.",
            "How to take it: open Resources, tap Vibe Coding Literacy Check, sit down as if you were about to merge. Answer from how you actually work, not how you wish you worked. Read the explanation even when you are right. Especially when you are right. Confidence is how bad habits hide.",
            "When you finish, do not screenshot a number for clout. Write down the two items that stung. Then go to the matching tool. If you keep accepting done, fill Before You Accept Done. If you are sloppy with secrets and vendors, read Tools and Updates and the Builder Quick Reference. If you want a longer on-ramp, get the free kit and use the smoke test.",
            "That is how the check is meant to be used: diagnosis, then one repair, then back to the project.",
        ],
        "onscreen": [
            "“20 questions. Instant feedback. No signup.”",
            "Topics: reading · safety · verification",
            "“A score is not a certificate.”",
            "After: 2 stinging items → one template or the kit",
            "/resources/vibe-coding-literacy-check",
        ],
        "caption": "Take the Vibe Coding Literacy Check on VettaJimale.Tech before you trust the next “it’s done.” Twenty questions, instant feedback, no signup. It is about reading, safety, and verification — not a badge. When you finish, keep the two misses that stung and repair them with a template, the Builder Quick Reference, or the free kit’s smoke test. Diagnosis, then one repair.",
        "first_comment": "Direct link: /resources/vibe-coding-literacy-check — then Templates if “done” is your weak spot.",
        "cta": "Take the check once, honestly. Repair one miss the same day.",
        "dont": "Do not turn this into a stitch-the-score trend. That fights the point. Do not claim it makes you “literate certified.”",
    },
    {
        "n": 11,
        "title": "How to use it — the three templates, in order",
        "job": "A complete workflow: which form, in which order, what to write, what to export, what to do after.",
        "original": [
            "Don’t start a build in the chat window.",
            "Open Templates.",
            "Fill ROADMAP so you know the destination.",
            "Fill Project Rules so the tool has a fence.",
            "Fill Before You Accept Done so you name the claim, try the path, and keep what you saw.",
            "Download it. Then prompt.",
        ],
        "why_thin": "Order is good; it still reads like a packing list. Completeness means one sentence of what belongs in each field, when to skip a form, Markdown vs PDF, and how this pairs with the sample tutorial and the kit’s longer smoke test.",
        "meta": {
            "audience": "People who open Cursor or Claude Code and start typing because the blank page won.",
            "platform": "Tutorial Reel, 70–90s, screen recording. This is a saveable post.",
            "visual": "Fill a few real fields live — not lorem ipsum. Show download of Markdown and PDF. Show the file dropped next to a project.",
        },
        "hook": "If the first artifact of your build is a chat log, you already handed the model the steering wheel.",
        "spoken": [
            "On VettaJimale.Tech, Templates is not a swipe file of pretty Notion pages. It is three fillable forms from the same method as the book and the kit.",
            "Use them in this order, unless you are mid-incident, in which case jump to number three.",
            "One: ROADMAP. Write the destination in language a tired future-you will still understand. What are you building, for whom, what does done look like at the next milestone — not at “version forever.” If you cannot write the destination, you are not ready to prompt for architecture. You are ready to think.",
            "Two: Project Rules. This is the fence. What the tool may touch. What it must not touch. Stack, tone, files that are off limits, how you will verify. Put the rules where the tool can see them. A chat window with no rules will cheerfully invent a second product.",
            "Three: Before You Accept Done. Name the claim in one sentence. Click the path a stranger would use. Keep what you saw. If it failed, the next prompt starts from the failure, not from “fixed.” There is a sample tutorial with the same name if you want the why before the form. The smoke-test checklist in the free kit is the longer version.",
            "Fill in the browser. Download Markdown when the notes belong in the repo. Download PDF when you need something you can hand a person. Then — only then — prompt.",
            "Skip ROADMAP if the destination is already written somewhere honest. Never skip Before You Accept Done on a change a user will touch.",
        ],
        "onscreen": [
            "1 ROADMAP — destination, next milestone",
            "2 Project Rules — the fence",
            "3 Before You Accept Done — claim, click, receipt",
            "Export: Markdown for the repo · PDF for a person",
            "Then prompt",
            "/resources/templates",
        ],
        "caption": "Do not start a build in the chat window. On VettaJimale.Tech → Templates, fill three forms. ROADMAP: the destination and the next milestone. Project Rules: what the tool may and must not touch. Before You Accept Done: name the claim, click the path, keep the receipt. Download Markdown or PDF. Then prompt. Mid-incident? Jump to number three. The sample tutorial is the why; the kit’s smoke test is the longer checklist.",
        "first_comment": "Templates: /resources/templates  Tutorial (sample): /resources/before-you-accept-done  Kit: /free-kit",
        "cta": "Fill one form for the task already on your desk. Export it. Then open the chat.",
        "dont": "Do not demo all three forms at novel length in one video. Show the order, fill a few real lines, export, stop.",
    },
    {
        "n": 12,
        "title": "How to use it — tools by job, with limits",
        "job": "Teach the tools shelf as a decision aid, including how to read limitations and official references.",
        "original": [
            "Most tool lists are organized by hype.",
            "This one is organized by the job.",
            "Need a newsletter? A form? A checkout? Look up the job, see what I use, see the limits, follow the official docs.",
            "That’s Tools & Updates. Use it when you’re about to add a tool, not when you’re bored.",
        ],
        "why_thin": "Correct thesis, no procedure. People need a worked example (one job), what columns to trust, what not to treat as a buying guide, and the rule to leave for official docs.",
        "meta": {
            "audience": "Someone about to paste an API key because a YouTube video used that vendor.",
            "platform": "Screen recording, 45–70s, one worked job (forms, checkout, or email — pick the one you can show honestly).",
            "visual": "Scroll to a single job. Highlight limitations. Highlight official reference. Do not speed-rake the whole catalog.",
        },
        "hook": "Do not pick a tool because it won a roundup. Pick it because it does the job you have, and because you have read what it will not do.",
        "spoken": [
            "Tools and Updates on VettaJimale.Tech is a reference shelf, not a giveaway of discount codes. It is organized by the job the software does.",
            "That sounds small. It is the whole correction. Hype lists are organized by novelty. Job lists are organized by your actual bottleneck: capture a lead, send a letter, take a payment, host a form, keep a list.",
            "How to use it. Write the job in a sentence before you open the page. “I need people to be able to sign up for a PDF kit.” Then find that job. Read what I use, and the researched options next to it. Then read the limitations. If you skip the limitations you are using the page wrong. Then follow the official reference — not a random tutorial that may be two versions behind.",
            "Use this page when you are about to add a tool, not when you are bored. Boredom is how you collect seven dashboards and zero shipped features.",
            "If the row makes you slower, good. Slower than a bad vendor decision is still faster than a year of undo.",
        ],
        "onscreen": [
            "Write the job in one sentence first",
            "Open Tools & Updates",
            "Read: what I use · options · limits · official docs",
            "“Skip the limits = using it wrong”",
            "/resources/tools-and-updates",
        ],
        "caption": "Tools & Updates on VettaJimale.Tech is organized by the job, not by the hype cycle. Write the job in one sentence. Find that row. Read what VJ uses, the researched options, the limitations, then the official docs. Use it when you are about to add a tool, not when you are bored. If the limits make you slower, that is the feature.",
        "first_comment": "Go in with a job already written. If you cannot write the job, you do not need a new vendor. You need ROADMAP.",
        "cta": "Write one sentence. Open one row. Read the limits out loud.",
        "dont": "Do not turn this into “my stack reveal” clout. Do not imply every listed tool is an endorsement without the limitations.",
    },
    {
        "n": 13,
        "title": "Why follow — you need a filter, not more tools",
        "job": "A complete follow-reason: what following gives, what it does not, how the site and the social feed divide labor.",
        "original": [
            "Follow if you are tired of AI content that never gets checked.",
            "I test ideas, ask questions, and share the useful parts.",
            "You don’t need more tools. You need a filter.",
            "That’s why the site exists. Follow for the checks, not the cheerleading.",
        ],
        "why_thin": "“Follow for the vibe” is still a vibe. Completeness means the content mix, the cadence honesty, the difference between following on social versus using the site, and a disqualify line for the wrong audience.",
        "meta": {
            "audience": "People about to tap Follow. Also people who should not.",
            "platform": "25–40s Reel. Use as a profile video or a follow-gate at the end of tutorials.",
            "visual": "Direct to camera. No trending audio that fights the words. End on Follow + URL, not Follow only.",
        },
        "hook": "If you follow me for tool dumps, you will be disappointed. If you follow me for a filter, you are early in the right place.",
        "spoken": [
            "Here is why to follow, said as a contract.",
            "I am VJ. I test ideas, ask questions, and share the useful parts. Technology moves fast. I focus on what is real, what is practical, and what actually helps builders move forward.",
            "You do not need more tools. You need a filter: a person who will say when a claim fell apart, when a shelf is empty, when a kit is a preview and not a full chapter, when “done” is a sentence you have to check.",
            "What following on social gets you: the short version of that filter, pointed at whatever I am testing now, plus a reminder to go use the site — the check, the templates, the tools shelf, the kit, the book.",
            "What following does not get you: a daily dopamine feed, a private Discord, or a newsletter that is already running. The Stay curious list is separate from the free kit, and it is not open yet. I will not pretend it is.",
            "If you want cheerleading, mute me. If you want checks, follow, then open VettaJimale.Tech and do one thing so the follow is not just a number.",
        ],
        "onscreen": [
            "“A filter, not a tool dump”",
            "Real · practical · checked",
            "Social = short filter  ·  Site = workbench",
            "Newsletter: not open yet. Kit: free. Book: $17.",
            "Follow if you want the checks.",
        ],
        "caption": "Why follow VJ: you need a filter, not more tools. I test ideas, ask questions, and share the useful parts. Social is the short filter. VettaJimale.Tech is the workbench — literacy check, templates, tools by job, free kit, $17 book. No daily dopamine feed. No fake newsletter. Stay curious is not open yet. Follow for the checks, then go do one thing on the site so the follow is not a trophy.",
        "first_comment": "If you only follow and never open the site, you opted into quotes instead of a workbench. URL in bio.",
        "cta": "Follow. Then take the literacy check or fill one template. That is the complete action.",
        "dont": "Do not say “join the movement.” Do not promise reply-guy energy on every comment. Do not bait with “comment TOOLS for the list” when the list is already public.",
    },
    {
        "n": 14,
        "title": "Why follow — useful, not theoretical (weekly habit)",
        "job": "Turn the brand line into a repeatable habit for the follower, with a concrete weekly ask.",
        "original": [
            "I explore technology, test ideas, and share what I learn so you can put it to work.",
            "If that’s useful to you, follow, then go do one thing on VettaJimale.Tech this week: the check, a template, or the free kit.",
            "Stay curious. Don’t swallow the demo.",
        ],
        "why_thin": "The line is true and still generic. A robust version specifies what “put it to work” looks like in a week, names the three doors again, and gives people permission to follow quietly without performing in the comments.",
        "meta": {
            "audience": "Quiet builders. Teachers. Marketers using AI. People who will never duet a video and will still use a template.",
            "platform": "Static + long caption, or a calm 40s talking-head. Good for LinkedIn and Instagram both.",
            "visual": "Text on the dark green field. Optional: VJ on camera, no jump cuts. The energy should match “useful, not theoretical.”",
        },
        "hook": "Useful, not theoretical. That is not a tagline on VettaJimale.Tech. It is the rejection criteria for what I publish.",
        "spoken": [
            "I explore technology, test ideas, and share what I learn so you can put it to work. If a note cannot survive that sentence, it does not belong on the site.",
            "Putting it to work has a shape. This week, not “when I have a startup.” You either take the literacy check and repair one miss, or you fill one template for a task that already exists, or you download the free kit and run one prompt plus the smoke test on something you will actually ship.",
            "Following me is how you get reminded that the demo is not the product. Using the site is how you get the artifact. If you only do the first half, you collected quotes. If you do both, you have a fence around the next prompt.",
            "You do not have to comment “interested” for a link. The library is public. Samples are labeled. Empty shelves are admitted. Stay curious — and do not swallow the demo.",
        ],
        "onscreen": [
            "“Useful, not theoretical.”",
            "This week: check or template or kit — one.",
            "Follow = reminder. Site = artifact.",
            "Stay curious. Don’t swallow the demo.",
        ],
        "caption": "I explore technology, test ideas, and share what I learn so you can put it to work. That is the rejection criteria for VettaJimale.Tech. This week, do one: the vibe coding literacy check, one fillable template, or the free kit plus a smoke test on a real task. Follow for the reminder. Use the site for the artifact. You do not need to comment for a link. Stay curious. Do not swallow the demo.",
        "first_comment": "Three doors, no gate: /resources/vibe-coding-literacy-check · /resources/templates · /free-kit",
        "cta": "Pick the weekly door. Mute the rest of the internet until it is done.",
        "dont": "Do not add a giveaway. Do not ask people to tag three friends. That is theoretical engagement.",
    },
    {
        "n": 15,
        "title": "Why follow — the pinned “who is this / what you get over time” film",
        "job": "The complete pin: person, site, offers, method, cadence, disqualifiers, first action. This replaces a weak about video.",
        "original": [
            "Here’s the deal if you follow.",
            "You get a person who is actually in the tools — Claude, Cursor, the boring stack around a real site.",
            "You get public notes: what worked, what died, what changed.",
            "You get free things you can use without buying. The book is there when you want the full argument.",
            "You will not get a daily dopamine feed. You will get the next useful piece.",
            "VettaJimale.Tech. Come for one resource. Stay if the honesty helps you build.",
        ],
        "why_thin": "This was the strongest original and still moved too fast to be a pin. A pin has to survive strangers, returning visitors, and people who only watch with sound off. It needs chapters, on-screen labels, and an honest “not for you if.”",
        "meta": {
            "audience": "Anyone landing on the profile for the first time. Also anyone you meet offline who asks “so what do you do.”",
            "platform": "90–120s talking-head with chapter cards. Pin it. Cut a 20s trailer later; do not replace this with the trailer.",
            "visual": "Chapters: Person / Site / Offers / Method / Cadence / Not for you / First action. Show the real homepage and one real tool. Spell the URL on screen for the last eight seconds.",
        },
        "hook": "If you are going to follow one builder this year, you deserve to know what you are actually getting, and what you are not.",
        "spoken": [
            "I am Vetta Jimale. VJ. Writer, marketer, creator, and AI builder. I test ideas, ask questions, and share the useful parts. The site is VettaJimale.Tech — one word, dot tech.",
            "What the site is: a public workbench for making sense of technology while it is moving. A resource library. Fillable templates. A tools shelf organized by job, with limits written down. A twenty-question literacy check with no signup. Essays like AI is not smarter than you. A Building in Public lane for receipts — including dead ends. Some pieces are labeled sample. At least one shelf is not published yet. I will tell you that up front because the alternative is theater.",
            "What you can take without paying: the Resources tools I just named, and the free starter kit — previews from three chapters, six prompts, checklists, a pocket glossary, lessons from the builds. The PDF is free. You get the download on the next page and in email.",
            "What you can buy if you want the complete how: I Call BS: AI Vibe Coding Myths Dispelled. Thirteen chapters. Digital PDF. Seventeen dollars. You do not buy it to unlock the kit. The kit stays free.",
            "How to use all of it: name the claim, try the path yourself, keep what you saw, then prompt inside a fence — roadmap, project rules, before you accept done. That method is the site. The social feed is the reminder.",
            "What you get over time if you follow: the next useful piece from work I am actually in — Claude Code, Cursor, and the unglamorous stack around a real site. Notes on what worked, what died, and what changed. Not a daily dopamine feed. Not a fake waitlist. The occasional notes list is not open yet.",
            "This is not for you if you want secrets, hustle theater, or someone who will tell you the model is smarter than you. It is for you if you want to stay curious without swallowing the demo.",
            "First action: VettaJimale.Tech, Explore Resources, one tool. Then follow so you can find the door again.",
        ],
        "onscreen": [
            "Ch 1 Person — Vetta Jimale / VJ",
            "Ch 2 Site — workbench, not a course mill",
            "Ch 3 Free — resources + kit (previews, not 3 full chapters)",
            "Ch 4 Paid — I Call BS, $17 PDF",
            "Ch 5 Method — name, try, keep, then prompt",
            "Ch 6 Cadence — useful pieces, not daily dopamine",
            "Ch 7 Not for you if — secrets / theater / “the model is smarter”",
            "Ch 8 First action — URL for 8 seconds",
        ],
        "caption": "The deal if you follow VJ. Person: writer, marketer, creator, AI builder. Site: VettaJimale.Tech — a workbench. Free: resources (check, templates, tools by job, labeled samples) and a starter kit that is genuinely a kit, not three full chapters in disguise. Paid: I Call BS, $17 digital PDF, optional. Method: name the claim, try the path, keep the receipt, prompt inside a fence. Cadence: the next useful piece, not a dopamine feed. Newsletter not open yet. Not for you if you want theater. First action: open Resources and do one thing. Then follow so you can find it again.",
        "first_comment": "Pin companion links: /resources  /free-kit  /products/i-call-bs  Spelling: VettaJimale.Tech",
        "cta": "Watch once with sound. Screenshot the URL. Do one resource before you follow anyone else today.",
        "dont": "Do not cut this into only the charming parts. The empty-shelf honesty is why people will trust the pin six months from now.",
    },
]


def add_script(doc, s):
    heading(doc, f"Script {s['n']}. {s['title']}", 1)
    labeled(doc, "Campaign job.", s["job"])
    labeled(doc, "Audience.", s["meta"]["audience"])
    labeled(doc, "Platform and length.", s["meta"]["platform"])
    labeled(doc, "Visual / shot list.", s["meta"]["visual"])

    heading(doc, "Original (first draft)", 2)
    quote_block(doc, "As previously written", s["original"])
    labeled(doc, "Why this was too thin.", s["why_thin"])

    heading(doc, "Revision (production packet)", 2)
    labeled(doc, "Hook (first 1–3 seconds).", s["hook"])
    heading(doc, "Spoken script", 3)
    for line in s["spoken"]:
        para(doc, line, space_after=10)
    heading(doc, "On-screen text", 3)
    bullets(doc, s["onscreen"])
    heading(doc, "Caption (Instagram / LinkedIn / TikTok)", 3)
    para(doc, s["caption"], space_after=10)
    labeled(doc, "First comment (links live here, not in the spoken last line).", s["first_comment"])
    labeled(doc, "Call to action.", s["cta"])
    labeled(doc, "Do not say.", s["dont"])
    para(doc, "", space_after=4)
    add_horizontal_line(para(doc, ""))


def build():
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.9)
    section.bottom_margin = Inches(0.9)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

    styles = doc.styles["Normal"]
    styles.font.name = "Calibri"
    styles.font.size = Pt(11)
    styles.font.color.rgb = INK

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = title.add_run("VettaJimale.Tech")
    set_run(r, size=12, bold=True, color=GREEN)
    para(doc, "Social media scripts", size=22, bold=True, color=GREEN, space_after=4)
    para(
        doc,
        "Fifteen pieces: what the site is, how to find it, what you can use, how to use it, and why to follow. Each piece includes the original short draft and a complete revision.",
        size=12,
        italic=True,
        color=MUTED,
        space_after=6,
    )
    para(doc, "Prepared for Vetta Jimale  ·  Working draft  ·  October 2026", size=10, color=MUTED)
    add_horizontal_line(para(doc, ""))

    heading(doc, "How to read this document", 1)
    para(
        doc,
        "The first version of these scripts was a set of hooks. That is useful in a brainstorm and insufficient in production. A stranger cannot spell VettaJimale from a fast talk-track. A builder cannot use a template from a list of names. A follow cannot be asked for without saying what the follow is not.",
    )
    para(
        doc,
        "This revision treats every post as a small product: a job, an audience, a visual plan, a hook, a full spoken script, on-screen text, a caption, a first comment for links, a call to action, and a “do not say” line so the brand does not accidentally overpromise.",
    )
    para(
        doc,
        "Record from the Revision section. Keep the Original section so you can see what got stronger, and so you can steal a single line from the short draft when you need a sticker or a thumbnail.",
    )

    heading(doc, "Thoughts on the campaign (expanded)", 1)
    heading(doc, "What was wrong with “flimsy”", 2)
    para(
        doc,
        "Flimsy, here, did not mean false. The first drafts were on-voice: anti-hype, useful-not-theoretical, receipts over roundups. They failed as production documents. They assumed the viewer already knew the site was a library with a kit and a book. They used slogans as if slogans were instructions. They asked people to follow without a contract. They skipped the unglamorous facts that actually create trust on this particular site: samples are labeled, Creative Tools is not published yet, the Stay curious list is not open, the kit contains previews from three chapters rather than three full chapters, the book is a $17 digital PDF, nothing else is for sale.",
    )
    heading(doc, "What this campaign is actually for", 2)
    para(
        doc,
        "It is not fifteen ways to say “go to my website.” It is five jobs, each done three ways so the algorithm and the human both get variety.",
    )
    bullets(
        doc,
        [
            "Find: the name, the spelling, the URL, the one-line stance (scripts 1–3).",
            "Inventory: the map of the library, the three live tools, the kit versus the book, the essay, the receipts lane (scripts 4–8).",
            "Use: first visit protocol, literacy check, templates in order, tools by job (scripts 9–12).",
            "Follow: filter versus tool-dump, weekly habit, the pinned film (scripts 13–15).",
        ],
    )
    para(
        doc,
        "If you only record five, record 2, 5, 10, 11, and 15. That set covers retrieval, a live shelf, two how-tos, and the pin. Script 6 is for people who already came once. Script 4 is mandatory before you talk about “the library,” because honesty about empty shelves is the brand.",
    )
    heading(doc, "Voice rules for every post", 2)
    bullets(
        doc,
        [
            "Talk like the site: short sentences, then one precise list. No guru second person (“you’re not grinding hard enough”).",
            "Prefer names of real artifacts: Vibe Coding Literacy Check, ROADMAP, Project Rules, Before You Accept Done, I Call BS, free starter kit.",
            "Prefer verbs a skeptic could watch: click the path, download Markdown, read the limits, leave the site.",
            "Never imply a community, a Discord, a live cohort, or an open newsletter.",
            "Never say “three free chapters.” Say “previews from three chapters.”",
            "Never hide SAMPLE. If the tutorial is labeled sample on the site, say it in the video.",
            "Put links in the first comment and on screen. Do not cram paths into the last spoken second.",
            "End with one action. Two doors is a courtesy in the caption. Two doors in the spoken close is a bounce.",
        ],
    )
    heading(doc, "Cadence suggestion", 2)
    para(
        doc,
        "Two posts a week is enough if they are complete. Week one: spelling (2) and literacy check (10). Week two: templates (11) and kit versus book (6). Week three: tools by job (12) and the pin (15). Use 13 and 14 as end-cards on other videos rather than as standalone fluff. Repeat 2 as a bumper whenever you say the name out loud.",
    )
    heading(doc, "Proof points you can always fall back on", 2)
    bullets(
        doc,
        [
            "Homepage stance: “Tech is moving. Let’s make sense of it.”",
            "Person: writer, marketer, creator, hands-on AI builder.",
            "Method: name the claim, try the path, keep the receipt.",
            "Live no-account tools: literacy check (20 questions), templates, tools by job.",
            "Free kit: useful kit, not a teaser; PDF on the next page and in email.",
            "Book: I Call BS: AI Vibe Coding Myths Dispelled; 13 chapters; $17 digital PDF; optional.",
            "Catalog rule: the book and the free kit; nothing else is for sale.",
        ],
    )

    heading(doc, "Contents", 1)
    for s in SCRIPTS:
        para(doc, f"{s['n']}. {s['title']} — {s['job']}", size=11, space_after=4)

    for s in SCRIPTS:
        add_script(doc, s)

    heading(doc, "After you record", 1)
    para(
        doc,
        "Watch each video once with the sound off. If you cannot tell the job of the post from the on-screen text, the revision is not done. Watch once with the sound on. If the URL is not held long enough to screenshot, the find-job has failed. Then do the call to action yourself on a fresh browser profile. If the path in the first comment 404s, fix the comment before you boost the post.",
    )
    para(
        doc,
        "When the Creative Tools shelf has real posts, or when Stay curious opens, update scripts 4, 9, 13, and 15. Do not silently leave “not open yet” in a pinned film after it becomes false. Honesty is a dating policy with the audience. It has to stay current.",
    )
    para(
        doc,
        "— End of working draft —",
        italic=True,
        color=MUTED,
        space_before=18,
    )

    doc.save(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
