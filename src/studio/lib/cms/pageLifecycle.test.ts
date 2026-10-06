import { describe, expect, it } from 'vitest';
import {
  assertWriteMatchedRow,
  nextDocVersion,
  restoreRevisionWorkingCopy,
  restoreFromTrashPatch,
  staleWriteMessage,
  trashPatch,
} from './pageLifecycle';

describe('trashPatch', () => {
  it('moves a record to trash without clearing the published snapshot', () => {
    expect(trashPatch()).toEqual({ status: 'trash' });
  });

  it('can bump doc_version when trashing to block concurrent overwrites', () => {
    expect(trashPatch(5)).toEqual({ status: 'trash', doc_version: 5 });
  });

  it('restores trash to draft so republishing stays explicit', () => {
    expect(restoreFromTrashPatch()).toEqual({ status: 'draft' });
  });
});

describe('nextDocVersion', () => {
  it('increments a known version and starts at 2 when missing', () => {
    expect(nextDocVersion(4)).toBe(5);
    expect(nextDocVersion(null)).toBe(2);
  });
});

describe('assertWriteMatchedRow', () => {
  it('rejects a zero-row update as a stale or unauthorized write', () => {
    expect(() => assertWriteMatchedRow(null)).toThrow(staleWriteMessage());
  });

  it('returns the saved row when a write matched', () => {
    const row = { id: 'page-1', doc_version: 3 };
    expect(assertWriteMatchedRow(row)).toBe(row);
  });
});

describe('restoreRevisionWorkingCopy', () => {
  it('restores working blocks and body without publishing', () => {
    const next = restoreRevisionWorkingCopy({
      format: 'blocks',
      blocks: [{ id: 'hero', type: 'paragraph', data: { text: '<p>Old</p>' } }],
      html: '<p>Old</p>',
    });
    expect(next.content_blocks).toHaveLength(1);
    expect(next.body).toBe('<p>Old</p>');
    expect(next).not.toHaveProperty('published_document');
    expect(next).not.toHaveProperty('status');
  });
});
