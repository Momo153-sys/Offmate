
import { describe, expect, it } from 'vitest';
import { extractTextFile } from './text-extractor';

describe('TXT Extraction', () => {
  it('extracts text from a TXT file', async () => {
    const file = new File(
      ['Offmate works offline.'],
      'notes.txt',
      { type: 'text/plain' },
    );

    const result = await extractTextFile(file);

    expect(result.text).toBe('Offmate works offline.');
    expect(result.mimeType).toBe('text/plain');
    expect(result.method).toBe('direct');
    expect(result.extractedAt).toBeGreaterThan(0);
  });

  it('rejects non-TXT files', async () => {
    const file = new File(
      ['PDF content'],
      'lecture.pdf',
      { type: 'application/pdf' },
    );

    await expect(extractTextFile(file))
      .rejects.toThrow('Expected a TXT file.');
  });
});
