import { offmateAI } from './engine';
import { WebLLMEngine } from './providers/web-llm';

const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

let initializationPromise: Promise<void> | null = null;
let lifecyclePromise: Promise<void> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

const AI_IDLE_TIMEOUT = 5 * 60 * 1000;

export function setupLocalAI(): void {
  // Register a factory instead of a static instance so it can recreate itself after unloading
  offmateAI.registerEngineFactory(() => new WebLLMEngine(MODEL_ID));
}

function clearAIIdleTimer(): void {
  if (idleTimer !== null) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

export function resetAIIdleTimer(): void {
  clearAIIdleTimer();

  if (offmateAI.getStatus() !== 'ready') return;

  idleTimer = setTimeout(() => {
    idleTimer = null;

    // Fixed: check status and do not use recursive calls
    if (offmateAI.getStatus() === 'generating') {
      resetAIIdleTimer(); // Or let generation finish handle it, but with check
      return;
    }

    void unloadLocalAI().catch((error) => {
      console.error('Failed to unload AI model:', error);
    });
  }, AI_IDLE_TIMEOUT);
}

export async function initializeLocalAI(): Promise<void> {
  setupLocalAI();

  if (lifecyclePromise) {
    await lifecyclePromise;
  }

  if (offmateAI.getStatus() === 'ready') {
    resetAIIdleTimer();
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  clearAIIdleTimer();

  const initialization = (async () => {
    try {
      await offmateAI.initialize();
      resetAIIdleTimer();
    } catch (error) {
      console.error('Initialization error, resetting engine state:', error);
      await unloadLocalAI();
      throw error;
    }
  })();

  initializationPromise = initialization;

  try {
    await initialization;
  } finally {
    if (initializationPromise === initialization) {
      initializationPromise = null;
    }
  }
}

export async function unloadLocalAI(): Promise<void> {
  clearAIIdleTimer();

  if (lifecyclePromise) {
    return lifecyclePromise;
  }

  if (offmateAI.getStatus() === 'generating') {
    resetAIIdleTimer();
    return;
  }

  const lifecycle = (async () => {
    if (initializationPromise) {
      await initializationPromise;
    }

    if (offmateAI.getStatus() === 'generating') {
      resetAIIdleTimer();
      return;
    }

    await offmateAI.unload();
  })();

  lifecyclePromise = lifecycle;

  try {
    await lifecycle;
  } finally {
    if (lifecyclePromise === lifecycle) {
      lifecyclePromise = null;
    }
  }
}