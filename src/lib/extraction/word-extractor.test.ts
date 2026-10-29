
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { extractWordFile } from './word-extractor';

describe('Word Extraction', () => {
  it('extracts text from a DOCX file', async () => {
    const bytes = await readFile(
      new URL('./__fixtures__/sample.docx', import.meta.url),
    );

    const file = new Blob(
      [new Uint8Array(bytes)],
      {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    );

    const result = await extractWordFile(file);

    expect(result.text).toContain(
      'Offmate PDF extraction test',
    );

    expect(result.method).toBe('docx');
    expect(result.mimeType).toBe(file.type);
    expect(result.extractedAt).toBeGreaterThan(0);
  });

  it('rejects non-DOCX files', async () => {
    const file = new Blob(
      ['Plain text'],
      { type: 'text/plain' },
    );

    await expect(extractWordFile(file))
      .rejects.toThrow('Expected a DOCX file.');
  });
});
