import { nanoid } from 'nanoid'
import { BLOG_BLOCK_DEFAULTS, type BlogBlock, type BlogBlockType } from './blogBlockTypes'
import { normalizeColumnZones } from './columnLayouts'

export const STYLE_KEYS = [
  'align',
  'color',
  'backgroundColor',
  'fontSize',
  'fontFamily',
  'fontWeight',
  'textColor',
  'size',
  'buttonWidth',
  'marginTop',
  'marginBottom',
  'paddingY',
  'customClass',
] as const

export type EditorDevice = 'desktop' | 'tablet' | 'mobile'

export const DEVICE_WIDTH: Record<EditorDevice, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
}

export function stylePatchFor(block: BlogBlock): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const key of STYLE_KEYS) {
    if (key in block.data) patch[key] = block.data[key]
  }
  if (block.data.responsive && typeof block.data.responsive === 'object') {
    patch.responsive = JSON.parse(JSON.stringify(block.data.responsive)) as Record<string, unknown>
  }
  return patch
}

export function pasteStylePatch(source: BlogBlock, target: BlogBlock): Record<string, unknown> | null {
  if (source.type !== target.type) return null
  const defaults = (BLOG_BLOCK_DEFAULTS as Record<string, Record<string, unknown>>)[target.type as BlogBlockType] ?? {}
  const patch: Record<string, unknown> = {}
  for (const key of STYLE_KEYS) {
    if (key in source.data && (key in defaults || key in target.data)) patch[key] = source.data[key]
  }
  if (source.data.responsive && typeof source.data.responsive === 'object') {
    patch.responsive = JSON.parse(JSON.stringify(source.data.responsive)) as Record<string, unknown>
  }
  return patch
}

export function readDeviceOverride(data: Record<string, unknown>, device: EditorDevice): Record<string, unknown> {
  if (device === 'desktop') return {}
  const bag = data.responsive
  if (!bag || typeof bag !== 'object' || Array.isArray(bag)) return {}
  const slice = (bag as Record<string, unknown>)[device]
  if (!slice || typeof slice !== 'object' || Array.isArray(slice)) return {}
  return slice as Record<string, unknown>
}

export function withDeviceOverride(
  data: Record<string, unknown>,
  device: Exclude<EditorDevice, 'desktop'>,
  key: string,
  value: string,
): Record<string, unknown> {
  const bag = data.responsive && typeof data.responsive === 'object' && !Array.isArray(data.responsive)
    ? { ...(data.responsive as Record<string, unknown>) }
    : {}
  const current = readDeviceOverride(data, device)
  const next = { ...current }
  if (!value.trim()) delete next[key]
  else next[key] = value
  return { responsive: { ...bag, [device]: next } }
}

export function clearDeviceOverride(data: Record<string, unknown>, device: Exclude<EditorDevice, 'desktop'>): Record<string, unknown> {
  const bag = data.responsive && typeof data.responsive === 'object' && !Array.isArray(data.responsive)
    ? { ...(data.responsive as Record<string, unknown>) }
    : {}
  delete bag[device]
  return { responsive: bag }
}

export function applyDevice(block: BlogBlock, device: EditorDevice): BlogBlock {
  if (device === 'desktop') return block
  const over = readDeviceOverride(block.data, device)
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(over)) {
    if (value == null || value === '') continue
    patch[key] = value
  }
  if (Object.keys(patch).length === 0) return block
  return { ...block, data: { ...block.data, ...patch } }
}

export function regenerateBlockIds(block: BlogBlock, keepId?: string): BlogBlock {
  const data = JSON.parse(JSON.stringify(block.data)) as Record<string, unknown>
  if (block.type === 'columns') {
    const layout = String(data.layout ?? '50-50')
    const zones = normalizeColumnZones(data.columns, layout)
    data.columns = zones.map((zone) => ({
      blocks: zone.blocks.map((nested) => regenerateBlockIds(nested)),
    }))
  }
  return { id: keepId || nanoid(), type: block.type, data }
}

export function topLevelForSelection(blocks: BlogBlock[], selectedId: string | null): BlogBlock | null {
  if (!selectedId) return null
  const direct = blocks.find((block) => block.id === selectedId)
  if (direct) return direct
  for (const block of blocks) {
    if (block.type !== 'columns') continue
    const zones = normalizeColumnZones(block.data.columns, String(block.data.layout ?? '50-50'))
    const hit = zones.some((zone) => zone.blocks.some((nested) => nested.id === selectedId))
    if (hit) return block
  }
  return null
}
