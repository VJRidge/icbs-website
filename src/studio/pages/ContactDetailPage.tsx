import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Contact } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageContacts } from '../lib/cms/authorization';
import { slugifyContactTag } from '../../lib/contacts/segmentRules';
import type { UserProfile } from '../types';

type ContactDetail = {
  id: string;
  email: string;
  first_name: string | null;
  marketing_ok: boolean;
  suppressed_at: string | null;
  unsubscribe_token: string;
  first_consented_at: string | null;
  last_consented_at: string | null;
  source_form_id: string | null;
  created_at: string;
  updated_at: string;
};

type ConsentEvent = {
  id: string;
  event_type: string;
  consent_text: string;
  form_id: string | null;
  form_version: number | null;
  submission_id: string | null;
  occurred_at: string;
};

type TagRow = { id: string; slug: string; label: string };
type PubList = { id: string; name: string; slug: string };
type SubRow = { list_id: string; status: string };
type InterestCat = { id: string; name: string; slug: string };

export default function ContactDetailPage({ userProfile }: { userProfile: UserProfile | null }) {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<ContactDetail | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [events, setEvents] = useState<ConsentEvent[]>([]);
  const [linkedTags, setLinkedTags] = useState<TagRow[]>([]);
  const [allTags, setAllTags] = useState<TagRow[]>([]);
  const [pubLists, setPubLists] = useState<PubList[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [categories, setCategories] = useState<InterestCat[]>([]);
  const [interestIds, setInterestIds] = useState<Set<string>>(new Set());
  const [newTagLabel, setNewTagLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowed = canManageContacts(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    if (!contactId) return;
    const { data, error: contactError } = await supabase
      .from('contacts')
      .select(
        'id, email, first_name, marketing_ok, suppressed_at, unsubscribe_token, first_consented_at, last_consented_at, source_form_id, created_at, updated_at',
      )
      .eq('id', contactId)
      .maybeSingle();
    if (contactError) {
      setError(contactError.message);
      setRow(null);
      return;
    }
    if (!data) {
      setError('Contact not found.');
      setRow(null);
      return;
    }
    setRow(data as ContactDetail);
    const { data: eventRows, error: eventsError } = await supabase
      .from('contact_consent_events')
      .select('id, event_type, consent_text, form_id, form_version, submission_id, occurred_at')
      .eq('contact_id', contactId)
      .order('occurred_at', { ascending: false })
      .limit(100);
    if (eventsError) {
      setError(eventsError.message);
      setEvents([]);
      return;
    }
    setError(null);
    setEvents((eventRows as ConsentEvent[]) ?? []);

    const { data: linkRows } = await supabase
      .from('contact_tag_links')
      .select('tag_id, contact_tags(id, slug, label)')
      .eq('contact_id', contactId);
    const linked: TagRow[] = [];
    for (const link of linkRows || []) {
      const t = link.contact_tags as TagRow | TagRow[] | null;
      const tag = Array.isArray(t) ? t[0] : t;
      if (tag?.id) linked.push(tag);
    }
    setLinkedTags(linked);

    const { data: tagRows } = await supabase
      .from('contact_tags')
      .select('id, slug, label')
      .order('label', { ascending: true });
    setAllTags((tagRows as TagRow[]) ?? []);

    const { data: listRows } = await supabase
      .from('newsletter_lists')
      .select('id, name, slug')
      .order('sort_order', { ascending: true });
    setPubLists((listRows as PubList[]) ?? []);

    const { data: subRows } = await supabase
      .from('contact_subscriptions')
      .select('list_id, status')
      .eq('contact_id', contactId);
    setSubs((subRows as SubRow[]) ?? []);

    const { data: catRows } = await supabase
      .from('taxonomies')
      .select('id, name, slug')
      .eq('kind', 'category')
      .order('sort_order', { ascending: true });
    setCategories((catRows as InterestCat[]) ?? []);

    const { data: interestRows } = await supabase
      .from('contact_interests')
      .select('taxonomy_id')
      .eq('contact_id', contactId);
    setInterestIds(
      new Set((interestRows ?? []).map((r) => String((r as { taxonomy_id: string }).taxonomy_id))),
    );
  }, [contactId]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Contact" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage contacts.</p>
      </AdminCmsShell>
    );
  }

  const unsubPath = row ? `/api/contact-unsubscribe?token=${row.unsubscribe_token}` : '';

  return (
    <AdminCmsShell
      title="Contact"
      titleIcon={<Contact size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-3xl p-6 md:p-10">
        <Link
          to="/admin/contacts"
          className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-brand-blue"
        >
          ← Contacts
        </Link>
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {row ? (
          <>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-serif text-3xl font-black text-slate-900">{row.email}</h1>
                <p className="mt-1 text-sm text-slate-600">{row.first_name || 'No name on file'}</p>
              </div>
              <button
                type="button"
                disabled={deleting}
                className="rounded-md border border-red-200 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-700 disabled:opacity-50"
                onClick={() => {
                  if (!window.confirm(`Delete ${row.email}? This cannot be undone.`)) return;
                  setDeleting(true);
                  void (async () => {
                    const { error: delError } = await supabase.from('contacts').delete().eq('id', row.id);
                    if (delError) {
                      setError(delError.message);
                      setDeleting(false);
                      return;
                    }
                    navigate('/admin/contacts');
                  })();
                }}
              >
                Delete
              </button>
            </div>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Status</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {row.marketing_ok ? 'Marketing OK' : 'Suppressed'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">First consent</dt>
                <dd className="mt-1 text-slate-800">
                  {row.first_consented_at ? new Date(row.first_consented_at).toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Last consent</dt>
                <dd className="mt-1 text-slate-800">
                  {row.last_consented_at ? new Date(row.last_consented_at).toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Suppressed at</dt>
                <dd className="mt-1 text-slate-800">
                  {row.suppressed_at ? new Date(row.suppressed_at).toLocaleString() : '—'}
                </dd>
              </div>
            </dl>
            <p className="mt-4 break-all text-xs text-slate-500">
              Preference link (for future emails): <code>{unsubPath}</code>
            </p>

            <h2 className="mt-10 text-lg font-bold text-slate-900">Email subscriptions</h2>
            <p className="mt-1 text-xs text-slate-500">
              Publications this person receives. Separate from topic interests below.
            </p>
            <ul className="mt-3 space-y-2">
              {pubLists.map((list) => {
                const status = subs.find((s) => s.list_id === list.id)?.status ?? 'unsubscribed';
                return (
                  <li
                    key={list.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-slate-800">{list.name}</span>
                    <select
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900"
                      value={status}
                      onChange={(e) => {
                        const next = e.target.value;
                        void (async () => {
                          const now = new Date().toISOString();
                          const prev = subs.find((s) => s.list_id === list.id);
                          const payload: Record<string, unknown> = {
                            contact_id: row.id,
                            list_id: list.id,
                            status: next,
                            updated_at: now,
                          };
                          if (next === 'subscribed') {
                            payload.subscribed_at = now;
                            payload.unsubscribed_at = null;
                          } else if (next === 'unsubscribed') {
                            payload.unsubscribed_at = now;
                            // Keep prior subscribed_at for audit when present.
                            if (!prev) payload.subscribed_at = null;
                          }
                          const { error: subError } = await supabase
                            .from('contact_subscriptions')
                            .upsert(payload);
                          if (subError) {
                            setError(subError.message);
                            return;
                          }
                          await load();
                        })();
                      }}
                    >
                      <option value="subscribed">Subscribed</option>
                      <option value="unsubscribed">Unsubscribed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </li>
                );
              })}
            </ul>

            <h2 className="mt-10 text-lg font-bold text-slate-900">Topic interests</h2>
            <p className="mt-1 text-xs text-slate-500">
              Personalization only — does not subscribe them to a dedicated email.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((cat) => {
                const on = interestIds.has(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                      on
                        ? 'bg-brand-blue text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    onClick={() => {
                      void (async () => {
                        if (on) {
                          const { error: delError } = await supabase
                            .from('contact_interests')
                            .delete()
                            .eq('contact_id', row.id)
                            .eq('taxonomy_id', cat.id);
                          if (delError) {
                            setError(delError.message);
                            return;
                          }
                        } else {
                          const { error: upsertError } = await supabase
                            .from('contact_interests')
                            .upsert({
                              contact_id: row.id,
                              taxonomy_id: cat.id,
                            });
                          if (upsertError) {
                            setError(upsertError.message);
                            return;
                          }
                        }
                        await load();
                      })();
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            <h2 className="mt-10 text-lg font-bold text-slate-900">Tags</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {linkedTags.length === 0 ? (
                <span className="text-sm text-slate-500">No tags yet.</span>
              ) : (
                linkedTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-700 hover:bg-red-50 hover:text-red-700"
                    title="Remove tag"
                    onClick={() => {
                      void (async () => {
                        await supabase
                          .from('contact_tag_links')
                          .delete()
                          .eq('contact_id', row.id)
                          .eq('tag_id', tag.id);
                        await load();
                      })();
                    }}
                  >
                    {tag.label} ×
                  </button>
                ))
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900"
                defaultValue=""
                onChange={(e) => {
                  const tagId = e.target.value;
                  e.target.value = '';
                  if (!tagId) return;
                  void (async () => {
                    await supabase.from('contact_tag_links').upsert({
                      contact_id: row.id,
                      tag_id: tagId,
                    });
                    await load();
                  })();
                }}
              >
                <option value="">Add existing tag…</option>
                {allTags
                  .filter((t) => !linkedTags.some((l) => l.id === t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
              </select>
              <input
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900"
                placeholder="New tag label"
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
              />
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-slate-700"
                onClick={() => {
                  const label = newTagLabel.trim();
                  const slug = slugifyContactTag(label);
                  if (!slug) return;
                  void (async () => {
                    const { data: existing } = await supabase
                      .from('contact_tags')
                      .select('id')
                      .eq('slug', slug)
                      .maybeSingle();
                    let tagId = existing?.id as string | undefined;
                    if (!tagId) {
                      const { data: created } = await supabase
                        .from('contact_tags')
                        .insert({ slug, label })
                        .select('id')
                        .maybeSingle();
                      tagId = created?.id;
                    }
                    if (!tagId) return;
                    await supabase.from('contact_tag_links').upsert({
                      contact_id: row.id,
                      tag_id: tagId,
                    });
                    setNewTagLabel('');
                    await load();
                  })();
                }}
              >
                Create & add
              </button>
            </div>

            <h2 className="mt-10 text-lg font-bold text-slate-900">Consent history</h2>
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {events.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate-500">No events recorded.</li>
              ) : (
                events.map((ev) => (
                  <li key={ev.id} className="px-4 py-3 text-sm">
                    <div className="font-semibold text-slate-900">
                      {ev.event_type} · {new Date(ev.occurred_at).toLocaleString()}
                    </div>
                    <div className="mt-1 text-slate-600">{ev.consent_text}</div>
                    {ev.form_version != null ? (
                      <div className="mt-1 text-xs text-slate-400">Form version {ev.form_version}</div>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </>
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
