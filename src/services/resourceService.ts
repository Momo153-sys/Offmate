
import type {
  Resource,
  ResourceKind,
  CreateResourceInput,
  UpdateResourceInput,
} from '../domain/resources';

import {
  saveResource,
  getResource,
  getResources,
  getResourcesByKind,
  updateResource,
  deleteResource,
  searchResources as searchStoredResources,
} from '../lib/db';

/**
 * Create a resource after validating its input.
 */
export async function createResource(
  input: CreateResourceInput,
): Promise<Resource> {
  const title = input.title.trim();

  if (!title) {
    throw new Error('Resource title cannot be empty.');
  }

  return saveResource({
    ...input,
    title,
  });
}

/**
 * Retrieve one resource by ID.
 */
export async function findResource(
  id: string,
): Promise<Resource | undefined> {
  return getResource(id);
}

/**
 * Retrieve all resources.
 */
export async function listResources(): Promise<Resource[]> {
  return getResources();
}

/**
 * Retrieve resources of a specific kind.
 */
export async function listResourcesByKind(
  kind: ResourceKind,
): Promise<Resource[]> {
  return getResourcesByKind(kind);
}

/**
 * Update a resource after validating changes.
 */
export async function editResource(
  id: string,
  changes: UpdateResourceInput,
): Promise<Resource> {
  if (
    changes.title !== undefined &&
    !changes.title.trim()
  ) {
    throw new Error('Resource title cannot be empty.');
  }

  return updateResource(id, changes);
}

/**
 * Delete a resource by ID.
 */
export async function removeResource(
  id: string,
): Promise<void> {
  return deleteResource(id);
}

/**
 * Search saved resources by title or text content.
 *
 * Delegates searching to the IndexedDB layer.
 * Works offline and is case-insensitive.
 */
export async function searchResources(
  query: string,
): Promise<Resource[]> {
  if (!query.trim()) {
    return [];
  }

  return searchStoredResources(query);
}