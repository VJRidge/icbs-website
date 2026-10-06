import { describe, expect, it } from 'vitest';
import { activityLogRow, formatActivityLabel } from './activityLog';

describe('activityLogRow', () => {
  it('shapes an insert without inventing actor ids', () => {
    expect(
      activityLogRow({
        actorId: 'user-1',
        action: 'content.publish',
        entity: 'contents',
        entityId: 'page-1',
        meta: { slug: 'hello' },
      }),
    ).toEqual({
      actor_id: 'user-1',
      action: 'content.publish',
      entity: 'contents',
      entity_id: 'page-1',
      meta: { slug: 'hello' },
    });
  });

  it('nulls missing actor and entity ids', () => {
    expect(activityLogRow({ actorId: null, action: 'content.trash' })).toEqual({
      actor_id: null,
      action: 'content.trash',
      entity: null,
      entity_id: null,
      meta: {},
    });
  });
});

describe('formatActivityLabel', () => {
  it('maps known actions to readable labels', () => {
    expect(formatActivityLabel('content.publish')).toBe('Published');
    expect(formatActivityLabel('content.schedule')).toBe('Scheduled');
  });
});
