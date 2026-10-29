
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { extractPdfFile } from './pdf-extractor';

describe('PDF Extraction', () => {
  it('extracts text from a real PDF', async () => {
    const bytes = await readFile(
      new URL('./__fixtures__/sample.pdf', import.meta.url),
    );

    const file = new Blob(
      [bytes],
      { type: 'application/pdf' },
    );

    const result = await extractPdfFile(file);

    expect(result.text).toContain(
      'Offmate PDF extraction test',
    );

    expect(result.mimeType).toBe('application/pdf');
    expect(result.method).toBe('pdf');
    expect(result.pageCount).toBe(1);
  });

  it('rejects non-PDF files', async () => {
    const file = new Blob(
      ['Plain text'],
      { type: 'text/plain' },
    );

    await expect(extractPdfFile(file))
      .rejects.toThrow('Expected a PDF file.');
  });
});
