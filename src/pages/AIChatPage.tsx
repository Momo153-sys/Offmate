
import { useEffect, useRef, useState } from 'react';
import { offmateAI } from '../ai/engine';
import { initializeLocalAI } from '../ai/setup';
import { useAIChat } from '../ai/useAIChat';
import {
  deleteConversation,
  getConversations,
} from '../lib/conversation-db';
import './AIChatPage.css';

export default function AIChatPage() {
  const [input, setInput] = useState('');
  const [isReady, setIsReady] = useState(
    () => offmateAI.getStatus() === 'ready',
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<
    Awaited<ReturnType<typeof getConversations>>
  >([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLElement>(null);

  const {
    messages,
    conversationId,
    isRestoring,
    isGenerating,
    error,
    sendMessage,
    clearMessages,
    selectConversation,
  } = useAIChat();

  useEffect(() => {
    let cancelled = false;

    async function loadConversations() {
      try {
        const saved = await getConversations();

        if (!cancelled) {
          setConversations(saved);
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      }
    }

    void loadConversations();

    return () => {
      cancelled = true;
    };
  }, [conversationId, isGenerating]);

  useEffect(() => {
    const updateReadyState = () => {
      setIsReady(offmateAI.getStatus() === 'ready');
    };

    const unsubscribe = offmateAI.subscribeToStatus(updateReadyState);
    updateReadyState();

    return unsubscribe;
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: isGenerating ? 'auto' : 'smooth',
    });
  }, [messages, isGenerating]);

  async function handleDeleteConversation(id: string) {
    if (isGenerating || isRestoring) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this conversation? This action cannot be undone.',
    );

    if (!confirmed) return;

    try {
      await deleteConversation(id);

      if (conversationId === id) {
        clearMessages();
      }

      setConversations(await getConversations());
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }

  async function handleLoadAI() {
    if (isLoading) return;

    setIsLoading(true);
    setLoadError(null);

    try {
      await initializeLocalAI();
      setIsReady(true);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load AI model.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend() {
    const text = input.trim();

    if (!text || !isReady || isGenerating || isRestoring) return;

    setInput('');
    await sendMessage(text);
  }

  function handleNewChat() {
    if (isGenerating || isRestoring) return;

    clearMessages();
    setInput('');
  }

  return (
    <main className="ai-chat-page">
      <header className="ai-chat-heading">
        
<div className="ai-chat-header-actions">
  {!isReady ? (
    <button
      type="button"
      onClick={() => void handleLoadAI()}
      disabled={isLoading}
      className="ai-chat-button ai-chat-primary"
    >
      {isLoading ? 'Loading…' : 'Load AI'}
    </button>
  ) : (
    <span className="ai-chat-ready-label">
      <span aria-hidden="true" />
      AI ready
    </span>
  )}

  <button
    type="button"
    onClick={handleNewChat}
    disabled={isGenerating || isRestoring}
    className="ai-chat-button"
  >
    + New chat
  </button>
</div>
</header>


      <aside className="ai-chat-history" aria-label="Conversation history">
        <h2 className="ai-chat-history-heading">Recent conversations</h2>

        <div className="ai-chat-history-list">
          {conversations.length === 0 && (
            <p className="text-sm text-gray-500">
              Your saved chats will appear here.
            </p>
          )}

          {conversations.map((conversation) => (
            <div key={conversation.id} className="ai-chat-history-item">
              <button
                type="button"
                onClick={() => void selectConversation(conversation.id)}
                disabled={isGenerating || isRestoring}
                aria-current={
                  conversation.id === conversationId ? 'true' : undefined
                }
                title={conversation.title}
                className="ai-chat-history-select"
              >
                {conversation.title}
              </button>

              <button
                type="button"
                onClick={() => void handleDeleteConversation(conversation.id)}
                disabled={isGenerating || isRestoring}
                aria-label={`Delete ${conversation.title}`}
                title="Delete conversation"
                className="ai-chat-delete"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </aside>

      {loadError && (
  <p role="alert" className="ai-chat-error">
    {loadError}
  </p>
)}

      <section
        ref={messagesContainerRef}
        aria-label="Conversation"
        aria-live="polite"
        className="ai-chat-messages"
      >
        {messages.length === 0 && (
          <div className="ai-chat-empty">
            <div className="ai-chat-empty-mark" aria-hidden="true">
              ✳
            </div>
            <strong>What can I help you with?</strong>
            <span>
              Ask a question or explore your saved notes and documents.
              Your conversation stays on your device.
            </span>
          </div>
        )}

        {messages.map((message, index) => (
          <article
            key={`${conversationId ?? 'chat'}-${index}-${message.role}`}
            className={`ai-chat-message ${
              message.role === 'user'
                ? 'ai-chat-message-user'
                : 'ai-chat-message-assistant'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>

            {message.role === 'assistant' &&
              message.sources &&
              message.sources.length > 0 && (
                <div className="ai-chat-sources">
                  <span className="ai-chat-sources-heading">
                    Sources from your library
                  </span>

                  {message.sources.map((source) => (
                    <div
                      key={source.resourceId}
                      className="ai-chat-source"
                    >
                      <span aria-hidden="true">▤</span>
                      <span>{source.title}</span>
                    </div>
                  ))}
                </div>
              )}
          </article>
        ))}

        {isRestoring && (
          <p role="status" className="ai-chat-thinking">
            Restoring conversation…
          </p>
        )}

        {isGenerating && (
          <div role="status" className="ai-chat-thinking">
            <span className="ai-chat-thinking-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            Offmate is thinking
          </div>
        )}

        <div ref={messagesEndRef} />
      </section>

      {error && (
        <p role="alert" className="ai-chat-error">
          {error}
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
        className="ai-chat-composer"
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            isRestoring
              ? 'Restoring conversation…'
              : isGenerating
                ? 'Offmate is responding…'
                : 'Message Offmate…'
          }
          aria-label="Message Offmate"
          disabled={!isReady || isGenerating || isRestoring}
          className="ai-chat-input"
        />

        <button
          type="submit"
          disabled={
            !isReady || isGenerating || isRestoring || !input.trim()
          }
          className="ai-chat-button ai-chat-primary"
        >
          Send
        </button>
      </form>
    </main>
  );
}
