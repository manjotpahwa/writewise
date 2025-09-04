import { aiEngine } from '../../shared/ai-engine';
import { StorageManager } from '../../shared/storage';
import { SuggestionUI } from '../components/SuggestionUI';
import type { SuggestionData, WritingGoal } from '../../shared/types';

export class UniversalTextDetector {
  private activeElements = new WeakMap<HTMLElement, SuggestionUI>();
  private debounceTimers = new WeakMap<HTMLElement, NodeJS.Timeout>();
  private storageManager = StorageManager.getInstance();
  private isEnabled = true;

  constructor(protected platform: string) {
    this.initializeDetection();
    this.loadPreferences();
  }

  private async loadPreferences(): Promise<void> {
    try {
      const preferences = await this.storageManager.getUserPreferences();
      this.isEnabled = preferences.platforms[this.platform]?.enabled ?? true;
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }

  protected initializeDetection(): void {
    // Monitor focus events for text inputs
    document.addEventListener('focusin', this.handleFocus.bind(this), true);
    
    // Monitor input events for text changes
    document.addEventListener('input', this.handleInput.bind(this), true);
    
    // Monitor click events to hide suggestions
    document.addEventListener('click', this.handleClick.bind(this), true);
    
    // Initialize existing elements
    setTimeout(() => this.scanForTextElements(), 1000);
  }

  private handleFocus(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (this.isWritingElement(target) && this.isEnabled) {
      this.attachSuggestionUI(target);
    }
  }

  private handleInput(event: Event): void {
    const target = event.target as HTMLElement;
    if (!this.isWritingElement(target) || !this.isEnabled) return;

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(target);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer for analysis (2 second delay)
    const timer = setTimeout(() => {
      this.analyzeText(target);
    }, 2000);

    this.debounceTimers.set(target, timer);
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Hide suggestions if clicking outside of suggestion UI
    if (!target.closest('.writewise-popup')) {
      this.hideAllSuggestions();
    }
  }

  private scanForTextElements(): void {
    const selectors = this.getTextElementSelectors();
    
    selectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(element => {
          const htmlElement = element as HTMLElement;
          if (this.isWritingElement(htmlElement) && !this.isAlreadyAttached(htmlElement)) {
            this.attachSuggestionUI(htmlElement);
          }
        });
      } catch (error) {
        // Ignore invalid selectors
      }
    });
  }

  protected getTextElementSelectors(): string[] {
    return [
      'input[type="text"]',
      'input[type="email"]',
      'textarea',
      '[contenteditable="true"]',
      '[role="textbox"]',
      '.notranslate[contenteditable="true"]'
    ];
  }

  protected isWritingElement(element: HTMLElement): boolean {
    if (!element) return false;

    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type')?.toLowerCase();
    const contentEditable = element.contentEditable;
    const role = element.getAttribute('role');

    // Check for text inputs
    if (tagName === 'input' && ['text', 'email', 'search'].includes(type || '')) {
      return true;
    }

    // Check for textareas
    if (tagName === 'textarea') {
      return true;
    }

    // Check for contenteditable elements
    if (contentEditable === 'true' || contentEditable === '') {
      return true;
    }

    // Check for role-based text elements
    if (role === 'textbox') {
      return true;
    }

    // Exclude password fields and other sensitive inputs
    if (type === 'password' || element.classList.contains('password')) {
      return false;
    }

    return false;
  }

  private isAlreadyAttached(element: HTMLElement): boolean {
    return this.activeElements.has(element);
  }

  private attachSuggestionUI(element: HTMLElement): void {
    if (this.activeElements.has(element)) return;

    try {
      const suggestionUI = new SuggestionUI(element, this.platform);
      this.activeElements.set(element, suggestionUI);
    } catch (error) {
      console.error('Failed to attach suggestion UI:', error);
    }
  }

  private async analyzeText(element: HTMLElement): Promise<void> {
    try {
      const text = this.extractText(element);
      
      if (text.length < 10 || text.length > 5000) {
        return; // Skip very short or very long text
      }

      // Check usage limits
      const canUse = await this.storageManager.incrementUsage();
      if (!canUse) {
        this.showUpgradePrompt(element);
        return;
      }

      // Get user goals
      const goals = await this.storageManager.getWritingGoals();
      
      // Generate suggestion
      const suggestion = await aiEngine.generateSuggestion(text, goals, this.platform);
      
      if (suggestion) {
        const suggestionUI = this.activeElements.get(element);
        if (suggestionUI) {
          suggestionUI.showSuggestion(suggestion);
          
          // Track analytics
          await this.storageManager.trackEvent('suggestion_generated', {
            platform: this.platform,
            textLength: text.length,
            goalCategory: goals.category,
            goalPrimary: goals.primary
          });
        }
      }
    } catch (error) {
      console.error('Text analysis failed:', error);
    }
  }

  private extractText(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'input' || tagName === 'textarea') {
      return (element as HTMLInputElement).value;
    }
    
    return element.textContent || element.innerText || '';
  }

  private showUpgradePrompt(element: HTMLElement): void {
    const suggestionUI = this.activeElements.get(element);
    if (suggestionUI) {
      suggestionUI.showUpgradePrompt();
    }
  }

  private hideAllSuggestions(): void {
    this.activeElements.forEach(ui => {
      ui.hide();
    });
  }

  // Platform-specific methods (to be overridden by subclasses)
  protected getPlatformSpecificSelectors(): string[] {
    return [];
  }

  protected isPlatformReady(): boolean {
    return true;
  }

  // Public methods
  public destroy(): void {
    // Clear all timers
    this.debounceTimers = new WeakMap();
    
    // Destroy all suggestion UIs
    this.activeElements.forEach(ui => {
      ui.destroy();
    });
    this.activeElements = new WeakMap();

    // Remove event listeners
    document.removeEventListener('focusin', this.handleFocus.bind(this), true);
    document.removeEventListener('input', this.handleInput.bind(this), true);
    document.removeEventListener('click', this.handleClick.bind(this), true);
  }

  public enable(): void {
    this.isEnabled = true;
    this.scanForTextElements();
  }

  public disable(): void {
    this.isEnabled = false;
    this.hideAllSuggestions();
  }

  public isElementSupported(element: HTMLElement): boolean {
    return this.isWritingElement(element);
  }
}