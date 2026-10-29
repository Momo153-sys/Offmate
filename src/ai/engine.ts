import type {
  AIEngine,
  AIEngineStatus,
  AIGenerationRequest,
  AIGenerationResult,
} from './types';

export class OffmateAI {
  private engine: AIEngine | null = null;
  private engineFactory: (() => AIEngine) | null = null;
  private hasBeenRegistered: boolean = false;
  private isDisposed: boolean = false;

  // Allow passing a factory function so we can recreate the engine fresh when needed
  registerEngineFactory(factory: () => AIEngine): void {
    this.engineFactory = factory;
    this.hasBeenRegistered = true;
    this.isDisposed = false;
  }

  registerEngine(engine: AIEngine): void {
    this.engine = engine;
    this.hasBeenRegistered = true;
    this.isDisposed = false;

  }

  getStatus(): AIEngineStatus {
    if (!this.engine) {
      // If disposed, it's unavailable. If just unloaded, it's idle.
      if (this.isDisposed) return 'unavailable';
      return this.hasBeenRegistered ? 'idle' : 'unavailable';
    }
    return this.engine.getStatus();
  }

  async initialize(): Promise<void> {
    if (this.isDisposed && !this.engineFactory) {
      throw new Error('AI engine has been disposed and no factory is available.');
    }

    if (!this.engine && this.engineFactory) {
      this.engine = this.engineFactory();
      this.isDisposed = false;
    }

    if (!this.engine) {
      throw new Error('No AI engine has been registered.');
    }

    try {
      await this.engine.initialize();
    } catch (error) {
      this.engine = null;
      throw error;
    }
  }

  subscribeToStatus(
    listener: (status: AIEngineStatus) => void,
  ): () => void {
    if (!this.engine) {
      return () => {};
    }
    return this.engine.subscribeToStatus(listener);
  }

  async generate(
    request: AIGenerationRequest,
  ): Promise<AIGenerationResult> {
    if (!this.engine || this.engine.getStatus() !== 'ready') {
      throw new Error('AI engine is not ready.');
    }

    if (request.messages.length === 0) {
      throw new Error('At least one message is required.');
    }

    try {
      return await this.engine.generate(request);
    } catch (error) {
      // Catch runtime GPU loss / disposal errors during generation
      if (String(error).includes('disposed') || String(error).includes('Device was lost')) {
        this.engine = null; // Force clean reset
      }
      throw error;
    }
  }

  async unload(): Promise<void> {
    if (!this.engine) return;
    try {
      await this.engine.dispose();
    } finally {
      this.engine = null; // Unloaded keeps factory ready, status becomes 'idle'
    }
  }

  async dispose(): Promise<void> {
    if (this.engine) {
      await this.engine.dispose();
    }
    this.engine = null;
    this.engineFactory = null; // Clear factory so it's fully gone
    this.isDisposed = true;    // Status becomes 'unavailable'
  }
}

export const offmateAI = new OffmateAI();