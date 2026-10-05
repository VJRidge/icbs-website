import type { BlogBlock } from './blogBlockTypes'

const HISTORY_LIMIT = 50

export type WidgetHistoryEntry = {
  label: string
  blocks: BlogBlock[]
}

export function cloneBlocks(blocks: BlogBlock[]): BlogBlock[] {
  return JSON.parse(JSON.stringify(blocks)) as BlogBlock[]
}

/** Store the blocks from before a structural change, with a short label for that change. */
export function pushHistory(past: WidgetHistoryEntry[], blocks: BlogBlock[], label: string): WidgetHistoryEntry[] {
  const next = [...past, { label, blocks: cloneBlocks(blocks) }]
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
}
