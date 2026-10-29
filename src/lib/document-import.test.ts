
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  importDocument,
  retryDocumentExtraction,
} from './document-import';
import {
  getResource,
  getResources,
  deleteResource,
  searchResources,
} from './db';

import { extractDocument } from './extraction/document-extractor';

vi.mock('./extraction/document-extractor', () => ({
  extractDocument: vi.fn(),
}));

const mockedExtractDocument = vi.mocked(extractDocument);

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('Document Import', () => {
  beforeEach(async () => {
    vi.resetAllMocks();

    const resources = await getResources();

    await Promise.all(
      resources.map((resource) => deleteResource(resource.id)),
    );

    // Simulate successful text extraction by default
    mockedExtractDocument.mockImplementation(async (file) => ({
      text: 'Extracted document content',
      mimeType: file.type as
        | 'application/pdf'
        | 'text/plain'
        | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        | 'image/jpeg'
        | 'image/png',
      method: 'direct',
      extractedAt: Date.now(),
    }));
  });

  it.each([
    ['lecture.pdf', 'application/pdf'],
    ['notes.txt', 'text/plain'],
    ['assignment.docx', DOCX_MIME],
    ['lecture.png', 'image/png'],
    ['notes.jpg', 'image/jpeg'],
  ])(
    'imports and extracts %s',
    async (filename, mimeType) => {
      const file = new File(
        ['Sample file content'],
        filename,
        { type: mimeType },
      );

      const resource = await importDocument(file);
      const saved = await getResource(resource.id);

      expect(resource.title).toBe(filename);
      expect(resource.kind).toBe('document');
      expect(resource.mimeType).toBe(mimeType);

      // Verify original document preservation
      expect(saved?.file).toBeInstanceOf(Blob);
      expect(saved?.mimeType).toBe(mimeType);

      // Verify extraction was executed
      expect(mockedExtractDocument).toHaveBeenCalledWith(file);

      // Verify extracted content was persisted
      expect(saved?.content).toBe(
        'Extracted document content',
      );
      expect(saved?.extractionStatus).toBe('completed');
      expect(saved?.extractedAt).toEqual(
        expect.any(Number),
      );
    },
  );

  it('preserves the original file when extraction fails', async () => {
    mockedExtractDocument.mockRejectedValueOnce(
      new Error('OCR failed'),
    );

    const file = new File(
      ['Image data'],
      'difficult-image.png',
      { type: 'image/png' },
    );

    const resource = await importDocument(file);
    const saved = await getResource(resource.id);

    expect(saved).toBeDefined();
    expect(saved?.file).toBeInstanceOf(Blob);
    expect(saved?.title).toBe('difficult-image.png');
    expect(saved?.extractionStatus).toBe('failed');
    expect(saved?.content).toBeUndefined();
    expect(saved?.extractedAt).toBeUndefined();
  });

  it('saves the document before extraction begins', async () => {
    let releaseExtraction!: () => void;

    const extractionGate = new Promise<void>((resolve) => {
      releaseExtraction = resolve;
    });

    mockedExtractDocument.mockImplementationOnce(
      async () => {
        await extractionGate;

        return {
          text: 'Finished extraction',
          mimeType: 'text/plain',
          method: 'direct',
          extractedAt: Date.now(),
        };
      },
    );

    const file = new File(
      ['Lecture notes'],
      'pending.txt',
      { type: 'text/plain' },
    );

    const importPromise = importDocument(file);

    // Wait until the extraction function is called
    await vi.waitFor(() => {
      expect(mockedExtractDocument).toHaveBeenCalledOnce();
    });

    const resources = await getResources();
    const pending = resources.find(
      (resource) => resource.title === 'pending.txt',
    );

    expect(pending).toBeDefined();
    expect(pending?.extractionStatus).toBe('pending');
    expect(pending?.file).toBeInstanceOf(Blob);

    releaseExtraction();

    const completed = await importPromise;

    expect(completed.extractionStatus).toBe('completed');
    expect(completed.content).toBe('Finished extraction');
  });

  it('rejects unsupported file types', async () => {
    const file = new File(
      ['Audio content'],
      'recording.mp3',
      { type: 'audio/mpeg' },
    );

    await expect(importDocument(file)).rejects.toThrow(
      'Unsupported file type',
    );

    expect(mockedExtractDocument).not.toHaveBeenCalled();
  });

  it('rejects empty files', async () => {
    const file = new File(
      [],
      'empty.pdf',
      { type: 'application/pdf' },
    );

    await expect(importDocument(file)).rejects.toThrow(
      'Cannot import an empty file',
    );

    expect(mockedExtractDocument).not.toHaveBeenCalled();
  });

  it('rejects files larger than 10 MB', async () => {
    const file = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      'large.pdf',
      { type: 'application/pdf' },
    );

    await expect(importDocument(file)).rejects.toThrow(
      'File exceeds the 10 MB limit',
    );

    expect(mockedExtractDocument).not.toHaveBeenCalled();
  });


it('retries extraction successfully after an initial failure', async () => {
  const file = new File(
    ['Offline course material'],
    'course.txt',
    { type: 'text/plain' },
  );

  // First extraction attempt fails.
  mockedExtractDocument.mockRejectedValueOnce(
    new Error('Temporary extraction failure'),
  );

  const imported = await importDocument(file);

  expect(imported.extractionStatus).toBe('failed');
  expect(imported.file).toBeDefined();

  // Second extraction attempt succeeds.
  mockedExtractDocument.mockResolvedValueOnce({
    text: 'Offline applications store data locally.',
    extractedAt: Date.now(),
    mimeType: 'text/plain',
    method: 'direct',
  });

  const recovered = await retryDocumentExtraction(imported);

  expect(recovered.id).toBe(imported.id);
  expect(recovered.extractionStatus).toBe('completed');
  expect(recovered.content).toContain('Offline applications');

  // Confirm the recovered text is searchable.
  const results = await searchResources('applications');

  expect(results.some((resource) => resource.id === imported.id)).toBe(true);

  // Confirm the updated state persists in IndexedDB.
  const stored = await getResource(imported.id);

  expect(stored?.extractionStatus).toBe('completed');
  expect(stored?.content).toBe(recovered.content);
});

});
