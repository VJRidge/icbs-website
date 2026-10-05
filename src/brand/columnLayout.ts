import type { CSSProperties } from 'react'

/** Per-column vertical alignment. Empty inherits the current top-aligned stack. */
export const COLUMN_V_ALIGNS = ['top', 'center', 'bottom'] as const
/** Per-column horizontal alignment. Empty inherits stretch, the brand column default. */
export const COLUMN_H_ALIGNS = ['left', 'center', 'right'] as const

export type ColumnVAlign = (typeof COLUMN_V_ALIGNS)[number]
export type ColumnHAlign = (typeof COLUMN_H_ALIGNS)[number]

const SLOT_KEYS = ['columnVAlign', 'columnHAlign', 'columnWidgetGap'] as const
const GAP_MAX = 200

function slotAt(raw: unknown, index: number): unknown {
  return Array.isArray(raw) ? raw[index] : undefined
}

export function readColumnVAlign(data: Record<string, unknown>, index: number): ColumnVAlign | '' {
  const value = String(slotAt(data.columnVAlign, index) ?? '')
  return (COLUMN_V_ALIGNS as readonly string[]).includes(value) ? (value as ColumnVAlign) : ''
}

export function readColumnHAlign(data: Record<string, unknown>, index: number): ColumnHAlign | '' {
  const value = String(slotAt(data.columnHAlign, index) ?? '')
  return (COLUMN_H_ALIGNS as readonly string[]).includes(value) ? (value as ColumnHAlign) : ''
}

function readGap(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > GAP_MAX) return null
  return Math.round(n)
}

/** Pixels between widgets in one column. Null inherits the section's current spacing. */
export function readColumnWidgetGap(data: Record<string, unknown>, index: number): number | null {
  return readGap(slotAt(data.columnWidgetGap, index))
}

/** Pixels between columns. Null leaves the section's CSS gap alone. */
export function readColumnGap(data: Record<string, unknown>): number | null {
  return readGap(data.columnGap)
}

export function withColumnSlot(raw: unknown, count: number, index: number, value: unknown): unknown[] {
  const next = Array.from({ length: count }, (_, i) => (Array.isArray(raw) ? (raw[i] ?? null) : null))
  if (index >= 0 && index < count) next[index] = value
  return next
}

/** Keep per-column layout values with the column when one is removed or duplicated. */
export function shiftColumnLayout(data: Record<string, unknown>, index: number, mode: 'drop' | 'copy'): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const key of SLOT_KEYS) {
    const raw = data[key]
    if (!Array.isArray(raw)) continue
    const next = [...raw]
    if (mode === 'drop') {
      if (index < 0 || index >= next.length) continue
      next.splice(index, 1)
    } else {
      const value = index >= 0 && index < next.length ? next[index] : null
      next.splice(index + 1, 0, value)
    }
    patch[key] = next
  }
  return patch
}

/** Flex stack for one column. Empty alignment and gap add nothing, so existing rows stay put. */
export function columnStackAttrs(data: Record<string, unknown>, index: number): { className: string; style?: CSSProperties } {
  const y = readColumnVAlign(data, index)
  const x = readColumnHAlign(data, index)
  const gap = readColumnWidgetGap(data, index)
  if (!y && !x && gap == null) return { className: '' }
  const style: CSSProperties = { display: 'flex', flexDirection: 'column' }
  if (y === 'top') style.justifyContent = 'flex-start'
  if (y === 'center') {
    style.justifyContent = 'center'
    style.alignSelf = 'stretch'
  }
  if (y === 'bottom') {
    style.justifyContent = 'flex-end'
    style.alignSelf = 'stretch'
  }
  if (x === 'left') style.alignItems = 'flex-start'
  if (x === 'center') style.alignItems = 'center'
  if (x === 'right') style.alignItems = 'flex-end'
  if (gap != null) style.gap = gap
  const className = [y ? `vj-col-y-${y}` : '', x ? `vj-col-x-${x}` : '', gap != null ? 'vj-col-widgets' : '']
    .filter(Boolean)
    .join(' ')
  return { className, style }
}
