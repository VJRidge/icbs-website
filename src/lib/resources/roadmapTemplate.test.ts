import { describe, expect, it } from 'vitest'
import { emptyRoadmapForm, serializeRoadmapMarkdown } from './roadmapTemplate'

describe('serializeRoadmapMarkdown', () => {
  it('fills bracket fields into a project ROADMAP.md body', () => {
    const md = serializeRoadmapMarkdown({
      ...emptyRoadmapForm(),
      project: 'Reading Notes',
      updated: '2026-10-06',
      owner: 'Alex',
      purposeUser: 'reader',
      purposeJob: 'save a short book note',
      purposeScope: 'local dummy notes',
      purposeDeferred: 'accounts and payments',
      nowOutcome: 'Add empty-state message',
      nowBranch: 'feature/empty-state',
      nowCommit: 'abc123',
      nowFiles: 'src/NotesList.tsx',
      nowMustKeep: 'create, edit, delete notes',
      nowCheck: 'Message only when list is empty',
      done: 'Saved one note — Evidence: stayed after refresh — Commit: abc120',
      next: '1. Verify empty state\n2. Check delete-last path',
      blocked: 'Deploy — Blocked by: no staging — Next action: ask for host — Owner: Alex',
      decisions: '2026-10-05: Use localStorage for practice data',
      checkChange: 'Empty-state copy',
      checkExpected: 'Shows only with zero notes',
      checkSteps: 'Cleared list, refreshed',
      checkResult: 'Message appeared',
      checkNotChecked: 'Mobile layout',
      checkOpen: 'None',
      handoffCompleted: 'Empty-state message',
      handoffInProgress: 'None',
      handoffNext: 'Commit and open PR',
      handoffDoNotTouch: 'auth/',
    })

    expect(md).toContain('# Project Roadmap')
    expect(md).toContain('Project: Reading Notes')
    expect(md).toContain('Owner: Alex')
    expect(md).toContain('One outcome: Add empty-state message')
    expect(md).not.toContain('[name]')
    expect(md).not.toContain('Fictional')
  })

  it('keeps placeholders when a field is blank', () => {
    const md = serializeRoadmapMarkdown(emptyRoadmapForm())
    expect(md).toContain('Project: [name]')
    expect(md).toContain('One outcome: [specific change]')
  })
})
