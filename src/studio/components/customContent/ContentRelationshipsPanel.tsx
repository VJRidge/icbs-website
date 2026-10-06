import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  canAddRelationship,
  effectiveContentType,
  relationshipAllowList,
  relationshipTypesForSource,
  type ContentRelationshipTypeKey,
} from '../../lib/customContent/contentRelationships';

type LinkedRow = {
  id: string;
  relationship_type: string;
  target_content_id: string;
  target_title: string;
  target_type: string;
};

type Candidate = {
  id: string;
  title: string;
  kind: string;
  content_type_key: string | null;
  effectiveType: string;
};

type ContentTypeRow = { id: string; key: string };

/** Attach shared records by ID — no copied titles/URLs. */
export default function ContentRelationshipsPanel({
  sourceContentId,
  sourceType,
  actorId,
}: {
  sourceContentId: string;
  sourceType: string;
  actorId: string | null | undefined;
}) {
  const typeOptions = useMemo(() => relationshipTypesForSource(sourceType), [sourceType]);
  const [relType, setRelType] = useState<ContentRelationshipTypeKey | ''>(
    () => (typeOptions[0]?.key as ContentRelationshipTypeKey | undefined) ?? '',
  );
  const [links, setLinks] = useState<LinkedRow[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadLinks = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('content_relationships')
      .select('id, relationship_type, target_content_id, target:contents!content_relationships_target_content_id_fkey(id, title, kind, content_type_id)')
      .eq('source_content_id', sourceContentId)
      .order('position', { ascending: true });
    if (loadError) {
      // Fallback without embed if FK name differs.
      const plain = await supabase
        .from('content_relationships')
        .select('id, relationship_type, target_content_id')
        .eq('source_content_id', sourceContentId)
        .order('position', { ascending: true });
      if (plain.error) {
        setError(plain.error.message);
        setLinks([]);
        return;
      }
      const targetIds = (plain.data ?? []).map((r) => r.target_content_id);
      const { data: targets } = targetIds.length
        ? await supabase.from('contents').select('id, title, kind, content_type_id').in('id', targetIds)
        : { data: [] as Array<{ id: string; title: string; kind: string; content_type_id: string | null }> };
      const { data: types } = await supabase.from('content_types').select('id, key');
      const typeById = new Map((types as ContentTypeRow[] | null)?.map((t) => [t.id, t.key]) ?? []);
      const titleById = new Map((targets ?? []).map((t) => [t.id, t]));
      setLinks(
        (plain.data ?? []).map((row) => {
          const target = titleById.get(row.target_content_id);
          const key = target?.content_type_id ? typeById.get(target.content_type_id) ?? null : null;
          return {
            id: row.id,
            relationship_type: row.relationship_type,
            target_content_id: row.target_content_id,
            target_title: target?.title || row.target_content_id,
            target_type: effectiveContentType({ kind: target?.kind ?? '', contentTypeKey: key }) || 'unknown',
          };
        }),
      );
      setError(null);
      return;
    }

    const { data: types } = await supabase.from('content_types').select('id, key');
    const typeById = new Map((types as ContentTypeRow[] | null)?.map((t) => [t.id, t.key]) ?? []);
    setLinks(
      (data ?? []).map((row) => {
        const target = row.target as
          | { id: string; title: string; kind: string; content_type_id: string | null }
          | { id: string; title: string; kind: string; content_type_id: string | null }[]
          | null;
        const t = Array.isArray(target) ? target[0] : target;
        const key = t?.content_type_id ? typeById.get(t.content_type_id) ?? null : null;
        return {
          id: row.id,
          relationship_type: row.relationship_type,
          target_content_id: row.target_content_id,
          target_title: t?.title || row.target_content_id,
          target_type: effectiveContentType({ kind: t?.kind ?? '', contentTypeKey: key }) || 'unknown',
        };
      }),
    );
    setError(null);
  }, [sourceContentId]);

  const loadCandidates = useCallback(async () => {
    const rule = relType ? relationshipAllowList(relType) : null;
    if (!rule) {
      setCandidates([]);
      return;
    }
    const { data: types } = await supabase.from('content_types').select('id, key');
    const typeRows = (types as ContentTypeRow[] | null) ?? [];
    const typeById = new Map(typeRows.map((t) => [t.id, t.key]));
    const { data, error: listError } = await supabase
      .from('contents')
      .select('id, title, kind, content_type_id, status')
      .neq('status', 'trash')
      .neq('id', sourceContentId)
      .order('updated_at', { ascending: false })
      .limit(200);
    if (listError) {
      setError(listError.message);
      setCandidates([]);
      return;
    }
    const next: Candidate[] = [];
    for (const row of data ?? []) {
      const key = row.content_type_id ? typeById.get(row.content_type_id) ?? null : null;
      const effective = effectiveContentType({ kind: row.kind, contentTypeKey: key });
      if (!effective || !rule.allowedTargetTypes.includes(effective)) continue;
      next.push({
        id: row.id,
        title: row.title || 'Untitled',
        kind: row.kind,
        content_type_key: key,
        effectiveType: effective,
      });
    }
    setCandidates(next);
  }, [relType, sourceContentId]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    if (!relType && typeOptions[0]) setRelType(typeOptions[0].key);
  }, [relType, typeOptions]);

  const existingCount = links.filter((l) => l.relationship_type === relType).length;

  const add = async () => {
    if (!relType || !targetId || !actorId) return;
    const candidate = candidates.find((c) => c.id === targetId);
    if (!candidate) return;
    const check = canAddRelationship({
      relationshipType: relType,
      sourceType,
      targetType: candidate.effectiveType,
      sourceContentId,
      targetContentId: targetId,
      existingTargetCount: existingCount,
    });
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase.from('content_relationships').insert({
      source_content_id: sourceContentId,
      target_content_id: targetId,
      relationship_type: relType,
      position: existingCount,
      created_by: actorId,
    });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setTargetId('');
    await loadLinks();
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError(null);
    const { error: deleteError } = await supabase.from('content_relationships').delete().eq('id', id);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadLinks();
  };

  if (typeOptions.length === 0) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <Link2 size={14} className="text-brand-blue" />
        <h2 className="font-serif text-xl font-black text-slate-900">Relationships</h2>
      </div>
      <p className="text-sm text-slate-600">
        Link shared records by ID. Titles and URLs stay on the related row — no copies.
      </p>
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      {links.length === 0 ? (
        <p className="text-sm text-slate-500">No relationships yet.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
            >
              <div>
                <span className="font-semibold text-slate-800">{link.target_title}</span>
                <span className="ml-2 text-xs uppercase tracking-wider text-slate-400">
                  {relationshipAllowList(link.relationship_type)?.label || link.relationship_type} · {link.target_type}
                </span>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(link.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
              >
                <Trash2 size={12} /> Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label className="block space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</span>
          <select
            value={relType}
            onChange={(e) => {
              setRelType(e.target.value as ContentRelationshipTypeKey);
              setTargetId('');
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {typeOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
                {opt.maxTargets != null ? ` (max ${opt.maxTargets})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target record</span>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.effectiveType})
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            disabled={busy || !relType || !targetId}
            onClick={() => void add()}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
          >
            Add link
          </button>
        </div>
      </div>
    </section>
  );
}
