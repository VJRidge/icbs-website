import { describe, expect, it } from 'vitest'
import { emptyProjectRulesForm, serializeProjectRulesMarkdown } from './projectRulesTemplate'

describe('serializeProjectRulesMarkdown', () => {
  it('writes filled purpose and scope fields', () => {
    const md = serializeProjectRulesMarkdown({
      ...emptyProjectRulesForm(),
      product: 'Notes app',
      user: 'readers',
      job: 'save book notes',
      outcome: 'empty-state message',
    })
    expect(md).toContain('We are building Notes app for readers to accomplish save book notes.')
    expect(md).toContain('Implement the agreed outcome: empty-state message.')
    expect(md).not.toContain('Fictional')
  })
})
