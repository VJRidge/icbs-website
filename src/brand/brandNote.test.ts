import { describe, expect, it } from 'vitest'
import { noteAnchor, noteParagraphs } from './brandNote'

describe('noteParagraphs', () => {
  it('returns empty when items is missing', () => {
    expect(noteParagraphs({})).toEqual([])
  })

  it('keeps non-empty text in order and drops blanks', () => {
    expect(
      noteParagraphs({
        items: [{ text: 'First.' }, { text: '  ' }, { text: 'Third.' }, null],
      }),
    ).toEqual(['First.', 'Third.'])
  })
})

describe('noteAnchor', () => {
  it('trims the stored anchor', () => {
    expect(noteAnchor({ anchor: '  from-book-page  ' })).toBe('from-book-page')
  })
})
