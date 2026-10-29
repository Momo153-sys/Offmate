
import { dbPromise } from './db';
import type {
  Conversation,
  ChatMessage,
  ChatSource,
} from '../domain/conversations';

export async function createConversation(
  title = 'New conversation',
): Promise<Conversation> {
  const db = await dbPromise;
  const now = Date.now();

  const conversation: Conversation = {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
  };

  await db.put('conversations', conversation);

  return conversation;
}

export async function getConversations(): Promise<Conversation[]> {
  const db = await dbPromise;
  const conversations = await db.getAll('conversations');

  return conversations.sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}

export async function getConversation(
  id: string,
): Promise<Conversation | undefined> {
  const db = await dbPromise;
  return db.get('conversations', id);
}

export async function saveChatMessage(
  conversationId: string,
  role: ChatMessage['role'],
  content: string,
  sources?: ChatSource[],
): Promise<ChatMessage> {
  const db = await dbPromise;
  const now = Math.max(
  Date.now(),
  (await db.getAllFromIndex(
    'messages',
    'by-conversation',
    conversationId,
  )).reduce(
    (latest, message) => Math.max(latest, message.createdAt + 1),
    0,
  ),
);

  const transaction = db.transaction(
    ['conversations', 'messages'],
    'readwrite',
  );

  const conversation = await transaction
    .objectStore('conversations')
    .get(conversationId);

  if (!conversation) {
    await transaction.done;
    throw new Error('Conversation not found');
  }

  const message: ChatMessage = {
    id: crypto.randomUUID(),
    conversationId,
    role,
    content,
    createdAt: now,
    ...(sources?.length ? { sources } : {}),
  };

  await transaction.objectStore('messages').put(message);

  await transaction.objectStore('conversations').put({
    ...conversation,
    updatedAt: now,
  });

  await transaction.done;

  return message;
}

export async function getChatMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  const db = await dbPromise;

  const messages = await db.getAllFromIndex(
    'messages',
    'by-conversation',
    conversationId,
  );

  return messages.sort(
    (a, b) =>
      a.createdAt - b.createdAt ||
      a.id.localeCompare(b.id),
  );
}

export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  const db = await dbPromise;

  const transaction = db.transaction(
    ['conversations', 'messages'],
    'readwrite',
  );

  const messagesStore = transaction.objectStore('messages');
  const index = messagesStore.index('by-conversation');

  let cursor = await index.openCursor(conversationId);

  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await transaction
    .objectStore('conversations')
    .delete(conversationId);

  await transaction.done;
}
