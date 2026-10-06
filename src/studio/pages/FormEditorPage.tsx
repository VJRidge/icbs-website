import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageForms } from '../lib/cms/authorization';
import { normalizeFormFields } from '../../lib/forms/leadCaptureForm';
import { defaultLeadCaptureSettings, type StudioFormRow } from '../lib/forms/formDraft';
import type { UserProfile } from '../types';

type SubmissionRow = {
  id: string;
  created_at: string;
  payload: Record<string, unknown>;
  consent: { marketing?: boolean; text?: string; at?: string };
  form_version: number;
};

export default function FormEditorPage({ userProfile }: { userProfile: UserProfile | null }) {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<StudioFormRow | null>(null);
  const [subs, setSubs] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [magnets, setMagnets] = useState<Array<{ id: string; title: string }>>([]);

  const allowed = canManageForms(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    if (!formId) return;
    const { data, error: formError } = await supabase.from('forms').select('*').eq('id', formId).maybeSingle();
    if (formError) {
      setError(formError.message);
      setForm(null);
      return;
    }
    if (!data) {
      setError('Form not found.');
      setForm(null);
      return;
    }
    const settings =
      data.settings && typeof data.settings === 'object'
        ? { ...defaultLeadCaptureSettings(), ...(data.settings as object) }
        : defaultLeadCaptureSettings();
    setForm({
      id: data.id,
      title: data.title,
      slug: data.slug,
      status: data.status === 'published' ? 'published' : 'draft',
      version: data.version ?? 1,
      fields: normalizeFormFields(data.fields),
      settings,
      published_at: data.published_at,
      updated_at: data.updated_at,
      created_at: data.created_at,
    });
    const { data: submissionRows } = await supabase
      .from('form_submissions')
      .select('id, created_at, payload, consent, form_version')
      .eq('form_id', formId)
      .order('created_at', { ascending: false })
      .limit(50);
    setSubs((submissionRows as SubmissionRow[]) ?? []);
    const { data: magnetRows } = await supabase
      .from('lead_magnets')
      .select('id, title')
      .eq('status', 'published')
      .order('title', { ascending: true });
    setMagnets((magnetRows as Array<{ id: string; title: string }>) ?? []);
    setError(null);
  }, [formId]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  async function save(nextStatus?: 'draft' | 'published') {
    if (!form || !allowed) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const status = nextStatus ?? form.status;
    const bumpVersion = status === 'published' && form.status === 'draft';
    const version = bumpVersion ? form.version + 1 : form.version;
    const { error: updateError } = await supabase
      .from('forms')
      .update({
        title: form.title.trim(),
        slug: form.slug.trim(),
        status,
        version,
        fields: form.fields,
        settings: form.settings,
        published_at: status === 'published' ? form.published_at || new Date().toISOString() : form.published_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', form.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setForm((f) => (f ? { ...f, status, version } : f));
    setNotice(status === 'published' ? 'Published.' : 'Saved.');
    void load();
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Forms" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage forms.</p>
      </AdminCmsShell>
    );
  }

  if (loading) {
    return (
      <AdminCmsShell title="Forms" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-500">Loading…</p>
      </AdminCmsShell>
    );
  }

  if (!form) {
    return (
      <AdminCmsShell title="Forms" userProfile={userProfile}>
        <p className="p-8 text-sm text-red-700">{error || 'Form not found.'}</p>
        <Link to="/admin/forms" className="px-8 text-sm font-semibold text-brand-blue underline">
          Back to forms
        </Link>
      </AdminCmsShell>
    );
  }

  const consentField = form.fields.find((f) => f.type === 'consent');

  return (
    <AdminCmsShell title="Forms" titleIcon={<ClipboardList size={14} className="text-brand-yellow" />} userProfile={userProfile}>
      <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/admin/forms" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-brand-blue">
              ← Forms
            </Link>
            <h1 className="mt-2 font-serif text-3xl font-black text-slate-900">{form.title}</h1>
            <p className="mt-1 text-xs text-slate-500">
              Status {form.status} · v{form.version} · public slug <code>{form.slug}</code>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save('draft')}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 disabled:opacity-60"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save('published')}
              className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-yellow disabled:opacity-60"
            >
              Publish
            </button>
          </div>
        </div>

        {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p> : null}

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
            Title
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-900"
            />
          </label>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
            Slug
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.trim().toLowerCase() })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm normal-case tracking-normal text-slate-900"
            />
          </label>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
            Success message
            <input
              value={form.settings.successMessage || ''}
              onChange={(e) => setForm({ ...form, settings: { ...form.settings, successMessage: e.target.value } })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
            />
          </label>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
            Consent text (stored with each submission)
            <textarea
              value={form.settings.consentText || consentField?.label || ''}
              onChange={(e) => setForm({ ...form, settings: { ...form.settings, consentText: e.target.value } })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
            />
          </label>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
            Lead magnet delivery (optional)
            <select
              value={form.settings.leadMagnetId || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  settings: {
                    ...form.settings,
                    leadMagnetId: e.target.value || undefined,
                  },
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
            >
              <option value="">None — consent only</option>
              {magnets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-slate-500">
            Public embed: <code>/updates</code> posts to <code>/api/form-submit</code> with slug <code>{form.slug}</code>.
            Kit signup at <code>/free</code> is unchanged. Lead magnet delivery uses the Contacts outbox, not subscribers.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Recent submissions</h2>
          {subs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No submissions yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {subs.map((s) => (
                <li key={s.id} className="py-3 text-sm">
                  <p className="font-semibold text-slate-900">
                    {String(s.payload?.firstName || '—')} · {String(s.payload?.email || '—')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(s.created_at).toLocaleString()} · v{s.form_version} · consent{' '}
                    {s.consent?.marketing ? 'yes' : 'no'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminCmsShell>
  );
}
