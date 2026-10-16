import { useEffect, useState } from 'react'
import Footer from '../components/Footer'
import SiteHeader from '../components/SiteHeader'
import './legalPage.css'

type PrefsList = { id: string; name: string; status: string }

type PrefsState = {
  email: string
  suppressed: boolean
  lists: PrefsList[]
}

function tokenFromUrl(): string {
  try {
    return new URLSearchParams(window.location.search).get('token') ?? ''
  } catch {
    return ''
  }
}

export default function EmailPrefsPage() {
  const [token] = useState(tokenFromUrl)
  const [state, setState] = useState<PrefsState | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    document.title = 'Email preferences · I Call BS'
  }, [])

  useEffect(() => {
    if (!token) {
      setError('That preferences link is missing a token. Use the link in a recent email.')
      return
    }
    void (async () => {
      const res = await fetch(`/api/email-prefs?token=${encodeURIComponent(token)}`)
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || 'That preferences link is not valid.')
        return
      }
      setState({ email: body.email, suppressed: body.suppressed, lists: body.lists || [] })
    })()
  }, [token])

  async function post(payload: Record<string, unknown>) {
    setBusy(String(payload.listId || payload.suppressAll || 'save'))
    setError('')
    try {
      const res = await fetch('/api/email-prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...payload }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not update preferences.')
      setState({ email: body.email, suppressed: body.suppressed, lists: body.lists || [] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update preferences.')
    } finally {
      setBusy('')
    }
  }

  return (
    <main>
      <SiteHeader />
      <section className="sec cream" style={{ minHeight: '70vh' }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <a className="k o" href="/">
            ← Home
          </a>
          <h2>Email preferences</h2>
          {error ? <p className="lede">{error}</p> : null}
          {state ? (
            <>
              <p className="lede">
                Lists for {state.email}. Stay curious stays closed until you open a list here.
              </p>
              {state.suppressed ? (
                <p className="lede">Marketing mail is currently stopped for this address.</p>
              ) : null}
              <ul className="faq-list">
                {state.lists.map((list) => (
                  <li key={list.id}>
                    <p>
                      <strong>{list.name}</strong>
                      {' — '}
                      {list.status === 'subscribed' ? 'subscribed' : 'not subscribed'}
                    </p>
                    <p>
                      <button
                        type="button"
                        className="btn"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          void post({
                            listId: list.id,
                            action: list.status === 'subscribed' ? 'unsubscribe' : 'subscribe',
                          })
                        }
                      >
                        {list.status === 'subscribed' ? 'Unsubscribe' : 'Subscribe'}
                      </button>
                    </p>
                  </li>
                ))}
              </ul>
              {!state.lists.length ? <p className="lede">No public lists are open yet.</p> : null}
              <p>
                <button type="button" className="btn" disabled={Boolean(busy)} onClick={() => void post({ suppressAll: true })}>
                  Stop all marketing email
                </button>
              </p>
            </>
          ) : null}
        </div>
      </section>
      <Footer />
    </main>
  )
}
