import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageForms } from '../lib/cms/authorization';
import { normalizeFormFields, type FormFieldDef, type FormFieldType } from '../../lib/forms/leadCaptureForm';
import {
  FORM_BUILDER_FIELD_TYPES,
  addFormField,
  formHasRequiredEmailAndConsent,
  moveFormField,
  removeFormField,
  updateFormField,
} from '../../lib/forms/formBuilder';
import { defaultLeadCaptureSettings, type StudioFormRow } from '../lib/forms/formDraft';
import {
  normalizeNewsletterListIds,
  toggleNewsletterListId,
} from '../../lib/newsletter/formNewsletterLists';
import type { UserProfile } from '../types';

type SubmissionRow = {
  id: string;
  created_at: string;
  payload: Record<string, unknown>;
  consent: { marketing?: boolean; text?: string; at?: string };
  form_version: number;
};

type Tab = 'build' | 'settings' | 'submissions';

export default function FormEditorPage({ userProfile }: { userProfile: UserProfile | null }) {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<StudioFormRow | null>(null);
  const [subs, setSubs] = useState<SubmissionRow[]>([]);
  const [tab, setTab] = useState<Tab>('build');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [panel, setPanel] = useState<'add' | 'settings'>('add');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [magnets, setMagnets] = useState<Array<{ id: string; title: string }>>([]);
  const [newsletterLists, setNewsletterLists] = useState<Array<{ id: string; name: string }>>([]);

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
    const fields = normalizeFormFields(data.fields);
    setForm({
      id: data.id,
      title: data.title,
      slug: data.slug,
      status: data.status === 'published' ? 'published' : 'draft',
      version: data.version ?? 1,
      fields,
      settings,
      published_at: data.published_at,
      updated_at: data.updated_at,
      created_at: data.created_at,
    });
    setSelectedKey((prev) => prev || fields[0]?.key || null);
    const { data: submissionRows } = await supabase
      .from('form_submissions')
      .select('id, created_at, payload, consent, form_version')
      .eq('form_id', formId)
      .order('created_at', { ascending: false })
      .limit(50);
    setSubs((submissionRows as SubmissionRow[]) ?? []);
    const [{ data: magnetRows }, { data: listRows }] = await Promise.all([
      supabase
        .from('lead_magnets')
        .select('id, title')
        .eq('status', 'published')
        .order('title', { ascending: true }),
      supabase
        .from('newsletter_lists')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]);
    setMagnets((magnetRows as Array<{ id: string; title: string }>) ?? []);
    setNewsletterLists((listRows as Array<{ id: string; name: string }>) ?? []);
    setError(null);
  }, [formId]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  function setFields(next: FormFieldDef[]) {
    if (!form) return;
    setForm({ ...form, fields: next });
  }

  async function save(nextStatus?: 'draft' | 'published') {
    if (!form || !allowed) return;
    if (!formHasRequiredEmailAndConsent(form.fields)) {
      setError('Form must include an email field and a consent field.');
      return;
    }
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

  const selected = form.fields.find((f) => f.key === selectedKey) || null;
  const consentField = form.fields.find((f) => f.type === 'consent');

  return (
    <AdminCmsShell title="Forms" titleIcon={<ClipboardList size={14} className="text-brand-yellow" />} userProfile={userProfile}>
      <div className="mx-auto max-w-6xl space-y-4 p-6 md:p-10">
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

        <div className="flex gap-1 border-b border-slate-200">
          {(
            [
              ['build', 'Build it'],
              ['settings', 'Settings'],
              ['submissions', 'Submissions'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest ${
                tab === id
                  ? 'border-b-2 border-brand-blue text-brand-blue'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p> : null}

        {tab === 'build' ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-2xl border border-slate-200 bg-[#F7F3EA] p-6">
              <h2 className="font-serif text-2xl font-black text-slate-900">{form.title}</h2>
              <p className="mt-1 text-xs text-slate-500">Live field preview — click a field to edit settings.</p>
              <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                {form.fields.map((field) => {
                  const active = field.key === selectedKey;
                  return (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => {
                        setSelectedKey(field.key);
                        setPanel('settings');
                      }}
                      className={`block w-full rounded-lg border px-3 py-3 text-left ${
                        active
                          ? 'border-brand-yellow bg-brand-yellow/15'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {field.type}
                        {field.required ? ' · required' : ''}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {field.label}
                        {field.required ? <span className="text-red-600"> *</span> : null}
                      </div>
                      {field.type === 'consent' ? (
                        <div className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                          <input type="checkbox" disabled className="mt-1" />
                          <span>{field.label}</span>
                        </div>
                      ) : (
                        <div className="mt-2 rounded border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-400">
                          {field.type === 'email' ? 'name@example.com' : 'Subscriber answer'}
                        </div>
                      )}
                      {active ? (
                        <div className="mt-2 flex gap-2">
                          <span
                            role="button"
                            tabIndex={0}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFields(moveFormField(form.fields, field.key, 'up'));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                setFields(moveFormField(form.fields, field.key, 'up'));
                              }
                            }}
                          >
                            ↑
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFields(moveFormField(form.fields, field.key, 'down'));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                setFields(moveFormField(form.fields, field.key, 'down'));
                              }
                            }}
                          >
                            ↓
                          </span>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled
                  className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-bold text-white opacity-80"
                >
                  Subscribe
                </button>
              </div>
            </section>

            <aside className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex gap-1 border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => setPanel('add')}
                  className={`flex-1 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                    panel === 'add' ? 'text-brand-blue' : 'text-slate-400'
                  }`}
                >
                  Add a field
                </button>
                <button
                  type="button"
                  onClick={() => setPanel('settings')}
                  className={`flex-1 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                    panel === 'settings' ? 'text-brand-blue' : 'text-slate-400'
                  }`}
                >
                  Field settings
                </button>
              </div>

              {panel === 'add' ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-slate-500">
                    Mailchimp-style field types for this signup form. Email + consent are required.
                  </p>
                  {FORM_BUILDER_FIELD_TYPES.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-slate-400"
                      onClick={() => {
                        const next = addFormField(form.fields, item.type as FormFieldType);
                        setFields(next);
                        const added = next.find(
                          (f) => !form.fields.some((x) => x.key === f.key),
                        );
                        if (added) {
                          setSelectedKey(added.key);
                          setPanel('settings');
                        }
                      }}
                    >
                      <span className="font-semibold text-slate-800">{item.label}</span>
                      <span className="text-xs text-slate-400">+</span>
                    </button>
                  ))}
                </div>
              ) : selected ? (
                <div className="mt-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Field type · {selected.type}
                  </p>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                    Field label
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                      value={selected.label}
                      onChange={(e) =>
                        setFields(
                          updateFormField(form.fields, selected.key, { label: e.target.value }),
                        )
                      }
                    />
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                    Field tag (key)
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm font-normal normal-case tracking-normal text-slate-900"
                      value={selected.key}
                      onChange={(e) =>
                        setFields(
                          updateFormField(form.fields, selected.key, { key: e.target.value }),
                        )
                      }
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(selected.required)}
                      onChange={(e) =>
                        setFields(
                          updateFormField(form.fields, selected.key, {
                            required: e.target.checked,
                          }),
                        )
                      }
                    />
                    Required field
                  </label>
                  <button
                    type="button"
                    className="text-xs font-bold uppercase tracking-widest text-red-600"
                    onClick={() => {
                      const next = removeFormField(form.fields, selected.key);
                      if (next === form.fields) {
                        setError('Cannot remove the only email or consent field.');
                        return;
                      }
                      setFields(next);
                      setSelectedKey(next[0]?.key ?? null);
                    }}
                  >
                    Delete field
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Select a field on the canvas.</p>
              )}
            </aside>
          </div>
        ) : null}

        {tab === 'settings' ? (
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
                onChange={(e) =>
                  setForm({ ...form, settings: { ...form.settings, successMessage: e.target.value } })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
              />
            </label>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
              Consent text (stored with each submission)
              <textarea
                value={form.settings.consentText || consentField?.label || ''}
                onChange={(e) =>
                  setForm({ ...form, settings: { ...form.settings, consentText: e.target.value } })
                }
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
            <fieldset className="space-y-2">
              <legend className="text-xs font-black uppercase tracking-widest text-slate-500">
                Subscribe to newsletters (after consent)
              </legend>
              {newsletterLists.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No active newsletters yet. Create one under Newsletter → Preferences.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {newsletterLists.map((list) => {
                    const selected = normalizeNewsletterListIds(form.settings.newsletterListIds).includes(
                      list.id,
                    );
                    return (
                      <li key={list.id}>
                        <label className="flex items-center gap-2 text-sm font-normal normal-case tracking-normal text-slate-800">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              setForm({
                                ...form,
                                settings: {
                                  ...form.settings,
                                  newsletterListIds: toggleNewsletterListId(
                                    form.settings.newsletterListIds,
                                    list.id,
                                  ),
                                },
                              })
                            }
                          />
                          {list.name}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>
            <p className="text-xs text-slate-500">
              Public page <code>/updates</code> posts to <code>/api/form-submit</code>. Kit <code>/free</code> is
              unchanged.
            </p>
          </section>
        ) : null}

        {tab === 'submissions' ? (
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
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
