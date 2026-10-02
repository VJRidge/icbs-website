import { customAlphabet } from 'nanoid';
import { supabase } from './supabase';

export type CmsShortLinkResourceType = 'blog_post' | 'site_page';

export type CmsShortLinkRow = {
  id: string;
  code: string;
  resource_type: CmsShortLinkResourceType;
  resource_id: string;
  created_at: string;
};

const genCode = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 7);

export function cmsShortLinkPublicUrl(code: string): string {
  return `${window.location.origin}/s/${code}`;
}

export async function fetchCmsShortLink(
  resourceType: CmsShortLinkResourceType,
  resourceId: string,
): Promise<CmsShortLinkRow | null> {
  const { data, error } = await supabase
    .from('cms_short_links')
    .select('id, code, resource_type, resource_id, created_at')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .maybeSingle();
  if (error) throw error;
  return data as CmsShortLinkRow | null;
}

export async function createCmsShortLink(
  resourceType: CmsShortLinkResourceType,
  resourceId: string,
  createdBy: string,
): Promise<CmsShortLinkRow> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = genCode();
    const { data, error } = await supabase
      .from('cms_short_links')
      .insert({
        code,
        resource_type: resourceType,
        resource_id: resourceId,
        created_by: createdBy,
      })
      .select('id, code, resource_type, resource_id, created_at')
      .single();
    if (!error && data) return data as CmsShortLinkRow;
    if (error?.code !== '23505') throw error;
  }
  throw new Error('Could not generate a unique short link code. Try again.');
}

export async function resolveCmsShortLinkPath(code: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('resolve_cms_short_link', { p_code: code });
  if (error) throw error;
  return typeof data === 'string' && data.trim() ? data.trim() : null;
}
