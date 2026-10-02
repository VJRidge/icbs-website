import { useEffect, useState } from 'react';
import { ImageIcon, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { LandingMediaPicker } from '../components/LandingMediaPicker';
import {
  chromeStylesPayload,
  DEFAULT_SITE_CHROME,
  EMPTY_SOCIAL,
  invalidateSiteChrome,
  loadSiteChrome,
  SOCIAL_NETWORKS,
  type SiteChrome,
  type SiteSocial,
} from '../../lib/siteChrome';
import type { UserProfile } from '../types';

export default function SiteAppearancePage({ userProfile }: { userProfile: UserProfile | null }) {
  const [form, setForm] = useState<Pick<SiteChrome, 'siteName' | 'tagline' | 'logoUrl' | 'footerCredit' | 'social'>>({
    siteName: DEFAULT_SITE_CHROME.siteName,
    tagline: DEFAULT_SITE_CHROME.tagline,
    logoUrl: DEFAULT_SITE_CHROME.logoUrl,
    footerCredit: DEFAULT_SITE_CHROME.footerCredit,
    social: { ...EMPTY_SOCIAL },
  });
  const [prevStyles, setPrevStyles] = useState<unknown>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) {
      setLoading(false);
      return;
    }
    void (async () => {
      const chrome = await loadSiteChrome(supabase);
      const { data } = await supabase.from('settings').select('global_styles').eq('id', 1).maybeSingle();
      setPrevStyles(data?.global_styles ?? {});
      setForm({
        siteName: chrome.siteName,
        tagline: chrome.tagline,
        logoUrl: chrome.logoUrl,
        footerCredit: chrome.footerCredit,
        social: chrome.social,
      });
      setLoading(false);
    })();
  }, [userProfile]);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    const { data: latest } = await supabase.from('settings').select('global_styles').eq('id', 1).maybeSingle();
    const nextStyles = chromeStylesPayload(form, latest?.global_styles ?? prevStyles);
    const { data, error } = await supabase
      .from('settings')
      .update({
        site_name: form.siteName.trim() || DEFAULT_SITE_CHROME.siteName,
        global_styles: nextStyles,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select('id')
      .maybeSingle();
    setSaving(false);
    if (error) {
      setStatus(error.message);
      window.alert(error.message);
      return;
    }
    if (!data) {
      const msg = 'Save did not write. Sign out, sign back in, and try again.';
      setStatus(msg);
      window.alert(msg);
      return;
    }
    setPrevStyles(nextStyles);
    invalidateSiteChrome();
    setStatus('Saved. The public header shows on /about and /blog — /free keeps its own top bar.');
  };

  if (!isAnyAdminProfile(userProfile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <p className="font-semibold text-slate-700">Administrator access required.</p>
      </div>
    );
  }

  return (
    <AdminCmsShell
      title="Header & footer"
      titleIcon={<Palette size={14} className="text-brand-yellow" />}
      backTo="/admin"
      backLabel="Dashboard"
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-3xl p-6 md:p-10">
        <h1 className="font-serif text-3xl font-black text-slate-900">Header & footer</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Site name, tagline, logo, footer credit, and social profile links. The five icons always show in the header and the footer. Paste a profile URL to make that icon open the profile. Edit page links under Navigation. The kit page at{' '}
          <span className="font-mono">/free</span> keeps its own top bar so the funnel does not change.
        </p>

        {loading ? (
          <p className="mt-10 text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Site name
              <input
                value={form.siteName}
                onChange={(e) => setForm((f) => ({ ...f, siteName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-blue/40"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Tagline
              <input
                value={form.tagline}
                onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-blue/40"
              />
            </label>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Logo</p>
              <div className="mt-1 flex gap-2">
                <input
                  value={form.logoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                  placeholder="https://… or pick from the library"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-brand-blue/40"
                />
                <button
                  type="button"
                  onClick={() => setPicker(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:border-brand-blue/40"
                >
                  <ImageIcon size={14} /> Library
                </button>
              </div>
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="" className="mt-3 h-10 w-auto rounded border border-slate-200 bg-slate-50 p-1" />
              ) : null}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Social profiles</p>
              <p className="mt-1 text-xs text-slate-500">The icons always show. Paste a full profile URL to make one open that profile.</p>
              <div className="mt-3 space-y-3">
                {SOCIAL_NETWORKS.map((n) => (
                  <label key={n.id} className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    {n.label}
                    <input
                      value={form.social[n.id]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, social: { ...f.social, [n.id]: e.target.value } as SiteSocial }))
                      }
                      placeholder="https://"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-brand-blue/40"
                    />
                  </label>
                ))}
              </div>
            </div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Footer credit
              <input
                value={form.footerCredit}
                onChange={(e) => setForm((f) => ({ ...f, footerCredit: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-blue/40"
              />
            </label>
            <div className="rounded-xl bg-[#072a1b] p-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Public header preview</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="" className="h-8 w-auto rounded bg-white/10 p-1" />
                ) : (
                  <span className="rounded bg-brand-yellow px-2 py-0.5 text-xs font-black text-brand-blue">
                    {form.siteName || 'I Call BS'}
                  </span>
                )}
                <span className="text-sm text-white/80">{form.tagline}</span>
              </div>
              <p className="mt-3 border-t border-white/15 pt-3 text-xs text-white/70">{form.footerCredit || 'Footer credit'}</p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-yellow disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save appearance'}
            </button>
            {status ? (
              <p className={`text-sm font-medium ${status.startsWith('Saved') ? 'text-emerald-700' : 'text-red-700'}`}>{status}</p>
            ) : null}
          </div>
        )}
      </div>
      {userProfile?.id ? (
        <LandingMediaPicker
          open={picker}
          userId={userProfile.id}
          onClose={() => setPicker(false)}
          onPick={(url) => {
            setForm((f) => ({ ...f, logoUrl: url }));
            setPicker(false);
          }}
          title="Choose a logo"
        />
      ) : null}
    </AdminCmsShell>
  );
}
