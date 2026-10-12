export type BeforeDoneChecks = {
  pageLoads: boolean
  userPath: boolean
  dataSurvives: boolean
  boundaryCase: boolean
  relatedFlows: boolean
  accessSession: boolean
  diffScope: boolean
  automatedChecks: boolean
  realServices: boolean
}

export type BeforeDoneForm = {
  change: string
  date: string
  branchBaseline: string
  expected: string
  mustKeep: string
  checks: BeforeDoneChecks
  steps: string
  result: string
  evidence: string
  notChecked: string
  remaining: string
  decision: string
  verifiedCommit: string
  nextStep: string
}

function orPlaceholder(value: string, placeholder: string): string {
  const trimmed = value.trim()
  return trimmed || placeholder
}

function box(on: boolean): string {
  return on ? '[x]' : '[ ]'
}

export function emptyBeforeDoneForm(): BeforeDoneForm {
  return {
    change: '',
    date: '',
    branchBaseline: '',
    expected: '',
    mustKeep: '',
    checks: {
      pageLoads: false,
      userPath: false,
      dataSurvives: false,
      boundaryCase: false,
      relatedFlows: false,
      accessSession: false,
      diffScope: false,
      automatedChecks: false,
      realServices: false,
    },
    steps: '',
    result: '',
    evidence: '',
    notChecked: '',
    remaining: '',
    decision: '',
    verifiedCommit: '',
    nextStep: '',
  }
}

export function serializeBeforeDoneMarkdown(form: BeforeDoneForm): string {
  const f = form
  const c = f.checks
  return `# Before You Accept Done

Use this checklist for one change at a time. Write down what you actually checked. Mark irrelevant items N/A with a reason. It is not a complete security audit or launch approval.

Change: ${orPlaceholder(f.change, '[describe]')}
Date: ${orPlaceholder(f.date, '[date]')}
Branch and baseline: ${orPlaceholder(f.branchBaseline, '[details]')}
Expected behavior: ${orPlaceholder(f.expected, '[observable result]')}
Must keep working: ${orPlaceholder(f.mustKeep, '[related flows]')}

## Check the change

- ${box(c.pageLoads)} Relevant page loads and the app starts.
- ${box(c.userPath)} The actual user path produces the expected result.
- ${box(c.dataSurvives)} Expected saved data survives refresh or return.
- ${box(c.boundaryCase)} Relevant empty, error, or boundary case is checked.
- ${box(c.relatedFlows)} Related flows still work.
- ${box(c.accessSession)} Access/session behavior is checked if affected.
- ${box(c.diffScope)} Diff matches scope and exposes no real secrets.
- ${box(c.automatedChecks)} Relevant automated checks run; results recorded.
- ${box(c.realServices)} Real service actions are checked in a suitable test environment if affected.

## Keep the evidence

Steps performed: ${orPlaceholder(f.steps, '[steps]')}
Actual result: ${orPlaceholder(f.result, '[result]')}
Evidence location: ${orPlaceholder(f.evidence, '[non-sensitive file/screenshot/test output]')}
Not checked: ${orPlaceholder(f.notChecked, '[items and reasons]')}
Remaining issues: ${orPlaceholder(f.remaining, '[issues]')}
Decision: ${orPlaceholder(f.decision, '[ready for this scoped change / needs work]')}
Verified commit: ${orPlaceholder(f.verifiedCommit, '[identifier, after committing]')}
Next step: ${orPlaceholder(f.nextStep, '[step]')}
`
}

export function beforeDoneDownloadFilename(form: BeforeDoneForm): string {
  const slug = form.change
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return slug ? `BEFORE-YOU-ACCEPT-DONE-${slug}.md` : 'BEFORE-YOU-ACCEPT-DONE.md'
}
