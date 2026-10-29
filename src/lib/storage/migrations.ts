
import type { IDBPDatabase } from 'idb';
import type { OffmateDB } from './schema';

export function upgradeOffmateDatabase(
  db: IDBPDatabase<OffmateDB>,
  oldVersion: number,
): void {
  // Version 1: initial local database.
  if (oldVersion < 1) {
    const resources = db.createObjectStore('resources', {
      keyPath: 'id',
    });

    resources.createIndex('by-updated', 'updatedAt');
    resources.createIndex('by-kind', 'kind');

    db.createObjectStore('settings', {
      keyPath: 'key',
    });
  }

  // Version 2: persistent AI conversations.
  if (oldVersion < 2) {
    const conversations = db.createObjectStore('conversations', {
      keyPath: 'id',
    });

    conversations.createIndex('by-updated', 'updatedAt');

    const messages = db.createObjectStore('messages', {
      keyPath: 'id',
    });

    messages.createIndex('by-conversation', 'conversationId');
    messages.createIndex('by-created', 'createdAt');
  }
}
