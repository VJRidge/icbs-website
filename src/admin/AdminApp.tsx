import { lazy, Suspense, useEffect, useState } from 'react'
import { supabaseBrowser } from '../lib/supabaseBrowser'
import Login from './Login'
import type { UserProfile } from '../studio/types'
import './admin.css'

const StudioApp = lazy(() => import('../studio/StudioApp'))

function Loading({ label }: { label: string }) {
  return (
    <div className="ad-login">
      <p>{label}</p>
    </div>
  )
}

export default function AdminApp() {
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [denied, setDenied] = useState('')

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
          setProfile(null)
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
        setProfile(null)
        setReady(true)
        return
      }
      setProfile({
        id: user.id,
        email: user.email ?? undefined,
        display_name: data.display_name,
        role: data.role,
        is_admin: true,
        admin_tier: data.role === 'owner' ? 'super_admin' : 'admin',
      })
      setReady(true)
    }
    load()
    const { data: sub } = client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') load()
    })
    return () => {
      gone = true
      sub.subscription.unsubscribe()
    }
  }, [])

  if (!ready) return <Loading label="Loading studio…" />

  if (!profile) {
    if (!denied) return <Login />
    return (
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
    )
  }

  return (
    <Suspense fallback={<Loading label="Opening studio…" />}>
      <StudioApp userProfile={profile} />
    </Suspense>
  )
}
