import type { BlogBlock } from './blogBlockTypes'
import { parseBlogBlocks } from './useBlogEditorStore'
import { supabase } from '../supabase'

export type SavedSection = { id: string; title: string }

export async function listSavedSections(): Promise<SavedSection[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('id, title')
    .eq('kind', 'section')
    .eq('is_global', true)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as SavedSection[]
}

export async function saveGlobalSection(title: string, block: BlogBlock): Promise<string> {
  const { data, error } = await supabase
    .from('templates')
    .insert({
      title: title.trim(),
      kind: 'section',
      is_global: true,
      document: { format: 'blocks', blocks: [block] },
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return String(data.id)
}

export async function replaceGlobalSection(id: string, block: BlogBlock): Promise<void> {
  const { error } = await supabase
    .from('templates')
    .update({ document: { format: 'blocks', blocks: [block] } })
    .eq('id', id)
    .eq('kind', 'section')
  if (error) throw new Error(error.message)
}

export async function loadSavedSection(id: string): Promise<BlogBlock | null> {
  const { data, error } = await supabase.from('templates').select('document').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  const doc = data?.document as { blocks?: unknown } | null
  const blocks = parseBlogBlocks(doc?.blocks)
  return blocks[0] ?? null
}
