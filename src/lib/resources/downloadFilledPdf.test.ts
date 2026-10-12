import { describe, expect, it } from 'vitest'
import { pdfFilenameFromMarkdown } from './downloadFilledPdf'

describe('pdfFilenameFromMarkdown', () => {
  it('swaps .md for .pdf', () => {
    expect(pdfFilenameFromMarkdown('ROADMAP.md')).toBe('ROADMAP.pdf')
    expect(pdfFilenameFromMarkdown('PROJECT-RULES-notes.md')).toBe('PROJECT-RULES-notes.pdf')
  })
})
