import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageNewsletter } from '../lib/cms/authorization';
import { slugifyTitle } from '../lib/slugifyTitle';
import {
  canDeleteNewsletterIssue,
  openNewsletterHtmlPreview,
} from '../lib/newsletter/openNewsletterHtmlPreview';
import { formatIssueCreatedAt } from '../../lib/newsletter/issueTaxonomy';
import {
  ISSUE_STATUS_TABS,
  UNTITLED_NEWSLETTER,
  issueEditionTitle,
  isIssueStatusTab,
  matchesIssueStatusTab,
  newsletterHeaderSubtitle,
  type IssueStatusTab,
} from '../../lib/newsletter/newsletterWorkflow';
import type { UserProfile } from '../types';

type IssueRow = {
  id: string;
  name: string;
  subject: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number;
  updated_at: string;
  created_at: string;
  segment_id: string | null;
  list_id: string | null;
  issue_number: number | null;
  subcategory: string;
  taxonomies: { name: string } | { name: string }[] | null;
};

type NewsletterOption = { id: string; name: string; slug: string };
type SegmentOption = { id: string; name: string };

const STATUS_LABEL: Record<IssueStatusTab, string> = {
  all: 'All',
  draft: 'Drafts',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
  cancelled: 'Canceled',
};

export default function NewsletterListPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<IssueRow[]>([]);
  const [newsletters, setNewsletters] = useState<NewsletterOption[]>([]);
  const [segments, setSegments] = useState<SegmentOption[]>([]);
  const [newNewsletterName, setNewNewsletterName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingNewsletter, setCreatingNewsletter] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const selectedNewsletterId = searchParams.get('newsletter') ?? '';
  const statusTab: IssueStatusTab = isIssueStatusTab(searchParams.get('status'))
    ? (searchParams.get('status') as IssueStatusTab)
    : 'all';

  const allowed = canManageNewsletter(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    const [{ data, error: listError }, { data: nlRows, error: nlError }, { data: segRows }] =
      await Promise.all([
        supabase
          .from('newsletter_issues')
          .select(
            'id, name, subject, status, scheduled_for, sent_at, recipient_count, updated_at, created_at, segment_id, list_id, issue_number, subcategory, taxonomies:taxonomy_id(name)',
          )
          .order('updated_at', { ascending: false }),
        supabase
          .from('newsletter_lists')
          .select('id, name, slug')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase.from('audience_segments').select('id, name').order('name', { ascending: true }),
      ]);
    if (listError) {
      setError(listError.message);
      setRows([]);
      return;
    }
    if (nlError) {
      setError(nlError.message);
      setNewsletters([]);
    } else {
      setNewsletters((nlRows as NewsletterOption[]) ?? []);
    }
    setSegments((segRows as SegmentOption[]) ?? []);
    setError(null);
    setRows(
      ((data as IssueRow[]) ?? []).map((r) => ({
        ...r,
        name: r.name ?? '',
        segment_id: r.segment_id ?? null,
        list_id: r.list_id ?? null,
        issue_number: r.issue_number ?? null,
        subcategory: r.subcategory ?? '',
      })),
    );
  }, []);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  // Default to the first publication when none is selected in the URL.
  useEffect(() => {
    if (loading || selectedNewsletterId || newsletters.length === 0) return;
    setQuery({ newsletter: newsletters[0].id });
    // setQuery reads searchParams; only re-run when lists finish loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, newsletters, selectedNewsletterId]);

  const selectedNewsletter = newsletters.find((n) => n.id === selectedNewsletterId) ?? null;

  const visibleRows = useMemo(() => {
    return rows.filter((r) => {
      if (selectedNewsletterId && r.list_id !== selectedNewsletterId) return false;
      return matchesIssueStatusTab(r.status, statusTab);
    });
  }, [rows, selectedNewsletterId, statusTab]);

  function setQuery(next: { newsletter?: string; status?: IssueStatusTab }) {
    const params = new URLSearchParams(searchParams);
    if (next.newsletter !== undefined) {
      if (next.newsletter) params.set('newsletter', next.newsletter);
      else params.delete('newsletter');
    }
    if (next.status !== undefined) {
      if (next.status === 'all') params.delete('status');
      else params.set('status', next.status);
    }
    setSearchParams(params, { replace: true });
  }

  async function createNewsletter() {
    const name = newNewsletterName.trim();
    if (!allowed || creatingNewsletter || !name) return;
    setCreatingNewsletter(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('newsletter_lists')
        .insert({
          name,
          slug: slugifyTitle(name),
          description: '',
          is_active: true,
          sort_order: (newsletters.length + 1) * 10,
        })
        .select('id, name, slug')
        .single();
      if (insertError) throw insertError;
      const row = data as NewsletterOption;
      setNewsletters((prev) => [...prev, row]);
      setNewNewsletterName('');
      setQuery({ newsletter: row.id });
      setNotice(`Newsletter “${row.name}” created. Create a send next.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create newsletter.');
    } finally {
      setCreatingNewsletter(false);
    }
  }

  async function createIssue() {
    if (!allowed || creating) return;
    if (!selectedNewsletterId) {
      setError('Select or create a newsletter first, then create a send.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('newsletter_issues')
        .insert({
          name: UNTITLED_NEWSLETTER,
          subject: '',
          status: 'draft',
          list_id: selectedNewsletterId,
          created_by: userProfile?.id ?? null,
        })
        .select('id')
        .maybeSingle();
      if (insertError) throw insertError;
      if (data?.id) window.location.assign(`/admin/newsletter/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create newsletter.');
    } finally {
      setCreating(false);
    }
  }

  async function duplicateIssue(row: IssueRow) {
    if (busyId || !allowed) return;
    setBusyId(row.id);
    setError(null);
    setNotice(null);
    try {
      const { data: source, error: loadError } = await supabase
        .from('newsletter_issues')
        .select(
          'name, subject, preview_text, body_html, body_text, document, list_id, segment_id, taxonomy_id, subcategory, series_id',
        )
        .eq('id', row.id)
        .maybeSingle();
      if (loadError) throw loadError;
      if (!source) throw new Error('Newsletter not found.');
      const baseName = issueEditionTitle(source.name, source.subject);
      const { data, error: insertError } = await supabase
        .from('newsletter_issues')
        .insert({
          name: `${baseName} (copy)`,
          subject: source.subject || '',
          preview_text: source.preview_text || '',
          body_html: source.body_html || '',
          body_text: source.body_text || '',
          document: source.document ?? null,
          status: 'draft',
          list_id: source.list_id || selectedNewsletterId || null,
          segment_id: source.segment_id ?? null,
          taxonomy_id: source.taxonomy_id ?? null,
          subcategory: source.subcategory || '',
          series_id: source.series_id ?? null,
          created_by: userProfile?.id ?? null,
        })
        .select('id')
        .maybeSingle();
      if (insertError) throw insertError;
      if (data?.id) window.location.assign(`/admin/newsletter/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not duplicate newsletter.');
    } finally {
      setBusyId(null);
    }
  }

  async function previewIssue(id: string) {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      const { data, error: loadError } = await supabase
        .from('newsletter_issues')
        .select('subject, body_html')
        .eq('id', id)
        .maybeSingle();
      if (loadError) throw loadError;
      const html = typeof data?.body_html === 'string' ? data.body_html.trim() : '';
      if (!html) {
        throw new Error('No compiled email yet. Open the newsletter and click Save first.');
      }
      openNewsletterHtmlPreview(data?.subject || 'Untitled', html);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteIssue(row: IssueRow) {
    if (busyId || !canDeleteNewsletterIssue(row.status)) return;
    const label = issueEditionTitle(row.name, row.subject);
    if (!window.confirm(`Delete “${label}”? This cannot be undone.`)) return;
    setBusyId(row.id);
    setError(null);
    setNotice(null);
    try {
      const { data, error: delError } = await supabase
        .from('newsletter_issues')
        .delete()
        .eq('id', row.id)
        .in('status', ['draft', 'scheduled'])
        .select('id');
      if (delError) throw delError;
      if (!data?.length) throw new Error('Newsletter could not be deleted (may already be sending or sent).');
      setNotice('Newsletter deleted.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Newsletter Management" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage newsletters.</p>
      </AdminCmsShell>
    );
  }

  const segmentNameById = new Map(segments.map((s) => [s.id, s.name]));
  const newsletterNameById = new Map(newsletters.map((n) => [n.id, n.name]));

  return (
    <AdminCmsShell
      title="Newsletter Management"
      subtitle={newsletterHeaderSubtitle(selectedNewsletter?.name ?? null)}
      titleIcon={<Mail size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-black text-slate-900">Newsletter Management</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Pick a newsletter, then create a send. Topics organize content; newsletters are what people
              subscribe to.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Link
              to="/admin/newsletter/templates"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700"
            >
              Templates
            </Link>
            <button
              type="button"
              className="rounded-md bg-brand-blue px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
              disabled={creating}
              onClick={() => void createIssue()}
            >
              {creating ? 'Creating…' : 'Create newsletter'}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Newsletter</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {newsletters.map((n) => {
              const on = n.id === selectedNewsletterId;
              return (
                <button
                  key={n.id}
                  type="button"
                  className={`rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                    on
                      ? 'bg-brand-blue text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:border-brand-blue/40'
                  }`}
                  onClick={() => setQuery({ newsletter: on ? '' : n.id })}
                >
                  {n.name}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex max-w-md gap-1.5">
            <input
              className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-900"
              placeholder="New newsletter name…"
              value={newNewsletterName}
              onChange={(e) => setNewNewsletterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void createNewsletter();
                }
              }}
            />
            <button
              type="button"
              disabled={creatingNewsletter || !newNewsletterName.trim()}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700 disabled:opacity-40"
              onClick={() => void createNewsletter()}
            >
              Add
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
          {ISSUE_STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                statusTab === tab ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => setQuery({ status: tab })}
            >
              {STATUS_LABEL[tab]}
            </button>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mt-4 text-sm text-emerald-800">{notice}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}

        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {visibleRows.map((row) => {
            const topic = Array.isArray(row.taxonomies) ? row.taxonomies[0]?.name : row.taxonomies?.name;
            const newsletter = row.list_id ? newsletterNameById.get(row.list_id) : null;
            return (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">
                    {issueEditionTitle(row.name, row.subject)}
                    {row.issue_number != null ? (
                      <span className="ml-2 text-xs font-bold text-slate-400">#{row.issue_number}</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-slate-500">
                    {row.status}
                    {newsletter ? ` · ${newsletter}` : ''}
                    {topic ? ` · ${topic}` : ''}
                    {row.subcategory ? ` · ${row.subcategory}` : ''}
                    {row.segment_id
                      ? ` · ${segmentNameById.get(row.segment_id) || 'Contact list'}`
                      : ''}
                    {` · ${formatIssueCreatedAt(row.created_at)}`}
                    {row.recipient_count ? ` · ${row.recipient_count} recipients` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-brand-blue disabled:opacity-50"
                    disabled={busyId === row.id}
                    onClick={() => void previewIssue(row.id)}
                  >
                    Preview
                  </button>
                  <Link
                    to={`/admin/newsletter/${row.id}`}
                    className="text-[10px] font-black uppercase tracking-widest text-brand-blue"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-brand-blue disabled:opacity-50"
                    disabled={busyId === row.id}
                    onClick={() => void duplicateIssue(row)}
                  >
                    Duplicate
                  </button>
                  {canDeleteNewsletterIssue(row.status) ? (
                    <button
                      type="button"
                      className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-800 disabled:opacity-50"
                      disabled={busyId === row.id}
                      onClick={() => void deleteIssue(row)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        {!loading && visibleRows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            {rows.length === 0
              ? 'No newsletters yet. Select a newsletter above and create one.'
              : 'No newsletters match this selection or status.'}
          </p>
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
