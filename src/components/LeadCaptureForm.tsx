import { FormEvent, useEffect, useState } from 'react'
import { captureUtm } from '../lib/utm'
import { trackPublicEvent } from '../lib/analytics/trackClient'
import {
  LEAD_CAPTURE_DEFAULT_FIELDS,
  normalizeFormFields,
  type FormFieldDef,
} from '../lib/forms/leadCaptureForm'

type Props = {
  formSlug?: string
  className?: string
}

type SchemaResponse = {
  ok?: boolean
  fields?: unknown
  settings?: { successMessage?: string; consentText?: string }
}

/** Must match api/_forms.ts default; never loaded from public schema (SUP-008). */
const LEAD_HONEYPOT_KEY = 'company'

/** Public lead-capture form. Stores consent + payload only; never hits /api/subscribe. */
export default function LeadCaptureForm({ formSlug = 'lead-capture', className = '' }: Props) {
  const [fields, setFields] = useState<FormFieldDef[]>(LEAD_CAPTURE_DEFAULT_FIELDS)
  const [successFallback, setSuccessFallback] = useState('Thanks — you are on the list.')
  const [values, setValues] = useState<Record<string, string | boolean>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    trackPublicEvent('form_start', { path: window.location.pathname, meta: { formSlug } })
  }, [formSlug])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/form-schema?slug=${encodeURIComponent(formSlug)}`)
        if (!res.ok) return
        const data = (await res.json()) as SchemaResponse
        if (cancelled || !data.ok) return
        const next = normalizeFormFields(data.fields)
        setFields(next)
        if (data.settings?.successMessage) setSuccessFallback(data.settings.successMessage)
      } catch {
        /* keep defaults */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [formSlug])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        formSlug,
        path: window.location.pathname,
        utm: captureUtm(),
        [LEAD_HONEYPOT_KEY]: values[LEAD_HONEYPOT_KEY] ?? '',
      }
      for (const field of fields) {
        body[field.key] = values[field.key] ?? (field.type === 'consent' ? false : '')
      }
      const res = await fetch('/api/form-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string
        message?: string
        ok?: boolean
      }
      if (!res.ok) {
        setError(payload.error || 'Could not submit. Please try again.')
        return
      }
      setDone(payload.message || successFallback)
      setValues({})
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
      {fields.map((field) => {
        if (field.type === 'consent') {
          return (
            <label key={field.key} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name={field.key}
                checked={Boolean(values[field.key])}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.checked }))}
                required={field.required}
              />
              <span>{field.label}</span>
            </label>
          )
        }
        const id = `lead-${field.key}`
        return (
          <div key={field.key}>
            <label className="sr-only" htmlFor={id}>
              {field.label}
            </label>
            <input
              id={id}
              name={field.key}
              type={field.type === 'email' ? 'email' : 'text'}
              autoComplete={field.type === 'email' ? 'email' : field.key === 'firstName' ? 'given-name' : 'on'}
              value={String(values[field.key] ?? '')}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              placeholder={field.label}
              required={field.required}
              maxLength={field.maxLength}
            />
          </div>
        )
      })}
      <input
        name={LEAD_HONEYPOT_KEY}
        value={String(values[LEAD_HONEYPOT_KEY] ?? '')}
        onChange={(e) => setValues((v) => ({ ...v, [LEAD_HONEYPOT_KEY]: e.target.value }))}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
      />
      {error ? <p className="error">{error}</p> : null}
      <button type="submit" disabled={busy}>
        {busy ? 'Sending…' : 'Subscribe'}
      </button>
    </form>
  )
}
