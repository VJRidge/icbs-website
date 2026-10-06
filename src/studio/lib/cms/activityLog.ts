import { supabase } from '../supabase';

export const ACTIVITY_ACTIONS = [
  'content.publish',
  'content.unpublish',
  'content.schedule',
  'content.trash',
  'content.restore',
  'content.revision_restore',
  'content.preview',
  'content.submit_review',
  'content.return_review',
  'settings.publish',
  'media.upload',
  'media.delete',
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export type ActivityLogInput = {
  actorId: string | null | undefined;
  action: ActivityAction;
  entity?: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
};

export function activityLogRow(input: ActivityLogInput) {
  return {
    actor_id: input.actorId || null,
    action: input.action,
    entity: input.entity ?? null,
    entity_id: input.entityId || null,
    meta: input.meta ?? {},
  };
}

/** Best-effort audit insert. Never throws into the publishing path. */
export async function recordActivity(input: ActivityLogInput): Promise<void> {
  try {
    const { error } = await supabase.from('activity_log').insert(activityLogRow(input));
    if (error) console.warn('[activity_log]', error.message);
  } catch (err) {
    console.warn('[activity_log]', err);
  }
}

export type ActivityLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export function formatActivityLabel(action: string): string {
  switch (action) {
    case 'content.publish':
      return 'Published';
    case 'content.unpublish':
      return 'Unpublished';
    case 'content.schedule':
      return 'Scheduled';
    case 'content.trash':
      return 'Moved to trash';
    case 'content.restore':
      return 'Restored from trash';
    case 'content.revision_restore':
      return 'Restored revision';
    case 'content.preview':
      return 'Opened secure preview';
    case 'content.submit_review':
      return 'Submitted for review';
    case 'content.return_review':
      return 'Returned from review';
    case 'settings.publish':
      return 'Published settings';
    case 'media.upload':
      return 'Uploaded media';
    case 'media.delete':
      return 'Deleted media';
    default:
      return action;
  }
}

export async function listRecentActivity(limit = 12): Promise<ActivityLogRow[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('id, actor_id, action, entity, entity_id, meta, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as ActivityLogRow[]) ?? [];
}
