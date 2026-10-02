import { lazy, Suspense, type ReactNode } from 'react'
import type { PublishedPageDocument } from '../studio/types'

const StudioPageView = lazy(() => import('../studio/pages/PublisherSitePageDetailPage'))
const KitLandingView = lazy(() => import('../studio/pages/KitLandingView'))

export function isStudioDocument(doc: unknown): doc is PublishedPageDocument {
  return typeof doc === 'object' && doc !== null && (doc as { format?: unknown }).format === 'blocks'
}

function isKitOnly(doc: PublishedPageDocument): boolean {
  if (doc.layout !== 'landing' || !Array.isArray(doc.blocks) || doc.blocks.length === 0) return false
  return doc.blocks.every((b) => String((b as { type?: unknown })?.type ?? '').startsWith('kit_'))
}

export default function PublicPage({ title, document, fallback }: { title: string; document: unknown; fallback: ReactNode }) {
  if (!isStudioDocument(document)) return <>{fallback}</>
  const View = isKitOnly(document) ? KitLandingView : StudioPageView
  return (
    <Suspense
      fallback={
        <main>
          <section className="sec green" style={{ minHeight: '40vh' }} />
        </main>
      }
    >
      <View title={title} document={document} />
    </Suspense>
  )
}
