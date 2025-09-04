import type { SuggestionData, WritingGoal } from './types';

export class LocalAIEngine {
  private worker: Worker | null = null;
  private isInitialized = false;
  private requestQueue = new Map<string, {
    resolve: (value: SuggestionData | null) => void;
    reject: (error: any) => void;
  }>();

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create worker from chrome extension URL
      const workerUrl = chrome.runtime.getURL('workers/ai-worker.js');
      this.worker = new Worker(workerUrl);
      
      this.setupWorkerHandlers();
      
      // Initialize the worker
      await this.sendWorkerMessage('initialize', {});
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AI engine:', error);
      throw error;
    }
  }

  private setupWorkerHandlers(): void {
    if (!this.worker) return;

    this.worker.onmessage = (e) => {
      const { type, data, requestId } = e.data;

      switch (type) {
        case 'progress':
          console.log('AI model loading progress:', data);
          break;

        case 'initialized':
          console.log('AI worker initialized successfully');
          break;

        case 'result':
          this.handleWorkerResult(requestId, data);
          break;

        case 'error':
          this.handleWorkerError(requestId, data.error);
          break;
      }
    };

    this.worker.onerror = (error) => {
      console.error('AI worker error:', error);
    };
  }

  private handleWorkerResult(requestId: string, result: SuggestionData | null): void {
    const pending = this.requestQueue.get(requestId);
    if (pending) {
      this.requestQueue.delete(requestId);
      pending.resolve(result);
    }
  }

  private handleWorkerError(requestId: string, error: string): void {
    const pending = this.requestQueue.get(requestId);
    if (pending) {
      this.requestQueue.delete(requestId);
      pending.reject(new Error(error));
    }
  }

  private sendWorkerMessage(type: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const requestId = crypto.randomUUID();
      this.requestQueue.set(requestId, { resolve, reject });

      this.worker.postMessage({ type, data, requestId });

      // Set timeout to prevent hanging requests
      setTimeout(() => {
        if (this.requestQueue.has(requestId)) {
          this.requestQueue.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  async generateSuggestion(
    text: string,
    goal: WritingGoal,
    platform: string
  ): Promise<SuggestionData | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (text.length < 10) {
      return null; // Skip very short text
    }

    try {
      const result = await this.sendWorkerMessage('analyze', {
        text,
        goal,
        platform
      });

      return result;
    } catch (error) {
      console.error('Failed to generate suggestion:', error);
      return null;
    }
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.requestQueue.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
export const aiEngine = new LocalAIEngine();