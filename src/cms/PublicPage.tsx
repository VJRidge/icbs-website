import Footer from '../components/Footer'
import { bodyFromDocument, type BuilderDocument } from './document'

export default function PublicPage({ title, document }: { title: string; document: BuilderDocument }) {
  const body = bodyFromDocument(document)
  return (
    <main>
      <section className="sec cream" style={{ minHeight: '70vh' }}>
        <div className="wrap">
          <h2>{document.title || title}</h2>
          {body ? (
            body.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="lede" style={{ whiteSpace: 'pre-wrap' }}>
                {para}
              </p>
            ))
          ) : (
            <p className="lede">This page has no body yet.</p>
          )}
        </div>
      </section>
      <Footer />
    </main>
  )
}
