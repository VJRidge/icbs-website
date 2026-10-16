import { Children, Fragment, useState, type CSSProperties, type ReactNode } from 'react'
import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import {
  COLUMN_GUTTER_PX,
  defaultWidthsForLayout,
  gridTemplateFromWidths,
  gridTemplateWithGutters,
  gutteredGridTemplate,
  layoutForColumnCount,
  normalizeColumnWidths,
  resizedColumnWidths,
} from '../studio/lib/blog/columnLayouts'
import BrandColumnGutter from './BrandColumnGutters'
import { readColumnGap } from './columnLayout'
import { liveColumnWidthsId, setLiveColumnWidths } from './liveColumnWidths'

export type ColumnSizing = 'always' | 'grid' | 'custom'
export { setLiveColumnWidths }

function templateWidths(block: BlogBlock, count: number, sizing: ColumnSizing): number[] | null {
  const layout = layoutForColumnCount(String(block.data.layout ?? '50-50'), count)
  const raw = block.data.columnWidths
  const live = liveColumnWidthsId() === block.id && Array.isArray(raw) && raw.length === count
  if (live) return raw.map((n) => Number(n))
  if (sizing === 'always') return normalizeColumnWidths(layout, raw)
  if (sizing === 'grid') return resizedColumnWidths(layout, block.data.columnWidths) ?? defaultWidthsForLayout(layout)
  return resizedColumnWidths(layout, block.data.columnWidths)
}

function cssTemplate(className: string, count: number, plainTemplate?: string): string {
  if (className.includes('vj-split')) return '1.15fr 0.85fr'
  if (className.includes('vj-product')) return '160px 1fr'
  if (plainTemplate) return plainTemplate
  return `repeat(${Math.max(count, 1)}, 1fr)`
}

export function BrandColumnGrid({
  block,
  editing,
  className,
  sizing,
  plainTemplate,
  children,
}: {
  block: BlogBlock
  editing: boolean
  className: string
  sizing: ColumnSizing
  /** Used when a designed row has no saved resize yet, such as repeat(n, 1fr). */
  plainTemplate?: string
  children: ReactNode
}) {
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const items = Children.toArray(children)
  const count = items.length
  const widths = templateWidths(block, count, sizing)
  const showGutters = Boolean(editing && count > 1)

  const style: CSSProperties & { '--vj-cols'?: string } = {}
  const columnGap = readColumnGap(block.data)
  const gutterPx = Math.max(COLUMN_GUTTER_PX, columnGap ?? COLUMN_GUTTER_PX)

  if (showGutters) {
    const cols = widths
      ? gridTemplateWithGutters(widths, gutterPx)
      : gutteredGridTemplate(cssTemplate(className, count, plainTemplate), gutterPx)
    style['--vj-cols'] = cols
    style.gridTemplateColumns = cols
    style.columnGap = 0
  } else {
    if (widths) style['--vj-cols'] = gridTemplateFromWidths(widths)
    else if (plainTemplate) style.gridTemplateColumns = plainTemplate
    if (columnGap != null) style.columnGap = columnGap
  }

  return (
    <div
      ref={setHost}
      data-col-grid=""
      className={`${className} vj-col-grid${widths || showGutters ? ' vj-col-custom' : ''}`}
      style={style}
    >
      {items.map((child, index) => (
        <Fragment key={`col-${index}`}>
          {child}
          {showGutters && index < count - 1 ? (
            <BrandColumnGutter block={block} index={index} count={count} host={host} />
          ) : null}
        </Fragment>
      ))}
    </div>
  )
}
