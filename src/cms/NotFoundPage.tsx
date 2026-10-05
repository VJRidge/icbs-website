import Footer from '../components/Footer'
import SiteHeader from '../components/SiteHeader'

/** Shown when a public URL has no published page. */
export default function NotFoundPage() {
  return (
    <main>
      <SiteHeader />
      <section className="sec cream" style={{ minHeight: '70vh' }}>
        <div className="wrap">
          <h2>Page not found</h2>
          <p className="lede">That page doesn’t exist or isn’t published yet.</p>
          <p>
            <a className="k o" href="/">
              Back to the home page
            </a>
          </p>
        </div>
      </section>
      <Footer />
    </main>
  )
}
