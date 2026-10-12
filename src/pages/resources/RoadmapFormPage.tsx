import {
  emptyRoadmapForm,
  roadmapDownloadFilename,
  serializeRoadmapMarkdown,
  type RoadmapForm,
} from '../../lib/resources/roadmapTemplate'
import { formHasUserContent } from '../../lib/resources/formDraft'
import { FormSection, TextField } from './formFields'
import ResourcePageShell, { ResourceFooterMeta } from './ResourcePageShell'
import TemplateDownloadActions from './TemplateDownloadActions'
import { useTemplateFormDraft } from './useTemplateFormDraft'

export default function RoadmapFormPage() {
  const [form, setForm] = useTemplateFormDraft<RoadmapForm>('roadmap', emptyRoadmapForm)
  const set =
    (key: keyof RoadmapForm) =>
    (value: string) =>
      setForm((prev) => ({ ...prev, [key]: value }))

  const body = serializeRoadmapMarkdown(form)
  const mdName = roadmapDownloadFilename(form)
  const canDownload = formHasUserContent(form)

  return (
    <ResourcePageShell title="ROADMAP template">
      <nav aria-label="Breadcrumb" className="k o">
        <a href="/resources">Resources</a> / <a href="/resources/templates">Templates</a> / ROADMAP
      </nav>
      <h1>Project ROADMAP</h1>
      <p className="resource-lede">
        Fill the fields for your real project, then download Markdown for your repo or PDF for a printable copy. Drafts
        stay in this browser until you clear the fields.
      </p>

      <form
        className="resource-form"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <FormSection title="Project">
          <TextField label="Project name" value={form.project} onChange={set('project')} />
          <TextField label="Updated" value={form.updated} onChange={set('updated')} hint="Date you last revised this" />
          <TextField label="Owner" value={form.owner} onChange={set('owner')} />
        </FormSection>

        <FormSection title="Purpose">
          <TextField label="Who it helps" value={form.purposeUser} onChange={set('purposeUser')} />
          <TextField label="Job to be done" value={form.purposeJob} onChange={set('purposeJob')} />
          <TextField label="Smallest useful scope" value={form.purposeScope} onChange={set('purposeScope')} multiline />
          <TextField label="Deferred for later" value={form.purposeDeferred} onChange={set('purposeDeferred')} multiline />
        </FormSection>

        <FormSection title="Now">
          <TextField label="One outcome" value={form.nowOutcome} onChange={set('nowOutcome')} multiline />
          <TextField label="Current branch" value={form.nowBranch} onChange={set('nowBranch')} />
          <TextField label="Known-good commit" value={form.nowCommit} onChange={set('nowCommit')} />
          <TextField label="Relevant files" value={form.nowFiles} onChange={set('nowFiles')} multiline />
          <TextField label="Must keep working" value={form.nowMustKeep} onChange={set('nowMustKeep')} multiline />
          <TextField label="Completion check" value={form.nowCheck} onChange={set('nowCheck')} multiline />
        </FormSection>

        <FormSection title="Done, next, blocked">
          <TextField
            label="Done"
            value={form.done}
            onChange={set('done')}
            hint="Verified outcome — evidence — commit"
            multiline
          />
          <TextField label="Next" value={form.next} onChange={set('next')} multiline rows={4} />
          <TextField label="Blocked" value={form.blocked} onChange={set('blocked')} multiline />
          <TextField label="Decisions" value={form.decisions} onChange={set('decisions')} multiline />
        </FormSection>

        <FormSection title="Checks and evidence">
          <TextField label="Change" value={form.checkChange} onChange={set('checkChange')} />
          <TextField label="Expected" value={form.checkExpected} onChange={set('checkExpected')} multiline />
          <TextField label="Checked" value={form.checkSteps} onChange={set('checkSteps')} multiline />
          <TextField label="Result" value={form.checkResult} onChange={set('checkResult')} multiline />
          <TextField label="Not checked" value={form.checkNotChecked} onChange={set('checkNotChecked')} multiline />
          <TextField label="Open issues" value={form.checkOpen} onChange={set('checkOpen')} multiline />
        </FormSection>

        <FormSection title="Session handoff">
          <TextField label="Completed" value={form.handoffCompleted} onChange={set('handoffCompleted')} multiline />
          <TextField label="In progress" value={form.handoffInProgress} onChange={set('handoffInProgress')} multiline />
          <TextField label="Next safe step" value={form.handoffNext} onChange={set('handoffNext')} multiline />
          <TextField label="Do not touch" value={form.handoffDoNotTouch} onChange={set('handoffDoNotTouch')} multiline />
        </FormSection>
      </form>

      <TemplateDownloadActions
        markdownFilename={mdName}
        pdfTitle="Project ROADMAP"
        body={body}
        canDownload={canDownload}
      />
      <ResourceFooterMeta />
    </ResourcePageShell>
  )
}
