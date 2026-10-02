import { lazy, Suspense, type ReactNode } from 'react'
import type { PublishedPageDocument } from '../studio/types'

const StudioPageView = lazy(() => import('../studio/pages/PublisherSitePageDetailPage'))

export function isStudioDocument(doc: unknown): doc is PublishedPageDocument {
  return typeof doc === 'object' && doc !== null && (doc as { format?: unknown }).format === 'blocks'
}

export default function PublicPage({ title, document, fallback }: { title: string; document: unknown; fallback: ReactNode }) {
  if (!isStudioDocument(document)) return <>{fallback}</>
  return (
    <Suspense
      fallback={
        <main>
          <section className="sec cream" style={{ minHeight: '40vh' }} />
        </main>
      }
    >
      <StudioPageView title={title} document={document} />
    </Suspense>
  )
}
