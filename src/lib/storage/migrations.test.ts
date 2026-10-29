
import { describe, it, expect, vi } from 'vitest';
import type { IDBPDatabase } from 'idb';
import type { OffmateDB } from './schema';
import { upgradeOffmateDatabase } from './migrations';

describe('upgradeOffmateDatabase', () => {
  it('skips both migrations when oldVersion is 2', () => {
    const db = {
      createObjectStore: vi.fn(),
    } as unknown as IDBPDatabase<OffmateDB>;

    upgradeOffmateDatabase(db, 2);

    expect(db.createObjectStore).not.toHaveBeenCalled();
  });

  it('skips version 1 migration when oldVersion is 1', () => {
    const db = {
  createObjectStore: vi.fn(() => {
    return {
      createIndex: vi.fn(),
    };
  }),
} as unknown as IDBPDatabase<OffmateDB>;

    upgradeOffmateDatabase(db, 1);

    expect(db.createObjectStore).toHaveBeenCalledTimes(2);
    expect(db.createObjectStore).toHaveBeenCalledWith(
      'conversations',
      { keyPath: 'id' },
    );
    expect(db.createObjectStore).toHaveBeenCalledWith(
      'messages',
      { keyPath: 'id' },
    );
  });
});
