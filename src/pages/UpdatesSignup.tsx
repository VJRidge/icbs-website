import { useEffect } from 'react'
import SiteHeader from '../components/SiteHeader'
import Footer from '../components/Footer'
import LeadCaptureForm from '../components/LeadCaptureForm'

/** Public lead-capture page. Separate from kit signup at /free. */
export default function UpdatesSignup() {
  useEffect(() => {
    document.title = 'Updates · VettaJimale.Tech'
  }, [])

  return (
    <main>
      <SiteHeader />
      <section className="sec cream" style={{ minHeight: '70vh' }}>
        <div className="wrap" style={{ maxWidth: '28rem' }}>
          <p className="k o">Updates</p>
          <h1 className="an">Stay in the loop</h1>
          <p className="lede">
            Occasional notes about free resources and the book. This is not the starter-kit signup — the kit download
            stays at <a href="/free">/free</a>.
          </p>
          <LeadCaptureForm formSlug="lead-capture" />
        </div>
      </section>
      <Footer />
    </main>
  )
}
