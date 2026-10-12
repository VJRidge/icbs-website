import { downloadTextFile } from '../../lib/resources/downloadTextFile'
import { downloadFilledPdf, pdfFilenameFromMarkdown } from '../../lib/resources/downloadFilledPdf'
import MarkdownExplainer from './MarkdownExplainer'

type Props = {
  markdownFilename: string
  pdfTitle: string
  body: string
  /** False until the user has entered at least one field (or check). */
  canDownload: boolean
  backHref?: string
}

export default function TemplateDownloadActions({
  markdownFilename,
  pdfTitle,
  body,
  canDownload,
  backHref = '/resources/templates',
}: Props) {
  const onMarkdown = () => {
    if (!canDownload) return
    downloadTextFile(markdownFilename, body)
  }
  const onPdf = () => {
    if (!canDownload) return
    downloadFilledPdf(pdfFilenameFromMarkdown(markdownFilename), pdfTitle, body)
  }

  return (
    <div className="resource-download-block resource-download-sticky" id="download">
      <MarkdownExplainer />
      {!canDownload ? (
        <p className="resource-download-hint" role="status">
          Fill at least one field below, then download. Your answers stay in this browser tab until you clear them.
        </p>
      ) : (
        <p className="resource-download-hint is-ready" role="status">
          Ready — download includes what you entered on this page.
        </p>
      )}
      <div className="resource-actions resource-download-actions">
        <button type="button" className="btn" onClick={onMarkdown} disabled={!canDownload}>
          Download Markdown
        </button>
        <button type="button" className="btn line" onClick={onPdf} disabled={!canDownload}>
          Download PDF
        </button>
        <a className="btn line" href={backHref}>
          Back to templates
        </a>
      </div>
    </div>
  )
}
