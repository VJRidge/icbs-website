import { describe, expect, it } from 'vitest'
import type { BlogBlock } from '../studio/lib/blog/blogBlockTypes'
import { wrapLooseBlocksInSections } from './sectionActions'
import { isReusableEmptySection, withoutUnusedEmptySections } from './sectionEmpty'

function columns(id: string, extra: Partial<BlogBlock['data']> = {}): BlogBlock {
  return {
    id,
    type: 'columns',
    data: {
      layout: '100',
      columns: [{ blocks: [] }],
      structureChosen: false,
      ...extra,
    },
  }
}

describe('reusable empty sections', () => {
  it('treats an unused empty columns block as reusable', () => {
    expect(isReusableEmptySection(columns('a'))).toBe(true)
    expect(isReusableEmptySection(columns('b', { structureChosen: true }))).toBe(false)
    expect(
      isReusableEmptySection(
        columns('c', { columns: [{ blocks: [{ id: 'h', type: 'heading', data: {} }] }] }),
      ),
    ).toBe(false)
  })

  it('drops leftover empty containers unless this session just added one', () => {
    const filled: BlogBlock = { id: 'p', type: 'paragraph', data: {} }
    const empty = columns('empty')
    expect(withoutUnusedEmptySections([filled, empty], null).map((block) => block.id)).toEqual(['p'])
    expect(withoutUnusedEmptySections([filled, empty], 'empty').map((block) => block.id)).toEqual(['p', 'empty'])
    const stable = [filled]
    expect(withoutUnusedEmptySections(stable, null)).toBe(stable)
  })
})

describe('wrapLooseBlocksInSections', () => {
  it('puts a loose paragraph inside a one-column section', () => {
    const wrapped = wrapLooseBlocksInSections([{ id: 'p', type: 'paragraph', data: { text: 'Hi' } }])
    expect(wrapped).toHaveLength(1)
    expect(wrapped[0].type).toBe('columns')
    const zones = wrapped[0].data.columns as Array<{ blocks: BlogBlock[] }>
    expect(zones[0].blocks[0].id).toBe('p')
  })
})
