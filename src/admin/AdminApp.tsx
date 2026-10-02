import { useEffect, useState } from 'react'
import { supabaseBrowser } from '../lib/supabaseBrowser'
import { ADMIN_NAV } from './nav'
import Login from './Login'
import Dashboard from './Dashboard'
import ComingSoon from './ComingSoon'
import PagesList from './pages/PagesList'
import PageEditor from './pages/PageEditor'
import './admin.css'

type Profile = { role: string; display_name: string | null; staff_approved: boolean }

function adminPath() {
  return window.location.pathname.replace(/\/+$/, '') || '/admin'
}

function titleFor(path: string) {
  if (path === '/admin') return 'Dashboard'
  if (path === '/admin/pages/new') return 'New page'
  if (path.startsWith('/admin/pages/')) return 'Edit page'
  if (path.startsWith('/admin/pages')) return 'Pages'
  return ADMIN_NAV.find((n) => n.href === path)?.label ?? 'Studio'
}

function screen(path: string, profile: Profile | null) {
  if (path === '/admin') return <Dashboard profile={profile} />
  if (path === '/admin/pages') return <PagesList />
  if (path === '/admin/pages/new') return <PageEditor id="new" />
  const edit = path.match(/^\/admin\/pages\/([^/]+)$/)
  if (edit) return <PageEditor id={edit[1]} />
  return <ComingSoon path={path} />
}

export default function AdminApp() {
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [denied, setDenied] = useState('')
  const path = adminPath()

  useEffect(() => {
    const sb = supabaseBrowser()
    if (!sb) {
      setReady(true)
      return
    }
    const client = sb
    let gone = false
    async function load() {
      const { data: sessionData } = await client.auth.getSession()
      const user = sessionData.session?.user
      if (!user) {
        if (!gone) {
          setAuthed(false)
          setReady(true)
        }
        return
      }
      const { data, error } = await client.from('profiles').select('role, display_name, staff_approved').eq('id', user.id).maybeSingle()
      if (gone) return
      if (error || !data?.staff_approved) {
        setDenied(
          error
            ? 'Could not read your profile. Run the CMS migration, then approve this user as owner.'
            : 'This account is signed in but not approved for the studio. Ask the owner to set staff_approved = true.',
        )
        setAuthed(false)
        setReady(true)
        return
      }
      setProfile(data)
      setAuthed(true)
      setReady(true)
    }
    load()
    const { data: sub } = client.auth.onAuthStateChange(() => {
      load()
    })
    return () => {
      gone = true
      sub.subscription.unsubscribe()
    }
  }, [])

  if (!ready) {
    return (
      <div className="ad-login">
        <p>Loading studio…</p>
      </div>
    )
  }

  if (!authed) {
    return (
      <>
        {denied ? (
          <div className="ad-login">
            <form onSubmit={(e) => e.preventDefault()}>
              <h1>Access pending</h1>
              <p>{denied}</p>
              <button
                type="button"
                onClick={async () => {
                  await supabaseBrowser()?.auth.signOut()
                  window.location.reload()
                }}
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Login />
        )}
      </>
    )
  }

  return (
    <div className="ad-root">
      <aside className="ad-side">
        <div className="ad-brand">
          <b>I Call BS</b>
          <span>Studio</span>
        </div>
        <nav className="ad-nav">
          {ADMIN_NAV.map((item) => (
            <a key={item.href} href={item.href} className={path === item.href || (item.href !== '/admin' && path.startsWith(item.href)) ? 'on' : undefined}>
              {item.label}
              {item.phase > 1 ? <i>P{item.phase}</i> : null}
            </a>
          ))}
        </nav>
        <div className="ad-side-foot">
          {profile?.display_name || profile?.role}
          <button
            type="button"
            onClick={async () => {
              await supabaseBrowser()?.auth.signOut()
              window.location.assign('/admin')
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="ad-main">
        <header className="ad-top">
          <h1>{titleFor(path)}</h1>
          <a className="pub" href="/" target="_blank" rel="noreferrer">
            View site
          </a>
        </header>
        <div className="ad-body">{screen(path, profile)}</div>
      </div>
    </div>
  )
}
