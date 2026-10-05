import { createContext, useContext } from 'react'

export type BrandEditApi = {
  selectedField: string | null
  setField: (key: string, value: string) => void
  /** Opens the media library. `label` is the left-panel field this file fills. */
  pickImage: (onPick: (url: string) => void, label?: string) => void
  /** Scrolls the left panel to this field and marks it on the canvas. */
  focusField: (key: string) => void
  hideField: (key: string) => void
  showField: (key: string) => void
  /** Updates one field on a card, project, or screenshot in this section. */
  setItem: (index: number, key: string, value: string) => void
}

export const BrandEditContext = createContext<BrandEditApi | null>(null)

export function useBrandEdit(): BrandEditApi | null {
  return useContext(BrandEditContext)
}
