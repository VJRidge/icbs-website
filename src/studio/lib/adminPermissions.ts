import type { UserProfile } from '../types';

export function isSuperAdminProfile(profile: Pick<UserProfile, 'admin_tier'> | null | undefined): boolean {
  return profile?.admin_tier === 'super_admin';
}

export function isAnyAdminProfile(profile: Pick<UserProfile, 'is_admin' | 'admin_tier'> | null | undefined): boolean {
  if (!profile) return false;
  return !!profile.is_admin || isSuperAdminProfile(profile);
}
