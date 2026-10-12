import { describe, expect, it } from 'vitest'
import { blankFormPreviewFilename, buildBlankFormPreviewPdf } from './blankFormPreview'

describe('blankFormPreview', () => {
  it('builds a PDF blob for each blank form', () => {
    for (const id of ['roadmap', 'project-rules', 'before-you-accept-done'] as const) {
      const { blob, filename, title } = buildBlankFormPreviewPdf(id)
      expect(blob.size).toBeGreaterThan(500)
      expect(filename).toBe(blankFormPreviewFilename(id))
      expect(title.toLowerCase()).toContain('blank')
    }
  })
})
