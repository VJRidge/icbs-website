import { supabaseBrowser } from './supabaseBrowser'

export type MediaRow = {
  id: string
  bucket: string
  path: string
  mime: string | null
  byte_size: number | null
  title: string | null
  alt: string | null
  created_at: string
}

export function mediaKind(mime: string | null, path: string) {
  const m = (mime || '').toLowerCase()
  const p = path.toLowerCase()
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(p)) return 'image'
  if (m.startsWith('video/') || /\.(mp4|webm|mov)$/.test(p)) return 'video'
  if (m.startsWith('audio/') || /\.(mp3|wav|m4a)$/.test(p)) return 'audio'
  return 'other'
}

export function publicMediaUrl(row: Pick<MediaRow, 'bucket' | 'path'>) {
  const sb = supabaseBrowser()
  if (!sb) return ''
  return sb.storage.from(row.bucket).getPublicUrl(row.path).data.publicUrl
}

export async function listMedia() {
  const sb = supabaseBrowser()
  if (!sb) return { rows: [] as MediaRow[], error: 'Supabase is not configured.' }
  const { data, error } = await sb.from('media').select('id, bucket, path, mime, byte_size, title, alt, created_at').order('created_at', { ascending: false })
  return { rows: (data ?? []) as MediaRow[], error: error?.message ?? '' }
}

export async function uploadMedia(file: File) {
  const sb = supabaseBrowser()
  if (!sb) return { error: 'Supabase is not configured.' }
  const { data: userData } = await sb.auth.getUser()
  const uid = userData.user?.id
  if (!uid) return { error: 'Sign in to upload.' }
  const safe = file.name.replace(/[^\w.\-]+/g, '-').slice(0, 80)
  const path = `${uid}/${Date.now()}-${safe}`
  const { error: upErr } = await sb.storage.from('media-public').upload(path, file, { contentType: file.type || undefined })
  if (upErr) return { error: upErr.message }
  const { data, error } = await sb
    .from('media')
    .insert({
      bucket: 'media-public',
      path,
      mime: file.type || null,
      byte_size: file.size,
      title: file.name,
      is_public: true,
      created_by: uid,
    })
    .select('id, bucket, path, mime, byte_size, title, alt, created_at')
    .single()
  if (error) return { error: error.message }
  return { row: data as MediaRow, error: '' }
}

export async function deleteMedia(row: MediaRow) {
  const sb = supabaseBrowser()
  if (!sb) return { error: 'Supabase is not configured.' }
  await sb.storage.from(row.bucket).remove([row.path])
  const { error } = await sb.from('media').delete().eq('id', row.id)
  return { error: error?.message ?? '' }
}
