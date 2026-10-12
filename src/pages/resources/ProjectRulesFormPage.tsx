import {
  emptyProjectRulesForm,
  projectRulesDownloadFilename,
  serializeProjectRulesMarkdown,
  type ProjectRulesForm,
} from '../../lib/resources/projectRulesTemplate'
import { formHasUserContent } from '../../lib/resources/formDraft'
import { FormSection, TextField } from './formFields'
import ResourcePageShell, { ResourceFooterMeta } from './ResourcePageShell'
import TemplateDownloadActions from './TemplateDownloadActions'
import { useTemplateFormDraft } from './useTemplateFormDraft'

export default function ProjectRulesFormPage() {
  const [form, setForm] = useTemplateFormDraft<ProjectRulesForm>('project-rules', emptyProjectRulesForm)
  const set =
    (key: keyof ProjectRulesForm) =>
    (value: string) =>
      setForm((prev) => ({ ...prev, [key]: value }))

  const body = serializeProjectRulesMarkdown(form)
  const mdName = projectRulesDownloadFilename(form)
  const canDownload = formHasUserContent(form)

  return (
    <ResourcePageShell title="Project Rules template">
      <nav aria-label="Breadcrumb" className="k o">
        <a href="/resources">Resources</a> / <a href="/resources/templates">Templates</a> / Project Rules
      </nav>
      <h1>Project Rules</h1>
      <p className="resource-lede">
        Fill in your project boundaries, then download Markdown to merge into your instructions or PDF for a printable
        copy. Drafts stay in this browser until you clear the fields.
      </p>

      <form
        className="resource-form"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <FormSection title="Project purpose">
          <TextField label="Product" value={form.product} onChange={set('product')} />
          <TextField label="User" value={form.user} onChange={set('user')} />
          <TextField label="Job to accomplish" value={form.job} onChange={set('job')} />
          <TextField label="Current stack" value={form.stack} onChange={set('stack')} multiline />
          <TextField
            label="Existing instruction files"
            value={form.existingInstructions}
            onChange={set('existingInstructions')}
            hint="e.g. CLAUDE.md, .cursor/rules"
            multiline
          />
        </FormSection>

        <FormSection title="Scope and protection">
          <TextField label="Agreed outcome" value={form.outcome} onChange={set('outcome')} multiline />
          <TextField
            label="Flows that must keep working"
            value={form.protectedFlows}
            onChange={set('protectedFlows')}
            multiline
          />
          <TextField label="Needs extra review" value={form.extraReview} onChange={set('extraReview')} multiline />
        </FormSection>

        <FormSection title="Evidence and recovery">
          <TextField label="Check commands" value={form.checkCommands} onChange={set('checkCommands')} multiline />
          <TextField
            label="Acceptance path steps"
            value={form.acceptanceSteps}
            onChange={set('acceptanceSteps')}
            multiline
          />
          <TextField
            label="Secret handling method"
            value={form.secretMethod}
            onChange={set('secretMethod')}
            multiline
          />
          <TextField
            label="Known-good baseline commit"
            value={form.knownGoodCommit}
            onChange={set('knownGoodCommit')}
          />
        </FormSection>
      </form>

      <TemplateDownloadActions
        markdownFilename={mdName}
        pdfTitle="Project Rules"
        body={body}
        canDownload={canDownload}
      />
      <ResourceFooterMeta />
    </ResourcePageShell>
  )
}
