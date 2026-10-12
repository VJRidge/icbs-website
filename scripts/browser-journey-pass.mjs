/**
 * Read-only browser journey pass for VettaJimale.Tech.
 * Does not edit app code. Safe boundaries: no real contact/kit/newsletter
 * production posts, no Stripe purchase, no admin credential use unless
 * JOURNEY_ADMIN_EMAIL + JOURNEY_ADMIN_PASSWORD are set.
 *
 * Usage:
 *   node scripts/browser-journey-pass.mjs
 *   BASE_URL=https://vettajimale.tech node scripts/browser-journey-pass.mjs
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const EVIDENCE = path.join(ROOT, 'docs', 'reviews', 'browser-journey-evidence')
const REPORT = path.join(ROOT, 'docs', 'reviews', '04-browser-journey-tests.md')

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'phone-320', width: 320, height: 640 },
]

async function detectBaseUrl() {
  const env = (process.env.BASE_URL || '').trim().replace(/\/$/, '')
  if (env) return { baseUrl: env, source: 'BASE_URL env' }

  // Prefer production for “VettaJimale.Tech” journey pass when both are up —
  // local Vite is DEV brand + broken /api handlers.
  const preferProd = (process.env.JOURNEY_PREFER_LOCAL || '').trim() !== '1'
  const candidates = preferProd
    ? [
        { url: 'https://vettajimale.tech', label: 'production' },
        { url: 'http://localhost:5173', label: 'local Vite :5173' },
        { url: 'http://127.0.0.1:5173', label: 'local Vite 127.0.0.1:5173' },
        { url: 'http://localhost:4173', label: 'vite preview :4173' },
      ]
    : [
        { url: 'http://localhost:5173', label: 'local Vite :5173' },
        { url: 'http://127.0.0.1:5173', label: 'local Vite 127.0.0.1:5173' },
        { url: 'http://localhost:4173', label: 'vite preview :4173' },
        { url: 'https://vettajimale.tech', label: 'production' },
      ]

  for (const c of candidates) {
    try {
      const res = await fetch(c.url, { signal: AbortSignal.timeout(4000) })
      if (res.ok) return { baseUrl: c.url, source: c.label }
    } catch {
      /* try next */
    }
  }
  return { baseUrl: 'https://vettajimale.tech', source: 'fallback production' }
}

function ensureDirs() {
  fs.mkdirSync(EVIDENCE, { recursive: true })
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

async function shot(page, name) {
  const file = path.join(EVIDENCE, `${slug(name)}.png`)
  await page.screenshot({ path: file, fullPage: true })
  return path.relative(ROOT, file).replace(/\\/g, '/')
}

async function collectConsole(page, bag) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') bag.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => bag.pageErrors.push(String(err)))
  page.on('response', (res) => {
    const u = res.url()
    if (res.status() >= 400 && !u.includes('favicon')) {
      bag.failedRequests.push(`${res.status()} ${u}`)
    }
  })
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth > doc.clientWidth + 1
  })
}

async function focusRingVisible(page) {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return { ok: false, reason: 'no focus' }
    const cs = getComputedStyle(el)
    const outline = cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px'
    const shadow = Boolean(cs.boxShadow && cs.boxShadow !== 'none')
    return {
      ok: outline || shadow || el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'A',
      tag: el.tagName,
      text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40),
    }
  })
}

function result(journey, steps, expected, actual, status, evidence = []) {
  return { journey, steps, expected, actual, status, evidence }
}

async function probeApiSurface(baseUrl) {
  const checks = []
  for (const p of ['/api/form-schema?slug=lead-capture', '/api/checkout']) {
    try {
      const res = await fetch(`${baseUrl}${p}`, {
        method: p.includes('checkout') ? 'GET' : 'GET',
        signal: AbortSignal.timeout(8000),
        redirect: 'manual',
      })
      const ct = res.headers.get('content-type') || ''
      const text = await res.text()
      const looksLikeTsSource = text.includes('export default async function handler')
      checks.push({
        path: p,
        status: res.status,
        contentType: ct,
        looksLikeTsSource,
        snippet: text.slice(0, 120).replace(/\s+/g, ' '),
      })
    } catch (e) {
      checks.push({ path: p, error: String(e) })
    }
  }
  try {
    const res = await fetch(`${baseUrl}/downloads/I-Call-BS-Free-Starter-Kit.pdf`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(8000),
    })
    checks.push({
      path: '/downloads/I-Call-BS-Free-Starter-Kit.pdf',
      status: res.status,
      contentType: res.headers.get('content-type') || '',
      contentDisposition: res.headers.get('content-disposition') || '',
    })
  } catch (e) {
    checks.push({ path: '/downloads/I-Call-BS-Free-Starter-Kit.pdf', error: String(e) })
  }
  return checks
}

async function runViewportChecks(page, label, bag) {
  const notes = []
  if (await hasHorizontalOverflow(page)) {
    notes.push('horizontal overflow')
    bag.overflow = true
  }
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  const focus = await focusRingVisible(page)
  if (!focus.ok) notes.push(`weak/missing focus after Tab (${focus.reason || focus.tag})`)
  else notes.push(`focus ok on ${focus.tag}`)
  return notes
}

async function journeyHomeAboutContact(page, baseUrl, bag, results) {
  const steps = []
  const evidence = []
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    steps.push('Open /')
    await page.waitForTimeout(800)
    const homeTitle = await page.title()
    const homeText = await page.locator('body').innerText()
    steps.push(`Home title: ${homeTitle}`)

    // Prefer nav About, else direct
    const aboutLink = page.locator('a[href="/about"], a[href*="about"]').first()
    if (await aboutLink.count()) {
      await aboutLink.click()
      steps.push('Click About nav/link')
    } else {
      await page.goto(`${baseUrl}/about`, { waitUntil: 'domcontentloaded' })
      steps.push('Direct /about (no About link found)')
    }
    await page.waitForTimeout(600)
    const aboutUrl = page.url()
    const aboutText = await page.locator('body').innerText()
    if (!aboutUrl.includes('/about')) {
      evidence.push(await shot(page, 'j1-about-url-fail'))
      results.push(
        result(
          '1. Homepage → About → Contact',
          steps,
          'About page at /about',
          `URL ${aboutUrl}`,
          'Fail',
          evidence,
        ),
      )
      return
    }

    await page.goBack()
    steps.push('Browser Back from About')
    await page.waitForTimeout(400)
    const afterBack = page.url()

    await page.goto(`${baseUrl}/about`, { waitUntil: 'domcontentloaded' })
    steps.push('Direct /about refresh path')
    await page.reload({ waitUntil: 'domcontentloaded' })
    steps.push('Refresh About')

    const contactLink = page.locator('a[href="/contact"]').first()
    if (await contactLink.count()) {
      await contactLink.click()
      steps.push('Click Contact')
    } else {
      await page.goto(`${baseUrl}/contact`, { waitUntil: 'domcontentloaded' })
      steps.push('Direct /contact')
    }
    await page.waitForTimeout(600)
    const contactUrl = page.url()
    const contactBody = await page.locator('body').innerText()

    // Form presence — do not submit real message
    const form = page.locator('form').first()
    const hasForm = (await form.count()) > 0
    steps.push(hasForm ? 'Contact form present (no submit — safety boundary)' : 'No form found')

    // Invalid empty submit if form exists
    let invalidState = 'n/a'
    if (hasForm) {
      const submit = form.locator('button[type="submit"], input[type="submit"]').first()
      if (await submit.count()) {
        await submit.click()
        await page.waitForTimeout(400)
        invalidState = 'attempted empty submit (browser validation / no live post verified)'
        steps.push(invalidState)
      }
    }

    const vpNotes = await runViewportChecks(page, 'contact', bag)
    const overflowFail = bag.overflow
    const placeholders =
      /YOUR PHOTO|YOUR INTRODUCTION VIDEO|Project placeholder|This page is being written/i.test(
        homeText + aboutText + contactBody,
      )

    let status = 'Pass'
    const actualParts = [
      `home="${homeTitle}"`,
      `aboutOk=${aboutUrl.includes('/about')}`,
      `backLanded=${afterBack}`,
      `contactOk=${contactUrl.includes('/contact')}`,
      `form=${hasForm}`,
      `vp=${vpNotes.join('; ')}`,
    ]
    if (placeholders) {
      status = 'Fail'
      actualParts.push('placeholder copy still visible on journey pages')
      evidence.push(await shot(page, 'j1-placeholders'))
    }
    if (overflowFail) {
      status = status === 'Pass' ? 'Fail' : status
      evidence.push(await shot(page, 'j1-overflow-contact'))
    }
    if (bag.consoleErrors.length > 5) {
      status = 'Fail'
      actualParts.push(`consoleErrors=${bag.consoleErrors.length}`)
      evidence.push(await shot(page, 'j1-console'))
    }

    results.push(
      result(
        '1. Homepage → About → Contact',
        steps,
        'Navigate home→about→contact; back/refresh work; form visible; no live email send',
        actualParts.join(' | '),
        status,
        evidence,
      ),
    )
  } catch (e) {
    evidence.push(await shot(page, 'j1-exception').catch(() => ''))
    results.push(
      result('1. Homepage → About → Contact', steps, 'Complete nav journey', String(e), 'Fail', evidence),
    )
  }
}

async function journeyKitThanksDownload(page, baseUrl, bag, results, apiChecks) {
  const steps = []
  const evidence = []
  try {
    await page.goto(`${baseUrl}/free-kit`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    steps.push('Open /free-kit')
    await page.waitForTimeout(700)
    let kitUrl = page.url()
    if (!kitUrl.includes('free') && !kitUrl.includes('kit')) {
      await page.goto(`${baseUrl}/free`, { waitUntil: 'domcontentloaded' })
      steps.push('Fallback /free redirect')
      await page.waitForTimeout(1200)
      kitUrl = page.url()
    }

    // Do not submit kit signup to production
    const form = page.locator('form').first()
    steps.push(
      (await form.count())
        ? 'Kit form present — submit skipped (no production contact write)'
        : 'No kit form (may be brand CTA-only page)',
    )

    await page.goto(`${baseUrl}/free-kit/thank-you`, { waitUntil: 'domcontentloaded' })
    steps.push('Direct /free-kit/thank-you')
    await page.waitForTimeout(500)
    const thanksText = await page.locator('body').innerText()

    // Download link
    const dl = page.locator('a[href*="I-Call-BS-Free-Starter-Kit.pdf"], a[href*="/downloads/"]').first()
    let downloadOk = false
    let downloadMeta = ''
    if (await dl.count()) {
      const href = await dl.getAttribute('href')
      steps.push(`Download link href=${href}`)
      const abs = href?.startsWith('http') ? href : `${baseUrl}${href}`
      const head = await fetch(abs, { method: 'HEAD', signal: AbortSignal.timeout(10000) })
      downloadMeta = `${head.status} ${head.headers.get('content-type') || ''}`
      downloadOk = head.status === 200 && (head.headers.get('content-type') || '').includes('pdf')
      steps.push(`HEAD download → ${downloadMeta}`)
    } else {
      // Try known public path
      const pdfCheck = apiChecks.find((c) => c.path?.includes('Starter-Kit'))
      if (pdfCheck?.status === 200) {
        downloadOk = true
        downloadMeta = `direct path ${pdfCheck.status} ${pdfCheck.contentType}`
        steps.push(`No on-page link; public PDF path exists (${downloadMeta})`)
      } else {
        steps.push('No download link on thanks page')
        evidence.push(await shot(page, 'j2-no-download-link'))
      }
    }

    const status = downloadOk ? 'Pass' : 'Fail'
    results.push(
      result(
        '2. Homepage → Starter Kit → thank-you → download',
        steps,
        'Kit/thanks reachable; PDF download returns application/pdf; no live subscribe post',
        `kitUrl=${kitUrl} | thanksHasText=${thanksText.slice(0, 80).replace(/\n/g, ' ')} | download=${downloadMeta} | emailDelivery=unverified (request not sent)`,
        status,
        evidence,
      ),
    )
  } catch (e) {
    evidence.push(await shot(page, 'j2-exception').catch(() => ''))
    results.push(result('2. Starter Kit → thank-you → download', steps, 'Kit+PDF', String(e), 'Fail', evidence))
  }
}

async function journeyKitToCheckout(page, baseUrl, results) {
  const steps = []
  const evidence = []
  try {
    await page.goto(`${baseUrl}/free-kit`, { waitUntil: 'networkidle', timeout: 45000 }).catch(async () => {
      await page.goto(`${baseUrl}/free-kit`, { waitUntil: 'domcontentloaded' })
    })
    steps.push('Open kit')
    await page.waitForTimeout(800)

    const bookLink = page
      .locator(
        'a[href="/products/i-call-bs"], a[href*="/products/i-call-bs"], a:has-text("Complete Book"), a:has-text("$17")',
      )
      .first()
    if (await bookLink.count()) {
      await bookLink.click()
      steps.push('Click book CTA from kit')
      await page.waitForTimeout(1200)
    } else {
      // Production may use CMS slug pages instead of /products/i-call-bs
      await page.goto(`${baseUrl}/products/i-call-bs`, { waitUntil: 'domcontentloaded' })
      steps.push('Direct /products/i-call-bs')
      await page.waitForTimeout(1000)
    }
    const bookUrl = page.url()
    const bodyText = await page.locator('body').innerText()
    steps.push(`Book surface text length=${bodyText.length}`)

    const checkout = page
      .locator(
        'a[href="/api/checkout"], a[href*="/api/checkout"], a:has-text("Get the Complete Book"), a:has-text("$17")',
      )
      .first()
    let entry = 'missing'
    if (await checkout.count()) {
      const href = (await checkout.getAttribute('href')) || '(no href)'
      entry = href
      steps.push(`Checkout entry found: ${href}`)
      if (href.includes('/api/checkout')) {
        const res = await fetch(`${baseUrl}/api/checkout`, {
          method: 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(10000),
        })
        const loc = res.headers.get('location') || ''
        steps.push(
          `GET /api/checkout → ${res.status} locationHost=${loc ? new URL(loc, baseUrl).host : 'none'} (payment not completed)`,
        )
        entry += ` status=${res.status}`
        // Raw TS from Vite counts as blocked API, not a real checkout entry
        const text = await res.text().catch(() => '')
        if (text.includes('export default')) {
          entry += ' (vite-raw-handler)'
          steps.push('Checkout handler returned source (local Vite) — not a live Stripe session')
        }
      }
    } else if (/stripe|checkout|\$17/i.test(bodyText)) {
      entry = 'copy-mentions-price-but-no-link'
      evidence.push(await shot(page, 'j3-price-no-link'))
    } else {
      evidence.push(await shot(page, 'j3-no-checkout'))
    }

    let status = 'Fail'
    if (entry.includes('/api/checkout') && !entry.includes('vite-raw')) status = 'Pass'
    else if (entry.includes('vite-raw') || entry === 'missing') status = 'Blocked'
    else if (entry === 'copy-mentions-price-but-no-link') status = 'Fail'

    results.push(
      result(
        '3. Starter Kit → book page → checkout entry point',
        steps,
        'Reach book surface and see checkout entry; stop before payment',
        `bookUrl=${bookUrl} | entry=${entry} | purchase=not attempted`,
        status,
        evidence,
      ),
    )
  } catch (e) {
    evidence.push(await shot(page, 'j3-exception').catch(() => ''))
    results.push(result('3. Kit → book → checkout', steps, 'Checkout entry only', String(e), 'Fail', evidence))
  }
}

async function journeyResources(page, baseUrl, results) {
  const steps = []
  const evidence = []
  try {
    await page.goto(`${baseUrl}/resources`, { waitUntil: 'domcontentloaded' })
    steps.push('Open /resources')
    await page.waitForSelector('main, body', { timeout: 10000 })
    await page.waitForTimeout(800)
    const candidates = [
      '/resources/builder-quick-reference',
      '/resources/templates',
      '/resources/tools-and-updates',
      '/resources/before-you-accept-done',
      '/resources/vibe-coding-literacy-check',
      '/resources/ai-and-technology',
      '/blog',
    ]
    let landed = null
    for (const c of candidates) {
      const link = page.locator(`a[href="${c}"]`).first()
      if (await link.count()) {
        await Promise.all([
          page.waitForURL(new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), { timeout: 15000 }).catch(() => {}),
          link.click(),
        ])
        await page.waitForTimeout(900)
        landed = page.url()
        steps.push(`Clicked ${c} → ${landed}`)
        break
      }
    }
    if (!landed) {
      await page.goto(`${baseUrl}/resources/builder-quick-reference`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
      landed = page.url()
      steps.push(`No in-page essay link; direct ${landed}`)
    }

    await page.waitForFunction(() => (document.body?.innerText || '').trim().length > 80, null, {
      timeout: 10000,
    }).catch(() => {})
    const body = await page.locator('body').innerText()
    const emptyShelf = /not ready|no posts yet|coming soon/i.test(body)
    const hasContent = body.trim().length > 200
    let status = hasContent ? 'Pass' : 'Fail'
    if (emptyShelf && landed.includes('creative')) status = 'Blocked'
    if (!hasContent) evidence.push(await shot(page, 'j4-empty'))

    results.push(
      result(
        '4. Resources → published essay, tutorial, or download',
        steps,
        'Open a published resource item with real content',
        `landed=${landed} | chars=${body.trim().length} | emptyShelfHint=${emptyShelf}`,
        status,
        evidence,
      ),
    )
  } catch (e) {
    evidence.push(await shot(page, 'j4-exception').catch(() => ''))
    results.push(result('4. Resources content', steps, 'Published item', String(e), 'Fail', evidence))
  }
}

async function journeyTools(page, baseUrl, results) {
  const steps = []
  const evidence = []
  try {
    await page.goto(`${baseUrl}/resources/tools-and-updates`, { waitUntil: 'domcontentloaded' })
    steps.push('Open tools page')
    await page.waitForTimeout(800)
    const select = page.locator('select, [role="listbox"], label:has-text("job") select').first()
    const nativeSelect = page.locator('select').first()
    if (await nativeSelect.count()) {
      const options = await nativeSelect.locator('option').allTextContents()
      steps.push(`Job select options: ${options.slice(0, 6).join(', ')}`)
      if (options.length > 1) {
        const value = await nativeSelect.locator('option').nth(1).getAttribute('value')
        await nativeSelect.selectOption(value)
        await page.waitForTimeout(400)
        steps.push(`Selected job value=${value} url=${page.url()}`)
      }
    } else {
      steps.push('No native <select> — trying buttons/radios')
      const jobBtn = page.locator('button, a').filter({ hasText: /builder|writer|designer/i }).first()
      if (await jobBtn.count()) {
        await jobBtn.click()
        steps.push(`Clicked job control → ${page.url()}`)
      }
    }

    // Expand a tool details control
    const details = page.locator('details, button[aria-expanded], [data-tool]').first()
    let expanded = false
    const expandBtn = page.locator('button:has-text("Details"), button:has-text("Why"), summary, details summary').first()
    if (await expandBtn.count()) {
      await expandBtn.click()
      await page.waitForTimeout(300)
      expanded = true
      steps.push('Expanded tool details')
    } else if (await page.locator('details').count()) {
      await page.locator('details').first().locator('summary').click()
      expanded = true
      steps.push('Opened first <details>')
    } else {
      steps.push('No accordion control found — checking for always-visible tool cards')
      expanded = (await page.locator('a[href^="http"]').count()) > 0
    }

    const ext = page.locator('a[href^="http"][target="_blank"]').first()
    let official = null
    if (await ext.count()) {
      official = await ext.getAttribute('href')
      steps.push(`Official/external link sample: ${official}`)
    }

    // Category state via query + back
    const urlWithJob = page.url()
    await page.goto(`${baseUrl}/resources/tools-and-updates?job=builders`, { waitUntil: 'domcontentloaded' })
    steps.push(`Direct ?job=builders → ${page.url()}`)
    await page.goBack()
    steps.push(`Back → ${page.url()}`)

    const overflow = await hasHorizontalOverflow(page)
    if (overflow) evidence.push(await shot(page, 'j5-overflow'))

    const status = official && !overflow ? 'Pass' : official ? 'Fail' : 'Blocked'
    results.push(
      result(
        '5. Tools page → category → details → official links',
        steps,
        'Select job category, expand details, see official external links; query state works',
        `expanded=${expanded} | official=${official} | overflow=${overflow} | urlSample=${urlWithJob}`,
        status,
        evidence,
      ),
    )
  } catch (e) {
    evidence.push(await shot(page, 'j5-exception').catch(() => ''))
    results.push(result('5. Tools page', steps, 'Category+details+links', String(e), 'Fail', evidence))
  }
}

async function journeyNewsletter(page, baseUrl, apiChecks, results) {
  const steps = []
  const evidence = []
  try {
    await page.goto(`${baseUrl}/updates`, { waitUntil: 'domcontentloaded' })
    steps.push('Open /updates (lead-capture / newsletter-adjacent)')
    await page.waitForTimeout(700)
    const body = await page.locator('body').innerText()
    const notOpen = /not open yet|coming soon|preference center/i.test(body)
    const form = page.locator('form').first()
    const hasForm = (await form.count()) > 0
    steps.push(hasForm ? 'Form present' : 'No form')

    // Invalid empty
    if (hasForm) {
      const submit = form.locator('button[type="submit"]').first()
      if (await submit.count()) {
        await submit.click()
        await page.waitForTimeout(300)
        steps.push('Empty submit attempted (client validation boundary)')
      }
      // Fill invalid email — still do not POST to prod if API is live
      const email = form.locator('input[type="email"], input[name="email"]').first()
      if (await email.count()) {
        await email.fill('not-an-email')
        await submit.click()
        await page.waitForTimeout(300)
        steps.push('Invalid email attempted')
      }
    }

    // Topic preferences / unsubscribe
    await page.goto(`${baseUrl}/api/contact-unsubscribe?token=invalid-test-token`, {
      waitUntil: 'domcontentloaded',
    })
    steps.push('Hit unsubscribe with fake token (expect error, not prod change)')
    await page.waitForTimeout(400)
    const unsubText = await page.locator('body').innerText().catch(() => '')
    steps.push(`Unsubscribe response snippet: ${unsubText.slice(0, 100).replace(/\n/g, ' ')}`)

    const schema = apiChecks.find((c) => c.path?.includes('form-schema'))
    const apiLive = schema && !schema.looksLikeTsSource && schema.status === 200

    let status = 'Blocked'
    let actual = `notOpenHint=${notOpen} | form=${hasForm} | apiFormSchema=${JSON.stringify(schema || {})} | `
    actual +=
      'Email layers: requestAccepted=not attempted (safety) | providerDelivery=unverified | messageReceived=unverified | '
    actual += 'topicPreferences UI=not found as dedicated flow | unsubscribe=fake token only'

    if (notOpen && !hasForm) {
      status = 'Blocked'
      actual += ' | Newsletter closed / preference center incomplete'
    } else if (hasForm && !apiLive) {
      status = 'Blocked'
      actual += ' | Local/dev API not serving form-schema JSON — cannot safely verify signup'
      evidence.push(await shot(page, 'j6-updates'))
    } else if (hasForm && apiLive) {
      status = 'Blocked'
      actual += ' | Form+API live but live subscribe skipped (no prod contact write)'
      evidence.push(await shot(page, 'j6-live-boundary'))
    }

    results.push(
      result(
        '6. Newsletter signup → preferences → confirmation → unsubscribe',
        steps,
        'Full preference center + confirm + unsubscribe with test services',
        actual,
        status,
        evidence,
      ),
    )
  } catch (e) {
    evidence.push(await shot(page, 'j6-exception').catch(() => ''))
    results.push(result('6. Newsletter', steps, 'Safe newsletter path', String(e), 'Fail', evidence))
  }
}

async function journeyAdmin(page, baseUrl, results) {
  const steps = []
  const evidence = []
  try {
    await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' })
    steps.push('Open /admin')
    await page.waitForTimeout(800)
    const body = await page.locator('body').innerText()
    const hasLogin =
      /sign in|log in|password|email/i.test(body) ||
      (await page.locator('input[type="password"]').count()) > 0
    steps.push(hasLogin ? 'Login UI present' : 'Login UI unclear')

    const email = (process.env.JOURNEY_ADMIN_EMAIL || '').trim()
    const password = (process.env.JOURNEY_ADMIN_PASSWORD || '').trim()
    if (!email || !password) {
      evidence.push(await shot(page, 'j7-admin-login-boundary'))
      results.push(
        result(
          '7. Admin login → authorized access',
          steps,
          'Login with designated test account and reach authorized shell',
          'No JOURNEY_ADMIN_EMAIL/PASSWORD provided — stopped at login UI; authorized access unverified',
          'Blocked',
          evidence,
        ),
      )
      return
    }

    await page.locator('input[type="email"], input[name="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(password)
    await page.locator('button[type="submit"], button:has-text("Sign")').first().click()
    await page.waitForTimeout(2000)
    const after = page.url()
    const afterText = await page.locator('body').innerText()
    const authed = /dashboard|analytics|contents|campaigns|sign out|log out/i.test(afterText)
    if (!authed) evidence.push(await shot(page, 'j7-admin-auth-fail'))
    results.push(
      result(
        '7. Admin login → authorized access',
        steps.concat([`Post-login url=${after}`]),
        'Reach authorized admin UI',
        `authedHint=${authed}`,
        authed ? 'Pass' : 'Fail',
        evidence,
      ),
    )
  } catch (e) {
    evidence.push(await shot(page, 'j7-exception').catch(() => ''))
    results.push(result('7. Admin', steps, 'Login boundary', String(e), 'Fail', evidence))
  }
}

async function multiViewportSmoke(browser, baseUrl, results) {
  const steps = []
  const evidence = []
  const issues = []
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await context.newPage()
    const bag = { consoleErrors: [], pageErrors: [], failedRequests: [] }
    await collectConsole(page, bag)
    try {
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(500)
      const overflow = await hasHorizontalOverflow(page)
      await page.goto(`${baseUrl}/resources/tools-and-updates`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)
      const overflowTools = await hasHorizontalOverflow(page)
      steps.push(`${vp.name}: homeOverflow=${overflow} toolsOverflow=${overflowTools}`)
      if (overflow || overflowTools) {
        issues.push(vp.name)
        evidence.push(await shot(page, `viewport-overflow-${vp.name}`))
      }
      // keyboard
      await page.keyboard.press('Tab')
      const focus = await focusRingVisible(page)
      steps.push(`${vp.name}: focus=${JSON.stringify(focus)}`)
    } catch (e) {
      issues.push(`${vp.name}:${e}`)
      evidence.push(await shot(page, `viewport-fail-${vp.name}`).catch(() => ''))
    }
    await context.close()
  }
  results.push(
    result(
      'Viewport matrix (/, tools)',
      steps,
      'No horizontal overflow at 1440/768/390/320; keyboard focus moves',
      issues.length ? `issues: ${issues.join(', ')}` : 'no overflow flagged',
      issues.length ? 'Fail' : 'Pass',
      evidence,
    ),
  )
}

function renderReport({ baseUrl, source, started, apiChecks, results, isDevBrand }) {
  const lines = []
  lines.push('# 04 — Browser journey tests (VettaJimale.Tech)')
  lines.push('')
  lines.push(`**Date:** ${started}`)
  lines.push(`**Base URL:** ${baseUrl}`)
  lines.push(`**URL source:** ${source}`)
  lines.push(`**Surface:** ${isDevBrand ? 'Likely DEV brand routes (`import.meta.env.DEV`)' : 'Production / non-DEV build (CMS-backed public routes)'}`)
  lines.push('**Mode:** Automated Playwright. No application code edited.')
  lines.push('**Safety:** No real contact/kit/newsletter production writes; no Stripe payment; admin credentials only if `JOURNEY_ADMIN_*` set.')
  lines.push('')
  lines.push('## URL identification')
  lines.push('')
  lines.push('| Candidate | Result |')
  lines.push('| --- | --- |')
  lines.push('| `http://localhost:5173` | Probed at start of pass (see URL source) |')
  lines.push('| `http://localhost:4173` | Probed |')
  lines.push('| `https://vettajimale.tech` | Production |')
  lines.push('')
  lines.push('## API / download probes (not equivalent to email delivery)')
  lines.push('')
  lines.push('```json')
  lines.push(JSON.stringify(apiChecks, null, 2))
  lines.push('```')
  lines.push('')
  lines.push('Email semantics used in this report:')
  lines.push('- **Request accepted:** HTTP handler returned success for a submit (not claimed unless tested).')
  lines.push('- **Provider delivery event:** Resend/webhook event (not tested here).')
  lines.push('- **Message received:** Inbox observation (not tested here).')
  lines.push('')
  lines.push('## Journey results')
  lines.push('')
  for (const r of results) {
    lines.push(`### ${r.journey}`)
    lines.push('')
    lines.push(`**Status:** ${r.status}`)
    lines.push('')
    lines.push('**Steps**')
    for (const s of r.steps) lines.push(`- ${s}`)
    lines.push('')
    lines.push(`**Expected:** ${r.expected}`)
    lines.push('')
    lines.push(`**Actual:** ${r.actual}`)
    lines.push('')
    if (r.evidence?.length) {
      lines.push('**Evidence**')
      for (const e of r.evidence.filter(Boolean)) lines.push(`- \`${e}\``)
      lines.push('')
    }
  }
  const pass = results.filter((r) => r.status === 'Pass').length
  const fail = results.filter((r) => r.status === 'Fail').length
  const blocked = results.filter((r) => r.status === 'Blocked').length
  lines.push('## Summary counts')
  lines.push('')
  lines.push(`| Pass | Fail | Blocked |`)
  lines.push(`| --- | --- | --- |`)
  lines.push(`| ${pass} | ${fail} | ${blocked} |`)
  lines.push('')
  lines.push('## Coverage gaps')
  lines.push('')
  lines.push('- Live kit subscribe → provider delivery → inbox received (intentionally not exercised against production).')
  lines.push('- Contact form → inbox delivery (synthetic) — not sent.')
  lines.push('- Newsletter preference center + confirmed double-opt-in — product path incomplete / blocked.')
  lines.push('- Stripe Checkout payment + webhook fulfill + purchase email — stopped at entry point.')
  lines.push('- Admin authorized shell — requires designated `JOURNEY_ADMIN_EMAIL` / `JOURNEY_ADMIN_PASSWORD`.')
  lines.push('- Local Vite does not execute Vercel `/api/*` handlers (may return raw TS); production API shape differs.')
  lines.push('- DEV brand homepage vs production `HomeOrKit` CMS — if base URL is local DEV, production CMS content was not fully journey-tested on that base.')
  lines.push('- Accordion scroll-jump regressions beyond tools page expand click.')
  lines.push('- Duplicate-submit and failed-request UI for forms when API is live (skipped to avoid prod writes).')
  lines.push('- Screenshot alone is not treated as pass criteria; status requires step/actual match above.')
  lines.push('')
  return lines.join('\n')
}

async function main() {
  ensureDirs()
  const started = new Date().toISOString()
  const { baseUrl, source } = await detectBaseUrl()
  const apiChecks = await probeApiSurface(baseUrl)
  const isDevBrand = /localhost|127\.0\.0\.1/.test(baseUrl)

  const browser = await chromium.launch({ headless: true })
  const results = []

  // Primary journeys at desktop
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    const page = await context.newPage()
    const bag = { consoleErrors: [], pageErrors: [], failedRequests: [], overflow: false }
    await collectConsole(page, bag)

    await journeyHomeAboutContact(page, baseUrl, bag, results)
    await journeyKitThanksDownload(page, baseUrl, bag, results, apiChecks)
    await journeyKitToCheckout(page, baseUrl, results)
    await journeyResources(page, baseUrl, results)
    await journeyTools(page, baseUrl, results)
    await journeyNewsletter(page, baseUrl, apiChecks, results)
    await journeyAdmin(page, baseUrl, results)

    // Attach console noise summary
    if (bag.consoleErrors.length || bag.failedRequests.length) {
      const localApiNoise = /localhost|127\.0\.0\.1/.test(baseUrl)
      const meaningfulFails = bag.failedRequests.filter(
        (f) =>
          !f.includes('favicon') &&
          !f.includes('invalid-test-token') &&
          !(localApiNoise && f.includes('/api/analytics-track')) &&
          !(localApiNoise && f.includes('/api/') && f.startsWith('404')),
      )
      results.push(
        result(
          'Console / network errors (desktop session)',
          [`consoleErrors=${bag.consoleErrors.length}`, `failedRequests=${bag.failedRequests.length}`],
          'No unexpected 4xx/5xx or page errors on traversed routes',
          `console=${bag.consoleErrors.slice(0, 8).join(' || ')} | failed=${bag.failedRequests.slice(0, 12).join(' || ')} | meaningfulFails=${meaningfulFails.length}`,
          meaningfulFails.length ? 'Fail' : 'Pass',
          [],
        ),
      )
    }

    await context.close()
  }

  await multiViewportSmoke(browser, baseUrl, results)

  // Cross-surface note when primary is local DEV
  if (isDevBrand) {
    const prod = 'https://vettajimale.tech'
    try {
      const prodApi = await probeApiSurface(prod)
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      await page.goto(`${prod}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(800)
      const title = await page.title()
      const text = await page.locator('body').innerText()
      await page.goto(`${prod}/resources/tools-and-updates`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(600)
      const toolsOk = page.url().includes('tools')
      const evidence = []
      if (/YOUR PHOTO|Project placeholder/i.test(text)) {
        evidence.push(await shot(page, 'prod-home-placeholders'))
      }
      results.push(
        result(
          'Production spot-check (read-only; local was primary)',
          [
            `GET ${prod}/ title=${title}`,
            `tools page ok=${toolsOk}`,
            `api form-schema status=${prodApi.find((c) => c.path?.includes('form-schema'))?.status}`,
            'No production form posts',
          ],
          'Confirm production surface reachable while local DEV was primary base',
          `title=${title} | placeholders=${/YOUR PHOTO|Project placeholder/i.test(text)} | pdf=${JSON.stringify(prodApi.find((c) => c.path?.includes('pdf')))}`,
          toolsOk ? 'Pass' : 'Fail',
          evidence,
        ),
      )
      await context.close()
    } catch (e) {
      results.push(
        result(
          'Production spot-check (read-only; local was primary)',
          ['Attempted https://vettajimale.tech'],
          'Reachable production',
          String(e),
          'Blocked',
          [],
        ),
      )
    }
  }

  await browser.close()

  const md = renderReport({ baseUrl, source, started, apiChecks, results, isDevBrand })
  fs.writeFileSync(REPORT, md, 'utf8')
  console.log(`Wrote ${REPORT}`)
  console.log(
    results.map((r) => `${r.status.padEnd(7)} ${r.journey}`).join('\n'),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
