import type { Plugin } from 'vite'
import { loadEnv } from 'vite'

const SLUG = /^vj-[a-z0-9-]{1,64}$/

/** Dev-only. Reads unpublished vj-* drafts with the service role. Never bundled into the client. */
export function brandDraftPlugin(): Plugin {
  return {
    name: 'brand-draft-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (url.pathname !== '/api/dev-brand-draft') {
          next()
          return
        }
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end()
          return
        }
        void readDraft(server.config.root, server.config.mode, url.searchParams.get('slug') ?? '')
          .then((body) => {
            res.statusCode = body ? 200 : 404
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(body ?? { error: 'Draft not found' }))
          })
          .catch(() => {
            res.statusCode = 503
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Draft preview is not configured' }))
          })
      })
    },
  }
}

async function readDraft(root: string, mode: string, slug: string): Promise<{ title: string; seoTitle: string; blocks: unknown } | null> {
  if (!SLUG.test(slug)) return null
  const env = loadEnv(mode, root, '')
  const supabaseUrl = env.SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !key) throw new Error('Missing draft preview configuration')
  const endpoint = new URL('/rest/v1/contents', supabaseUrl)
  endpoint.searchParams.set('kind', 'eq.page')
  endpoint.searchParams.set('slug', `eq.${slug}`)
  endpoint.searchParams.set('status', 'eq.draft')
  endpoint.searchParams.set('select', 'title,seo_title,content_blocks')
  const response = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!response.ok) throw new Error('Draft read failed')
  const rows = (await response.json()) as Array<{ title?: string; seo_title?: string | null; content_blocks?: unknown }>
  const row = rows[0]
  if (!row || !Array.isArray(row.content_blocks) || row.content_blocks.length === 0) return null
  return {
    title: row.title ?? '',
    seoTitle: row.seo_title ?? '',
    blocks: row.content_blocks,
  }
}
