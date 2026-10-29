
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OffmateAI } from './engine';
import type { AIEngine, AIEngineStatus } from './types';

describe('Offmate AI Engine', () => {
  let ai: OffmateAI;
  let mockEngine: AIEngine;
  let status: AIEngineStatus;

  beforeEach(() => {
    ai = new OffmateAI();
    status = 'idle';

    mockEngine = {
      model: {
        id: 'test-model',
        name: 'Offmate Test Model',
      },

      getStatus: vi.fn(() => status),
      subscribeToStatus: vi.fn(() => () => {}),

      initialize: vi.fn(async () => {
        status = 'ready';
      }),

      generate: vi.fn(async () => ({
        text: 'Hello! I am Offmate.',
      })),

      dispose: vi.fn(async () => {
        status = 'idle';
      }),
    };
  });

  it('starts without an AI engine', () => {
    expect(ai.getStatus()).toBe('unavailable');
  });

  it('throws an error when initializing without an engine', async () => {
    await expect(ai.initialize()).rejects.toThrow(
      'No AI engine has been registered.',
    );
  });

  it('initializes a registered engine', async () => {
    ai.registerEngine(mockEngine);

    await ai.initialize();

    expect(mockEngine.initialize).toHaveBeenCalledOnce();
    expect(ai.getStatus()).toBe('ready');
  });

  it('generates a response when the engine is ready', async () => {
    ai.registerEngine(mockEngine);
    await ai.initialize();

    const response = await ai.generate({
      messages: [
        {
          role: 'user',
          content: 'Hello Offmate!',
        },
      ],
    });

    expect(response.text).toBe('Hello! I am Offmate.');
    expect(mockEngine.generate).toHaveBeenCalledOnce();
  });

  it('prevents generation before initialization', async () => {
    ai.registerEngine(mockEngine);

    await expect(
      ai.generate({
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      }),
    ).rejects.toThrow('AI engine is not ready.');
  });

  it('rejects empty conversations', async () => {
    ai.registerEngine(mockEngine);
    await ai.initialize();

    await expect(
      ai.generate({ messages: [] }),
    ).rejects.toThrow('At least one message is required.');
  });

  it('releases the engine when disposed', async () => {
    ai.registerEngine(mockEngine);
    await ai.initialize();

    await ai.dispose();

    expect(mockEngine.dispose).toHaveBeenCalledOnce();
    expect(ai.getStatus()).toBe('unavailable');
  });


  it('delegates status subscriptions to a registered engine', () => {
    ai.registerEngine(mockEngine);

    const listener = vi.fn();
    const unsubscribe = ai.subscribeToStatus(listener);

    expect(mockEngine.subscribeToStatus).toHaveBeenCalledWith(listener);
    expect(typeof unsubscribe).toBe('function');
  });

  it('returns a no-op unsubscribe function without an engine', () => {
    const listener = vi.fn();

    const unsubscribe = ai.subscribeToStatus(listener);

    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });

  it('does nothing when unloading without an engine', async () => {
    await expect(ai.unload()).resolves.toBeUndefined();
  });

  it('disposes the engine when unloading', async () => {
    ai.registerEngine(mockEngine);

    await ai.unload();

    expect(mockEngine.dispose).toHaveBeenCalledOnce();
    expect(ai.getStatus()).toBe('idle');
  });

  it('passes the generation request to the engine', async () => {
    ai.registerEngine(mockEngine);
    await ai.initialize();

    const request = {
      messages: [{ role: 'user' as const, content: 'Test request' }],
    };

    await ai.generate(request);

    expect(mockEngine.generate).toHaveBeenCalledWith(request);
  });

  it('does not clear the registered engine when disposal fails', async () => {
    ai.registerEngine(mockEngine);

    vi.mocked(mockEngine.dispose).mockRejectedValueOnce(
      new Error('Disposal failed'),
    );

    await expect(ai.dispose()).rejects.toThrow('Disposal failed');

    // The engine should remain registered because dispose() did not complete.
    expect(ai.getStatus()).toBe('idle');
  });

});
