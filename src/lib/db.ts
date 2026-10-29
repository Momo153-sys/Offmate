
import { openDB } from 'idb';

import type {
  Resource,
  ResourceKind,
  CreateResourceInput,
  UpdateResourceInput,
} from '../domain/resources';

import type { OffmateDB } from './storage/schema';
import { upgradeOffmateDatabase } from './storage/migrations';

export type { Resource, ResourceKind } from '../domain/resources';

const DB_NAME = 'offmate-local';
const DB_VERSION = 2;

// Initialize the IndexedDB database
export const dbPromise = openDB<OffmateDB>(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    upgradeOffmateDatabase(db, oldVersion);
  },
});

// Create a resource
export async function saveResource(
  input: CreateResourceInput,
): Promise<Resource> {
  const db = await dbPromise;
  const now = Date.now();

  const resource: Resource = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    kind: input.kind,

    // Notes or extracted document text
    content: input.content,

    // Original document information
    file: input.file,
    mimeType: input.mimeType,

    // Document extraction metadata
    extractionStatus: input.extractionStatus,
    extractedAt: input.extractedAt,

    // Timestamps
    createdAt: now,
    updatedAt: now,
  };

  if (!resource.title) {
    throw new Error('Resource title cannot be empty.');
  }

  await db.add('resources', resource);

  return resource;
}

// Retrieve a resource by ID
export async function getResource(
  id: string,
): Promise<Resource | undefined> {
  const db = await dbPromise;

  return db.get('resources', id);
}

// Retrieve all resources, newest updated first
export async function getResources(): Promise<Resource[]> {
  const db = await dbPromise;

  const resources = await db.getAll('resources');

  return resources.sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}


export async function searchResources(
  query: string,
): Promise<Resource[]> {
  const resources = await getResources();

  const normalizedQuery = query.trim().toLocaleLowerCase();

  // Return all resources when the search is empty
  if (!normalizedQuery) {
    return resources;
  }

  return resources.filter((resource) => {
    const title = resource.title.toLocaleLowerCase();
    const content = (resource.content ?? '').toLocaleLowerCase();

    return (
      title.includes(normalizedQuery) ||
      content.includes(normalizedQuery)
    );
  });
}


// Retrieve resources by kind
export async function getResourcesByKind(
  kind: ResourceKind,
): Promise<Resource[]> {
  const db = await dbPromise;

  const resources = await db.getAllFromIndex(
    'resources',
    'by-kind',
    kind,
  );

  return resources.sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}

// Update an existing resource
export async function updateResource(
  id: string,
  changes: UpdateResourceInput,
): Promise<Resource> {
  const db = await dbPromise;

  const existing = await db.get('resources', id);

  if (!existing) {
    throw new Error(`Resource not found: ${id}`);
  }

  const updated: Resource = {
    ...existing,
    ...changes,

    title: (
      changes.title ?? existing.title
    ).trim(),

    updatedAt: Date.now(),
  };

  if (!updated.title) {
    throw new Error('Resource title cannot be empty.');
  }

  await db.put('resources', updated);

  return updated;
}

// Delete a resource
export async function deleteResource(
  id: string,
): Promise<void> {
  const db = await dbPromise;

  await db.delete('resources', id);
}

// Save an application setting
export async function setSetting(
  key: string,
  value: unknown,
): Promise<void> {
  const db = await dbPromise;

  await db.put('settings', {
    key,
    value,
  });
}

// Retrieve an application setting
export async function getSetting<T>(
  key: string,
): Promise<T | undefined> {
  const db = await dbPromise;

  const setting = await db.get('settings', key);

  return setting?.value as T | undefined;
}
