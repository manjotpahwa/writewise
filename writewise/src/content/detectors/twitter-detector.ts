import { UniversalTextDetector } from './universal-detector';

export class TwitterDetector extends UniversalTextDetector {
  private mutationObserver: MutationObserver | null = null;

  constructor() {
    super('twitter');
    this.initializeTwitterSpecific();
  }

  private initializeTwitterSpecific(): void {
    if (this.isTwitterLoaded()) {
      this.setupTwitterObserver();
      this.attachToExistingElements();
    } else {
      this.waitForTwitterLoad();
    }
  }

  private isTwitterLoaded(): boolean {
    return document.querySelector('[data-testid="tweetTextarea_0"], .public-DraftEditor-content') !== null ||
           document.querySelector('[contenteditable="true"][aria-label*="Tweet"]') !== null;
  }

  private waitForTwitterLoad(): void {
    let attempts = 0;
    const maxAttempts = 40;

    const checkInterval = setInterval(() => {
      attempts++;
      
      if (this.isTwitterLoaded()) {
        clearInterval(checkInterval);
        this.setupTwitterObserver();
        this.attachToExistingElements();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('WriteWise: Twitter/X did not load within expected time');
      }
    }, 500);
  }

  private setupTwitterObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (this.isTwitterMessageElement(element)) {
              shouldCheck = true;
            }
          }
        });
      });

      if (shouldCheck) {
        setTimeout(() => this.attachToExistingElements(), 300);
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private isTwitterMessageElement(element: Element): boolean {
    return element.querySelector('[data-testid*="tweet"]') !== null ||
           element.classList.contains('public-DraftEditor-content') ||
           element.querySelector('.public-DraftEditor-content') !== null ||
           element.querySelector('[contenteditable="true"][aria-label*="Tweet"]') !== null ||
           element.querySelector('[data-testid="dmComposerTextInput"]') !== null;
  }

  private attachToExistingElements(): void {
    const selectors = this.getTwitterSelectors();

    selectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(element => {
          const htmlElement = element as HTMLElement;
          if (this.isWritingElement(htmlElement) && !this.isAlreadyAttached(htmlElement)) {
            htmlElement.setAttribute('data-writewise-attached', 'true');
            setTimeout(() => {
              this.attachSuggestionUI(htmlElement);
            }, 100);
          }
        });
      } catch (error) {
        console.error('Error attaching to Twitter elements:', error);
      }
    });
  }

  private getTwitterSelectors(): string[] {
    return [
      // Main tweet compose (new Twitter/X)
      '[data-testid="tweetTextarea_0"]',
      '[data-testid="tweetTextarea_1"]',
      
      // Tweet compose (legacy)
      '.public-DraftEditor-content[contenteditable="true"]',
      
      // Tweet with aria-label
      '[contenteditable="true"][aria-label*="Tweet"]',
      '[contenteditable="true"][aria-label*="Post"]',
      
      // Reply compose
      '[data-testid="tweetTextarea_0"][aria-label*="Reply"]',
      
      // DM compose
      '[data-testid="dmComposerTextInput"]',
      '[data-testid="dmComposerTextInput"] [contenteditable="true"]',
      
      // Quote tweet
      '[data-testid="tweetTextarea_0"][aria-label*="Quote"]',
      
      // Thread compose
      '[data-testid="tweetTextarea_1"]',
      '[data-testid="tweetTextarea_2"]',
      
      // Search
      'input[data-testid="SearchBox_Search_Input"]',
      
      // Bio editing
      '[data-testid="bioTextarea"]',
      
      // Spaces
      '[data-testid="spaces-create-title-input"]',
      
      // Generic Twitter inputs
      '.tweet-compose [contenteditable="true"]',
      '.compose-text [contenteditable="true"]',
      
      // Legacy selectors
      '.tweet-box[contenteditable="true"]',
      '#tweet-box-home-timeline',
      '.PublicDraftEditor-root'
    ];
  }

  protected getTextElementSelectors(): string[] {
    return [
      ...super.getTextElementSelectors(),
      ...this.getTwitterSelectors()
    ];
  }

  private isAlreadyAttached(element: HTMLElement): boolean {
    return element.hasAttribute('data-writewise-attached');
  }

  protected isWritingElement(element: HTMLElement): boolean {
    if (super.isWritingElement(element)) {
      return true;
    }

    if (!element) return false;

    // Twitter-specific checks
    const isTwitterInput = element.hasAttribute('data-testid') &&
                          (element.getAttribute('data-testid')?.includes('tweet') ||
                           element.getAttribute('data-testid')?.includes('dm') ||
                           element.getAttribute('data-testid')?.includes('bio')) ||
                          element.classList.contains('public-DraftEditor-content') ||
                          element.closest('.public-DraftEditor-content') !== null ||
                          element.getAttribute('aria-label')?.toLowerCase().includes('tweet') ||
                          element.getAttribute('aria-label')?.toLowerCase().includes('post') ||
                          element.getAttribute('aria-label')?.toLowerCase().includes('reply');

    // Exclude search and navigation elements
    const isExcluded = element.getAttribute('data-testid')?.includes('Search') ||
                      element.closest('[data-testid*="Search"]') !== null ||
                      element.closest('[role="navigation"]') !== null ||
                      element.closest('[aria-label*="Search"]') !== null;

    return isTwitterInput && !isExcluded;
  }

  protected isPlatformReady(): boolean {
    return this.isTwitterLoaded();
  }

  public destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    document.querySelectorAll('[data-writewise-attached]').forEach(element => {
      element.removeAttribute('data-writewise-attached');
    });

    super.destroy();
  }
}