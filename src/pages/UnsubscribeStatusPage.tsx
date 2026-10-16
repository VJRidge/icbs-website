import { useEffect } from 'react'
import Footer from '../components/Footer'
import SiteHeader from '../components/SiteHeader'
import './legalPage.css'

function readParam(name: string): string {
  try {
    return new URLSearchParams(window.location.search).get(name) ?? ''
  } catch {
    return ''
  }
}

export default function UnsubscribeStatusPage({ kind }: { kind: 'ok' | 'error' }) {
  const list = readParam('list')
  const reason = readParam('reason')
  const ok = kind === 'ok'
  const title = ok ? 'Unsubscribed' : 'Unsubscribe did not finish'
  const kit = list === 'kit'
  const invalid = reason === 'invalid'

  useEffect(() => {
    document.title = `${title} · I Call BS`
  }, [title])

  return (
    <main>
      <SiteHeader />
      <section className="sec cream" style={{ minHeight: '70vh' }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <a className="k o" href="/">
            ← Home
          </a>
          <h2>{title}</h2>
          {ok ? (
            <>
              <p className="lede">
                {kit
                  ? 'You will not get any more kit emails from I Call BS.'
                  : 'You will not get marketing updates from this list.'}
              </p>
              <p className="lede">
                {kit
                  ? 'A purchase receipt or download message can still arrive if you bought the book.'
                  : 'Kit emails use a separate list if you signed up for the free kit. Use the unsubscribe link in those emails to leave that list too.'}
              </p>
            </>
          ) : (
            <>
              <p className="lede">
                {invalid
                  ? 'That unsubscribe link is not valid. Use the link in a recent email from us.'
                  : 'Something went wrong while unsubscribing. Try the link again in a minute.'}
              </p>
              <p className="lede">
                If it still fails, use the contact page and include the email address on the list.
              </p>
            </>
          )}
          <p>
            <a href="/contact">Contact</a>
            {' · '}
            <a href="/privacy">Privacy</a>
          </p>
        </div>
      </section>
      <Footer />
    </main>
  )
}
