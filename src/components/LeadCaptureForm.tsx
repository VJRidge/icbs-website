import { FormEvent, useEffect, useState } from 'react'
import { captureUtm } from '../lib/utm'
import { trackPublicEvent } from '../lib/analytics/trackClient'

type Props = {
  formSlug?: string
  className?: string
}

/** Public lead-capture form. Stores consent + payload only; never hits /api/subscribe. */
export default function LeadCaptureForm({ formSlug = 'lead-capture', className = '' }: Props) {
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [company, setCompany] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    trackPublicEvent('form_start', { path: window.location.pathname, meta: { formSlug } })
  }, [formSlug])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/form-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formSlug,
          firstName,
          email,
          marketingConsent: consent,
          company,
          path: window.location.pathname,
          utm: captureUtm(),
        }),
      })
      const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string; ok?: boolean }
      if (!res.ok) {
        setError(payload.error || 'Could not submit. Please try again.')
        return
      }
      setDone(payload.message || 'Thanks — you are on the list.')
      setFirstName('')
      setEmail('')
      setConsent(false)
    } catch {
      setError('Could not submit. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className={className} role="status">
        <p className="lede">{done}</p>
      </div>
    )
  }

  return (
    <form className={className} onSubmit={onSubmit} noValidate>
      <label className="sr-only" htmlFor="lead-first-name">
        First name
      </label>
      <input
        id="lead-first-name"
        name="firstName"
        autoComplete="given-name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="First name"
        required
      />
      <label className="sr-only" htmlFor="lead-email">
        Email
      </label>
      <input
        id="lead-email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        name="company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', height: 1, width: 1, opacity: 0 }}
      />
      <label className="flex items-start gap-2 text-sm" style={{ marginTop: '0.75rem' }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
          style={{ marginTop: '0.25rem' }}
        />
        <span>I agree to receive occasional updates about free resources and the book.</span>
      </label>
      {error ? (
        <p className="lede" role="alert" style={{ color: '#8B1E1E', marginTop: '0.75rem' }}>
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn green" disabled={busy} style={{ marginTop: '1rem' }}>
        {busy ? 'Sending…' : 'Join the list'}
      </button>
    </form>
  )
}
