import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageCampaigns } from '../lib/cms/authorization';
import {
  computeCampaignReadiness,
  type CampaignStatus,
  type CampaignStepType,
} from '../../lib/campaigns/campaignReadiness';
import type { UserProfile } from '../types';

type Campaign = {
  id: string;
  title: string;
  slug: string;
  status: CampaignStatus;
  notes: string;
  eligibility_snapshot: {
    marketingOk?: number;
    suppressed?: number;
    capturedAt?: string;
  };
  ready_at: string | null;
};

type StepRow = {
  id?: string;
  sort_order: number;
  step_type: CampaignStepType;
  ref_id: string | null;
  label: string;
  notes: string;
};

type Option = { id: string; label: string };

export default function CampaignEditorPage({ userProfile }: { userProfile: UserProfile | null }) {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [pages, setPages] = useState<Option[]>([]);
  const [forms, setForms] = useState<Option[]>([]);
  const [magnets, setMagnets] = useState<Option[]>([]);
  const [issues, setIssues] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const allowed = canManageCampaigns(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    if (!campaignId) return;
    const { data, error: campError } = await supabase
      .from('campaigns')
      .select('id, title, slug, status, notes, eligibility_snapshot, ready_at')
      .eq('id', campaignId)
      .maybeSingle();
    if (campError || !data) {
      setError(campError?.message || 'Campaign not found.');
      setCampaign(null);
      return;
    }
    setCampaign({
      ...(data as Campaign),
      status: (data.status as CampaignStatus) || 'draft',
      eligibility_snapshot:
        data.eligibility_snapshot && typeof data.eligibility_snapshot === 'object'
          ? (data.eligibility_snapshot as Campaign['eligibility_snapshot'])
          : {},
    });

    const { data: stepRows } = await supabase
      .from('campaign_steps')
      .select('id, sort_order, step_type, ref_id, label, notes')
      .eq('campaign_id', campaignId)
      .order('sort_order', { ascending: true });
    setSteps(
      ((stepRows as StepRow[]) ?? []).map((s) => ({
        ...s,
        step_type: s.step_type as CampaignStepType,
      })),
    );

    const [{ data: pageRows }, { data: formRows }, { data: magnetRows }, { data: issueRows }] =
      await Promise.all([
        supabase
          .from('contents')
          .select('id, title, slug, status')
          .eq('kind', 'page')
          .eq('status', 'published')
          .order('title')
          .limit(100),
        supabase.from('forms').select('id, title, slug, status').eq('status', 'published').order('title').limit(100),
        supabase
          .from('lead_magnets')
          .select('id, title, slug, status, active_version_id')
          .eq('status', 'published')
          .order('title')
          .limit(100),
        supabase
          .from('newsletter_issues')
          .select('id, subject, status')
          .in('status', ['draft', 'scheduled', 'sending', 'sent'])
          .order('updated_at', { ascending: false })
          .limit(100),
      ]);

    setPages(
      ((pageRows as Array<{ id: string; title: string; slug: string }>) ?? []).map((r) => ({
        id: r.id,
        label: `${r.title} (${r.slug})`,
      })),
    );
    setForms(
      ((formRows as Array<{ id: string; title: string; slug: string }>) ?? []).map((r) => ({
        id: r.id,
        label: `${r.title} (${r.slug})`,
      })),
    );
    setMagnets(
      (
        (magnetRows as Array<{ id: string; title: string; active_version_id: string | null }>) ?? []
      )
        .filter((r) => r.active_version_id)
        .map((r) => ({ id: r.id, label: r.title })),
    );
    setIssues(
      ((issueRows as Array<{ id: string; subject: string; status: string }>) ?? []).map((r) => ({
        id: r.id,
        label: `${r.subject || 'Untitled'} · ${r.status}`,
      })),
    );
    setError(null);
  }, [campaignId]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  const readiness = useMemo(
    () =>
      computeCampaignReadiness(
        steps.map((s) => ({ stepType: s.step_type, refId: s.ref_id, label: s.label })),
        {
          publishedPageIds: new Set(pages.map((p) => p.id)),
          publishedFormIds: new Set(forms.map((f) => f.id)),
          publishedLeadMagnetIds: new Set(magnets.map((m) => m.id)),
          newsletterIssueIds: new Set(issues.map((i) => i.id)),
        },
      ),
    [steps, pages, forms, magnets, issues],
  );

  async function captureEligibility() {
    const [{ count: okCount }, { count: suppressedCount }] = await Promise.all([
      supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('marketing_ok', true)
        .is('suppressed_at', null),
      supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .not('suppressed_at', 'is', null),
    ]);
    return {
      marketingOk: typeof okCount === 'number' ? okCount : 0,
      suppressed: typeof suppressedCount === 'number' ? suppressedCount : 0,
      capturedAt: new Date().toISOString(),
    };
  }

  async function saveSteps(campaignIdValue: string, nextSteps: StepRow[]) {
    await supabase.from('campaign_steps').delete().eq('campaign_id', campaignIdValue);
    if (nextSteps.length === 0) return;
    const { error: insertError } = await supabase.from('campaign_steps').insert(
      nextSteps.map((s, index) => ({
        campaign_id: campaignIdValue,
        sort_order: index,
        step_type: s.step_type,
        ref_id: s.step_type === 'note' ? null : s.ref_id,
        label: s.label,
        notes: s.notes,
      })),
    );
    if (insertError) throw insertError;
  }

  async function saveCampaign(nextStatus?: CampaignStatus) {
    if (!campaign || !allowed || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const status = nextStatus ?? campaign.status;
      if (status === 'ready' && !readiness.ready) {
        setError('Fix readiness checks before marking Ready.');
        setSaving(false);
        return;
      }
      const snapshot = await captureEligibility();
      const { error: saveError } = await supabase
        .from('campaigns')
        .update({
          title: campaign.title.trim() || 'Untitled campaign',
          slug: campaign.slug.trim().toLowerCase(),
          notes: campaign.notes,
          status,
          eligibility_snapshot: snapshot,
          ready_at: status === 'ready' ? campaign.ready_at || new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaign.id);
      if (saveError) throw saveError;
      await saveSteps(campaign.id, steps);
      setNotice(status === 'ready' ? 'Campaign marked Ready.' : 'Campaign saved.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  function addStep(stepType: CampaignStepType) {
    setSteps((prev) => [
      ...prev,
      {
        sort_order: prev.length,
        step_type: stepType,
        ref_id: null,
        label: stepType === 'note' ? 'Note' : '',
        notes: '',
      },
    ]);
  }

  function updateStep(index: number, patch: Partial<StepRow>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, sort_order: i })));
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Campaign" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage campaigns.</p>
      </AdminCmsShell>
    );
  }

  const optionsFor = (type: CampaignStepType): Option[] => {
    if (type === 'page') return pages;
    if (type === 'form') return forms;
    if (type === 'lead_magnet') return magnets;
    if (type === 'newsletter_issue') return issues;
    return [];
  };

  return (
    <AdminCmsShell
      title="Campaign"
      titleIcon={<Megaphone size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-3xl p-6 md:p-10">
        <Link
          to="/admin/campaigns"
          className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-brand-blue"
        >
          ← Campaigns
        </Link>
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mt-4 text-sm text-emerald-800">{notice}</p> : null}

        {campaign ? (
          <>
            <h1 className="mt-4 font-serif text-3xl font-black text-slate-900">Blueprint</h1>
            <p className="mt-1 text-sm text-slate-600">
              Status: <strong>{campaign.status}</strong>. Blueprints do not charge cards (book checkout is separate).
            </p>

            <label className="mt-6 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Title
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                value={campaign.title}
                onChange={(e) => setCampaign({ ...campaign, title: e.target.value })}
              />
            </label>
            <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Slug
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                value={campaign.slug}
                onChange={(e) => setCampaign({ ...campaign, slug: e.target.value })}
              />
            </label>
            <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Notes
              <textarea
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                value={campaign.notes}
                onChange={(e) => setCampaign({ ...campaign, notes: e.target.value })}
              />
            </label>

            <h2 className="mt-10 text-lg font-bold text-slate-900">Steps</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ['page', 'Page'],
                  ['form', 'Form'],
                  ['lead_magnet', 'Lead magnet'],
                  ['newsletter_issue', 'Newsletter'],
                  ['note', 'Note'],
                ] as Array<[CampaignStepType, string]>
              ).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-slate-700"
                  onClick={() => addStep(type)}
                >
                  + {label}
                </button>
              ))}
            </div>

            <ul className="mt-4 space-y-3">
              {steps.length === 0 ? (
                <li className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  No steps yet. Add a form and a delivery path (lead magnet or newsletter).
                </li>
              ) : (
                steps.map((step, index) => (
                  <li key={`${step.step_type}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                        {index + 1}. {step.step_type.replace('_', ' ')}
                      </span>
                      <button
                        type="button"
                        className="text-xs font-bold uppercase tracking-widest text-red-600"
                        onClick={() => removeStep(index)}
                      >
                        Remove
                      </button>
                    </div>
                    {step.step_type === 'note' ? (
                      <input
                        className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Note"
                        value={step.label}
                        onChange={(e) => updateStep(index, { label: e.target.value })}
                      />
                    ) : (
                      <select
                        className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={step.ref_id || ''}
                        onChange={(e) => updateStep(index, { ref_id: e.target.value || null })}
                      >
                        <option value="">Select…</option>
                        {optionsFor(step.step_type).map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                ))
              )}
            </ul>

            <h2 className="mt-10 text-lg font-bold text-slate-900">Readiness</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {readiness.checks.map((check) => (
                <li key={check.code} className={check.ok ? 'text-emerald-800' : 'text-amber-800'}>
                  {check.ok ? '✓' : '○'} {check.label}
                </li>
              ))}
            </ul>

            <h2 className="mt-8 text-lg font-bold text-slate-900">Eligibility snapshot</h2>
            <p className="mt-2 text-sm text-slate-600">
              {campaign.eligibility_snapshot.capturedAt
                ? `Last capture: ${new Date(campaign.eligibility_snapshot.capturedAt).toLocaleString()} · ${campaign.eligibility_snapshot.marketingOk ?? 0} marketing OK · ${campaign.eligibility_snapshot.suppressed ?? 0} suppressed`
                : 'Save or mark Ready to capture current Contacts counts.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                disabled={saving}
                onClick={() => void saveCampaign('draft')}
              >
                Save draft
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 disabled:opacity-50"
                disabled={saving || !readiness.ready}
                onClick={() => void saveCampaign('ready')}
              >
                Mark Ready
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 disabled:opacity-50"
                disabled={saving}
                onClick={() => void saveCampaign('archived')}
              >
                Archive
              </button>
            </div>
          </>
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
