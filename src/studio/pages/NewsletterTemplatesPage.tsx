import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutTemplate } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageNewsletter } from '../lib/cms/authorization';
import {
  NEWSLETTER_TEMPLATE_KIND,
  cloneNewsletterTemplateDocument,
  starterNewsletterTemplates,
} from '../../lib/newsletter/newsletterTemplates';
import { compileNewsletterDocument } from '../lib/newsletter/newsletterDocument';
import type { UserProfile } from '../types';

type TemplateRow = {
  id: string;
  title: string;
  is_global: boolean;
  document: unknown;
  created_at: string;
};

function templateDescription(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return '';
  const d = (doc as { description?: unknown }).description;
  return typeof d === 'string' ? d : '';
}

export default function NewsletterTemplatesPage({
  userProfile,
}: {
  userProfile: UserProfile | null;
}) {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const allowed = canManageNewsletter(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    const { data, error: listError } = await supabase
      .from('templates')
      .select('id, title, is_global, document, created_at')
      .eq('kind', NEWSLETTER_TEMPLATE_KIND)
      .order('is_global', { ascending: false })
      .order('created_at', { ascending: false });
    if (listError) {
      setError(listError.message);
      setRows([]);
      return;
    }
    setError(null);
    setRows((data as TemplateRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  async function ensureStarters() {
    setError(null);
    setNotice(null);
    try {
      for (const starter of starterNewsletterTemplates()) {
        await supabase.from('templates').upsert({
          id: starter.id,
          title: starter.title,
          kind: NEWSLETTER_TEMPLATE_KIND,
          is_global: true,
          document: { ...starter.document, description: starter.description },
        });
      }
      setNotice('Starter templates restored.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore starters.');
    }
  }

  async function useTemplate(row: TemplateRow) {
    if (!allowed || busyId) return;
    setBusyId(row.id);
    setError(null);
    setNotice(null);
    try {
      const cloned = cloneNewsletterTemplateDocument(row.document);
      const compiled = compileNewsletterDocument({
        format: 'blocks',
        blocks: cloned.blocks as never,
      });
      const { data, error: insertError } = await supabase
        .from('newsletter_issues')
        .insert({
          subject: cloned.subject || row.title || 'Untitled issue',
          preview_text: cloned.preview_text || '',
          document: compiled.document,
          body_html: compiled.bodyHtml,
          body_text: compiled.bodyText,
          status: 'draft',
          created_by: userProfile?.id ?? null,
        })
        .select('id')
        .maybeSingle();
      if (insertError) throw insertError;
      if (!data?.id) throw new Error('Issue create returned no id.');
      window.location.assign(`/admin/newsletter/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create issue from template.');
      setBusyId(null);
    }
  }

  async function deleteTemplate(row: TemplateRow) {
    if (row.is_global) {
      setError('Starter templates cannot be deleted. Edit a copy instead.');
      return;
    }
    if (!window.confirm(`Delete template “${row.title}”?`)) return;
    const { error: delError } = await supabase.from('templates').delete().eq('id', row.id);
    if (delError) setError(delError.message);
    else {
      setNotice('Template deleted.');
      await load();
    }
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Newsletter templates" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage newsletter templates.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Newsletter templates"
      titleIcon={<LayoutTemplate size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              to="/admin/newsletter"
              className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-brand-blue"
            >
              ← Issues
            </Link>
            <h1 className="mt-3 font-serif text-3xl font-black text-slate-900">Email templates</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Start from a layout (Mailchimp-style), then edit blocks for each issue. Save any issue as a
              reusable template from the editor.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700"
            onClick={() => void ensureStarters()}
          >
            Restore starters
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mt-4 text-sm text-emerald-800">{notice}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-serif text-xl font-black text-slate-900">{row.title}</h2>
                {row.is_global ? (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Starter
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Saved
                  </span>
                )}
              </div>
              <p className="mt-2 flex-1 text-sm text-slate-600">
                {templateDescription(row.document) || 'Custom newsletter layout.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                  disabled={busyId === row.id}
                  onClick={() => void useTemplate(row)}
                >
                  {busyId === row.id ? 'Creating…' : 'Use template'}
                </button>
                {!row.is_global ? (
                  <button
                    type="button"
                    className="rounded-xl border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-700"
                    onClick={() => void deleteTemplate(row)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {!loading && rows.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            No templates yet.{' '}
            <button
              type="button"
              className="font-bold text-brand-blue underline-offset-2 hover:underline"
              onClick={() => void ensureStarters()}
            >
              Load starter gallery
            </button>
          </p>
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
