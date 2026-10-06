import { env, supabase } from './_lib.js'
import {
  absoluteUrl,
  buildSitemapXml,
  collectDiscoveryEntries,
  type DiscoveryPublishedRow,
} from './_discovery.js'

/**
 * Public sitemap built only from published_contents (+ homepage remap).
 * GET /api/sitemap  (rewritten from /sitemap.xml)
 */
export default async function handler(_req: any, res: any) {
  try {
    const siteUrl = env('SITE_URL').replace(/\/+$/, '')
    const settings = await supabase('settings?id=eq.1&select=homepage_content_id&limit=1')
    const homepageContentId = (settings?.[0]?.homepage_content_id as string | null) || null

    const rows = (await supabase(
      'published_contents?select=id,kind,slug,title,public_path,content_type_key,published_at,updated_at&order=published_at.desc.nullslast&limit=2000',
    )) as DiscoveryPublishedRow[]

    const entries = collectDiscoveryEntries(rows || [], { homepageContentId }, siteUrl)
    // Ensure the site root is listed even when homepage is a built-in fallback.
    if (!entries.some((e) => e.path === '/')) {
      entries.unshift({
        path: '/',
        loc: absoluteUrl(siteUrl, '/'),
        lastmod: null,
        row: {
          id: '',
          kind: 'page',
          slug: '',
        },
      })
    }

    const xml = buildSitemapXml(entries.map((e) => ({ loc: e.loc, lastmod: e.lastmod })))
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')
    return res.status(200).send(xml)
  } catch (err) {
    console.error('[sitemap]', err)
    return res.status(500).send('Sitemap unavailable')
  }
}
