import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import type { UserProfile } from '../types';

type Form = {
  site_name: string;
  site_description: string;
  timezone: string;
  date_format: string;
  homepage_content_id: string;
  kit_content_id: string;
};

type PageOpt = { id: string; title: string; slug: string; status: string };

const empty: Form = {
  site_name: 'I Call BS',
  site_description: '',
  timezone: 'America/New_York',
  date_format: 'MMMM d, yyyy',
  homepage_content_id: '',
  kit_content_id: '',
};

const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'UTC'];
const DATE_FORMATS = [
  { value: 'MMMM d, yyyy', label: 'October 2, 2026' },
  { value: 'MMM d, yyyy', label: 'Oct 2, 2026' },
  { value: 'yyyy-MM-dd', label: '2026-10-02' },
];

export default function SiteSettingsPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [form, setForm] = useState<Form>(empty);
  const [pages, setPages] = useState<PageOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) {
      setLoading(false);
      return;
    }
    void (async () => {
      const [{ data, error: sErr }, { data: pageRows, error: pErr }] = await Promise.all([
        supabase
          .from('settings')
          .select('site_name, site_description, timezone, date_format, homepage_content_id, kit_content_id')
          .eq('id', 1)
          .maybeSingle(),
        supabase.from('contents').select('id, title, slug, status').eq('kind', 'page').neq('status', 'trash').order('title'),
      ]);
      if (sErr || pErr) {
        setError((sErr || pErr)?.message ?? 'Could not load settings.');
        setLoading(false);
        return;
      }
      if (data) {
        setForm({
          site_name: data.site_name || empty.site_name,
          site_description: data.site_description || '',
          timezone: data.timezone || empty.timezone,
          date_format: data.date_format || empty.date_format,
          homepage_content_id: data.homepage_content_id || '',
          kit_content_id: data.kit_content_id || '',
        });
      }
      setPages((pageRows as PageOpt[]) ?? []);
      setError(null);
      setLoading(false);
    })();
  }, [userProfile]);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    const { data, error: saveError } = await supabase
      .from('settings')
      .update({
        site_name: form.site_name.trim() || empty.site_name,
        site_description: form.site_description.trim() || null,
        timezone: form.timezone.trim() || empty.timezone,
        date_format: form.date_format.trim() || empty.date_format,
        homepage_content_id: form.homepage_content_id || null,
        kit_content_id: form.kit_content_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select('id')
      .maybeSingle();
    setSaving(false);
    if (saveError) {
      setStatus(saveError.message);
      window.alert(saveError.message);
      return;
    }
    if (!data) {
      const msg = 'Save did not write. Sign out, sign back in, and try again.';
      setStatus(msg);
      window.alert(msg);
      return;
    }
    setStatus('Saved.');
  };

  if (!isAnyAdminProfile(userProfile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <p className="font-semibold text-slate-700">Administrator access required.</p>
      </div>
    );
  }

  const published = pages.filter((p) => p.status === 'published');
  const home = published.find((p) => p.id === form.homepage_content_id);
  const kit = published.find((p) => p.id === form.kit_content_id);

  return (
    <AdminCmsShell
      title="Settings"
      titleIcon={<Settings size={14} className="text-brand-yellow" />}
      backTo="/admin"
      backLabel="Dashboard"
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-3xl p-6 md:p-10">
        <h1 className="font-serif text-3xl font-black text-slate-900">Settings</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Site-wide defaults. Logo, tagline, and menus are under Header & footer and Navigation.
        </p>
        {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {loading ? (
          <p className="mt-10 text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Site name
              <input
                value={form.site_name}
                onChange={(e) => setForm((f) => ({ ...f, site_name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-blue/40"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Site description
              <textarea
                value={form.site_description}
                onChange={(e) => setForm((f) => ({ ...f, site_description: e.target.value }))}
                rows={3}
                className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-blue/40"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Timezone
              <select
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
              >
                {TIMEZONES.includes(form.timezone) ? null : <option value={form.timezone}>{form.timezone}</option>}
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Date format
              <select
                value={form.date_format}
                onChange={(e) => setForm((f) => ({ ...f, date_format: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
              >
                {DATE_FORMATS.some((d) => d.value === form.date_format) ? null : (
                  <option value={form.date_format}>{form.date_format}</option>
                )}
                {DATE_FORMATS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Homepage at /
              <select
                value={form.homepage_content_id}
                onChange={(e) => setForm((f) => ({ ...f, homepage_content_id: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
              >
                <option value="">Built-in kit fallback</option>
                {published.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (/{p.slug})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Kit page at /free
              <select
                value={form.kit_content_id}
                onChange={(e) => setForm((f) => ({ ...f, kit_content_id: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
              >
                <option value="">Built-in kit page</option>
                {published.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (/{p.slug})
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Now on /</p>
                {home ? (
                  <Link to={`/admin/pages/${home.id}`} className="font-semibold text-brand-blue hover:underline">
                    {home.title}
                  </Link>
                ) : (
                  <p className="text-slate-600">Built-in kit</p>
                )}
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Now on /free</p>
                {kit ? (
                  <Link to={`/admin/pages/${kit.id}`} className="font-semibold text-brand-blue hover:underline">
                    {kit.title}
                  </Link>
                ) : (
                  <p className="text-slate-600">Built-in kit</p>
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-yellow disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            {status ? (
              <p className={`text-sm font-medium ${status === 'Saved.' ? 'text-emerald-700' : 'text-red-700'}`}>{status}</p>
            ) : null}
          </div>
        )}
      </div>
    </AdminCmsShell>
  );
}
