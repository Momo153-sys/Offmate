export interface ChatSource {
  resourceId: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;

  // Documents retrieved to help generate the response
  sources?: ChatSource[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}