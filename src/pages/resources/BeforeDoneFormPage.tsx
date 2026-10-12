import {
  beforeDoneDownloadFilename,
  emptyBeforeDoneForm,
  serializeBeforeDoneMarkdown,
  type BeforeDoneChecks,
  type BeforeDoneForm,
} from '../../lib/resources/beforeDoneTemplate'
import { formHasUserContent } from '../../lib/resources/formDraft'
import { CheckField, FormSection, TextField } from './formFields'
import ResourcePageShell, { ResourceFooterMeta } from './ResourcePageShell'
import TemplateDownloadActions from './TemplateDownloadActions'
import { useTemplateFormDraft } from './useTemplateFormDraft'

const CHECK_LABELS: { key: keyof BeforeDoneChecks; label: string }[] = [
  { key: 'pageLoads', label: 'Relevant page loads and the app starts.' },
  { key: 'userPath', label: 'The actual user path produces the expected result.' },
  { key: 'dataSurvives', label: 'Expected saved data survives refresh or return.' },
  { key: 'boundaryCase', label: 'Relevant empty, error, or boundary case is checked.' },
  { key: 'relatedFlows', label: 'Related flows still work.' },
  { key: 'accessSession', label: 'Access/session behavior is checked if affected.' },
  { key: 'diffScope', label: 'Diff matches scope and exposes no real secrets.' },
  { key: 'automatedChecks', label: 'Relevant automated checks run; results recorded.' },
  { key: 'realServices', label: 'Real service actions are checked in a suitable test environment if affected.' },
]

export default function BeforeDoneFormPage() {
  const [form, setForm] = useTemplateFormDraft<BeforeDoneForm>('before-done', emptyBeforeDoneForm)
  const set =
    (key: Exclude<keyof BeforeDoneForm, 'checks'>) =>
    (value: string) =>
      setForm((prev) => ({ ...prev, [key]: value }))
  const setCheck =
    (key: keyof BeforeDoneChecks) =>
    (checked: boolean) =>
      setForm((prev) => ({ ...prev, checks: { ...prev.checks, [key]: checked } }))

  const body = serializeBeforeDoneMarkdown(form)
  const mdName = beforeDoneDownloadFilename(form)
  const canDownload = formHasUserContent(form)

  return (
    <ResourcePageShell title="Before You Accept Done">
      <nav aria-label="Breadcrumb" className="k o">
        <a href="/resources">Resources</a> / <a href="/resources/templates">Templates</a> / Before You Accept Done
      </nav>
      <h1>Before You Accept Done</h1>
      <p className="resource-lede">
        Check one change at a time, then download your filled receipt as Markdown or PDF. Drafts stay in this browser
        until you clear the fields.
      </p>

      <form
        className="resource-form"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <FormSection title="This change">
          <TextField label="Change" value={form.change} onChange={set('change')} multiline />
          <TextField label="Date" value={form.date} onChange={set('date')} />
          <TextField label="Branch and baseline" value={form.branchBaseline} onChange={set('branchBaseline')} />
          <TextField label="Expected behavior" value={form.expected} onChange={set('expected')} multiline />
          <TextField label="Must keep working" value={form.mustKeep} onChange={set('mustKeep')} multiline />
        </FormSection>

        <FormSection title="Check the change">
          <div className="resource-form-checks">
            {CHECK_LABELS.map((item) => (
              <CheckField
                key={item.key}
                label={item.label}
                checked={form.checks[item.key]}
                onChange={setCheck(item.key)}
              />
            ))}
          </div>
        </FormSection>

        <FormSection title="Keep the evidence">
          <TextField label="Steps performed" value={form.steps} onChange={set('steps')} multiline />
          <TextField label="Actual result" value={form.result} onChange={set('result')} multiline />
          <TextField label="Evidence location" value={form.evidence} onChange={set('evidence')} />
          <TextField label="Not checked" value={form.notChecked} onChange={set('notChecked')} multiline />
          <TextField label="Remaining issues" value={form.remaining} onChange={set('remaining')} multiline />
          <TextField label="Decision" value={form.decision} onChange={set('decision')} hint="Ready / needs work" />
          <TextField label="Verified commit" value={form.verifiedCommit} onChange={set('verifiedCommit')} />
          <TextField label="Next step" value={form.nextStep} onChange={set('nextStep')} multiline />
        </FormSection>
      </form>

      <TemplateDownloadActions
        markdownFilename={mdName}
        pdfTitle="Before You Accept Done"
        body={body}
        canDownload={canDownload}
      />
      <ResourceFooterMeta />
    </ResourcePageShell>
  )
}
