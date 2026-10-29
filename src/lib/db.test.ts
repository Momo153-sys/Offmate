
import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';

import {
  deleteResource,
  getResource,
  getResources,
  getResourcesByKind,
  getSetting,
  saveResource,
  searchResources,
  setSetting,
  updateResource,
} from './db';

describe('Offmate local database', () => {
  // Ensure each test starts with an empty resource database
  beforeEach(async () => {
    const resources = await getResources();

    await Promise.all(
      resources.map((resource) => deleteResource(resource.id)),
    );
  });

  // ---------------------------------------
  // Resource creation and retrieval
  // ---------------------------------------

  it('creates and retrieves a note', async () => {
    const created = await saveResource({
      title: 'Offline test',
      kind: 'note',
      content: 'This note is stored locally.',
    });

    const retrieved = await getResource(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Offline test');
    expect(retrieved?.content).toBe(
      'This note is stored locally.',
    );
  });

  it('returns undefined for a missing resource', async () => {
    const result = await getResource('nonexistent-id');

    expect(result).toBeUndefined();
  });

  it('returns resources by kind', async () => {
    await saveResource({
      title: 'My note',
      kind: 'note',
      content: 'A note',
    });

    await saveResource({
      title: 'My document',
      kind: 'document',
      content: 'Document metadata',
    });

    const notes = await getResourcesByKind('note');

    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe('My note');
  });

  // ---------------------------------------
  // Resource updates
  // ---------------------------------------

  it('updates an existing resource', async () => {
    const created = await saveResource({
      title: 'Original title',
      kind: 'note',
      content: 'Keep this content',
    });

    const updated = await updateResource(created.id, {
      title: 'Updated title',
    });

    expect(updated.title).toBe('Updated title');
    expect(updated.content).toBe('Keep this content');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(
      created.updatedAt,
    );
  });

  it('preserves creation time when updating a resource', async () => {
    const created = await saveResource({
      title: 'Original title',
      kind: 'note',
    });

    const updated = await updateResource(created.id, {
      title: 'Updated title',
    });

    expect(updated.createdAt).toBe(created.createdAt);
  });

  it('rejects an update with an empty title', async () => {
    const created = await saveResource({
      title: 'Valid title',
      kind: 'note',
    });

    await expect(
      updateResource(created.id, { title: '   ' }),
    ).rejects.toThrow('Resource title cannot be empty.');

    const unchanged = await getResource(created.id);

    expect(unchanged?.title).toBe('Valid title');
  });

  it('rejects updating a missing resource', async () => {
    await expect(
      updateResource('missing-id', { title: 'Updated' }),
    ).rejects.toThrow('Resource not found: missing-id');
  });

  // ---------------------------------------
  // Resource deletion and validation
  // ---------------------------------------

  it('deletes a resource', async () => {
    const created = await saveResource({
      title: 'Temporary note',
      kind: 'note',
    });

    await deleteResource(created.id);

    expect(await getResource(created.id)).toBeUndefined();
  });

  it('rejects an empty title', async () => {
    await expect(
      saveResource({
        title: '   ',
        kind: 'note',
      }),
    ).rejects.toThrow('Resource title cannot be empty.');
  });

  // ---------------------------------------
  // Document storage
  // ---------------------------------------

  it('persists a document Blob and its MIME type', async () => {
    const file = new Blob(['Offmate document content'], {
      type: 'text/plain',
    });

    const created = await saveResource({
      title: 'Test document',
      kind: 'document',
      file,
      mimeType: 'text/plain',
    });

    const retrieved = await getResource(created.id);

    expect(retrieved?.file).toBeInstanceOf(Blob);
    expect(await retrieved?.file?.text()).toBe(
      'Offmate document content',
    );
    expect(retrieved?.mimeType).toBe('text/plain');
  });

  it('persists document extraction metadata', async () => {
    const created = await saveResource({
      title: 'lecture.pdf',
      kind: 'document',
      extractionStatus: 'pending',
    });

    expect(
      (await getResource(created.id))?.extractionStatus,
    ).toBe('pending');

    const extractedAt = Date.now();

    await updateResource(created.id, {
      content: 'Extracted lecture text',
      extractionStatus: 'completed',
      extractedAt,
    });

    const saved = await getResource(created.id);

    expect(saved?.content).toBe('Extracted lecture text');
    expect(saved?.extractionStatus).toBe('completed');
    expect(saved?.extractedAt).toBe(extractedAt);
  });

  // ---------------------------------------
  // Offline search
  // ---------------------------------------

  it('finds a document by its extracted content', async () => {
    await saveResource({
      title: 'lecture.pdf',
      kind: 'document',
      content: 'Database normalization reduces redundancy.',
      extractionStatus: 'completed',
    });

    const results = await searchResources('normalization');

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('lecture.pdf');
  });

  it('searches titles and content without case sensitivity', async () => {
    await saveResource({
      title: 'React Notes',
      kind: 'note',
      content: 'Components and hooks',
    });

    expect(await searchResources('REACT')).toHaveLength(1);
    expect(await searchResources('react')).toHaveLength(1);
    expect(await searchResources('HOOKS')).toHaveLength(1);
  });

  it('returns no results when content does not match', async () => {
    await saveResource({
      title: 'Networking',
      kind: 'note',
      content: 'TCP and UDP protocols',
    });

    const results = await searchResources('machine learning');

    expect(results).toHaveLength(0);
  });

  it('returns all resources when the search is empty', async () => {
    await saveResource({
      title: 'First note',
      kind: 'note',
    });

    await saveResource({
      title: 'Second note',
      kind: 'note',
    });

    const results = await searchResources('   ');

    expect(results).toHaveLength(2);
  });

  it('finds matching text in both notes and documents', async () => {
    await saveResource({
      title: 'Study notes',
      kind: 'note',
      content: 'Introduction to algorithms',
    });

    await saveResource({
      title: 'lecture.pdf',
      kind: 'document',
      content: 'Advanced algorithms',
    });

    const results = await searchResources('algorithms');

    expect(results).toHaveLength(2);
    expect(results.map((resource) => resource.kind).sort()).toEqual([
      'document',
      'note',
    ]);
  });

  // ---------------------------------------
  // Application settings
  // ---------------------------------------

  it('stores and retrieves settings', async () => {
    await setSetting('test-theme', 'dark');

    const value = await getSetting<string>('test-theme');

    expect(value).toBe('dark');
  });
});
