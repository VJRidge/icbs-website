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
      setErr('Enter a password to sign in, or use Create account / Email me a login link.')
      return
    }
    start()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setErr(
        error.message === 'Invalid login credentials'
          ? 'No account matches that email and password. Use Create account if this is your first time.'
          : error.message,
      )
      return
    }
    window.location.assign('/admin')
  }

  async function createAccount() {
    const sb = supabaseBrowser()
    if (!sb) return
    if (!email || !password) {
      setErr('Enter an email and a password (at least 6 characters) to create the first studio account.')
      return
    }
    if (password.length < 6) {
      setErr('Password must be at least 6 characters.')
      return
    }
    start()
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    if (data.session) {
      window.location.assign('/admin')
      return
    }
    setMsg('Account created. If Supabase requires email confirmation, open the email it sent, then sign in here.')
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
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    })
    setBusy(false)
    if (error) setErr(error.message)
    else setMsg('Check your email for the login link.')
  }

  return (
    <div className="ad-login">
      <form onSubmit={signIn}>
        <h1>I Call BS studio</h1>
        <p>
          The public site has no sign-up. This studio is for you. The first account you create
          becomes the owner.
        </p>
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : 'Sign in'}
        </button>
        <button type="button" className="ad-secondary" disabled={busy} onClick={createAccount}>
          Create account
        </button>
        <button type="button" className="ad-ghost" disabled={busy} onClick={magic}>
          Email me a login link
        </button>
        {msg ? <p className="msg">{msg}</p> : null}
        {err ? <p className="msg err">{err}</p> : null}
      </form>
    </div>
  )
}
