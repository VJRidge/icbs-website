/** Capability matrix mirroring `has_staff_capability` in Phase 2 SQL. */

export type StaffRole = 'owner' | 'admin' | 'editor' | 'author';

export type StaffCapability =
  | 'content.read'
  | 'content.create'
  | 'content.update_any'
  | 'content.update_own'
  | 'content.publish'
  | 'content.delete'
  | 'users.manage';

const ROLE_CAPABILITIES: Record<StaffRole, readonly StaffCapability[]> = {
  owner: [
    'content.read',
    'content.create',
    'content.update_any',
    'content.publish',
    'content.delete',
    'users.manage',
  ],
  admin: [
    'content.read',
    'content.create',
    'content.update_any',
    'content.publish',
    'content.delete',
  ],
  editor: ['content.read', 'content.create', 'content.update_any', 'content.publish'],
  author: ['content.read', 'content.create', 'content.update_own'],
};

export function capabilitiesForRole(role: string | null | undefined): readonly StaffCapability[] {
  if (role === 'owner' || role === 'admin' || role === 'editor' || role === 'author') {
    return ROLE_CAPABILITIES[role];
  }
  return [];
}

export function hasStaffCapability(
  role: string | null | undefined,
  capability: StaffCapability,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  // Fail closed: callers must affirm approval; disabled always denies.
  if (opts?.disabled) return false;
  if (opts?.staffApproved !== true) return false;
  return capabilitiesForRole(role).includes(capability);
}

export function canUpdateContent(args: {
  role: string | null | undefined;
  staffApproved?: boolean;
  disabled?: boolean;
  authorId: string | null | undefined;
  actorId: string | null | undefined;
}): boolean {
  if (hasStaffCapability(args.role, 'content.update_any', args)) return true;
  if (!hasStaffCapability(args.role, 'content.update_own', args)) return false;
  return Boolean(args.authorId && args.actorId && args.authorId === args.actorId);
}

export function canSetPublishStatus(args: {
  role: string | null | undefined;
  staffApproved?: boolean;
  disabled?: boolean;
  nextStatus: string;
}): boolean {
  if (args.disabled) return false;
  if (args.staffApproved !== true) return false;
  if (args.nextStatus === 'draft' || args.nextStatus === 'pending_review') {
    return (
      hasStaffCapability(args.role, 'content.update_any', args) ||
      hasStaffCapability(args.role, 'content.update_own', args)
    );
  }
  if (args.nextStatus === 'trash') {
    return (
      hasStaffCapability(args.role, 'content.delete', args) ||
      hasStaffCapability(args.role, 'content.update_any', args) ||
      hasStaffCapability(args.role, 'content.update_own', args)
    );
  }
  return hasStaffCapability(args.role, 'content.publish', args);
}

/** Authors and editors may move a working copy into the review queue. */
export function canSubmitForReview(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return canSetPublishStatus({ role, ...opts, nextStatus: 'pending_review' });
}

/** Only publish-capable staff may approve the queue into a live snapshot. */
export function canApprovePendingReview(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.publish', opts);
}

/** Only owners may update profiles (roles, approvals) per Phase 2 RLS. */
export function canUpdateProfiles(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'users.manage', opts) && role === 'owner';
}

/** Menus, redirects, and settings affect live chrome — require publish. */
export function canManageSiteChrome(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.publish', opts);
}

export function canCreateMedia(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.create', opts);
}

/** Media row updates: any-updater or owner of the upload. */
export function canManageMedia(args: {
  role: string | null | undefined;
  staffApproved?: boolean;
  disabled?: boolean;
  createdBy: string | null | undefined;
  actorId: string | null | undefined;
}): boolean {
  if (hasStaffCapability(args.role, 'content.update_any', args)) return true;
  if (!hasStaffCapability(args.role, 'content.update_own', args)) return false;
  return Boolean(args.createdBy && args.actorId && args.createdBy === args.actorId);
}

export function canManageTemplates(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.update_any', opts);
}

export function canManageTaxonomies(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.update_any', opts);
}

export function canManageForms(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.update_any', opts);
}

/** Contacts identity / consent history — same bar as Forms. */
export function canManageContacts(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.update_any', opts);
}

/** Lead magnets + delivery jobs — same bar as Forms. */
export function canManageLeadMagnets(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.update_any', opts);
}

/** Newsletter issues + send jobs — same bar as Forms. */
export function canManageNewsletter(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.update_any', opts);
}

/** Analytics dashboard — readable by any staff with content.read. */
export function canReadAnalytics(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.read', opts);
}

/** Campaign blueprints — same bar as Forms / Newsletter. */
export function canManageCampaigns(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.update_any', opts);
}

/** Import / migration jobs — same bar as Contacts. */
export function canManageImports(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.update_any', opts);
}

/** Stripe purchases ledger — readable by content.read staff. */
export function canReadPurchases(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.read', opts);
}

/** Audience segments / tags — same bar as Contacts. */
export function canManageSegments(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.update_any', opts);
}

export function canCreateShortLinks(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.create', opts);
}

/** Retarget or delete short links — not create-only authors. */
export function canManageShortLinks(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.update_any', opts);
}

export function canReadAdminActivity(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.read', opts);
}

export function canReadTemplates(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.read', opts);
}

/** Authors may insert usage links; clearing usages requires update_any. */
export function canLinkMediaUsage(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return (
    hasStaffCapability(role, 'content.update_any', opts) ||
    hasStaffCapability(role, 'content.create', opts)
  );
}

export function canUnlinkMediaUsage(
  role: string | null | undefined,
  opts?: { staffApproved?: boolean; disabled?: boolean },
): boolean {
  return hasStaffCapability(role, 'content.update_any', opts);
}
