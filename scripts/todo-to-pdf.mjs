/**
 * One fillable PDF: checklist + step-by-step instructions together.
 * Sources: docs/cms/TODO.md (status) + docs/cms/TODO-PLAN.md (how-to).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const todoPath = join(root, 'docs/cms/TODO.md')
const planPath = join(root, 'docs/cms/TODO-PLAN.md')
const out = join(root, 'docs/cms/TODO.pdf')

const PAGE_W = 612
const PAGE_H = 792
const MARGIN_X = 40
const MARGIN_TOP = 44
const MARGIN_BOTTOM = 40
const CONTENT_W = PAGE_W - MARGIN_X * 2
const NOTE_H = 26

function ascii(s) {
  return String(s)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/…/g, '...')
    .replace(/·/g, '|')
    .replace(/×/g, 'x')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractIds(text) {
  const ids = []
  const re = /\b((?:ADV-F|BJ-|SUP-P?)\d+)\b/gi
  let m
  while ((m = re.exec(text))) ids.push(m[1].toUpperCase().replace('ADV-F', 'ADV-F'))
  return [...new Set(ids.map((id) => id.replace(/^ADV-F0*/, (x) => x).replace(/^adv-f/i, 'ADV-F')))]
}

function normalizeId(id) {
  const u = id.toUpperCase()
  const adv = u.match(/^ADV-F0*(\d+)$/)
  if (adv) return `ADV-F${adv[1].padStart(2, '0')}`
  const bj = u.match(/^BJ-0*(\d+)$/)
  if (bj) return `BJ-${bj[1].padStart(2, '0')}`
  return u
}

function parseTodoStatus(md) {
  /** @type {Map<string, { done: boolean, text: string }>} */
  const byId = new Map()
  const items = []
  for (const raw of md.split(/\r?\n/)) {
    const task = raw.trim().match(/^- \[([ xX])\]\s+(.*)$/)
    if (!task) continue
    const done = task[1].toLowerCase() === 'x'
    const text = ascii(task[2])
    const ids = extractIds(text).map(normalizeId)
    const row = { done, text, ids }
    items.push(row)
    for (const id of ids) {
      const prev = byId.get(id)
      if (!prev || (done && !prev.done)) byId.set(id, { done, text })
    }
  }
  return { items, byId }
}

function parsePlan(md) {
  const lines = md.split(/\r?\n/)
  /** @type {{ part: string, title: string, id: string | null, why: string, doneWhen: string, steps: string[], body: string[] }[]} */
  const tasks = []
  let part = ''
  let i = 0

  const flushIntroBits = []

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## Part ') || line.startsWith('## Quick') || line.startsWith('## After')) {
      part = ascii(line.replace(/^##\s+/, ''))
      i += 1
      continue
    }

    if (line.startsWith('### ')) {
      const titleRaw = line.slice(4).trim()
      const title = ascii(titleRaw)
      if (/^Already fixed/i.test(title)) {
        i += 1
        while (i < lines.length && !lines[i].startsWith('## ') && !lines[i].startsWith('### ')) i += 1
        continue
      }

      const idMatch = titleRaw.match(/\b(ADV-F\d+|BJ-\d+)\b/i)
      const id = idMatch ? normalizeId(idMatch[1]) : null

      i += 1
      const chunk = []
      while (i < lines.length && !lines[i].startsWith('## ') && !lines[i].startsWith('### ')) {
        chunk.push(lines[i])
        i += 1
      }

      let why = ''
      let doneWhen = ''
      /** @type {string[]} */
      const steps = []
      let mode = 'body'
      /** @type {string[]} */
      const body = []

      for (const raw of chunk) {
        const t = raw.trimEnd()
        if (!t.trim() || t.trim() === '---') continue
        if (/^\*\*Why:\*\*/i.test(t.trim())) {
          why = ascii(t.replace(/^\*\*Why:\*\*\s*/i, ''))
          mode = 'why'
          continue
        }
        if (/^\*\*Done when:\*\*/i.test(t.trim())) {
          doneWhen = ascii(t.replace(/^\*\*Done when:\*\*\s*/i, ''))
          mode = 'done'
          continue
        }
        if (/^\*\*Steps\*\*/i.test(t.trim()) || /^Steps$/i.test(t.trim())) {
          mode = 'steps'
          continue
        }
        if (/^\*\*Option /i.test(t.trim())) {
          steps.push(ascii(t.replace(/\*\*/g, '')))
          mode = 'steps'
          continue
        }
        if (mode === 'why' && !/^\d+\./.test(t.trim()) && !/^\*\*/.test(t.trim())) {
          why = ascii(`${why} ${t}`)
          continue
        }
        if (mode === 'done' && !/^\d+\./.test(t.trim()) && !/^\*\*/.test(t.trim())) {
          doneWhen = ascii(`${doneWhen} ${t}`)
          continue
        }
        if (/^\d+\.\s+/.test(t.trim()) || /^-\s+/.test(t.trim())) {
          mode = 'steps'
          steps.push(ascii(t.trim().replace(/^-\s+/, '')))
          continue
        }
        if (mode === 'steps' && t.trim() && !t.startsWith('|')) {
          // continuation of previous step
          if (steps.length) steps[steps.length - 1] = ascii(`${steps[steps.length - 1]} ${t}`)
          else body.push(ascii(t))
          continue
        }
        if (t.trim() && !t.startsWith('|')) body.push(ascii(t))
      }

      tasks.push({ part, title, id, why, doneWhen, steps, body })
      continue
    }

    // Capture overwhelmed path numbered list under Quick section
    if (part.startsWith('Quick') && /^\d+\.\s+/.test(line.trim())) {
      flushIntroBits.push(ascii(line.trim()))
    }
    i += 1
  }

  return { tasks, quickPath: flushIntroBits }
}

function resolveDone(task, todo) {
  if (task.id && todo.byId.has(task.id)) return todo.byId.get(task.id).done
  // fuzzy: plan title words against todo text
  const key = task.title.toLowerCase()
  for (const item of todo.items) {
    const t = item.text.toLowerCase()
    if (task.id && item.ids.includes(task.id)) return item.done
    const significant = key
      .replace(/\b(adv-f\d+|bj-\d+)\b/g, '')
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 4)
    if (significant.length >= 2 && significant.every((w) => t.includes(w))) return item.done
    if (significant.length === 1 && t.includes(significant[0]) && t.includes(significant[0])) {
      /* continue */
    }
  }
  // keyword pairs
  const needles = [
    ['filter', 'marketing'],
    ['bulk', 'tag'],
    ['merge', 'duplicate'],
    ['preference', 'center'],
    ['author', 'breakdown'],
    ['coarse', 'geo'],
    ['welcome', 'nurture'],
    ['social', 'auto'],
    ['campaign', 'auto-send'],
    ['campaign', 'readiness'],
    ['resource', 'prose'],
    ['literacy', 'check'],
    ['tools', 'catalog'],
    ['book updates', 'card'],
    ['push', 'deploy'],
    ['wcag', 'audit'],
    ['kit funnel', 'replacement'],
    ['first real', 'book'],
    ['email gate', 'templates'],
    ['editorial', 'pass'],
    ['kit subscribers', 'contacts'],
    ['csv', 'column'],
    ['owner disable', 'kill'],
    ['periodic', 'review'],
    ['gates.md', ''],
    ['implementation.md', ''],
    ['resend', 'webhook'],
    ['turnstile', 'production'],
    ['disable', 'public signup'],
    ['stripe', 'smoke'],
    ['cron', 'jobs'],
    ['staging smoke', 'design'],
    ['open/click', 'stats'],
    ['newsletterlistids', ''],
    ['contact form', 'inbox'],
    ['kit subscribe', 'unsubscribe'],
    ['book checkout', 'stripe'],
    ['mobile pass', '320'],
  ]
  for (const item of todo.items) {
    const t = item.text.toLowerCase()
    for (const [a, b] of needles) {
      if (key.includes(a) && (!b || key.includes(b)) && t.includes(a) && (!b || t.includes(b))) {
        return item.done
      }
    }
  }
  return false
}

function wrapText(text, font, size, maxWidth) {
  const words = ascii(text).split(/\s+/).filter(Boolean)
  const lines = []
  let cur = ''
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) cur = next
    else {
      if (cur) lines.push(cur)
      cur = word
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

async function main() {
  const todo = parseTodoStatus(readFileSync(todoPath, 'utf8'))
  const { tasks, quickPath } = parsePlan(readFileSync(planPath, 'utf8'))

  const pdf = await PDFDocument.create()
  pdf.setTitle('CMS todo + instructions (fillable)')
  pdf.setAuthor('I Call BS')
  const form = pdf.getForm()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  let page = pdf.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN_TOP
  let pageNum = 1

  const openCount = tasks.filter((t) => !resolveDone(t, todo)).length
  const doneCount = tasks.length - openCount

  const drawFooter = () => {
    page.drawText(`Page ${pageNum}  |  ${openCount} open  |  ${doneCount} done  |  ${tasks.length} tasks`, {
      x: MARGIN_X,
      y: 22,
      size: 8,
      font,
      color: rgb(0.35, 0.35, 0.35),
    })
    page.drawText('Check boxes and type in Notes. File > Save As to keep your work.', {
      x: MARGIN_X,
      y: 12,
      size: 7,
      font,
      color: rgb(0.45, 0.45, 0.45),
    })
  }

  const newPage = () => {
    drawFooter()
    page = pdf.addPage([PAGE_W, PAGE_H])
    pageNum += 1
    y = PAGE_H - MARGIN_TOP
  }

  const ensure = (need) => {
    if (y - need < MARGIN_BOTTOM) newPage()
  }

  const drawLines = (lines, size, fnt, color, indent = 0) => {
    for (const ln of lines) {
      ensure(size + 4)
      page.drawText(ln, { x: MARGIN_X + indent, y, size, font: fnt, color })
      y -= size + 3
    }
  }

  // ----- Cover / how to use (single doc; no side-by-side) -----
  page.drawText('I Call BS - CMS work plan', {
    x: MARGIN_X,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.08, 0.08, 0.08),
  })
  y -= 18
  drawLines(
    wrapText(
      'Checklist and step-by-step instructions in one place. Open this PDF in Edge, Chrome, Adobe Reader, or Preview to check boxes and type notes.',
      font,
      9,
      CONTENT_W,
    ),
    9,
    font,
    rgb(0.25, 0.25, 0.25),
  )
  y -= 4
  drawLines(
    wrapText(
      'How to use: pick the next OPEN item, follow Why / Done when / Steps under it, type notes as you go, check the box when the Done when test passes. Prefer finishing ops before features that need live data.',
      font,
      9,
      CONTENT_W,
    ),
    9,
    font,
    rgb(0.25, 0.25, 0.25),
  )
  y -= 6

  ensure(40)
  page.drawText('If you are overwhelmed - do these first', {
    x: MARGIN_X,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })
  y -= 14
  const quick =
    quickPath.length > 0
      ? quickPath
      : [
          '1. BJ-01 Deploy production',
          '2. BJ-02 Auth signup off + leaked-password on',
          '3. BJ-03 Turnstile + newsletter webhook + Stripe env',
          '4. ADV-F01 Privacy + Terms',
          '5. ADV-F05 Remove placeholders',
          '6. ADV-F03 Decide kit PDF public vs gated',
          '7. ADV-F04 Book download not a permanent public URL',
          '8. Stripe + kit + contact smokes',
        ]
  for (const q of quick) {
    drawLines(wrapText(q, font, 9, CONTENT_W - 8), 9, font, rgb(0.15, 0.15, 0.15), 8)
  }
  y -= 6
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_W - MARGIN_X, y },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  })
  y -= 16

  let currentPart = ''
  let n = 0

  for (const task of tasks) {
    if (task.part.startsWith('Quick') || task.part.startsWith('After')) continue

    if (task.part && task.part !== currentPart) {
      currentPart = task.part
      ensure(28)
      y -= 2
      page.drawText(currentPart, {
        x: MARGIN_X,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.05, 0.05, 0.05),
      })
      y -= 5
      page.drawLine({
        start: { x: MARGIN_X, y },
        end: { x: PAGE_W - MARGIN_X, y },
        thickness: 0.7,
        color: rgb(0.55, 0.55, 0.55),
      })
      y -= 14
    }

    n += 1
    const done = resolveDone(task, todo)
    const status = done ? 'DONE' : 'OPEN'
    const statusColor = done ? rgb(0.12, 0.45, 0.22) : rgb(0.55, 0.22, 0.08)
    const title = task.id ? `${task.id} - ${task.title.replace(new RegExp(`^${task.id}\\s*—\\s*`, 'i'), '').replace(new RegExp(`^${task.id}\\s*-\\s*`, 'i'), '')}` : task.title
    const titleLines = wrapText(`${String(n).padStart(2, '0')}  ${title}`, fontBold, 10, CONTENT_W - 70)

    // estimate height
    const whyLines = task.why ? wrapText(`Why: ${task.why}`, font, 8.5, CONTENT_W - 16) : []
    const doneLines = task.doneWhen
      ? wrapText(`Done when: ${task.doneWhen}`, font, 8.5, CONTENT_W - 16)
      : []
    const stepLines = []
    for (const s of task.steps) {
      stepLines.push(...wrapText(s, font, 8.5, CONTENT_W - 20))
    }
    const bodyLines = []
    for (const b of task.body.slice(0, 4)) {
      bodyLines.push(...wrapText(b, font, 8.5, CONTENT_W - 16))
    }
    const est =
      titleLines.length * 13 +
      whyLines.length * 11 +
      doneLines.length * 11 +
      stepLines.length * 11 +
      bodyLines.length * 11 +
      NOTE_H +
      28
    ensure(Math.min(est, 200))

    const topY = y
    const cb = form.createCheckBox(`done_${n}`)
    cb.addToPage(page, {
      x: MARGIN_X,
      y: topY - 2,
      width: 12,
      height: 12,
      borderWidth: 1,
      borderColor: rgb(0.2, 0.2, 0.2),
      backgroundColor: rgb(1, 1, 1),
    })
    if (done) cb.check()

    page.drawText(status, {
      x: PAGE_W - MARGIN_X - fontBold.widthOfTextAtSize(status, 8),
      y: topY,
      size: 8,
      font: fontBold,
      color: statusColor,
    })

    // title without leading number in wrap - we already included number
    let ty = topY
    for (const ln of titleLines) {
      page.drawText(ln, {
        x: MARGIN_X + 18,
        y: ty,
        size: 10,
        font: fontBold,
        color: done ? rgb(0.35, 0.35, 0.35) : rgb(0.08, 0.08, 0.08),
      })
      ty -= 12
    }
    y = ty - 2

    if (whyLines.length) {
      drawLines(whyLines, 8.5, font, rgb(0.25, 0.25, 0.25), 18)
    }
    if (doneLines.length) {
      drawLines(doneLines, 8.5, font, rgb(0.2, 0.35, 0.2), 18)
    }
    if (stepLines.length) {
      ensure(12)
      page.drawText('Steps', {
        x: MARGIN_X + 18,
        y,
        size: 8,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      })
      y -= 11
      drawLines(stepLines, 8.5, font, rgb(0.15, 0.15, 0.15), 18)
    } else if (bodyLines.length) {
      drawLines(bodyLines, 8.5, font, rgb(0.2, 0.2, 0.2), 18)
    }

    ensure(NOTE_H + 14)
    page.drawText('Notes', {
      x: MARGIN_X + 18,
      y,
      size: 7.5,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    y -= NOTE_H + 2
    const field = form.createTextField(`notes_${n}`)
    field.enableMultiline()
    field.addToPage(page, {
      x: MARGIN_X + 18,
      y,
      width: CONTENT_W - 18,
      height: NOTE_H,
      borderWidth: 0.8,
      borderColor: rgb(0.7, 0.7, 0.7),
      backgroundColor: rgb(0.98, 0.98, 0.97),
      textColor: rgb(0.1, 0.1, 0.1),
    })
    field.setFontSize(9)
    y -= 12
  }

  drawFooter()
  form.updateFieldAppearances(font)
  writeFileSync(out, await pdf.save({ updateFieldAppearances: true }))
  console.log(`Wrote ${out} (${n} tasks with instructions + fillable notes)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
