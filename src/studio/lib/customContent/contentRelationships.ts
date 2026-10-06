export const CONTENT_RELATIONSHIP_TYPE_KEYS = [
  'related_content',
  'uses_resource',
  'sponsored_by',
  'related_resource',
  'lead_magnet',
  'newsletter_inclusion',
  'campaign',
  'author_sponsor',
  'replacement_asset',
] as const;

export type ContentRelationshipTypeKey = (typeof CONTENT_RELATIONSHIP_TYPE_KEYS)[number];

export type RelationshipAllowList = {
  key: ContentRelationshipTypeKey;
  label: string;
  allowedSourceTypes: readonly string[];
  allowedTargetTypes: readonly string[];
  maxTargets?: number;
};

/** Allow-lists: seeded Phase 3 keys plus planned Phase 3 extensions. */
export const CONTENT_RELATIONSHIP_ALLOW_LISTS: readonly RelationshipAllowList[] = [
  {
    key: 'related_content',
    label: 'Related content',
    allowedSourceTypes: ['page', 'post', 'resource', 'tool_review', 'event', 'interview'],
    allowedTargetTypes: ['page', 'post', 'resource', 'tool_review', 'event', 'interview'],
  },
  {
    key: 'uses_resource',
    label: 'Uses resource',
    allowedSourceTypes: ['page', 'post', 'tool_review', 'event', 'interview'],
    allowedTargetTypes: ['resource'],
  },
  {
    key: 'sponsored_by',
    label: 'Sponsored by',
    allowedSourceTypes: ['page', 'post', 'resource', 'tool_review', 'event', 'interview'],
    allowedTargetTypes: ['sponsor_profile'],
    maxTargets: 1,
  },
  {
    key: 'related_resource',
    label: 'Related resource',
    allowedSourceTypes: ['page', 'post', 'tool_review', 'interview', 'event'],
    allowedTargetTypes: ['resource', 'tool_review', 'post'],
  },
  {
    key: 'lead_magnet',
    label: 'Lead magnet',
    allowedSourceTypes: ['page', 'post', 'tool_review', 'resource'],
    allowedTargetTypes: ['resource'],
    maxTargets: 3,
  },
  {
    key: 'newsletter_inclusion',
    label: 'Newsletter inclusion',
    allowedSourceTypes: ['post', 'tool_review', 'resource', 'interview'],
    allowedTargetTypes: ['post', 'tool_review', 'resource'],
  },
  {
    key: 'campaign',
    label: 'Campaign',
    allowedSourceTypes: ['page', 'post'],
    allowedTargetTypes: ['page', 'post', 'resource', 'event'],
  },
  {
    key: 'author_sponsor',
    label: 'Author or sponsor',
    allowedSourceTypes: ['post', 'tool_review', 'interview', 'event'],
    allowedTargetTypes: ['sponsor_profile'],
    maxTargets: 5,
  },
  {
    key: 'replacement_asset',
    label: 'Replacement asset',
    allowedSourceTypes: ['resource'],
    allowedTargetTypes: ['resource'],
    maxTargets: 1,
  },
];

export function relationshipAllowList(key: string): RelationshipAllowList | null {
  return CONTENT_RELATIONSHIP_ALLOW_LISTS.find((row) => row.key === key) ?? null;
}

export function relationshipTypesForSource(sourceType: string): RelationshipAllowList[] {
  return CONTENT_RELATIONSHIP_ALLOW_LISTS.filter((row) => row.allowedSourceTypes.includes(sourceType));
}

export function effectiveContentType(args: {
  kind: string;
  contentTypeKey?: string | null;
}): string | null {
  if (args.kind === 'page' || args.kind === 'post') return args.kind;
  if (args.kind === 'custom') return args.contentTypeKey || null;
  return null;
}

export function assertValidRelationship(args: {
  relationshipType: string;
  sourceType: string;
  targetType: string;
  sourceContentId: string;
  targetContentId: string;
  existingTargetCount?: number;
}): void {
  if (args.sourceContentId === args.targetContentId) {
    throw new Error('A content record cannot relate to itself.');
  }
  const rule = relationshipAllowList(args.relationshipType);
  if (!rule) throw new Error(`Unknown relationship type: ${args.relationshipType}`);
  if (!rule.allowedSourceTypes.includes(args.sourceType)) {
    throw new Error(`Relationship ${args.relationshipType} does not allow source type ${args.sourceType}.`);
  }
  if (!rule.allowedTargetTypes.includes(args.targetType)) {
    throw new Error(`Relationship ${args.relationshipType} does not allow target type ${args.targetType}.`);
  }
  if (
    typeof rule.maxTargets === 'number' &&
    typeof args.existingTargetCount === 'number' &&
    args.existingTargetCount >= rule.maxTargets
  ) {
    throw new Error(`Relationship ${args.relationshipType} allows at most ${rule.maxTargets} targets.`);
  }
}

export function canAddRelationship(args: {
  relationshipType: string;
  sourceType: string;
  targetType: string;
  sourceContentId: string;
  targetContentId: string;
  existingTargetCount?: number;
}): { ok: true } | { ok: false; reason: string } {
  try {
    assertValidRelationship(args);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'Invalid relationship.' };
  }
}
