import { env, supabase } from './_lib.js'
import {
  buildRssXml,
  collectDiscoveryEntries,
  type DiscoveryPublishedRow,
} from './_discovery.js'

/**
 * Public RSS feed of published posts only.
 * GET /api/rss  (rewritten from /feed.xml and /rss.xml)
 */
export default async function handler(_req: any, res: any) {
  try {
    const siteUrl = env('SITE_URL').replace(/\/+$/, '')
    const settings = await supabase(
      'settings?id=eq.1&select=site_name,site_description,homepage_content_id&limit=1',
    )
    const site = settings?.[0] || {}
    const homepageContentId = (site.homepage_content_id as string | null) || null

    const rows = (await supabase(
      'published_contents?select=id,kind,slug,title,seo_description,public_path,content_type_key,published_at,updated_at&kind=eq.post&order=published_at.desc.nullslast&limit=50',
    )) as DiscoveryPublishedRow[]

    const entries = collectDiscoveryEntries(rows || [], { homepageContentId }, siteUrl)
    const xml = buildRssXml({
      siteUrl,
      siteName: String(site.site_name || 'I Call BS'),
      siteDescription: String(site.site_description || ''),
      items: entries.map((e) => ({
        title: String(e.row.title || e.row.slug || 'Post'),
        path: e.path,
        description: String(e.row.seo_description || ''),
        publishedAt: e.row.published_at || null,
      })),
    })

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')
    return res.status(200).send(xml)
  } catch (err) {
    console.error('[rss]', err)
    return res.status(500).send('Feed unavailable')
  }
}
