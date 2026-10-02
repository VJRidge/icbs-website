import { useEffect, useState, type FormEvent } from 'react'
import Footer from '../components/Footer'
import SiteHeader from '../components/SiteHeader'

export default function Contact() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    document.title = 'Contact · I Call BS'
  }, [])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const data = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          message: data.get('message'),
          company: data.get('company'),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Something went wrong. Please try again.')
      }
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <main>
      <SiteHeader />
      <section className="sec cream" style={{ minHeight: '70vh' }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <a className="k o" href="/">← The book</a>
          <h2>Write to me.</h2>
          <p className="lede">Questions about the book or the kit. I read these.</p>
          {sent ? (
            <p className="lede">Got it. I’ll read this.</p>
          ) : (
            <form className="contact-form" onSubmit={onSubmit}>
              <label className="sr" htmlFor="contact-name">Name</label>
              <input id="contact-name" name="name" placeholder="Name" autoComplete="name" maxLength={120} required />
              <label className="sr" htmlFor="contact-email">Email address</label>
              <input id="contact-email" name="email" type="email" placeholder="Email address" autoComplete="email" maxLength={200} required />
              <label className="sr" htmlFor="contact-message">Message</label>
              <textarea id="contact-message" name="message" placeholder="Message" maxLength={4000} required />
              <div className="hp" aria-hidden="true">
                <label htmlFor="contact-company">Company</label>
                <input id="contact-company" name="company" tabIndex={-1} autoComplete="off" />
              </div>
              {error ? <p className="contact-err" role="alert">{error}</p> : null}
              <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send'}</button>
            </form>
          )}
        </div>
      </section>
      <Footer />
    </main>
  )
}
