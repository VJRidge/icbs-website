/**
 * Writes the local brand seed into unpublished vj-* drafts.
 * Service role stays in this process. Does not publish or change the homepage slot.
 */
import { loadEnv } from 'vite'
import { brandDrafts, brandPages } from '../src/brand/pages.ts'

const env = loadEnv('development', process.cwd(), '')
const supabaseUrl = env.SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !key) {
  console.error('Draft sync needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
}

async function authorId(): Promise<string | null> {
  const endpoint = new URL('/rest/v1/contents', supabaseUrl)
  endpoint.searchParams.set('kind', 'eq.page')
  endpoint.searchParams.set('slug', 'eq.vj-home')
  endpoint.searchParams.set('select', 'author_id')
  const response = await fetch(endpoint, { headers })
  if (!response.ok) throw new Error(`Could not read the existing home draft (${response.status})`)
  const rows = (await response.json()) as Array<{ author_id?: string | null }>
  return rows[0]?.author_id ?? null
}

const author = await authorId()
let updated = 0
let created = 0

const leaveAlone = new Set(['vj-home'])

for (const draft of brandDrafts) {
  if (leaveAlone.has(draft.slug)) {
    console.log(`${draft.slug} left alone`)
    continue
  }
  const page = brandPages[draft.id]
  const endpoint = new URL('/rest/v1/contents', supabaseUrl)
  endpoint.searchParams.set('on_conflict', 'kind,slug')
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      kind: 'page',
      slug: draft.slug,
      title: page.title,
      status: 'draft',
      layout: 'landing',
      body: '',
      content_blocks: page.blocks,
      seo_title: page.seo,
      seo: { title: page.seo, description: '' },
      published_document: null,
      published_at: null,
      ...(author ? { author_id: author } : {}),
    }),
  })
  if (!response.ok) {
    console.error(`${draft.slug} failed (${response.status})`)
    process.exit(1)
  }
  const rows = (await response.json()) as Array<{ created_at?: string; updated_at?: string }>
  const row = rows[0]
  const isNew = row?.created_at && row.updated_at && row.created_at === row.updated_at
  if (isNew) created += 1
  else updated += 1
  console.log(`${draft.slug} ${isNew ? 'created' : 'updated'}`)
}

console.log(`done created=${created} updated=${updated}`)
