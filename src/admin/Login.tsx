import { FormEvent, useEffect, useRef, useState } from 'react'
import { supabaseBrowser, supabaseConfigured } from '../lib/supabaseBrowser'
import {
  STAFF_SIGNUP_HONEYPOT_KEY,
  STAFF_SIGNUP_MIN_PASSWORD,
  staffSignupPasswordError,
} from '../lib/auth/staffSignupRules'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: { sitekey: string; callback: (token: string) => void; 'expired-callback'?: () => void },
      ) => string
      reset: (id?: string) => void
    }
  }
}

const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || ''

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const turnstileRef = useRef<HTMLDivElement | null>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    if (mode !== 'signup' || !TURNSTILE_SITE_KEY || !turnstileRef.current) return
    let cancelled = false

    function mount() {
      if (cancelled || !turnstileRef.current || !window.turnstile) return
      turnstileRef.current.innerHTML = ''
      widgetId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
      })
    }

    if (window.turnstile) {
      mount()
    } else {
      const existing = document.querySelector('script[data-turnstile]')
      if (!existing) {
        const script = document.createElement('script')
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.dataset.turnstile = '1'
        script.onload = () => mount()
        document.head.appendChild(script)
      } else {
        existing.addEventListener('load', mount)
      }
    }

    return () => {
      cancelled = true
      setTurnstileToken('')
    }
  }, [mode])

  if (!supabaseConfigured()) {
    return (
      <div className="ad-login">
        <form onSubmit={(e) => e.preventDefault()}>
          <h1>Admin is not configured</h1>
          <p>
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to{' '}
            <code>.env.local</code> (and Vercel). Never add the service role key to those
            variables. See <code>docs/cms/IMPLEMENTATION.md</code>.
          </p>
        </form>
      </div>
    )
  }

  function start() {
    setBusy(true)
    setErr('')
    setMsg('')
  }

  async function signIn(e: FormEvent) {
    e.preventDefault()
    const sb = supabaseBrowser()
    if (!sb) return
    if (!password) {
      setErr('Enter a password to sign in, or email yourself a login link.')
      return
    }
    start()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setErr(
        error.message === 'Invalid login credentials'
          ? 'No account matches that email and password.'
          : error.message,
      )
      return
    }
    window.location.assign('/admin')
  }

  async function magic() {
    const sb = supabaseBrowser()
    if (!sb) return
    if (!email) {
      setErr('Enter your email first.')
      return
    }
    start()
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin`, shouldCreateUser: false },
    })
    setBusy(false)
    if (error) setErr(error.message)
    else setMsg('Check your email for the login link.')
  }

  async function signUp(e: FormEvent) {
    e.preventDefault()
    const passwordProblem = staffSignupPasswordError(password)
    if (passwordProblem) {
      setErr(passwordProblem)
      return
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setErr('Complete the CAPTCHA first.')
      return
    }
    start()
    try {
      const res = await fetch('/api/staff-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName,
          turnstileToken: turnstileToken || undefined,
          [STAFF_SIGNUP_HONEYPOT_KEY]: honeypot,
        }),
      })
      const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!res.ok) {
        setErr(payload.error || 'Could not create account.')
        if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current)
        setTurnstileToken('')
        return
      }
      setMsg(payload.message || 'Account created. Confirm your email, then sign in.')
      setMode('signin')
      setPassword('')
    } catch {
      setErr('Could not create account. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ad-login">
      <form onSubmit={mode === 'signin' ? signIn : signUp}>
        <h1>VettaJimale.Tech Studio</h1>
        <p>
          {mode === 'signin'
            ? 'Sign in with your password, or email yourself a login link.'
            : 'Create a studio account. You will confirm your email before access — no owner approval step.'}
        </p>

        {mode === 'signup' ? (
          <>
            <label htmlFor="ad-name">Display name</label>
            <input
              id="ad-name"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </>
        ) : null}

        <label htmlFor="ad-email">Email</label>
        <input
          id="ad-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="ad-pass">Password</label>
        <input
          id="ad-pass"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={mode === 'signup'}
          minLength={mode === 'signup' ? STAFF_SIGNUP_MIN_PASSWORD : undefined}
        />

        {mode === 'signup' ? (
          <>
            <label
              htmlFor="ad-hp"
              style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}
            >
              Website
            </label>
            <input
              id="ad-hp"
              name={STAFF_SIGNUP_HONEYPOT_KEY}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}
            />
            {TURNSTILE_SITE_KEY ? <div ref={turnstileRef} style={{ marginTop: 12 }} /> : null}
            {!TURNSTILE_SITE_KEY ? (
              <p className="msg" style={{ fontSize: 13 }}>
                Add Cloudflare Turnstile keys (<code>VITE_TURNSTILE_SITE_KEY</code> /{' '}
                <code>TURNSTILE_SECRET_KEY</code>) for CAPTCHA protection in production.
              </p>
            ) : null}
            <p className="msg" style={{ fontSize: 13 }}>
              Password: at least {STAFF_SIGNUP_MIN_PASSWORD} characters, with upper, lower, and a number.
            </p>
          </>
        ) : null}

        <button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        {mode === 'signin' ? (
          <button type="button" className="ad-ghost" disabled={busy} onClick={() => void magic()}>
            Email me a login link
          </button>
        ) : null}

        <button
          type="button"
          className="ad-ghost"
          disabled={busy}
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setErr('')
            setMsg('')
          }}
        >
          {mode === 'signin' ? 'Create an account' : 'Back to sign in'}
        </button>

        {msg ? <p className="msg">{msg}</p> : null}
        {err ? <p className="msg err">{err}</p> : null}
      </form>
    </div>
  )
}
