import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Filter } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageSegments } from '../lib/cms/authorization';
import {
  countMatchingContacts,
  normalizeSegmentDefinition,
  type ContactForSegment,
  type SegmentDefinition,
  type SegmentRule,
} from '../../lib/contacts/segmentRules';
import type { UserProfile } from '../types';

type TagOption = { id: string; slug: string; label: string };
type ListKind = 'dynamic' | 'static';

type CsvSummary = {
  total?: number;
  create?: number;
  update?: number;
  add_member?: number;
  skip?: number;
  wouldWrite?: number;
};

type CsvSampleRow = {
  line: number;
  email: string | null;
  action: string;
  reason: string;
};

function emptyRule(): SegmentRule {
  return { field: 'tag', op: 'has', value: 'newsletter' };
}

async function callListCsvApi(body: {
  segmentId: string;
  csvText: string;
  action: 'dry_run' | 'commit';
  confirmMarketingConsent: boolean;
}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sign in required.');
  const res = await fetch('/api/import-contact-list-csv', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    summary?: CsvSummary;
    sample?: CsvSampleRow[];
    written?: number;
  };
  if (!res.ok) throw new Error(payload.error || `CSV ${body.action} failed.`);
  return payload;
}

export default function SegmentEditorPage({ userProfile }: { userProfile: UserProfile | null }) {
  const { segmentId } = useParams<{ segmentId: string }>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [listKind, setListKind] = useState<ListKind>('dynamic');
  const [definition, setDefinition] = useState<SegmentDefinition>({ match: 'all', rules: [] });
  const [tags, setTags] = useState<TagOption[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [csvText, setCsvText] = useState('');
  const [confirmConsent, setConfirmConsent] = useState(false);
  const [csvSummary, setCsvSummary] = useState<CsvSummary | null>(null);
  const [csvSample, setCsvSample] = useState<CsvSampleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [csvBusy, setCsvBusy] = useState<'dry_run' | 'commit' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const allowed = canManageSegments(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    if (!segmentId) return;
    const { data, error: segError } = await supabase
      .from('audience_segments')
      .select('id, name, description, definition, list_kind')
      .eq('id', segmentId)
      .maybeSingle();
    if (segError || !data) {
      setError(segError?.message || 'Contact list not found.');
      return;
    }
    setName(data.name || '');
    setDescription(data.description || '');
    setListKind(data.list_kind === 'static' ? 'static' : 'dynamic');
    const normalizedDef = normalizeSegmentDefinition(data.definition);
    setDefinition({
      ...normalizedDef,
      rules: normalizedDef.rules.filter(
        (r) => r.field !== 'marketing_ok' && r.field !== 'suppressed',
      ),
    });

    const { data: tagRows } = await supabase
      .from('contact_tags')
      .select('id, slug, label')
      .order('label', { ascending: true });
    setTags((tagRows as TagOption[]) ?? []);

    if (data.list_kind === 'static') {
      const { count } = await supabase
        .from('audience_segment_members')
        .select('contact_id', { count: 'exact', head: true })
        .eq('segment_id', segmentId);
      setMemberCount(typeof count === 'number' ? count : null);
    } else {
      setMemberCount(null);
    }
    setError(null);
  }, [segmentId]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  const normalized = useMemo(() => normalizeSegmentDefinition(definition), [definition]);

  async function refreshCount() {
    setError(null);
    try {
      if (listKind === 'static' && segmentId) {
        const { data: members } = await supabase
          .from('audience_segment_members')
          .select('contact_id')
          .eq('segment_id', segmentId)
          .limit(5000);
        const ids = (members || []).map((m) => m.contact_id as string).filter(Boolean);
        setMemberCount(ids.length);
        if (!ids.length) {
          setPreviewCount(0);
          return;
        }
        let eligible = 0;
        const chunk = 80;
        for (let i = 0; i < ids.length; i += chunk) {
          const slice = ids.slice(i, i + chunk);
          const { count } = await supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .in('id', slice)
            .eq('marketing_ok', true)
            .is('suppressed_at', null);
          eligible += typeof count === 'number' ? count : 0;
        }
        setPreviewCount(eligible);
        return;
      }

      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, email, marketing_ok, suppressed_at, source_form_id')
        .eq('marketing_ok', true)
        .is('suppressed_at', null)
        .limit(5000);
      const ids = (contacts || []).map((c) => c.id as string);
      const tagSlugsByContact = new Map<string, string[]>();
      const chunk = 80;
      if (ids.length && normalized.rules.some((r) => r.field === 'tag')) {
        for (let i = 0; i < ids.length; i += chunk) {
          const slice = ids.slice(i, i + chunk);
          const { data: links } = await supabase
            .from('contact_tag_links')
            .select('contact_id, contact_tags(slug)')
            .in('contact_id', slice);
          for (const link of links || []) {
            const tag = link.contact_tags as { slug?: string } | { slug?: string }[] | null;
            const slug = Array.isArray(tag) ? tag[0]?.slug : tag?.slug;
            if (!link.contact_id || !slug) continue;
            const prev = tagSlugsByContact.get(link.contact_id) || [];
            prev.push(slug);
            tagSlugsByContact.set(link.contact_id, prev);
          }
        }
      }
      const magnetByContact = new Map<string, string[]>();
      if (ids.length && normalized.rules.some((r) => r.field === 'lead_magnet_id')) {
        for (let i = 0; i < ids.length; i += chunk) {
          const slice = ids.slice(i, i + chunk);
          const { data: jobs } = await supabase
            .from('delivery_jobs')
            .select('contact_id, lead_magnet_id')
            .in('contact_id', slice)
            .limit(5000);
          for (const job of jobs || []) {
            if (!job.contact_id || !job.lead_magnet_id) continue;
            const prev = magnetByContact.get(job.contact_id) || [];
            if (!prev.includes(job.lead_magnet_id)) prev.push(job.lead_magnet_id);
            magnetByContact.set(job.contact_id, prev);
          }
        }
      }
      const rows: ContactForSegment[] = (contacts || []).map((c) => ({
        id: c.id,
        email: c.email,
        marketing_ok: c.marketing_ok,
        suppressed_at: c.suppressed_at,
        source_form_id: c.source_form_id,
        tagSlugs: tagSlugsByContact.get(c.id) || [],
        requestedLeadMagnetIds: magnetByContact.get(c.id) || [],
      }));
      setPreviewCount(countMatchingContacts(rows, normalized));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not count recipients.');
      setPreviewCount(null);
    }
  }

  async function save() {
    if (!segmentId || !allowed || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { error: saveError } = await supabase
        .from('audience_segments')
        .update({
          name: name.trim() || 'Untitled list',
          description: description.trim(),
          definition: listKind === 'dynamic' ? normalized : { match: 'all', rules: [] },
          updated_at: new Date().toISOString(),
        })
        .eq('id', segmentId);
      if (saveError) throw saveError;
      setNotice('List saved.');
      await refreshCount();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function runCsv(action: 'dry_run' | 'commit') {
    if (!segmentId || !allowed || csvBusy) return;
    if (!csvText.trim()) {
      setError('Paste or upload a CSV first.');
      return;
    }
    setCsvBusy(action);
    setError(null);
    setNotice(null);
    try {
      const result = await callListCsvApi({
        segmentId,
        csvText,
        action,
        confirmMarketingConsent: confirmConsent,
      });
      setCsvSummary(result.summary || null);
      setCsvSample(result.sample || []);
      if (action === 'commit') {
        setNotice(`Import committed (${result.written ?? 0} rows written).`);
        await load();
        await refreshCount();
      } else {
        setNotice('Dry-run complete — review the sample, then commit.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'CSV import failed.');
    } finally {
      setCsvBusy(null);
    }
  }

  function updateRule(index: number, next: SegmentRule) {
    setDefinition({
      ...definition,
      rules: definition.rules.map((r, i) => (i === index ? next : r)),
    });
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Contact lists" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage contact lists.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Contact list"
      titleIcon={<Filter size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-3xl p-6 md:p-10">
        <Link
          to="/admin/segments"
          className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-brand-blue"
        >
          ← Contact lists
        </Link>
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mt-4 text-sm text-emerald-800">{notice}</p> : null}

        <p className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-400">
          Type · {listKind === 'static' ? 'Uploaded list' : 'Rule list'}
          {listKind === 'static' && memberCount != null ? ` · ${memberCount} members` : ''}
        </p>

        <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">
          Name
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">
          Description
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        {listKind === 'static' ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-900">Upload CSV</h2>
            <p className="mt-1 text-xs text-slate-500">
              Columns: <code>email</code>, optional <code>first_name</code>. New contacts require the consent
              checkbox. Suppressed contacts are added to the list but not re-opted-in.
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-3 block w-full text-sm text-slate-700"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 1_500_000) {
                  setError('CSV is too large (max ~1.5MB).');
                  return;
                }
                void file.text().then((text) => setCsvText(text));
              }}
            />
            <textarea
              className="mt-3 h-40 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900"
              placeholder="email,first_name&#10;ada@example.com,Ada"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmConsent}
                onChange={(e) => setConfirmConsent(e.target.checked)}
              />
              <span>
                I confirm these people previously consented to marketing email (required to create new
                contacts).
              </span>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 disabled:opacity-50"
                disabled={Boolean(csvBusy)}
                onClick={() => void runCsv('dry_run')}
              >
                {csvBusy === 'dry_run' ? 'Dry-run…' : 'Dry-run'}
              </button>
              <button
                type="button"
                className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                disabled={Boolean(csvBusy) || !confirmConsent}
                onClick={() => void runCsv('commit')}
              >
                {csvBusy === 'commit' ? 'Committing…' : 'Commit import'}
              </button>
            </div>
            {csvSummary ? (
              <p className="mt-3 text-sm text-slate-600">
                {csvSummary.total ?? 0} rows · create {csvSummary.create ?? 0} · update{' '}
                {csvSummary.update ?? 0} · add {csvSummary.add_member ?? 0} · skip {csvSummary.skip ?? 0}
              </p>
            ) : null}
            {csvSample.length > 0 ? (
              <ul className="mt-3 max-h-48 overflow-auto rounded-lg border border-slate-100 text-xs">
                {csvSample.map((row) => (
                  <li key={`${row.line}-${row.email}`} className="border-b border-slate-50 px-3 py-2">
                    <span className="font-semibold">{row.action}</span> · L{row.line} ·{' '}
                    {row.email || '(invalid)'} — {row.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Match</p>
              <div className="mt-2 flex gap-3">
                {(['all', 'any'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-widest ${
                      definition.match === m
                        ? 'bg-brand-blue text-white'
                        : 'border border-slate-200 text-slate-600'
                    }`}
                    onClick={() => setDefinition({ ...definition, match: m })}
                  >
                    {m === 'all' ? 'All rules' : 'Any rule'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Rules</p>
                <button
                  type="button"
                  className="text-xs font-black uppercase tracking-widest text-brand-blue"
                  onClick={() =>
                    setDefinition({ ...definition, rules: [...definition.rules, emptyRule()] })
                  }
                >
                  Add rule
                </button>
              </div>
              {definition.rules.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                  No rules — this list includes every marketing-ok, non-suppressed contact.
                </p>
              ) : null}
              {definition.rules.map((rule, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Field
                    <select
                      className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900"
                      value={rule.field}
                      onChange={(e) => {
                        const field = e.target.value;
                        if (field === 'tag')
                          updateRule(index, { field: 'tag', op: 'has', value: 'newsletter' });
                        else if (field === 'source_form_id')
                          updateRule(index, { field: 'source_form_id', op: 'eq', value: '' });
                        else updateRule(index, { field: 'lead_magnet_id', op: 'requested', value: '' });
                      }}
                    >
                      <option value="tag">Has tag</option>
                      <option value="source_form_id">Source form id</option>
                      <option value="lead_magnet_id">Requested lead magnet id</option>
                    </select>
                  </label>
                  {rule.field === 'tag' ? (
                    <>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Op
                        <select
                          className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900"
                          value={rule.op}
                          onChange={(e) =>
                            updateRule(index, {
                              field: 'tag',
                              op: e.target.value === 'not_has' ? 'not_has' : 'has',
                              value: rule.value,
                            })
                          }
                        >
                          <option value="has">has</option>
                          <option value="not_has">does not have</option>
                        </select>
                      </label>
                      <label className="min-w-[10rem] flex-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Tag
                        <select
                          className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900"
                          value={rule.value}
                          onChange={(e) =>
                            updateRule(index, { field: 'tag', op: rule.op, value: e.target.value })
                          }
                        >
                          {tags.map((t) => (
                            <option key={t.id} value={t.slug}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : null}
                  {(rule.field === 'source_form_id' || rule.field === 'lead_magnet_id') && (
                    <label className="min-w-[12rem] flex-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Id
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-slate-900"
                        value={rule.value}
                        onChange={(e) => updateRule(index, { ...rule, value: e.target.value })}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    className="text-xs font-bold uppercase tracking-widest text-red-600"
                    onClick={() =>
                      setDefinition({
                        ...definition,
                        rules: definition.rules.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            disabled={saving}
            onClick={() => void save()}
          >
            Save list
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700"
            onClick={() => void refreshCount()}
          >
            Preview count
          </button>
          {previewCount != null ? (
            <span className="text-sm text-slate-600">
              <strong>{previewCount}</strong> eligible for send
            </span>
          ) : null}
        </div>
      </div>
    </AdminCmsShell>
  );
}
