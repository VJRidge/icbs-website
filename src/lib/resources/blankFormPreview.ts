import { jsPDF } from 'jspdf'

export type BlankFormPreviewId = 'roadmap' | 'project-rules' | 'before-you-accept-done'

type FieldBlock = { section: string; fields: string[] }

const PREVIEWS: Record<BlankFormPreviewId, { title: string; filename: string; blocks: FieldBlock[] }> = {
  roadmap: {
    title: 'Project ROADMAP — blank form',
    filename: 'ROADMAP-blank-form.pdf',
    blocks: [
      { section: 'Project', fields: ['Project name', 'Updated', 'Owner'] },
      {
        section: 'Purpose',
        fields: ['Who it helps', 'Job to be done', 'Smallest useful scope', 'Deferred for later'],
      },
      {
        section: 'Now',
        fields: [
          'One outcome',
          'Current branch',
          'Known-good commit',
          'Relevant files',
          'Must keep working',
          'Completion check',
        ],
      },
      { section: 'Done, next, blocked', fields: ['Done', 'Next', 'Blocked', 'Decisions'] },
      {
        section: 'Checks and evidence',
        fields: ['Change', 'Expected', 'Checked', 'Result', 'Not checked', 'Open issues'],
      },
      {
        section: 'Session handoff',
        fields: ['Completed', 'In progress', 'Next safe step', 'Do not touch'],
      },
    ],
  },
  'project-rules': {
    title: 'Project Rules — blank form',
    filename: 'PROJECT-RULES-blank-form.pdf',
    blocks: [
      {
        section: 'Project purpose',
        fields: ['Product', 'User', 'Job to accomplish', 'Current stack', 'Existing instruction files'],
      },
      {
        section: 'Scope and protection',
        fields: ['Agreed outcome', 'Flows that must keep working', 'Needs extra review'],
      },
      {
        section: 'Evidence and recovery',
        fields: ['Check commands', 'Acceptance path steps', 'Secret handling method', 'Known-good baseline commit'],
      },
    ],
  },
  'before-you-accept-done': {
    title: 'Before You Accept Done — blank checklist',
    filename: 'BEFORE-YOU-ACCEPT-DONE-blank-form.pdf',
    blocks: [
      {
        section: 'This change',
        fields: ['Change', 'Date', 'Branch and baseline', 'Expected behavior', 'Must keep working'],
      },
      {
        section: 'Check the change',
        fields: [
          '☐ Relevant page loads and the app starts',
          '☐ Actual user path produces the expected result',
          '☐ Saved data survives refresh or return',
          '☐ Empty / error / boundary case checked',
          '☐ Related flows still work',
          '☐ Access / session checked if affected',
          '☐ Diff matches scope; no real secrets',
          '☐ Automated checks run; results recorded',
          '☐ Real service actions checked if affected',
        ],
      },
      {
        section: 'Keep the evidence',
        fields: [
          'Steps performed',
          'Actual result',
          'Evidence location',
          'Not checked',
          'Remaining issues',
          'Decision',
          'Verified commit',
          'Next step',
        ],
      },
    ],
  },
}

function drawBlankField(doc: jsPDF, label: string, x: number, y: number, width: number, height: number): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(20, 20, 20)
  doc.text(label, x, y)
  y += 6
  doc.setDrawColor(20, 20, 20)
  doc.setLineWidth(1)
  doc.rect(x, y, width, height)
  return y + height + 12
}

/** Build a blank form-layout PDF (empty fields) for View sample. */
export function buildBlankFormPreviewPdf(id: BlankFormPreviewId): { blob: Blob; filename: string; title: string } {
  const preview = PREVIEWS[id]
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 48
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const fieldWidth = pageWidth - margin * 2
  let y = margin

  const ensureSpace = (need: number) => {
    if (y + need > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(preview.title, margin, y)
  y += 22
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text('Blank form preview — fill the online template, then download Markdown or PDF.', margin, y)
  doc.setTextColor(20, 20, 20)
  y += 20

  for (const block of preview.blocks) {
    ensureSpace(36)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(block.section, margin, y)
    y += 16

    for (const field of block.fields) {
      const isCheck = field.startsWith('☐')
      const height = isCheck ? 16 : 28
      ensureSpace(height + 24)
      if (isCheck) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(field, margin, y + 10)
        y += 18
      } else {
        y = drawBlankField(doc, field, margin, y, fieldWidth, height)
      }
    }
    y += 6
  }

  return {
    blob: doc.output('blob'),
    filename: preview.filename,
    title: preview.title,
  }
}

/** Open the blank form preview PDF in a new browser tab. */
export function openBlankFormPreview(id: BlankFormPreviewId): void {
  const { blob } = buildBlankFormPreviewPdf(id)
  const url = URL.createObjectURL(blob)
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) {
    // Popup blocked — fall back to download.
    const a = document.createElement('a')
    a.href = url
    a.download = PREVIEWS[id].filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function blankFormPreviewFilename(id: BlankFormPreviewId): string {
  return PREVIEWS[id].filename
}
