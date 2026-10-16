import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import { normalizeColumnZones } from '../studio/lib/blog/columnLayouts'

export function sectionColumnsAreEmpty(block: BlogBlock): boolean {
  return normalizeColumnZones(block.data.columns, String(block.data.layout ?? '100')).every(
    (zone) => zone.blocks.length === 0,
  )
}

/** Unused Flexbox/Grid placeholder — not a real section until the author picks a layout. */
export function isReusableEmptySection(block: BlogBlock | undefined): boolean {
  return Boolean(
    block && block.type === 'columns' && block.data.structureChosen !== true && sectionColumnsAreEmpty(block),
  )
}

let keptEmptySectionId: string | null = null

export function keepAddedEmptySection(id: string | null) {
  keptEmptySectionId = id
}

export function peekKeptEmptySection() {
  return keptEmptySectionId
}

export function withoutUnusedEmptySections(blocks: BlogBlock[], keepId = keptEmptySectionId): BlogBlock[] {
  if (blocks.every((block) => !isReusableEmptySection(block) || block.id === keepId)) return blocks
  return blocks.filter((block) => !isReusableEmptySection(block) || block.id === keepId)
}
