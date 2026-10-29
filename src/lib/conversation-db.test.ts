
// @vitest-environment jsdom

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { dbPromise } from './db';
import {
  createConversation,
  getConversations,
  getConversation,
  saveChatMessage,
  getChatMessages,
  deleteConversation,
} from './conversation-db';

describe('Offmate conversation storage', () => {
  beforeEach(async () => {
    const db = await dbPromise;

    const transaction = db.transaction(
      ['conversations', 'messages'],
      'readwrite',
    );

    await Promise.all([
      transaction.objectStore('conversations').clear(),
      transaction.objectStore('messages').clear(),
    ]);

    await transaction.done;
  });

  it('creates and retrieves a conversation', async () => {
    const created = await createConversation('Learning TypeScript');

    const retrieved = await getConversation(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Learning TypeScript');
    expect(retrieved?.id).toBe(created.id);
  });

  it('lists saved conversations', async () => {
    await createConversation('First conversation');
    await createConversation('Second conversation');

    const conversations = await getConversations();

    expect(conversations).toHaveLength(2);
  });

  it('saves and retrieves chat messages', async () => {
    const conversation = await createConversation('Test chat');

    await saveChatMessage(
      conversation.id,
      'user',
      'Hello Offmate!',
    );

    await saveChatMessage(
      conversation.id,
      'assistant',
      'Hello! How can I help?',
    );

    const messages = await getChatMessages(conversation.id);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Hello Offmate!');
    expect(messages[1].role).toBe('assistant');
  });

  it('rejects messages for missing conversations', async () => {
    await expect(
      saveChatMessage(
        'missing-conversation',
        'user',
        'Hello',
      ),
    ).rejects.toThrow('Conversation not found');
  });

  it('deletes a conversation and its messages', async () => {
    const conversation = await createConversation('Delete me');

    await saveChatMessage(
      conversation.id,
      'user',
      'Temporary message',
    );

    await deleteConversation(conversation.id);

    const retrieved = await getConversation(conversation.id);
    const messages = await getChatMessages(conversation.id);

    expect(retrieved).toBeUndefined();
    expect(messages).toHaveLength(0);
  });

  it('preserves other conversations when deleting one', async () => {
    const first = await createConversation('First');
    const second = await createConversation('Second');

    await saveChatMessage(first.id, 'user', 'First message');
    await saveChatMessage(second.id, 'user', 'Second message');

    await deleteConversation(first.id);

    expect(await getConversation(second.id)).toBeDefined();

    const remainingMessages = await getChatMessages(second.id);

    expect(remainingMessages).toHaveLength(1);
    expect(remainingMessages[0].content).toBe('Second message');
  });
});
