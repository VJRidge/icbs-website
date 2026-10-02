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
};

const empty: Form = {
  site_name: 'I Call BS',
  site_description: '',
  timezone: 'America/New_York',
  date_format: 'MMMM d, yyyy',
};

export default function SiteSettingsPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [form, setForm] = useState<Form>(empty);
  const [home, setHome] = useState<{ id: string; title: string; slug: string } | null>(null);
  const [kit, setKit] = useState<{ id: string; title: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) {
      setLoading(false);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from('settings')
        .select('site_name, site_description, timezone, date_format, homepage_content_id, kit_content_id')
        .eq('id', 1)
        .maybeSingle();
      if (data) {
        setForm({
          site_name: data.site_name || empty.site_name,
          site_description: data.site_description || '',
          timezone: data.timezone || empty.timezone,
          date_format: data.date_format || empty.date_format,
        });
        const ids = [data.homepage_content_id, data.kit_content_id].filter(Boolean) as string[];
        if (ids.length) {
          const { data: pages } = await supabase.from('contents').select('id, title, slug').in('id', ids);
          setHome((pages ?? []).find((p) => p.id === data.homepage_content_id) ?? null);
          setKit((pages ?? []).find((p) => p.id === data.kit_content_id) ?? null);
        }
      }
      setLoading(false);
    })();
  }, [userProfile]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('settings')
      .update({
        site_name: form.site_name.trim() || empty.site_name,
        site_description: form.site_description.trim() || null,
        timezone: form.timezone.trim() || empty.timezone,
        date_format: form.date_format.trim() || empty.date_format,
      })
      .eq('id', 1);
    setSaving(false);
    if (error) window.alert(error.message);
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
              <input
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm font-normal text-slate-900 outline-none focus:border-brand-blue/40"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Date format
              <input
                value={form.date_format}
                onChange={(e) => setForm((f) => ({ ...f, date_format: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm font-normal text-slate-900 outline-none focus:border-brand-blue/40"
              />
            </label>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Homepage</p>
                {home ? (
                  <Link to={`/admin/pages/${home.id}`} className="font-semibold text-brand-blue hover:underline">
                    {home.title}
                  </Link>
                ) : (
                  <p className="text-slate-500">Kit fallback at /</p>
                )}
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kit page (/free)</p>
                {kit ? (
                  <Link to={`/admin/pages/${kit.id}`} className="font-semibold text-brand-blue hover:underline">
                    {kit.title}
                  </Link>
                ) : (
                  <p className="text-slate-500">Hardcoded Free.tsx</p>
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
          </div>
        )}
      </div>
    </AdminCmsShell>
  );
}
