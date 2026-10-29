
import * as webllm from '@mlc-ai/web-llm';

import type {
  AIEngine,
  AIEngineStatus,
  AIModelInfo,
  AIGenerationRequest,
  AIGenerationResult,
} from '../types';

export class WebLLMEngine implements AIEngine {
  readonly model: AIModelInfo;

  private engine: webllm.MLCEngine | null = null;
  private status: AIEngineStatus = 'idle';
  private statusListeners = new Set<(status: AIEngineStatus) => void>();
  private initializationPromise: Promise<void> | null = null;
  private generationPromise: Promise<AIGenerationResult> | null = null;
  private disposalPromise: Promise<void> | null = null;
  private isGenerating(): boolean {
  return this.status === 'generating';
}

  constructor(modelId: string) {
    this.model = { id: modelId, name: modelId };
  }

  getStatus(): AIEngineStatus {
    return this.status;
  }

  subscribeToStatus(listener: (status: AIEngineStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: AIEngineStatus): void {
    if (this.status === status) return;
    this.status = status;

    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (error) {
        console.error('AI status listener failed:', error);
      }
    }
  }

  async initialize(): Promise<void> {
    if (this.disposalPromise) {
      await this.disposalPromise;
    }

    if (this.status === 'ready' && this.engine) return;
    if (this.initializationPromise) return this.initializationPromise;

    if (!navigator.gpu) {
      this.setStatus('unavailable');
      throw new Error('WebGPU is unavailable in this browser.');
    }

    this.setStatus('loading');

    const initialization = (async () => {
      try {
        const previousEngine = this.engine;
        this.engine = null;

        if (previousEngine) {
          await previousEngine.unload();
        }

        const newEngine = await webllm.CreateMLCEngine(this.model.id);
        this.engine = newEngine;
        this.setStatus('ready');
      } catch (error) {
        this.engine = null;
        this.setStatus('error');
        throw error;
      }
    })();

    this.initializationPromise = initialization;

    try {
      await initialization;
    } finally {
      if (this.initializationPromise === initialization) {
        this.initializationPromise = null;
      }
    }
  }

  async generate(
    request: AIGenerationRequest,
  ): Promise<AIGenerationResult> {
    if (this.disposalPromise) {
      throw new Error('AI engine is unloading. Please reload the model.');
    }

    const engine = this.engine;

    if (!engine || this.status !== 'ready') {
      throw new Error('AI engine is not ready. Please reload the model.');
    }

    if (request.messages.length === 0) {
      throw new Error('At least one message is required.');
    }

    this.setStatus('generating');

    const generation = (async (): Promise<AIGenerationResult> => {
      try {
        const response = await engine.chat.completions.create({
          messages: request.messages,
          temperature: request.options?.temperature ?? 0.7,
          max_tokens: request.options?.maxTokens ?? 512,
        });

        return {
          text: response.choices[0]?.message?.content ?? '',
        };
      } catch (error) {
         console.error('[Offmate AI] Generation failed:', error);
        // A failed completion may indicate that WebLLM lost its model.
        // Invalidate this engine so the next initialization creates a fresh one.
        if (this.engine === engine) {
          this.setStatus('error');
        }

        throw error;
      }
    })();

    this.generationPromise = generation;

    try {
      return await generation;
    } finally {
      if (this.generationPromise === generation) {
        this.generationPromise = null;
      }

      if (this.engine === engine && this.isGenerating()) {
  this.setStatus('ready');
}
    }
  }

  async dispose(): Promise<void> {
    if (this.disposalPromise) return this.disposalPromise;

    const disposal = (async () => {
      if (this.generationPromise) {
        await this.generationPromise.catch(() => undefined);
      }

      if (this.initializationPromise) {
        await this.initializationPromise.catch(() => undefined);
      }

      const engine = this.engine;
      this.engine = null;

      try {
        if (engine) {
          await engine.unload();
        }
      } finally {
        this.setStatus('idle');
      }
    })();

    this.disposalPromise = disposal;

    try {
      await disposal;
    } finally {
      if (this.disposalPromise === disposal) {
        this.disposalPromise = null;
      }
    }
  }
}
