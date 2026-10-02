type Profile = { role: string; display_name: string | null; staff_approved: boolean }

export default function Dashboard({ profile }: { profile: Profile | null }) {
  return (
    <>
      <div className="ad-cards">
        <div className="ad-card">
          <b>—</b>
          <span>Published pages</span>
        </div>
        <div className="ad-card">
          <b>—</b>
          <span>Drafts</span>
        </div>
        <div className="ad-card">
          <b>—</b>
          <span>Media files</span>
        </div>
        <div className="ad-card">
          <b>—</b>
          <span>Form submissions</span>
        </div>
      </div>
      <div className="ad-panel">
        <h2>Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}</h2>
        <p className="ad-empty">
          Phase 1 is the studio shell and login. Counts fill in when Pages and Media land
          (Phase 2–3). The public kit at /free is unchanged.
        </p>
      </div>
      <div className="ad-panel">
        <h2>Quick actions</h2>
        <p className="ad-empty">
          Next: run the CMS SQL if you have not, approve your user as owner, then Phase 2
          (create/edit pages). Plan: docs/cms/IMPLEMENTATION.md
        </p>
      </div>
    </>
  )
}
