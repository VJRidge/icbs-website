/** Compact Markdown vs PDF note next to download buttons. */
export default function MarkdownExplainer() {
  return (
    <aside className="resource-md-explain" aria-labelledby="md-explain-title">
      <h2 id="md-explain-title">What is a Markdown (.md) file?</h2>
      <p>
        A plain-text file (not Word) that editors and AI tools read easily — open it in VS Code, Cursor, or GitHub.
        Use <strong>Markdown</strong> for a living project file (e.g. <code>ROADMAP.md</code>). Use <strong>PDF</strong>{' '}
        for a printable snapshot.
      </p>
    </aside>
  )
}
