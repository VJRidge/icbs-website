import { describe, expect, it } from 'vitest'
import { clickIsOnWidget } from './sectionClick'

describe('clickIsOnWidget', () => {
  it('does not treat empty clicks as a widget', () => {
    expect(clickIsOnWidget(null)).toBe(false)
  })
})
