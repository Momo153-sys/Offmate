
import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';

import {
  createResource,
  findResource,
  editResource,
  removeResource,
  listResources,
  listResourcesByKind,
  searchResources,
} from './resourceService';

import { deleteResource } from '../lib/db';

describe('Offmate resource service', () => {
  beforeEach(async () => {
    const resources = await listResources();

    await Promise.all(
      resources.map((resource) => deleteResource(resource.id)),
    );
  });

  it('creates a resource and trims its title', async () => {
    const resource = await createResource({
      title: '  My first note  ',
      kind: 'note',
      content: 'Stored locally',
    });

    expect(resource.title).toBe('My first note');
  });

  it('rejects an empty title', async () => {
    await expect(
      createResource({
        title: '   ',
        kind: 'note',
      }),
    ).rejects.toThrow('Resource title cannot be empty.');
  });

  it('finds a resource by ID', async () => {
    const created = await createResource({
      title: 'Find me',
      kind: 'note',
    });

    const found = await findResource(created.id);

    expect(found?.title).toBe('Find me');
  });

  it('lists resources by kind', async () => {
    await createResource({ title: 'Note one', kind: 'note' });
    await createResource({ title: 'Document one', kind: 'document' });

    const notes = await listResourcesByKind('note');

    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe('Note one');
  });

  it('edits a resource title', async () => {
    const created = await createResource({
      title: 'Before',
      kind: 'note',
    });

    const updated = await editResource(created.id, {
      title: 'After',
    });

    expect(updated.title).toBe('After');
    expect(updated.createdAt).toBe(created.createdAt);
  });

  it('rejects an empty title when editing', async () => {
    const created = await createResource({
      title: 'Valid title',
      kind: 'note',
    });

    await expect(
      editResource(created.id, { title: '   ' }),
    ).rejects.toThrow('Resource title cannot be empty.');
  });

  it('removes a resource', async () => {
    const created = await createResource({
      title: 'Delete me',
      kind: 'note',
    });

    await removeResource(created.id);

    expect(await findResource(created.id)).toBeUndefined();
  });
});


it('searches resource titles and content without case sensitivity', async () => {
  await createResource({
    title: 'University Project',
    kind: 'note',
    content: 'Offline synchronization',
  });

  await createResource({
    title: 'Shopping list',
    kind: 'note',
    content: 'Milk and bread',
  });

  const titleResults = await searchResources('UNIVERSITY');
  const contentResults = await searchResources('SYNCHRONIZATION');

  expect(titleResults).toHaveLength(1);
  expect(titleResults[0].title).toBe('University Project');

  expect(contentResults).toHaveLength(1);
  expect(contentResults[0].title).toBe('University Project');
});

it('returns no results for a blank search query', async () => {
  await createResource({
    title: 'Existing note',
    kind: 'note',
  });

  expect(await searchResources('   ')).toEqual([]);
});

it('returns no results when there is no match', async () => {
  await createResource({
    title: 'University project',
    kind: 'note',
    content: 'Offline synchronization',
  });

  expect(await searchResources('nonexistent')).toEqual([]);
});
