import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClipboardCheck, Plus } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { CUSTOM_CONTENT_TYPE_KEYS, CUSTOM_CONTENT_TYPES, type CustomContentTypeKey } from '../lib/customContentTypes';
import { isMissingCustomContentSchema, publicPathForCustomContent } from '../lib/customContent/customContentDraft';
import type { UserProfile } from '../types';

export default function CustomContentListPage({
  userProfile,
}: {
  userProfile: UserProfile | null;
}) {
  const { typeKey: rawType } = useParams<{ typeKey: string }>();
  const typeKey = CUSTOM_CONTENT_TYPE_KEYS.includes(rawType as CustomContentTypeKey)
    ? (rawType as CustomContentTypeKey)
    : null;
  const type = typeKey ? CUSTOM_CONTENT_TYPES[typeKey] : null;
  const [rows, setRows] = useState<Array<{ id: string; title: string; slug: string; status: string; updated_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!typeKey) return;
    const { data: typeRow, error: typeError } = await supabase
      .from('content_types')
      .select('id')
      .eq('key', typeKey)
      .maybeSingle();
    if (typeError) {
      setSchemaMissing(isMissingCustomContentSchema(typeError));
      setError(typeError.message);
      setRows([]);
      return;
    }
    if (!typeRow?.id) {
      setSchemaMissing(true);
      setRows([]);
      return;
    }
    const { data, error: listError } = await supabase
      .from('contents')
      .select('id, title, slug, status, updated_at')
      .eq('kind', 'custom')
      .eq('content_type_id', typeRow.id)
      .neq('status', 'trash')
      .order('updated_at', { ascending: false });
    if (listError) {
      setSchemaMissing(isMissingCustomContentSchema(listError));
      setError(listError.message);
      setRows([]);
      return;
    }
    setSchemaMissing(false);
    setError(null);
    setRows(data ?? []);
  }, [typeKey]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, load]);

  if (!typeKey || !type) {
    return (
      <AdminCmsShell title="Structured content" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">Unknown content type.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell title={type.plural} titleIcon={<ClipboardCheck size={14} className="text-brand-yellow" />} userProfile={userProfile}>
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-black text-slate-900">{type.plural}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{type.description} Drafts stay private. Publishing a review writes a frozen snapshot to `/reviews/:slug`.</p>
          </div>
          <Link
            to={`/admin/content/${typeKey}/new`}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-yellow"
          >
            <Plus size={14} /> Add {type.singular.toLowerCase()}
          </Link>
        </div>
        {schemaMissing ? (
          <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            The structured-content schema is not applied yet. Existing pages, posts, and the public site are unchanged.
          </p>
        ) : error ? (
          <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>
        ) : loading ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">No {type.plural.toLowerCase()} yet.</p>
        ) : (
          <ul className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <Link to={`/admin/content/${typeKey}/${row.id}`} className="font-semibold text-brand-blue hover:underline">
                    {row.title}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {row.status} · {row.slug}
                  </p>
                </div>
                {row.status === 'published' && publicPathForCustomContent(typeKey, row.slug) ? (
                  <a href={publicPathForCustomContent(typeKey, row.slug) ?? '#'} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-blue hover:underline">
                    View
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminCmsShell>
  );
}
