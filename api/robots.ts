import { env } from './_lib.js'
import { buildRobotsTxt } from './_discovery.js'

/**
 * Public robots.txt. Blocks studio and preview; points at the CMS sitemap.
 * GET /api/robots  (rewritten from /robots.txt)
 */
export default async function handler(_req: any, res: any) {
  try {
    const siteUrl = env('SITE_URL').replace(/\/+$/, '')
    const body = buildRobotsTxt(siteUrl)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
    return res.status(200).send(body)
  } catch (err) {
    console.error('[robots]', err)
    return res.status(500).send('robots.txt unavailable')
  }
}
