import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { loadFormDraft, syncFormDraft } from '../../lib/resources/formDraft'

/** Restore a template form from sessionStorage and keep it synced. */
export function useTemplateFormDraft<T>(id: string, empty: () => T): [T, Dispatch<SetStateAction<T>>] {
  const [form, setForm] = useState<T>(() => loadFormDraft<T>(id) ?? empty())

  useEffect(() => {
    syncFormDraft(id, form)
  }, [id, form])

  return [form, setForm]
}
