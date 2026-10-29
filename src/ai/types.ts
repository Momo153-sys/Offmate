import type { ChatSource } from '../domain/conversations';
export type AIMessageRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  role: AIMessageRole;
  content: string;

  // Optional references to local documents
  sources?: ChatSource[];
}

export interface AIModelInfo {
  id: string;
  name: string;
  sizeBytes?: number;
}

export type AIEngineStatus =
  | 'unavailable'
  | 'idle'
  | 'loading'
  | 'ready'
  | 'generating'
  | 'error';

export interface AIGenerationOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface AIGenerationRequest {
  messages: AIMessage[];
  options?: AIGenerationOptions;
}

export interface AIGenerationResult {
  text: string;
}

export interface AIEngine {
  readonly model: AIModelInfo;

  getStatus(): AIEngineStatus;

  subscribeToStatus(
    listener: (status: AIEngineStatus) => void,
  ): () => void;

  initialize(): Promise<void>;

  generate(
    request: AIGenerationRequest,
  ): Promise<AIGenerationResult>;

  dispose(): Promise<void>;
}
