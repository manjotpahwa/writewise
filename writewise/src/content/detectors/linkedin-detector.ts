import { UniversalTextDetector } from './universal-detector';

export class LinkedInDetector extends UniversalTextDetector {
  private mutationObserver: MutationObserver | null = null;

  constructor() {
    super('linkedin');
    this.initializeLinkedInSpecific();
  }

  private initializeLinkedInSpecific(): void {
    if (this.isLinkedInLoaded()) {
      this.setupLinkedInObserver();
      this.attachToExistingElements();
    } else {
      this.waitForLinkedInLoad();
    }
  }

  private isLinkedInLoaded(): boolean {
    return document.querySelector('.ql-editor, .msg-form__contenteditable') !== null ||
           document.querySelector('[data-placeholder*="Start a post"]') !== null;
  }

  private waitForLinkedInLoad(): void {
    let attempts = 0;
    const maxAttempts = 40;

    const checkInterval = setInterval(() => {
      attempts++;
      
      if (this.isLinkedInLoaded()) {
        clearInterval(checkInterval);
        this.setupLinkedInObserver();
        this.attachToExistingElements();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('WriteWise: LinkedIn did not load within expected time');
      }
    }, 500);
  }

  private setupLinkedInObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (this.isLinkedInMessageElement(element)) {
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

  private isLinkedInMessageElement(element: Element): boolean {
    return element.classList.contains('ql-editor') ||
           element.querySelector('.ql-editor') !== null ||
           element.classList.contains('msg-form__contenteditable') ||
           element.querySelector('.msg-form__contenteditable') !== null ||
           element.querySelector('[data-placeholder*="post"]') !== null ||
           element.querySelector('[data-placeholder*="message"]') !== null;
  }

  private attachToExistingElements(): void {
    const selectors = this.getLinkedInSelectors();

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
        console.error('Error attaching to LinkedIn elements:', error);
      }
    });
  }

  private getLinkedInSelectors(): string[] {
    return [
      // Post creation
      '.ql-editor[contenteditable="true"]',
      '[data-placeholder*="Start a post"] [contenteditable="true"]',
      '.share-creation-state__text-editor [contenteditable="true"]',
      
      // Messaging
      '.msg-form__contenteditable[contenteditable="true"]',
      '.msg-form__msg-content-container [contenteditable="true"]',
      
      // Comments
      '.comments-comment-texteditor [contenteditable="true"]',
      
      // Article writing
      '.article-editor [contenteditable="true"]',
      
      // InMail
      '.inmail-compose-form [contenteditable="true"]',
      
      // Connection request
      '.connect-button-send-invite [contenteditable="true"]',
      
      // Profile editing
      '.profile-edit [contenteditable="true"]',
      '.summary-edit [contenteditable="true"]',
      
      // Job applications
      '.jobs-apply [contenteditable="true"]',
      
      // Search
      'input[placeholder*="Search"]',
      
      // Generic LinkedIn inputs
      '.editor-content [contenteditable="true"]',
      '.text-editor [contenteditable="true"]',
      
      // Legacy selectors
      '.share-box__input',
      '.compose-form__message-texteditor'
    ];
  }

  protected getTextElementSelectors(): string[] {
    return [
      ...super.getTextElementSelectors(),
      ...this.getLinkedInSelectors()
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

    // LinkedIn-specific checks
    const isLinkedInInput = element.classList.contains('ql-editor') ||
                           element.classList.contains('msg-form__contenteditable') ||
                           element.closest('.ql-editor') !== null ||
                           element.closest('.msg-form__contenteditable') !== null ||
                           element.closest('.share-creation-state__text-editor') !== null ||
                           element.closest('.comments-comment-texteditor') !== null ||
                           element.getAttribute('data-placeholder')?.toLowerCase().includes('post') ||
                           element.getAttribute('data-placeholder')?.toLowerCase().includes('message') ||
                           element.getAttribute('data-placeholder')?.toLowerCase().includes('comment');

    // Exclude search and navigation elements
    const isExcluded = element.closest('.search-global-typeahead') !== null ||
                      element.closest('.nav-search') !== null ||
                      element.closest('[role="navigation"]') !== null ||
                      element.getAttribute('data-placeholder')?.toLowerCase().includes('search') ||
                      element.classList.contains('search-global-typeahead__input');

    return isLinkedInInput && !isExcluded;
  }

  protected isPlatformReady(): boolean {
    return this.isLinkedInLoaded();
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