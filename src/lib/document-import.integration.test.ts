

// @vitest-environment jsdom

import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it, vi } from 'vitest';


import { importDocument } from './document-import';
import { getResource, searchResources } from './db';
import { extractDocument } from './extraction/document-extractor';

// Mock extraction so this test focuses on the
// integration between importing, storage, and search.
vi.mock('./extraction/document-extractor', () => ({
  extractDocument: vi.fn(),
}));

const mockedExtractDocument = vi.mocked(extractDocument);

beforeEach(async () => {
  vi.clearAllMocks();

  // Remove resources created by previous tests.
  const resources = await searchResources('');

  for (const resource of resources) {
    const { deleteResource } = await import('./db');
    await deleteResource(resource.id);
  }
});

describe('Document import integration', () => {
  it('imports, stores, and searches extracted text', async () => {
    const file = new File(
      ['Computer networking course material'],
      'networks.txt',
      { type: 'text/plain' },
    );

    mockedExtractDocument.mockResolvedValue({
  text: 'TCP/IP enables communication between networks.',
  extractedAt: Date.now(),
  mimeType: 'text/plain',
  method: 'direct',
});

    const imported = await importDocument(file);

    // Verify the resource was created.
    expect(imported.kind).toBe('document');
    expect(imported.title).toBe('networks.txt');

    // Verify extracted text was saved.
    const stored = await getResource(imported.id);

    expect(stored?.content).toContain('TCP/IP');
    expect(stored?.extractionStatus).toBe('completed');

    // Verify the document can be found by content.
    const results = await searchResources('tcp/ip');

    expect(results.some((r) => r.id === imported.id)).toBe(true);
  });

  it('preserves the original document if extraction fails', async () => {
    const file = new File(
      ['Some document content'],
      'example.txt',
      { type: 'text/plain' },
    );

    mockedExtractDocument.mockRejectedValue(
      new Error('Extraction failed'),
    );

    const imported = await importDocument(file);

    expect(imported.extractionStatus).toBe('failed');
    expect(imported.file).toBeDefined();

    const stored = await getResource(imported.id);

    expect(stored).toBeDefined();
    expect(stored?.extractionStatus).toBe('failed');
  });
});

