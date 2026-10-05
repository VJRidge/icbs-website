import { type ReactNode } from 'react'
import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import { normalizeColumnZones } from '../studio/lib/blog/columnLayouts'
import { BrandColumnGrid } from './BrandColumnGrid'
import { columnModeOf } from './sectionActions'

export function BrandFlexibleColumns({
  block,
  editing,
  children,
}: {
  block: BlogBlock
  editing: boolean
  children: ReactNode
}) {
  const mode = columnModeOf(block.data)
  return (
    <BrandColumnGrid block={block} editing={editing} className="vj-sec-cols" sizing={mode === 'grid' ? 'grid' : 'always'}>
      {children}
    </BrandColumnGrid>
  )
}

export function sectionIsEmpty(block: BlogBlock) {
  return normalizeColumnZones(block.data.columns, String(block.data.layout ?? '100')).every((zone) => zone.blocks.length === 0)
}
