import { FormEvent, useState } from 'react'
import { supabaseBrowser, supabaseConfigured } from '../lib/supabaseBrowser'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

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

  async function magic(e: FormEvent) {
    e.preventDefault()
    const sb = supabaseBrowser()
    if (!sb) return
    setBusy(true)
    setErr('')
    setMsg('')
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    })
    setBusy(false)
    if (error) setErr(error.message)
    else setMsg('Check your email for the login link.')
  }

  async function withPassword(e: FormEvent) {
    e.preventDefault()
    const sb = supabaseBrowser()
    if (!sb) return
    setBusy(true)
    setErr('')
    setMsg('')
    const { error } = await sb.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setErr(error.message)
    else window.location.assign('/admin')
  }

  return (
    <div className="ad-login">
      <form onSubmit={password ? withPassword : magic}>
        <h1>I Call BS studio</h1>
        <p>Sign in to edit pages, media, and the rest of the site. Public visitors never see this.</p>
        <label htmlFor="ad-email">Email</label>
        <input
          id="ad-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="ad-pass">Password (optional if you use a magic link)</label>
        <input
          id="ad-pass"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : password ? 'Sign in' : 'Email me a login link'}
        </button>
        {msg ? <p className="msg">{msg}</p> : null}
        {err ? <p className="msg err">{err}</p> : null}
      </form>
    </div>
  )
}
