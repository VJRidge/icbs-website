/** Set while a width slider or canvas gutter is writing live column widths. */
let resizingId: string | null = null

export function setLiveColumnWidths(blockId: string | null) {
  resizingId = blockId
}

export function liveColumnWidthsId() {
  return resizingId
}
