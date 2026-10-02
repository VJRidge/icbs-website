import { useEffect, useState } from 'react'
import { supabaseBrowser } from '../lib/supabaseBrowser'

type Profile = { role: string; display_name: string | null; staff_approved: boolean }

export default function Dashboard({ profile }: { profile: Profile | null }) {
  const [published, setPublished] = useState<string | number>('—')
  const [drafts, setDrafts] = useState<string | number>('—')
  const [media, setMedia] = useState<string | number>('—')
  const [subs, setSubs] = useState<string | number>('—')

  useEffect(() => {
    const sb = supabaseBrowser()
    if (!sb) return
    sb.from('contents').select('id', { count: 'exact', head: true }).eq('kind', 'page').eq('status', 'published').then(({ count }) => setPublished(count ?? 0))
    sb.from('contents').select('id', { count: 'exact', head: true }).eq('kind', 'page').eq('status', 'draft').then(({ count }) => setDrafts(count ?? 0))
    sb.from('media').select('id', { count: 'exact', head: true }).then(({ count }) => setMedia(count ?? 0))
    sb.from('form_submissions').select('id', { count: 'exact', head: true }).then(({ count }) => setSubs(count ?? 0))
  }, [])

  return (
    <>
      <div className="ad-cards">
        <div className="ad-card">
          <b>{published}</b>
          <span>Published pages</span>
        </div>
        <div className="ad-card">
          <b>{drafts}</b>
          <span>Drafts</span>
        </div>
        <div className="ad-card">
          <b>{media}</b>
          <span>Media files</span>
        </div>
        <div className="ad-card">
          <b>{subs}</b>
          <span>Form submissions</span>
        </div>
      </div>
      <div className="ad-panel">
        <h2>Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}</h2>
        <p className="ad-empty">
          You can create pages now. The live kit at /free does not change until you publish a page and check
          “Use as website homepage.”
        </p>
      </div>
      <div className="ad-panel">
        <h2>Quick actions</h2>
        <p className="ad-empty">
          <a href="/admin/pages/new">Add a page</a>
          {' · '}
          <a href="/admin/pages">All pages</a>
        </p>
      </div>
    </>
  )
}
