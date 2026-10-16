import { describe, expect, it } from 'vitest';
import { collectDroppedFiles, filesFromFileList } from './mediaDropFiles';

describe('mediaDropFiles', () => {
  it('keeps named files and drops empties', () => {
    const keep = new File(['ok'], 'shot.jpg', { type: 'image/jpeg' });
    const skip = new File([], '.hidden', { type: 'application/octet-stream' });
    expect(filesFromFileList([keep, skip]).map((f) => f.name)).toEqual(['shot.jpg']);
    expect(filesFromFileList(null)).toEqual([]);
  });

  it('collects files from DataTransfer.files when entries are missing', async () => {
    const a = new File(['a'], 'a.png', { type: 'image/png' });
    const b = new File(['b'], 'b.png', { type: 'image/png' });
    const data = {
      items: [],
      files: [a, b],
    } as unknown as DataTransfer;
    expect((await collectDroppedFiles(data)).map((f) => f.name)).toEqual(['a.png', 'b.png']);
    expect(await collectDroppedFiles(null)).toEqual([]);
  });
});
