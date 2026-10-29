
import { beforeEach, describe, expect, it, vi } from 'vitest';

function mockWebGPU() {
  Object.defineProperty(navigator, 'gpu', {
    configurable: true,
    value: {},
  });
}

const { createEngine, mockUnload, mockCreateMLCEngine } = vi.hoisted(() => {
  const mockUnload = vi.fn();
  const mockCreateMLCEngine = vi.fn();

  const createEngine = () => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Hello from Offmate.',
              },
            },
          ],
        }),
      },
    },
    unload: mockUnload,
  });

  return {
    createEngine,
    mockUnload,
    mockCreateMLCEngine,
  };
});

vi.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: mockCreateMLCEngine,
}));

import { WebLLMEngine } from './web-llm';

describe('WebLLMEngine', () => {
  beforeEach(() => {
  vi.clearAllMocks();
  mockCreateMLCEngine.mockResolvedValue(createEngine());
  mockWebGPU();
});

  it('starts in the idle state', () => {
    const engine = new WebLLMEngine('test-model');
    

    expect(engine.getStatus()).toBe('idle');
  });

  it('initializes the model successfully', async () => {
    const engine = new WebLLMEngine('test-model');

    await engine.initialize();

    expect(mockCreateMLCEngine).toHaveBeenCalledWith('test-model');
    expect(engine.getStatus()).toBe('ready');
  });

  it('does not initialize the model twice when already ready', async () => {
    const engine = new WebLLMEngine('test-model');

    await engine.initialize();
    await engine.initialize();

    expect(mockCreateMLCEngine).toHaveBeenCalledTimes(1);
  });

  it('generates a response', async () => {
    const engine = new WebLLMEngine('test-model');
    await engine.initialize();

    const result = await engine.generate({
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.text).toBe('Hello from Offmate.');
    expect(engine.getStatus()).toBe('ready');
  });

  it('rejects generation before initialization', async () => {
    const engine = new WebLLMEngine('test-model');

    await expect(
      engine.generate({
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).rejects.toThrow('AI engine is not ready.');
  });

  it('unloads the model and returns to idle', async () => {
    const engine = new WebLLMEngine('test-model');
    await engine.initialize();

    await engine.dispose();

    expect(mockUnload).toHaveBeenCalledTimes(1);
    expect(engine.getStatus()).toBe('idle');
  });

  it('handles initialization errors', async () => {
    mockCreateMLCEngine.mockRejectedValueOnce(
      new Error('Initialization failed'),
    );

    const engine = new WebLLMEngine('test-model');

    await expect(engine.initialize()).rejects.toThrow(
      'Initialization failed',
    );

    expect(engine.getStatus()).toBe('error');
  });

  it('handles concurrent initialization requests', async () => {
  const engine = new WebLLMEngine('test-model');

  let resolveInitialization!: (value: ReturnType<typeof createEngine>) => void;

  mockCreateMLCEngine.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveInitialization = resolve;
    }),
  );

  const firstInitialization = engine.initialize();
  const secondInitialization = engine.initialize();

  resolveInitialization(createEngine());

  await expect(
    Promise.all([firstInitialization, secondInitialization]),
  ).resolves.toBeDefined();

  expect(mockCreateMLCEngine).toHaveBeenCalledTimes(1);
  expect(engine.getStatus()).toBe('ready');
});

it('rejects a second generation while one is in progress', async () => {
  const activeModel = createEngine();
  const engine = new WebLLMEngine('test-model');

  mockCreateMLCEngine.mockResolvedValueOnce(activeModel);
  await engine.initialize();

  let resolveGeneration!: (value: {
    choices: { message: { content: string } }[];
  }) => void;

  activeModel.chat.completions.create.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveGeneration = resolve;
    }),
  );

  const firstRequest = engine.generate({
    messages: [{ role: 'user', content: 'First request' }],
  });

  await expect(
    engine.generate({
      messages: [{ role: 'user', content: 'Second request' }],
    }),
  ).rejects.toThrow('AI engine is not ready.');

  resolveGeneration({
    choices: [{ message: { content: 'First response' } }],
  });

  await expect(firstRequest).resolves.toEqual({
    text: 'First response',
  });

  expect(engine.getStatus()).toBe('ready');
});


it('waits for generation to finish before unloading the model', async () => {
  const activeModel = createEngine();
  const engine = new WebLLMEngine('test-model');

  mockCreateMLCEngine.mockResolvedValueOnce(activeModel);
  await engine.initialize();

  let resolveGeneration!: (value: {
    choices: { message: { content: string } }[];
  }) => void;

  activeModel.chat.completions.create.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveGeneration = resolve;
    }),
  );

  const generation = engine.generate({
    messages: [{ role: 'user', content: 'Explain this document.' }],
  });

  const disposal = engine.dispose();

  // The model must remain loaded while generation is active.
  expect(mockUnload).not.toHaveBeenCalled();

  resolveGeneration({
    choices: [{ message: { content: 'Document explanation.' } }],
  });

  await expect(generation).resolves.toEqual({
    text: 'Document explanation.',
  });

  await disposal;

  expect(mockUnload).toHaveBeenCalledTimes(1);
  expect(engine.getStatus()).toBe('idle');
});


it('rejects initialization when WebGPU is unavailable', async () => {
  Object.defineProperty(navigator, 'gpu', {
    configurable: true,
    value: undefined,
  });

  const engine = new WebLLMEngine('test-model');

  await expect(engine.initialize()).rejects.toThrow(
    'WebGPU is unavailable in this browser.',
  );

  expect(engine.getStatus()).toBe('unavailable');
  expect(mockCreateMLCEngine).not.toHaveBeenCalled();
});

it('notifies subscribers when the engine status changes', async () => {
  const engine = new WebLLMEngine('test-model');
  const listener = vi.fn();

  engine.subscribeToStatus(listener);

  await engine.initialize();

  expect(listener).toHaveBeenNthCalledWith(1, 'loading');
  expect(listener).toHaveBeenNthCalledWith(2, 'ready');
});

it('returns an empty string when the model provides no response content', async () => {
  const engine = new WebLLMEngine('test-model');
  await engine.initialize();

  const activeModel = createEngine();
  activeModel.chat.completions.create.mockResolvedValueOnce({
    choices: [],
  });

  await engine.dispose();
  mockCreateMLCEngine.mockResolvedValueOnce(activeModel);
  await engine.initialize();

  const result = await engine.generate({
    messages: [{ role: 'user', content: 'Hello' }],
  });

  expect(result.text).toBe('');
});


it('marks the engine as error and invalidates it when generation fails', async () => {
  const model = createEngine();
  const engine = new WebLLMEngine('test-model');

  mockCreateMLCEngine.mockResolvedValueOnce(model);
  await engine.initialize();

  model.chat.completions.create.mockRejectedValueOnce(
    new Error('Generation failed'),
  );

  await expect(
    engine.generate({
      messages: [{ role: 'user', content: 'Hello' }],
    }),
  ).rejects.toThrow('Generation failed');

  expect(engine.getStatus()).toBe('error');

  // The next initialization should create a fresh underlying engine.
  const replacementModel = createEngine();
  mockCreateMLCEngine.mockResolvedValueOnce(replacementModel);

  await engine.initialize();

  expect(mockCreateMLCEngine).toHaveBeenCalledTimes(2);
  expect(engine.getStatus()).toBe('ready');
});





it('stops notifying a listener after unsubscribe', async () => {
  mockWebGPU();

  const engine = new WebLLMEngine('test-model');
  const listener = vi.fn();

  const unsubscribe = engine.subscribeToStatus(listener);

  await engine.initialize();

  expect(listener).toHaveBeenCalledWith('loading');
  expect(listener).toHaveBeenCalledWith('ready');

  listener.mockClear();
  unsubscribe();

  await engine.dispose();

  expect(listener).not.toHaveBeenCalled();
});


it('does not notify subscribers when the status has not changed', async () => {
  const engine = new WebLLMEngine('test-model');
  const listener = vi.fn();

  engine.subscribeToStatus(listener);

  await engine.initialize();

  listener.mockClear();

  // The engine is already ready, so initializing again changes no status.
  await engine.initialize();

  expect(listener).not.toHaveBeenCalled();
});

it('continues notifying other listeners if one listener throws', async () => {
  const engine = new WebLLMEngine('test-model');
  const failingListener = vi.fn(() => {
    throw new Error('Listener failed');
  });
  const secondListener = vi.fn();
  const consoleError = vi
    .spyOn(console, 'error')
    .mockImplementation(() => {});

  engine.subscribeToStatus(failingListener);
  engine.subscribeToStatus(secondListener);

  try {
    await engine.initialize();

    expect(consoleError).toHaveBeenCalledWith(
      'AI status listener failed:',
      expect.any(Error),
    );
    expect(secondListener).toHaveBeenCalledWith('loading');
    expect(secondListener).toHaveBeenCalledWith('ready');
  } finally {
    consoleError.mockRestore();
  }
});


it('unloads the model even when generation fails during disposal', async () => {
  const model = createEngine();
  const engine = new WebLLMEngine('test-model');

  mockCreateMLCEngine.mockResolvedValueOnce(model);
  await engine.initialize();

  let rejectGeneration!: (error: Error) => void;

  model.chat.completions.create.mockReturnValueOnce(
    new Promise((_, reject) => {
      rejectGeneration = reject;
    }),
  );

  const generation = engine.generate({
    messages: [{ role: 'user', content: 'Test failure' }],
  });

  const disposal = engine.dispose();

  rejectGeneration(new Error('Generation failed'));

  await expect(generation).rejects.toThrow('Generation failed');
  await expect(disposal).resolves.toBeUndefined();

  expect(mockUnload).toHaveBeenCalledTimes(1);
  expect(engine.getStatus()).toBe('idle');
});


it('waits for pending initialization before completing disposal', async () => {
  const engine = new WebLLMEngine('test-model');

  let resolveInitialization!: (
    value: ReturnType<typeof createEngine>,
  ) => void;

  mockCreateMLCEngine.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveInitialization = resolve;
    }),
  );

  const initialization = engine.initialize();
  const disposal = engine.dispose();

  // Initialization has not completed, so disposal must wait.
  expect(mockUnload).not.toHaveBeenCalled();

  resolveInitialization(createEngine());

  await initialization;
  await disposal;

  expect(mockUnload).toHaveBeenCalledTimes(1);
  expect(engine.getStatus()).toBe('idle');
});

it('completes disposal when initialization fails and no engine exists', async () => {
  const engine = new WebLLMEngine('test-model');

  mockCreateMLCEngine.mockRejectedValueOnce(
    new Error('Initialization failed'),
  );

  await expect(engine.initialize()).rejects.toThrow(
    'Initialization failed',
  );

  await expect(engine.dispose()).resolves.toBeUndefined();

  expect(mockUnload).not.toHaveBeenCalled();
  expect(engine.getStatus()).toBe('idle');
});


});
