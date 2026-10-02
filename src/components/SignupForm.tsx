import { useState, type FormEvent } from 'react'
import { captureUtm } from '../lib/utm'

export default function SignupForm({ id, buttonLabel = 'Send me the free kit' }: { id: string; buttonLabel?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const data = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.get('firstName'),
          email: data.get('email'),
          company: data.get('company'), // honeypot: real people leave this empty
          utm: captureUtm(),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Something went wrong. Please try again.')
      }
      window.location.assign('/free/thanks')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate={false}>
      <div className="row">
        <label className="sr" htmlFor={`${id}-first`}>First name</label>
        <input id={`${id}-first`} name="firstName" placeholder="First name" autoComplete="given-name" maxLength={80} required />
        <label className="sr" htmlFor={`${id}-email`}>Email address</label>
        <input id={`${id}-email`} name="email" type="email" placeholder="Email address" autoComplete="email" maxLength={200} required />
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor={`${id}-company`}>Company</label>
        <input id={`${id}-company`} name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Sending…' : buttonLabel}
      </button>
      {error && <div className="err" role="alert">{error}</div>}
      <div className="fine">
        Free PDF. You’ll also get a few emails about building with AI. Unsubscribe anytime. <a href="/privacy">Privacy</a>
      </div>
    </form>
  )
}
