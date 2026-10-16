import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import BlogBlockEditor from '../components/blog/editor/BlogBlockEditor';
import { ActiveEditorProvider } from '../contexts/ActiveEditorContext';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageNewsletter } from '../lib/cms/authorization';
import { useBlogEditorStore } from '../lib/blog/useBlogEditorStore';
import {
  compileNewsletterDocument,
  documentFromBlocks,
  parseNewsletterDocument,
} from '../lib/newsletter/newsletterDocument';
import {
  canDeleteNewsletterIssue,
  openNewsletterHtmlPreview,
} from '../lib/newsletter/openNewsletterHtmlPreview';
import {
  NEWSLETTER_TEMPLATE_KIND,
  documentFromIssueForTemplate,
} from '../../lib/newsletter/newsletterTemplates';
import { formatIssueCreatedAt, resolveIssueNumber } from '../../lib/newsletter/issueTaxonomy';
import {
  ISSUE_WORKFLOW_STEPS,
  UNTITLED_NEWSLETTER,
  issueEditionTitle,
  newsletterHeaderSubtitle,
  stepLabel,
  type IssueWorkflowStep,
} from '../../lib/newsletter/newsletterWorkflow';
import {
  buildNewsletterReviewChecklist,
  canScheduleNewsletter,
} from '../../lib/newsletter/newsletterReview';
import { POST_CATEGORY_KIND } from '../lib/contentKinds';
import { slugifyTitle } from '../lib/slugifyTitle';
import type { UserProfile } from '../types';

type Issue = {
  id: string;
  name: string;
  subject: string;
  preview_text: string;
  body_html: string;
  body_text: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number;
  document: unknown;
  segment_id: string | null;
  list_id: string | null;
  taxonomy_id: string | null;
  subcategory: string;
  series_id: string | null;
  issue_number: number | null;
  created_at: string;
};

type SegmentOption = { id: string; name: string; list_kind: string };
type NewsletterOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; slug: string };
type SeriesOption = { id: string; name: string };

type JobStats = { pending: number; sent: number; failed: number; skipped: number };

export default function NewsletterEditorPage({ userProfile }: { userProfile: UserProfile | null }) {
  const { issueId } = useParams<{ issueId: string }>();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [segments, setSegments] = useState<SegmentOption[]>([]);
  const [newsletters, setNewsletters] = useState<NewsletterOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesOption[]>([]);
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [stats, setStats] = useState<JobStats>({ pending: 0, sent: 0, failed: 0, skipped: 0 });
  const [scheduleLocal, setScheduleLocal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSeriesName, setNewSeriesName] = useState('');
  const [creatingMeta, setCreatingMeta] = useState<'category' | 'series' | null>(null);
  const [step, setStep] = useState<IssueWorkflowStep>('details');

  const loadBlocks = useBlogEditorStore((s) => s.loadBlocks);
  const resetBlocks = useBlogEditorStore((s) => s.resetBlocks);

  const allowed = canManageNewsletter(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const refreshEligibleCount = useCallback(async (listId: string | null) => {
    setEligibleCount(null);
    if (listId) {
      const { count } = await supabase
        .from('contact_subscriptions')
        .select('contact_id, contacts!inner(id)', { count: 'exact', head: true })
        .eq('list_id', listId)
        .eq('status', 'subscribed')
        .eq('contacts.marketing_ok', true)
        .is('contacts.suppressed_at', null);
      setEligibleCount(typeof count === 'number' ? count : null);
      return;
    }
    const { count } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('marketing_ok', true)
      .is('suppressed_at', null);
    setEligibleCount(typeof count === 'number' ? count : null);
  }, []);

  const load = useCallback(async () => {
    if (!issueId) return;
    const { data, error: issueError } = await supabase
      .from('newsletter_issues')
      .select(
        'id, name, subject, preview_text, body_html, body_text, status, scheduled_for, sent_at, recipient_count, document, segment_id, list_id, taxonomy_id, subcategory, series_id, issue_number, created_at',
      )
      .eq('id', issueId)
      .maybeSingle();
    if (issueError || !data) {
      setError(issueError?.message || 'Newsletter not found.');
      setIssue(null);
      setEditorReady(false);
      return;
    }
    const row = data as Issue;
    setIssue({
      ...row,
      name: row.name?.trim() ? row.name : UNTITLED_NEWSLETTER,
      segment_id: row.segment_id ?? null,
      list_id: row.list_id ?? null,
      taxonomy_id: row.taxonomy_id ?? null,
      subcategory: row.subcategory ?? '',
      series_id: row.series_id ?? null,
      issue_number: row.issue_number ?? null,
      created_at: row.created_at,
    });

    const { data: segmentRows, error: segmentsError } = await supabase
      .from('audience_segments')
      .select('id, name, list_kind')
      .order('name', { ascending: true });
    if (segmentsError) {
      setError(segmentsError.message);
      setSegments([]);
    } else {
      setSegments(
        ((segmentRows as SegmentOption[]) ?? []).map((s) => ({
          ...s,
          list_kind: s.list_kind === 'static' ? 'static' : 'dynamic',
        })),
      );
    }

    const [{ data: catRows }, { data: seriesRows }, { data: nlRows }] = await Promise.all([
      supabase
        .from('taxonomies')
        .select('id, name, slug')
        .eq('kind', POST_CATEGORY_KIND)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('series')
        .select('id, name')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('newsletter_lists')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]);
    setCategories((catRows as CategoryOption[]) ?? []);
    setSeriesList((seriesRows as SeriesOption[]) ?? []);
    setNewsletters((nlRows as NewsletterOption[]) ?? []);

    const doc = parseNewsletterDocument(row.document);
    loadBlocks(doc.blocks);
    setEditorReady(true);

    if (row.scheduled_for) {
      const d = new Date(row.scheduled_for);
      const pad = (n: number) => String(n).padStart(2, '0');
      setScheduleLocal(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    } else {
      setScheduleLocal('');
    }

    const { data: jobs } = await supabase
      .from('newsletter_send_jobs')
      .select('status')
      .eq('issue_id', issueId)
      .limit(5000);
    const next: JobStats = { pending: 0, sent: 0, failed: 0, skipped: 0 };
    for (const j of jobs || []) {
      if (j.status === 'sent') next.sent += 1;
      else if (j.status === 'failed') next.failed += 1;
      else if (j.status === 'skipped') next.skipped += 1;
      else if (j.status === 'pending' || j.status === 'processing') next.pending += 1;
    }
    setStats(next);
    setError(null);
  }, [issueId, loadBlocks]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
    return () => {
      resetBlocks();
    };
  }, [userProfile, allowed, load, resetBlocks]);

  // Keep Review / Schedule audience counts aligned with the current newsletter selection.
  useEffect(() => {
    if (!issue || loading) return;
    void refreshEligibleCount(issue.list_id);
  }, [issue?.list_id, issue?.id, loading, refreshEligibleCount]);

  function compiledPayload() {
    const blocks = useBlogEditorStore.getState().blocks;
    return compileNewsletterDocument(documentFromBlocks(blocks));
  }

  function issueMetaPayload(current: Issue) {
    return {
      name: current.name.trim() || UNTITLED_NEWSLETTER,
      subject: current.subject.trim(),
      preview_text: current.preview_text,
      taxonomy_id: current.taxonomy_id,
      subcategory: current.subcategory.trim(),
      series_id: current.series_id,
      issue_number: current.issue_number,
      segment_id: current.segment_id,
      list_id: current.list_id,
    };
  }

  function reviewInput() {
    if (!issue) {
      return {
        listId: null,
        subject: '',
        bodyHtml: '',
        eligibleCount: null,
        scheduleLocal: '',
      };
    }
    const isLocked = issue.status === 'sending' || issue.status === 'sent';
    let bodyHtml = issue.body_html || '';
    if (!isLocked && editorReady) {
      try {
        bodyHtml = compiledPayload().bodyHtml || bodyHtml;
      } catch {
        // keep saved body
      }
    }
    return {
      listId: issue.list_id,
      subject: issue.subject,
      bodyHtml,
      eligibleCount,
      scheduleLocal,
    };
  }

  async function assignIssueNumberForTopic(
    taxonomyId: string | null,
    previous: Issue,
  ): Promise<number | null> {
    if (!taxonomyId) return null;
    if (taxonomyId === previous.taxonomy_id && previous.issue_number != null) {
      return previous.issue_number;
    }
    const { data, error: rpcError } = await supabase.rpc('next_newsletter_issue_number', {
      p_taxonomy_id: taxonomyId,
    });
    if (rpcError) throw rpcError;
    return resolveIssueNumber({
      taxonomyId,
      previousTaxonomyId: previous.taxonomy_id,
      previousIssueNumber: previous.issue_number,
      nextIssueNumber: typeof data === 'number' ? data : 1,
    });
  }

  async function onTopicChange(taxonomyId: string) {
    if (!issue) return;
    try {
      const nextId = taxonomyId || null;
      const issueNumber = await assignIssueNumberForTopic(nextId, issue);
      setIssue({ ...issue, taxonomy_id: nextId, issue_number: issueNumber });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not assign issue number.');
    }
  }

  async function createCategory() {
    if (!allowed || creatingMeta) return;
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingMeta('category');
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('taxonomies')
        .insert({
          kind: POST_CATEGORY_KIND,
          name,
          slug: slugifyTitle(name),
          description: '',
          sort_order: (categories.length + 1) * 10,
        })
        .select('id, name, slug')
        .single();
      if (insertError) throw insertError;
      const cat = data as CategoryOption;
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName('');
      if (issue) await onTopicChange(cat.id);
      setNotice(`Category “${cat.name}” created.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create category.');
    } finally {
      setCreatingMeta(null);
    }
  }

  async function createSeries() {
    if (!allowed || creatingMeta) return;
    const name = newSeriesName.trim();
    if (!name) return;
    setCreatingMeta('series');
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('series')
        .insert({
          name,
          slug: slugifyTitle(name),
          description: '',
          sort_order: (seriesList.length + 1) * 10,
        })
        .select('id, name')
        .single();
      if (insertError) throw insertError;
      const row = data as SeriesOption;
      setSeriesList((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSeriesName('');
      if (issue) setIssue({ ...issue, series_id: row.id });
      setNotice(`Series “${row.name}” created.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create series.');
    } finally {
      setCreatingMeta(null);
    }
  }

  async function saveDraft() {
    if (!issue || !allowed || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const compiled = compiledPayload();
      const meta = issueMetaPayload(issue);
      const { error: saveError } = await supabase
        .from('newsletter_issues')
        .update({
          ...meta,
          document: compiled.document,
          body_html: compiled.bodyHtml,
          body_text: compiled.bodyText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', issue.id);
      if (saveError) throw saveError;
      setIssue({
        ...issue,
        ...meta,
        document: compiled.document,
        body_html: compiled.bodyHtml,
        body_text: compiled.bodyText,
      });
      setNotice('Draft saved. Body compiled for email delivery.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function scheduleIssue() {
    if (!issue || !allowed || saving) return;
    const readiness = reviewInput();
    if (!canScheduleNewsletter(readiness)) {
      setStep('review');
      setError('Finish the Review checklist before scheduling.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const compiled = compiledPayload();
      const when = new Date(scheduleLocal);
      if (Number.isNaN(when.getTime())) throw new Error('Invalid schedule time.');
      const meta = issueMetaPayload({
        ...issue,
        subject: issue.subject.trim() || issue.name.trim() || UNTITLED_NEWSLETTER,
      });
      const { data: scheduled, error: saveError } = await supabase
        .from('newsletter_issues')
        .update({
          ...meta,
          document: compiled.document,
          body_html: compiled.bodyHtml,
          body_text: compiled.bodyText,
          status: 'scheduled',
          scheduled_for: when.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', issue.id)
        .in('status', ['draft', 'scheduled'])
        .select('id');
      if (saveError) throw saveError;
      if (!scheduled?.length) throw new Error('Newsletter already sending or sent.');
      setNotice('Scheduled. Cron will freeze eligible contacts and send.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Schedule failed.');
    } finally {
      setSaving(false);
    }
  }

  async function cancelSchedule() {
    if (!issue || !allowed || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { data: cancelled, error: saveError } = await supabase
        .from('newsletter_issues')
        .update({
          status: 'draft',
          scheduled_for: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', issue.id)
        .eq('status', 'scheduled')
        .select('id');
      if (saveError) throw saveError;
      if (!cancelled?.length) throw new Error('Newsletter is not scheduled (may already be sending).');
      setNotice('Schedule cancelled.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed.');
    } finally {
      setSaving(false);
    }
  }

  function previewEmail() {
    if (!issue) return;
    setError(null);
    try {
      const isLocked = issue.status === 'sending' || issue.status === 'sent';
      // Prefer freshly compiled body from the editor when unlocked.
      const html = !isLocked ? compiledPayload().bodyHtml : issue.body_html;
      if (!html.trim()) {
        throw new Error('Nothing to preview yet. Add content and save draft first.');
      }
      openNewsletterHtmlPreview(issue.subject, html);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed.');
    }
  }

  async function sendTestEmail() {
    if (!issue || !allowed || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (issue.status !== 'sending' && issue.status !== 'sent') {
        const compiled = compiledPayload();
        const meta = issueMetaPayload(issue);
        const { error: saveError } = await supabase
          .from('newsletter_issues')
          .update({
            ...meta,
            document: compiled.document,
            body_html: compiled.bodyHtml,
            body_text: compiled.bodyText,
            updated_at: new Date().toISOString(),
          })
          .eq('id', issue.id);
        if (saveError) throw saveError;
        setIssue({
          ...issue,
          ...meta,
          document: compiled.document,
          body_html: compiled.bodyHtml,
          body_text: compiled.bodyText,
        });
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sign in again to send a test.');
      const res = await fetch('/api/newsletter-test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ issueId: issue.id }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string; to?: string };
      if (!res.ok) throw new Error(payload.error || 'Test send failed.');
      setNotice(`Test sent to ${payload.to || 'your email'}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test send failed.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteIssue() {
    if (!issue || !allowed || saving || !canDeleteNewsletterIssue(issue.status)) return;
    const label = issue.subject.trim() || UNTITLED_NEWSLETTER;
    if (!window.confirm(`Delete “${label}”? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { data, error: delError } = await supabase
        .from('newsletter_issues')
        .delete()
        .eq('id', issue.id)
        .in('status', ['draft', 'scheduled'])
        .select('id');
      if (delError) throw delError;
      if (!data?.length) throw new Error('Newsletter could not be deleted (may already be sending or sent).');
      navigate('/admin/newsletter');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
      setSaving(false);
    }
  }

  async function saveAsTemplate() {
    if (!issue || !allowed || saving) return;
    const name = window.prompt('Template name', issue.subject.trim() || 'Newsletter template');
    if (!name?.trim()) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const blocks = useBlogEditorStore.getState().blocks;
      const document = documentFromIssueForTemplate({
        blocks,
        subject: issue.subject,
        previewText: issue.preview_text,
      });
      const { error: insertError } = await supabase.from('templates').insert({
        title: name.trim().slice(0, 120),
        kind: NEWSLETTER_TEMPLATE_KIND,
        is_global: false,
        document: {
          ...document,
          description: 'Saved from a newsletter.',
        },
      });
      if (insertError) throw insertError;
      setNotice('Template saved. Open Newsletter → Templates to reuse it.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save template.');
    } finally {
      setSaving(false);
    }
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Newsletter Management" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage newsletters.</p>
      </AdminCmsShell>
    );
  }

  const locked = issue?.status === 'sending' || issue?.status === 'sent';
  const newsletterName = issue
    ? newsletters.find((n) => n.id === issue.list_id)?.name ?? null
    : null;
  const topicName = issue
    ? categories.find((c) => c.id === issue.taxonomy_id)?.name ?? null
    : null;
  const checklist = issue ? buildNewsletterReviewChecklist(reviewInput()) : [];
  const scheduleReady = issue ? canScheduleNewsletter(reviewInput()) : false;
  const fieldClass =
    'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 disabled:bg-slate-50';
  const btnClass =
    'rounded-md border border-slate-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700 disabled:opacity-50';

  return (
    <AdminCmsShell
      title="Newsletter Management"
      subtitle={newsletterHeaderSubtitle(newsletterName)}
      titleIcon={<Mail size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              to={issue?.list_id ? `/admin/newsletter?newsletter=${issue.list_id}` : '/admin/newsletter'}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-blue"
            >
              ← All newsletters
            </Link>
            {issue ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" className={btnClass} disabled={saving} onClick={() => previewEmail()}>
                  Preview
                </button>
                <button
                  type="button"
                  className={btnClass}
                  disabled={saving}
                  onClick={() => void sendTestEmail()}
                >
                  Test send
                </button>
                {!locked ? (
                  <button
                    type="button"
                    className="rounded-md bg-brand-blue px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                    disabled={saving}
                    onClick={() => void saveDraft()}
                  >
                    Save
                  </button>
                ) : null}
                <button type="button" className={btnClass} disabled={saving} onClick={() => void saveAsTemplate()}>
                  Save as template
                </button>
                {issue.status === 'draft' || issue.status === 'scheduled' ? (
                  <>
                    <input
                      type="datetime-local"
                      disabled={locked}
                      aria-label="Schedule time"
                      className="rounded-md border border-slate-300 px-2 py-1 text-[10px] text-slate-700 disabled:bg-slate-50"
                      value={scheduleLocal}
                      onChange={(e) => setScheduleLocal(e.target.value)}
                    />
                    <button
                      type="button"
                      className={btnClass}
                      disabled={saving || locked || !scheduleReady}
                      title={scheduleReady ? 'Schedule send' : 'Complete the Review checklist first'}
                      onClick={() => void scheduleIssue()}
                    >
                      Schedule
                    </button>
                  </>
                ) : null}
                {issue.status === 'scheduled' ? (
                  <button
                    type="button"
                    className="rounded-md border border-red-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-red-700 disabled:opacity-50"
                    disabled={saving}
                    onClick={() => void cancelSchedule()}
                  >
                    Cancel schedule
                  </button>
                ) : null}
                {canDeleteNewsletterIssue(issue.status) ? (
                  <button
                    type="button"
                    className="rounded-md border border-red-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-red-700 disabled:opacity-50"
                    disabled={saving}
                    onClick={() => void deleteIssue()}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          {issue ? (
            <nav className="mt-3 flex flex-wrap gap-1" aria-label="Newsletter steps">
              {ISSUE_WORKFLOW_STEPS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                    step === s ? 'bg-brand-blue text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  onClick={() => setStep(s)}
                >
                  {stepLabel(s)}
                </button>
              ))}
            </nav>
          ) : null}
          {loading ? <p className="mt-2 text-sm text-slate-500">Loading…</p> : null}
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
          {notice ? <p className="mt-2 text-sm text-emerald-800">{notice}</p> : null}
        </div>

        {issue ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {step !== 'design' ? (
              <div className="min-h-0 flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h1 className="font-serif text-2xl font-black text-slate-900">
                    {issueEditionTitle(issue.name, issue.subject)}
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Status: <strong>{issue.status}</strong>
                    {issue.issue_number != null ? ` · #${issue.issue_number}` : ''}
                    {` · Created ${formatIssueCreatedAt(issue.created_at)}`}
                  </p>

                  {step === 'details' ? (
                    <div className="mt-5 space-y-4">
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                        Newsletter
                        <select
                          disabled={locked}
                          className={fieldClass}
                          value={issue.list_id || ''}
                          onChange={(e) =>
                            setIssue({ ...issue, list_id: e.target.value ? e.target.value : null })
                          }
                        >
                          <option value="">Select a newsletter…</option>
                          {newsletters.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                        Title
                        <input
                          disabled={locked}
                          className={fieldClass}
                          value={issue.name}
                          onChange={(e) => setIssue({ ...issue, name: e.target.value })}
                          placeholder={UNTITLED_NEWSLETTER}
                        />
                      </label>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                        Topic
                        <select
                          disabled={locked}
                          className={fieldClass}
                          value={issue.taxonomy_id || ''}
                          onChange={(e) => void onTopicChange(e.target.value)}
                        >
                          <option value="">Select a topic…</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {!locked ? (
                        <div className="flex gap-1.5">
                          <input
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900"
                            placeholder="New topic…"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void createCategory();
                              }
                            }}
                          />
                          <button
                            type="button"
                            disabled={Boolean(creatingMeta) || !newCategoryName.trim()}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-40"
                            onClick={() => void createCategory()}
                          >
                            Add
                          </button>
                        </div>
                      ) : null}
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                        Subcategory
                        <input
                          disabled={locked}
                          className={fieldClass}
                          value={issue.subcategory}
                          onChange={(e) => setIssue({ ...issue, subcategory: e.target.value })}
                          placeholder="Optional"
                        />
                      </label>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                        Series
                        <select
                          disabled={locked}
                          className={fieldClass}
                          value={issue.series_id || ''}
                          onChange={(e) =>
                            setIssue({ ...issue, series_id: e.target.value ? e.target.value : null })
                          }
                        >
                          <option value="">None</option>
                          {seriesList.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {!locked ? (
                        <div className="flex gap-1.5">
                          <input
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900"
                            placeholder="New series…"
                            value={newSeriesName}
                            onChange={(e) => setNewSeriesName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void createSeries();
                              }
                            }}
                          />
                          <button
                            type="button"
                            disabled={Boolean(creatingMeta) || !newSeriesName.trim()}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-40"
                            onClick={() => void createSeries()}
                          >
                            Add
                          </button>
                        </div>
                      ) : null}
                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        Number:{' '}
                        {issue.issue_number != null
                          ? `#${issue.issue_number}`
                          : 'Assigned when you pick a topic'}
                      </p>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                        Email subject
                        <input
                          disabled={locked}
                          className={fieldClass}
                          value={issue.subject}
                          onChange={(e) => setIssue({ ...issue, subject: e.target.value })}
                          placeholder={issue.name || UNTITLED_NEWSLETTER}
                        />
                      </label>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                        Preview text
                        <input
                          disabled={locked}
                          className={fieldClass}
                          value={issue.preview_text}
                          onChange={(e) => setIssue({ ...issue, preview_text: e.target.value })}
                        />
                      </label>
                    </div>
                  ) : null}

                  {step === 'audience' ? (
                    <div className="mt-5 space-y-4">
                      <p className="text-sm text-slate-600">
                        {issue.list_id
                          ? `Send goes to subscribers of ${newsletterName ?? 'this newsletter'} (marketing OK, not suppressed), counted once.`
                          : 'No newsletter selected. Send would go to all marketing contacts, or a contact list below.'}
                      </p>
                      {eligibleCount != null ? (
                        <p className="text-sm font-semibold text-slate-900">
                          Eligible now: {eligibleCount}
                          {eligibleCount === 0 ? ' — nobody would receive this send yet.' : ''}
                        </p>
                      ) : null}
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                        Optional contact list
                        <select
                          disabled={locked || Boolean(issue.list_id)}
                          className={fieldClass}
                          value={issue.segment_id || ''}
                          onChange={(e) =>
                            setIssue({
                              ...issue,
                              segment_id: e.target.value ? e.target.value : null,
                            })
                          }
                        >
                          <option value="">
                            {issue.list_id ? 'Using newsletter subscribers' : 'All marketing contacts'}
                          </option>
                          {segments.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                              {s.list_kind === 'static' ? ' (uploaded)' : ' (rules)'}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="text-xs text-slate-500">
                        A newsletter assignment is the audience. Contact lists apply only when no newsletter is
                        selected.
                      </p>
                    </div>
                  ) : null}

                  {step === 'review' ? (
                    <div className="mt-5 space-y-5">
                      <ul className="space-y-2">
                        {checklist.map((item) => (
                          <li
                            key={item.id}
                            className={`rounded-lg border px-3 py-2 text-sm ${
                              item.ok
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                : 'border-amber-200 bg-amber-50 text-amber-950'
                            }`}
                          >
                            <p className="font-semibold">
                              {item.ok ? '✓' : '!'} {item.label}
                            </p>
                            <p className="mt-0.5 text-xs opacity-90">{item.detail}</p>
                          </li>
                        ))}
                      </ul>
                      <dl className="space-y-3 text-sm">
                        <div>
                          <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Newsletter
                          </dt>
                          <dd className="mt-1 font-semibold text-slate-900">
                            {newsletterName ?? 'Not selected'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Title
                          </dt>
                          <dd className="mt-1 font-semibold text-slate-900">
                            {issueEditionTitle(issue.name, issue.subject)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Topic
                          </dt>
                          <dd className="mt-1 text-slate-800">
                            {topicName ?? 'None'}
                            {issue.subcategory ? ` · ${issue.subcategory}` : ''}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Subject
                          </dt>
                          <dd className="mt-1 text-slate-800">{issue.subject.trim() || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Recipients
                          </dt>
                          <dd className="mt-1 text-slate-800">
                            {eligibleCount != null ? `${eligibleCount} eligible` : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Delivery
                          </dt>
                          <dd className="mt-1 text-slate-800">
                            Pending {stats.pending} · Sent {stats.sent} · Failed {stats.failed} · Skipped{' '}
                            {stats.skipped}
                            {issue.recipient_count ? ` · Frozen ${issue.recipient_count}` : ''}
                          </dd>
                        </div>
                      </dl>
                      {!scheduleReady ? (
                        <p className="text-xs text-amber-800">
                          Schedule stays disabled until every checklist item is complete.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <section
              className={`min-h-0 overflow-auto bg-[#F3EDE3] p-4 md:p-6 ${
                step === 'design' ? 'flex-1' : 'hidden'
              } ${locked ? 'pointer-events-none opacity-70' : ''}`}
            >
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {newsletterName ?? 'Newsletter'}
                </p>
                <h2 className="font-serif text-xl font-black text-slate-900">
                  {issueEditionTitle(issue.name, issue.subject)}
                </h2>
              </div>
              {locked ? (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  This newsletter is locked because it is {issue.status}.
                </p>
              ) : null}
              {editorReady ? (
                <ActiveEditorProvider>
                  <BlogBlockEditor userId={userProfile?.id ?? null} palette="email" />
                </ActiveEditorProvider>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
