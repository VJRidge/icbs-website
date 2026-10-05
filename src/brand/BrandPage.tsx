import { useEffect, useState } from 'react'
import { parseBlogBlocks } from '../studio/lib/blog/useBlogEditorStore'
import BrandBlockView from './BrandBlocks'
import BrandChrome from './BrandChrome'
import { brandDrafts, brandPages, type BrandPageDoc, type BrandPageId } from './pages'

function headerCta(page: BrandPageDoc): { label: string; href: string } {
  const data = page.blocks[0]?.data
  const label = typeof data?.headerLabel === 'string' ? data.headerLabel.trim() : ''
  const href = typeof data?.headerHref === 'string' ? data.headerHref.trim() : ''
  if (label && href) return { label, href }
  return page.cta
}

function pageFromDraft(raw: unknown, seed: BrandPageDoc): BrandPageDoc | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as { title?: unknown; seoTitle?: unknown; blocks?: unknown }
  const blocks = parseBlogBlocks(row.blocks)
  if (blocks.length === 0) return null
  const title = typeof row.title === 'string' && row.title.trim() ? row.title : seed.title
  const seo = typeof row.seoTitle === 'string' && row.seoTitle.trim() ? row.seoTitle : title
  return { title, seo, cta: seed.cta, blocks }
}

export default function BrandPage({ id }: { id: BrandPageId }) {
  const seed = brandPages[id]
  const [page, setPage] = useState(seed)

  useEffect(() => {
    setPage(seed)
    const slug = brandDrafts.find((draft) => draft.id === id)?.slug
    if (!import.meta.env.DEV || !slug) return
    const controller = new AbortController()
    fetch(`/api/dev-brand-draft?slug=${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((raw) => {
        const next = pageFromDraft(raw, seed)
        if (next) setPage(next)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [id, seed])

  useEffect(() => {
    document.title = page.seo
  }, [page.seo])

  return (
    <BrandChrome cta={headerCta(page)}>
      {page.blocks.map((block) => <BrandBlockView key={block.id} block={block} />)}
    </BrandChrome>
  )
}
