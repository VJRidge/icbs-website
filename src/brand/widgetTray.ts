import { create } from 'zustand'

/** Left-panel + opens this list. It does not add a section. */
export const useWidgetTray = create<{
  open: boolean
  show: () => void
  hide: () => void
}>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}))
