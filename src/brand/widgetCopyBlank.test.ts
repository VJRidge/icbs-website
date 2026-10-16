import { describe, expect, it } from 'vitest'
import { widgetCopyIsBlank } from './widgetCopyBlank'

describe('widgetCopyIsBlank', () => {
  it('treats a dropped text editor with no copy as blank', () => {
    expect(widgetCopyIsBlank({ type: 'paragraph', data: { text: '' } })).toBe(true)
    expect(widgetCopyIsBlank({ type: 'paragraph', data: { text: '<p></p>' } })).toBe(true)
    expect(widgetCopyIsBlank({ type: 'paragraph', data: { text: '<p>&nbsp;</p>' } })).toBe(true)
  })

  it('keeps a heading or paragraph with words', () => {
    expect(widgetCopyIsBlank({ type: 'heading', data: { text: 'Explore' } })).toBe(false)
    expect(widgetCopyIsBlank({ type: 'paragraph', data: { text: '<p>Hello</p>' } })).toBe(false)
  })

  it('ignores other widgets', () => {
    expect(widgetCopyIsBlank({ type: 'image', data: {} })).toBe(false)
  })
})
