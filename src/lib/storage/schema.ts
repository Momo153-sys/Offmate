
import type { DBSchema } from 'idb';
import type { Resource, ResourceKind } from '../../domain/resources';
import type {
  Conversation,
  ChatMessage,
} from '../../domain/conversations';

export interface OffmateDB extends DBSchema {
  resources: {
    key: string;
    value: Resource;
    indexes: {
      'by-updated': number;
      'by-kind': ResourceKind;
    };
  };

  settings: {
    key: string;
    value: {
      key: string;
      value: unknown;
    };
  };

  conversations: {
    key: string;
    value: Conversation;
    indexes: {
      'by-updated': number;
    };
  };

  messages: {
    key: string;
    value: ChatMessage;
    indexes: {
      'by-conversation': string;
      'by-created': number;
    };
  };
}
