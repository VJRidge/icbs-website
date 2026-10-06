import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { recordActivity } from '../lib/cms/activityLog';
import {
  discardSettingsDraftPatch,
  draftFromRow,
  hasPendingSettingsDraft,
  liveRowToSnapshot,
  publishSettingsDraftPatch,
  saveSettingsDraftPatch,
  settingsPreviewSummary,
  type SettingsSnapshot,
} from '../lib/cms/settingsLifecycle';
import type { UserProfile } from '../types';

type PageOpt = { id: string; title: string; slug: string; status: string };

const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'UTC'];
const DATE_FORMATS = [
  { value: 'MMMM d, yyyy', label: 'October 2, 2026' },
  { value: 'MMM d, yyyy', label: 'Oct 2, 2026' },
  { value: 'yyyy-MM-dd', label: '2026-10-02' },
];

function toForm(snapshot: SettingsSnapshot) {
  return {
    site_name: snapshot.site_name,
    site_description: snapshot.site_description,
    timezone: snapshot.timezone,
    date_format: snapshot.date_format,
    homepage_content_id: snapshot.homepage_content_id || '',
    kit_content_id: snapshot.kit_content_id || '',
  };
}

function fromForm(form: ReturnType<typeof toForm>): SettingsSnapshot {
  return {
    site_name: form.site_name,
    site_description: form.site_description,
    timezone: form.timezone,
    date_format: form.date_format,
    homepage_content_id: form.homepage_content_id || null,
    kit_content_id: form.kit_content_id || null,
  };
}

export default function SiteSettingsPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [form, setForm] = useState(toForm(draftFromRow(null)));
  const [live, setLive] = useState<SettingsSnapshot>(liveRowToSnapshot(null));
  const [settingsVersion, setSettingsVersion] = useState(1);
  const [draftSupported, setDraftSupported] = useState(true);
  const [pages, setPages] = useState<PageOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const load = async () => {
    const pagesQuery = supabase
      .from('contents')
      .select('id, title, slug, status')
      .eq('kind', 'page')
      .neq('status', 'trash')
      .order('title');

    const withDraft = await supabase
      .from('settings')
      .select(
        'site_name, site_description, timezone, date_format, homepage_content_id, kit_content_id, draft_document, settings_version',
      )
      .eq('id', 1)
      .maybeSingle();

    let settingsRow = withDraft.data;
    let draftOk = !withDraft.error;
    if (withDraft.error) {
      const legacy = await supabase
        .from('settings')
        .select('site_name, site_description, timezone, date_format, homepage_content_id, kit_content_id')
        .eq('id', 1)
        .maybeSingle();
      if (legacy.error) {
        setError(legacy.error.message);
        setLoading(false);
        return;
      }
      settingsRow = legacy.data as typeof settingsRow;
      draftOk = false;
    }

    const { data: pageRows, error: pErr } = await pagesQuery;
    if (pErr) {
      setError(pErr.message);
      setLoading(false);
      return;
    }

    const liveSnap = liveRowToSnapshot(settingsRow ?? undefined);
    const draftSnap = draftFromRow(settingsRow ?? undefined);
    setLive(liveSnap);
    setForm(toForm(draftSnap));
    setSettingsVersion(Math.max(1, Number(settingsRow?.settings_version) || 1));
    setDraftSupported(draftOk);
    setPages((pageRows as PageOpt[]) ?? []);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) {
      setLoading(false);
      return;
    }
    void load();
  }, [userProfile]);

  const draft = useMemo(() => fromForm(form), [form]);
  const pending = hasPendingSettingsDraft(live, draft);
  const preview = settingsPreviewSummary(
    draft,
    pages.filter((p) => p.status === 'published'),
  );
  const published = pages.filter((p) => p.status === 'published');
  const liveHome = published.find((p) => p.id === live.homepage_content_id);
  const liveKit = published.find((p) => p.id === live.kit_content_id);

  const saveDraft = async () => {
    if (!draftSupported) {
      window.alert('Apply migration 20261012_settings_draft.sql before using draft settings.');
      return;
    }
    setSaving(true);
    setStatus(null);
    const patch = saveSettingsDraftPatch({ draft, settingsVersion });
    const { data, error: saveError } = await supabase
      .from('settings')
      .update(patch)
      .eq('id', 1)
      .eq('settings_version', settingsVersion)
      .select('draft_document, settings_version')
      .maybeSingle();
    setSaving(false);
    if (saveError) {
      setStatus(saveError.message);
      window.alert(saveError.message);
      return;
    }
    if (!data) {
      const msg = 'This settings copy is out of date. Refresh and try again.';
      setStatus(msg);
      window.alert(msg);
      return;
    }
    setSettingsVersion(Math.max(1, Number(data.settings_version) || settingsVersion + 1));
    setForm(toForm(draftFromRow({ draft_document: data.draft_document })));
    setStatus('Draft saved. Live site chrome is unchanged until you publish.');
  };

  const publishDraft = async () => {
    if (!draftSupported) {
      window.alert('Apply migration 20261012_settings_draft.sql before publishing settings.');
      return;
    }
    if (!window.confirm('Publish these settings to the live site?')) return;
    setPublishing(true);
    setStatus(null);
    const patch = publishSettingsDraftPatch({ draft, settingsVersion });
    const { data, error: publishError } = await supabase
      .from('settings')
      .update(patch)
      .eq('id', 1)
      .eq('settings_version', settingsVersion)
      .select('site_name, site_description, timezone, date_format, homepage_content_id, kit_content_id, draft_document, settings_version')
      .maybeSingle();
    setPublishing(false);
    if (publishError) {
      setStatus(publishError.message);
      window.alert(publishError.message);
      return;
    }
    if (!data) {
      const msg = 'This settings copy is out of date. Refresh and try again.';
      setStatus(msg);
      window.alert(msg);
      return;
    }
    const nextLive = liveRowToSnapshot(data);
    setLive(nextLive);
    setForm(toForm(draftFromRow(data)));
    setSettingsVersion(Math.max(1, Number(data.settings_version) || settingsVersion + 1));
    setStatus('Published. Live site chrome now uses this snapshot.');
    void recordActivity({
      actorId: userProfile?.id,
      action: 'settings.publish',
      entity: 'settings',
      meta: { site_name: nextLive.site_name },
    });
  };

  const discardDraft = async () => {
    if (!draftSupported) return;
    if (!window.confirm('Discard the pending settings draft and reload the live values?')) return;
    setSaving(true);
    const patch = discardSettingsDraftPatch({ live, settingsVersion });
    const { data, error: discardError } = await supabase
      .from('settings')
      .update(patch)
      .eq('id', 1)
      .eq('settings_version', settingsVersion)
      .select('draft_document, settings_version')
      .maybeSingle();
    setSaving(false);
    if (discardError || !data) {
      window.alert(discardError?.message || 'Could not discard draft.');
      return;
    }
    setForm(toForm(draftFromRow({ draft_document: data.draft_document })));
    setSettingsVersion(Math.max(1, Number(data.settings_version) || settingsVersion + 1));
    setStatus('Draft discarded.');
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
          Edit a pending snapshot. Live chrome and homepage assignments change only when you publish.
        </p>
        {!draftSupported ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Settings drafts need migration <code className="font-mono">20261012_settings_draft.sql</code>. Live columns
            are still readable; draft/publish stays disabled until it is applied.
          </p>
        ) : null}
        {pending ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Pending draft differs from the live site. Preview, then publish when ready.
          </p>
        ) : (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Draft matches the live snapshot.</p>
        )}
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
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live on /</p>
                {liveHome ? (
                  <Link to={`/admin/pages/${liveHome.id}`} className="font-semibold text-brand-blue hover:underline">
                    {liveHome.title}
                  </Link>
                ) : (
                  <p className="text-slate-600">Built-in kit</p>
                )}
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live on /free</p>
                {liveKit ? (
                  <Link to={`/admin/pages/${liveKit.id}`} className="font-semibold text-brand-blue hover:underline">
                    {liveKit.title}
                  </Link>
                ) : (
                  <p className="text-slate-600">Built-in kit</p>
                )}
              </div>
            </div>

            {showPreview ? (
              <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue">Pending snapshot preview</p>
                <dl className="mt-3 space-y-2 text-sm text-slate-700">
                  <div>
                    <dt className="font-semibold">Site name</dt>
                    <dd>{preview.siteName}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Description</dt>
                    <dd>{preview.siteDescription}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Timezone / date</dt>
                    <dd>
                      {preview.timezone} · {preview.dateFormat}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Homepage</dt>
                    <dd>{preview.homepageLabel}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Kit page</dt>
                    <dd>{preview.kitLabel}</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving || !draftSupported}
                onClick={() => void saveDraft()}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700"
              >
                <Eye size={12} /> {showPreview ? 'Hide preview' : 'Preview draft'}
              </button>
              <button
                type="button"
                disabled={publishing || !draftSupported || !pending}
                onClick={() => void publishDraft()}
                className="rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-yellow disabled:opacity-50"
              >
                {publishing ? 'Publishing…' : 'Publish settings'}
              </button>
              <button
                type="button"
                disabled={saving || !draftSupported || !pending}
                onClick={() => void discardDraft()}
                className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-red-700 disabled:opacity-50"
              >
                Discard draft
              </button>
            </div>
            {status ? (
              <p className={`text-sm font-medium ${status.startsWith('Published') || status.startsWith('Draft') ? 'text-emerald-700' : 'text-red-700'}`}>
                {status}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </AdminCmsShell>
  );
}
