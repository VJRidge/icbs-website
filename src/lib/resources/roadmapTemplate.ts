export type RoadmapForm = {
  project: string
  updated: string
  owner: string
  purposeUser: string
  purposeJob: string
  purposeScope: string
  purposeDeferred: string
  nowOutcome: string
  nowBranch: string
  nowCommit: string
  nowFiles: string
  nowMustKeep: string
  nowCheck: string
  done: string
  next: string
  blocked: string
  decisions: string
  checkChange: string
  checkExpected: string
  checkSteps: string
  checkResult: string
  checkNotChecked: string
  checkOpen: string
  handoffCompleted: string
  handoffInProgress: string
  handoffNext: string
  handoffDoNotTouch: string
}

function orPlaceholder(value: string, placeholder: string): string {
  const trimmed = value.trim()
  return trimmed || placeholder
}

export function emptyRoadmapForm(): RoadmapForm {
  return {
    project: '',
    updated: '',
    owner: '',
    purposeUser: '',
    purposeJob: '',
    purposeScope: '',
    purposeDeferred: '',
    nowOutcome: '',
    nowBranch: '',
    nowCommit: '',
    nowFiles: '',
    nowMustKeep: '',
    nowCheck: '',
    done: '',
    next: '',
    blocked: '',
    decisions: '',
    checkChange: '',
    checkExpected: '',
    checkSteps: '',
    checkResult: '',
    checkNotChecked: '',
    checkOpen: '',
    handoffCompleted: '',
    handoffInProgress: '',
    handoffNext: '',
    handoffDoNotTouch: '',
  }
}

export function serializeRoadmapMarkdown(form: RoadmapForm): string {
  const f = form
  return `# Project Roadmap

Project: ${orPlaceholder(f.project, '[name]')}
Updated: ${orPlaceholder(f.updated, '[date]')}
Owner: ${orPlaceholder(f.owner, '[name]')}

## How to use this file

Copy this file into your project as ROADMAP.md. Keep the Now section short enough for someone new to understand the next task. Move verified work to Done; do not mark something done merely because an AI said it worked. Do not store passwords, keys, or private user information here.

## Purpose

This project helps ${orPlaceholder(f.purposeUser, '[reader or user]')} do ${orPlaceholder(f.purposeJob, '[specific job]')}.
The smallest useful version includes ${orPlaceholder(f.purposeScope, '[scope]')}.
It does not yet include ${orPlaceholder(f.purposeDeferred, '[deferred features]')}.

## Now

One outcome: ${orPlaceholder(f.nowOutcome, '[specific change]')}
Current branch: ${orPlaceholder(f.nowBranch, '[branch]')}
Known-good commit: ${orPlaceholder(f.nowCommit, '[commit identifier]')}
Relevant files: ${orPlaceholder(f.nowFiles, '[paths]')}
Must keep working: ${orPlaceholder(f.nowMustKeep, '[flows]')}
Completion check: ${orPlaceholder(f.nowCheck, '[observable result]')}

## Done

- ${orPlaceholder(f.done, '[verified outcome] — Evidence: [check/result] — Commit: [identifier]')}

## Next

${orPlaceholder(f.next, '1. [one scoped task]\n2. [next task]\n3. [later task]')}

## Blocked

- ${orPlaceholder(f.blocked, '[task] — Blocked by: [reason] — Next action: [action] — Owner: [name]')}

## Decisions

- ${orPlaceholder(f.decisions, '[date]: [decision and reason]')}

## Checks and evidence

- Change: ${orPlaceholder(f.checkChange, '[what changed]')}
- Expected: ${orPlaceholder(f.checkExpected, '[what should happen]')}
- Checked: ${orPlaceholder(f.checkSteps, '[steps performed]')}
- Result: ${orPlaceholder(f.checkResult, '[actual result]')}
- Not checked: ${orPlaceholder(f.checkNotChecked, '[limitations]')}
- Open issues: ${orPlaceholder(f.checkOpen, '[issues]')}

## Session handoff

Completed: ${orPlaceholder(f.handoffCompleted, '[work]')}
In progress: ${orPlaceholder(f.handoffInProgress, '[work]')}
Next safe step: ${orPlaceholder(f.handoffNext, '[step]')}
Do not touch: ${orPlaceholder(f.handoffDoNotTouch, '[paths/flows]')}
`
}

export function roadmapDownloadFilename(form: RoadmapForm): string {
  const slug = form.project
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug ? `ROADMAP-${slug}.md` : 'ROADMAP.md'
}
