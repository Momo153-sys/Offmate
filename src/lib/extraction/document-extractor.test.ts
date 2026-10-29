
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractDocument } from './document-extractor';

import { extractTextFile } from './text-extractor';
import { extractPdfFile } from './pdf-extractor';
import { extractWordFile } from './word-extractor';
import { extractImageFile } from './image-extractor';

vi.mock('./text-extractor', () => ({
  extractTextFile: vi.fn(),
}));

vi.mock('./pdf-extractor', () => ({
  extractPdfFile: vi.fn(),
}));

vi.mock('./word-extractor', () => ({
  extractWordFile: vi.fn(),
}));

vi.mock('./image-extractor', () => ({
  extractImageFile: vi.fn(),
}));

describe('Unified document extractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes TXT files to the text extractor', async () => {
    const file = new Blob(['Hello Offmate'], {
      type: 'text/plain',
    });

    await extractDocument(file);

    expect(extractTextFile).toHaveBeenCalledWith(file);
  });

  it('routes PDFs to the PDF extractor', async () => {
    const file = new Blob(['PDF content'], {
      type: 'application/pdf',
    });

    await extractDocument(file);

    expect(extractPdfFile).toHaveBeenCalledWith(file);
  });

  it('routes DOCX files to the Word extractor', async () => {
    const file = new Blob(['DOCX content'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    await extractDocument(file);

    expect(extractWordFile).toHaveBeenCalledWith(file);
  });

  it.each(['image/png', 'image/jpeg'])(
    'routes %s images to the image extractor',
    async (mimeType) => {
      const file = new Blob(['Image content'], {
        type: mimeType,
      });

      await extractDocument(file);

      expect(extractImageFile).toHaveBeenCalledWith(file);
    },
  );

  it('rejects unsupported document formats', async () => {
    const file = new Blob(['Unknown content'], {
      type: 'application/zip',
    });

    await expect(extractDocument(file)).rejects.toThrow(
      'Unsupported document type',
    );
  });
});
