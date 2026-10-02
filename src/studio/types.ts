/** Studio user, built from `profiles` (staff_approved + role) after sign-in. */
export interface UserProfile {
  id: string;
  email?: string;
  display_name?: string | null;
  role?: string;
  is_admin?: boolean;
  /** `owner` maps to `super_admin`; other approved staff are `admin`. */
  admin_tier?: 'super_admin' | 'admin' | null;
}

/** A `contents` row with `kind = 'page'`. */
export interface PublisherSitePage {
  id: string;
  slug: string;
  title: string;
  body: string;
  featured_image_url?: string | null;
  featured_image_alt?: string | null;
  status: 'draft' | 'published' | 'scheduled' | 'trash';
  published_at: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  content_blocks?: unknown[] | null;
  seo_title?: string | null;
  seo_description?: string | null;
  published_document?: PublishedPageDocument | null;
  layout?: PageLayout | null;
}

/** `article` = title + narrow column; `landing` = full-width kit sections, no title header. */
export type PageLayout = 'article' | 'landing';

export interface PublishedPageDocument {
  format: 'blocks';
  blocks: unknown[];
  html: string;
  layout?: PageLayout;
  featured_image_url?: string | null;
  featured_image_alt?: string | null;
}
