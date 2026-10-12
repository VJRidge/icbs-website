import { describe, expect, it } from 'vitest'
import { emptyBeforeDoneForm, serializeBeforeDoneMarkdown } from './beforeDoneTemplate'

describe('serializeBeforeDoneMarkdown', () => {
  it('marks checked items with [x]', () => {
    const form = emptyBeforeDoneForm()
    form.change = 'Empty-state message'
    form.checks.pageLoads = true
    form.checks.userPath = true
    const md = serializeBeforeDoneMarkdown(form)
    expect(md).toContain('Change: Empty-state message')
    expect(md).toContain('- [x] Relevant page loads')
    expect(md).toContain('- [x] The actual user path')
    expect(md).toContain('- [ ] Related flows still work')
    expect(md).not.toContain('Fictional example')
  })
})
