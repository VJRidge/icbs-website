import { jsPDF } from 'jspdf'

/** Write filled template text into a simple multi-page PDF download. */
export function downloadFilledPdf(filename: string, title: string, body: string): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 48
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxWidth = pageWidth - margin * 2
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  const titleLines = doc.splitTextToSize(title, maxWidth) as string[]
  for (const line of titleLines) {
    if (y > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
    doc.text(line, margin, y)
    y += 18
  }
  y += 10

  doc.setFont('courier', 'normal')
  doc.setFontSize(9)
  const lines = doc.splitTextToSize(body.replace(/\r\n/g, '\n'), maxWidth) as string[]
  for (const line of lines) {
    if (y > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
    doc.text(line, margin, y)
    y += 12
  }

  const safeName = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`
  doc.save(safeName)
}

export function pdfFilenameFromMarkdown(mdFilename: string): string {
  return mdFilename.replace(/\.md$/i, '') + '.pdf'
}
