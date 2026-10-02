import { useCallback, useEffect, useRef, useState } from 'react';
import type { BlogBlock } from '../blog/blogBlockTypes';
import {
  clearCmsEditorLocalDraft,
  cmsEditorSnapshot,
  readCmsEditorLocalDraft,
  writeCmsEditorLocalDraft,
  type CmsEditorKind,
  type CmsEditorLocalDraft,
} from './cmsEditorDraft';

const LOCAL_DEBOUNCE_MS = 800;
const SERVER_DEBOUNCE_MS = 3000;

export type CmsAutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export type UseCmsEditorAutosaveArgs<TForm> = {
  kind: CmsEditorKind;
  storageKey: string;
  enabled: boolean;
  form: TForm;
  blocks: BlogBlock[];
  slugTouched: boolean;
  serverUpdatedAt?: string | null;
  saving: boolean;
  canServerAutosave: boolean;
  persistAutosave: () => Promise<boolean>;
  onRestore: (payload: CmsEditorLocalDraft<TForm>) => void;
};

export function useCmsEditorAutosave<TForm>({
  kind,
  storageKey,
  enabled,
  form,
  blocks,
  slugTouched,
  serverUpdatedAt,
  saving,
  canServerAutosave,
  persistAutosave,
  onRestore,
}: UseCmsEditorAutosaveArgs<TForm>) {
  const [autosaveStatus, setAutosaveStatus] = useState<CmsAutosaveStatus>('idle');
  const [lastAutosavedAt, setLastAutosavedAt] = useState<Date | null>(null);
  const [pendingLocalDraft, setPendingLocalDraft] = useState<CmsEditorLocalDraft<TForm> | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const baselineRef = useRef('');
  const localTimerRef = useRef<number | null>(null);
  const serverTimerRef = useRef<number | null>(null);
  const autosavingRef = useRef(false);
  const checkedRecoveryRef = useRef(false);

  const setBaseline = useCallback(
    (nextForm: TForm, nextBlocks: BlogBlock[], nextSlugTouched: boolean) => {
      baselineRef.current = cmsEditorSnapshot(nextForm, nextBlocks, nextSlugTouched);
      setIsDirty(false);
    },
    [],
  );

  const restoreLocalDraft = useCallback(() => {
    if (!pendingLocalDraft) return;
    onRestore(pendingLocalDraft);
    setPendingLocalDraft(null);
    checkedRecoveryRef.current = true;
  }, [onRestore, pendingLocalDraft]);

  const dismissLocalDraft = useCallback(() => {
    clearCmsEditorLocalDraft(kind, storageKey);
    setPendingLocalDraft(null);
    checkedRecoveryRef.current = true;
  }, [kind, storageKey]);

  useEffect(() => {
    if (!enabled) return;
    checkedRecoveryRef.current = false;
    setPendingLocalDraft(null);
  }, [enabled, storageKey]);

  useEffect(() => {
    if (!enabled || checkedRecoveryRef.current) return;
    const local = readCmsEditorLocalDraft<TForm>(kind, storageKey);
    if (!local) {
      checkedRecoveryRef.current = true;
      return;
    }
    const serverMs = serverUpdatedAt ? new Date(serverUpdatedAt).getTime() : 0;
    const localMs = new Date(local.savedAt).getTime();
    const localSnapshot = cmsEditorSnapshot(local.form, local.blocks, local.slugTouched);
    const differsFromBaseline = localSnapshot !== baselineRef.current;
    if (localMs > serverMs && differsFromBaseline) {
      setPendingLocalDraft(local);
    } else if (localMs <= serverMs) {
      clearCmsEditorLocalDraft(kind, storageKey);
    }
    checkedRecoveryRef.current = true;
  }, [enabled, kind, serverUpdatedAt, storageKey]);

  useEffect(() => {
    if (!enabled) return;
    const snapshot = cmsEditorSnapshot(form, blocks, slugTouched);
    setIsDirty(snapshot !== baselineRef.current);
  }, [enabled, form, blocks, slugTouched]);

  useEffect(() => {
    if (!enabled || !isDirty) return;

    if (localTimerRef.current) window.clearTimeout(localTimerRef.current);
    localTimerRef.current = window.setTimeout(() => {
      writeCmsEditorLocalDraft(kind, storageKey, { form, blocks, slugTouched });
    }, LOCAL_DEBOUNCE_MS);

    if (canServerAutosave && !saving && !autosavingRef.current) {
      setAutosaveStatus((s) => (s === 'saving' ? s : 'pending'));
      if (serverTimerRef.current) window.clearTimeout(serverTimerRef.current);
      serverTimerRef.current = window.setTimeout(() => {
        void (async () => {
          if (autosavingRef.current || saving) return;
          autosavingRef.current = true;
          setAutosaveStatus('saving');
          try {
            const ok = await persistAutosave();
            if (ok) {
              setBaseline(form, blocks, slugTouched);
              clearCmsEditorLocalDraft(kind, storageKey);
              setLastAutosavedAt(new Date());
              setAutosaveStatus('saved');
              setPendingLocalDraft(null);
            } else {
              setAutosaveStatus('error');
            }
          } catch {
            setAutosaveStatus('error');
          } finally {
            autosavingRef.current = false;
          }
        })();
      }, SERVER_DEBOUNCE_MS);
    }

    return () => {
      if (localTimerRef.current) window.clearTimeout(localTimerRef.current);
      if (serverTimerRef.current) window.clearTimeout(serverTimerRef.current);
    };
  }, [
    enabled,
    isDirty,
    form,
    blocks,
    slugTouched,
    kind,
    storageKey,
    canServerAutosave,
    saving,
    persistAutosave,
    setBaseline,
  ]);

  useEffect(() => {
    if (!enabled || !isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [enabled, isDirty]);

  const noteManualSaveSuccess = useCallback(
    (nextForm: TForm, nextBlocks: BlogBlock[], nextSlugTouched: boolean) => {
      setBaseline(nextForm, nextBlocks, nextSlugTouched);
      clearCmsEditorLocalDraft(kind, storageKey);
      setLastAutosavedAt(new Date());
      setAutosaveStatus('saved');
      setPendingLocalDraft(null);
    },
    [kind, setBaseline, storageKey],
  );

  return {
    autosaveStatus,
    lastAutosavedAt,
    pendingLocalDraft,
    isDirty,
    setBaseline,
    noteManualSaveSuccess,
    restoreLocalDraft,
    dismissLocalDraft,
  };
}
