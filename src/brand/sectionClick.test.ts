import { describe, expect, it } from 'vitest'
import { clickIsOnWidget, clickSelectsWidget, columnPickFromNode } from './sectionClick'

describe('clickIsOnWidget', () => {
  it('does not treat empty clicks as a widget', () => {
    expect(clickIsOnWidget(null)).toBe(false)
  })
})

describe('columnPickFromNode', () => {
  it('returns nothing off the canvas', () => {
    expect(columnPickFromNode(null)).toBe(null)
  })
})

describe('clickSelectsWidget', () => {
  it('does not treat empty padding as a widget', () => {
    expect(clickSelectsWidget({ target: null, clientX: 0, clientY: 0 })).toBe(false)
  })

  it('keeps a dropped empty text box clickable', () => {
    if (typeof document === 'undefined') return
    const host = document.createElement('div')
    host.setAttribute('data-widget-box', '')
    host.setAttribute('data-empty-widget', '')
    const inner = document.createElement('span')
    host.appendChild(inner)
    document.body.appendChild(host)
    expect(clickSelectsWidget({ target: inner, clientX: 0, clientY: 0 })).toBe(true)
    host.remove()
  })
})
