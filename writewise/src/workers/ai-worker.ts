import { pipeline, env } from '@xenova/transformers';
import type { SuggestionData, WritingGoal, SuggestionContext } from '../shared/types';

// Configure environment for web worker
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

class AIWorker {
  private sentimentPipeline: any = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load lightweight sentiment analysis model
      this.sentimentPipeline = await pipeline(
        'sentiment-analysis',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
        {
          progress_callback: (progress: any) => {
            self.postMessage({
              type: 'progress',
              data: progress
            });
          }
        }
      );

      this.isInitialized = true;
      self.postMessage({
        type: 'initialized',
        data: { success: true }
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        data: { error: error.message }
      });
    }
  }

  async analyzeText(text: string, goal: WritingGoal, platform: string): Promise<SuggestionData | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Analyze sentiment
      const sentimentResult = await this.sentimentPipeline(text);
      
      // Generate suggestion based on goal and sentiment
      const suggestion = this.generateSuggestion(text, goal, platform, sentimentResult[0]);
      
      return suggestion;
    } catch (error) {
      console.error('Text analysis failed:', error);
      return null;
    }
  }

  private generateSuggestion(
    text: string, 
    goal: WritingGoal, 
    platform: string, 
    sentiment: { label: string; score: number }
  ): SuggestionData | null {
    // Basic heuristics for suggestion generation
    // In production, this would use more sophisticated AI models
    
    let suggestedText = text;
    let rationale = '';
    let needsSuggestion = false;

    // Apply goal-based transformations
    switch (goal.primary) {
      case 'confidence':
        if (this.hasWeakLanguage(text)) {
          suggestedText = this.makeMoreConfident(text);
          rationale = 'Made language more assertive and confident';
          needsSuggestion = true;
        }
        break;
        
      case 'clarity':
        if (this.hasComplexSentences(text)) {
          suggestedText = this.simplifySentences(text);
          rationale = 'Simplified sentence structure for better clarity';
          needsSuggestion = true;
        }
        break;
        
      case 'warmth':
        if (this.isTooFormal(text, platform)) {
          suggestedText = this.makeWarmer(text);
          rationale = 'Added warmth and personal touch';
          needsSuggestion = true;
        }
        break;
        
      case 'conciseness':
        if (this.isTooWordy(text)) {
          suggestedText = this.makeConcise(text);
          rationale = 'Removed unnecessary words for better conciseness';
          needsSuggestion = true;
        }
        break;
    }

    if (!needsSuggestion) {
      return null;
    }

    return {
      id: crypto.randomUUID(),
      originalText: text,
      suggestedText,
      rationale,
      platform: platform as any,
      goalCategory: goal.category,
      confidence: 0.8,
      timestamp: Date.now()
    };
  }

  private hasWeakLanguage(text: string): boolean {
    const weakPhrases = [
      'i think', 'maybe', 'perhaps', 'sort of', 'kind of',
      'i guess', 'might be', 'probably', 'i suppose'
    ];
    const lowerText = text.toLowerCase();
    return weakPhrases.some(phrase => lowerText.includes(phrase));
  }

  private makeMoreConfident(text: string): string {
    return text
      .replace(/I think /gi, 'I believe ')
      .replace(/Maybe /gi, 'Likely ')
      .replace(/Perhaps /gi, 'Potentially ')
      .replace(/sort of /gi, '')
      .replace(/kind of /gi, '')
      .replace(/I guess /gi, 'I expect ')
      .replace(/might be /gi, 'is likely ')
      .replace(/probably /gi, 'likely ')
      .replace(/I suppose /gi, 'I believe ');
  }

  private hasComplexSentences(text: string): boolean {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.some(sentence => {
      const words = sentence.trim().split(/\s+/).length;
      return words > 20; // Consider sentences with more than 20 words as complex
    });
  }

  private simplifySentences(text: string): string {
    // Basic sentence simplification
    return text
      .replace(/,\s*which\s+/gi, '. This ')
      .replace(/,\s*that\s+/gi, '. This ')
      .replace(/;\s*/g, '. ');
  }

  private isTooFormal(text: string, platform: string): boolean {
    if (platform === 'slack') {
      const formalPhrases = [
        'dear sir/madam', 'to whom it may concern', 'yours sincerely',
        'i would like to', 'please find attached', 'as per'
      ];
      const lowerText = text.toLowerCase();
      return formalPhrases.some(phrase => lowerText.includes(phrase));
    }
    return false;
  }

  private makeWarmer(text: string): string {
    return text
      .replace(/Dear Sir\/Madam/gi, 'Hi there')
      .replace(/To whom it may concern/gi, 'Hello')
      .replace(/I would like to/gi, 'I\'d love to')
      .replace(/Please find attached/gi, 'I\'ve attached')
      .replace(/As per/gi, 'Based on');
  }

  private isTooWordy(text: string): boolean {
    const wordyPhrases = [
      'in order to', 'due to the fact that', 'at this point in time',
      'for the purpose of', 'with regard to', 'in the event that'
    ];
    const lowerText = text.toLowerCase();
    return wordyPhrases.some(phrase => lowerText.includes(phrase));
  }

  private makeConcise(text: string): string {
    return text
      .replace(/in order to /gi, 'to ')
      .replace(/due to the fact that /gi, 'because ')
      .replace(/at this point in time /gi, 'now ')
      .replace(/for the purpose of /gi, 'to ')
      .replace(/with regard to /gi, 'about ')
      .replace(/in the event that /gi, 'if ');
  }
}

const aiWorker = new AIWorker();

self.onmessage = async function(e) {
  const { type, data, requestId } = e.data;

  try {
    switch (type) {
      case 'initialize':
        await aiWorker.initialize();
        break;

      case 'analyze':
        const result = await aiWorker.analyzeText(
          data.text,
          data.goal,
          data.platform
        );
        
        self.postMessage({
          type: 'result',
          requestId,
          data: result
        });
        break;

      default:
        self.postMessage({
          type: 'error',
          requestId,
          data: { error: 'Unknown message type' }
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId,
      data: { error: error.message }
    });
  }
};