import { describe, expect, it } from 'vitest'
import { previewScreen } from './previewScreen'

describe('previewScreen', () => {
  it('treats the phone and tablet editor frames as narrow', () => {
    expect(previewScreen(390)).toBe('phone')
    expect(previewScreen(768)).toBe('tablet')
    expect(previewScreen(1280)).toBe('desktop')
  })
})
