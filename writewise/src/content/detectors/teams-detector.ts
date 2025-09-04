import { UniversalTextDetector } from './universal-detector';

export class TeamsDetector extends UniversalTextDetector {
  private mutationObserver: MutationObserver | null = null;

  constructor() {
    super('teams');
    this.initializeTeamsSpecific();
  }

  private initializeTeamsSpecific(): void {
    if (this.isTeamsLoaded()) {
      this.setupTeamsObserver();
      this.attachToExistingElements();
    } else {
      this.waitForTeamsLoad();
    }
  }

  private isTeamsLoaded(): boolean {
    return document.querySelector('.cke_editable, [data-tid="ckeditor"]') !== null ||
           document.querySelector('.ts-message-compose-box') !== null;
  }

  private waitForTeamsLoad(): void {
    let attempts = 0;
    const maxAttempts = 40;

    const checkInterval = setInterval(() => {
      attempts++;
      
      if (this.isTeamsLoaded()) {
        clearInterval(checkInterval);
        this.setupTeamsObserver();
        this.attachToExistingElements();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('WriteWise: Teams did not load within expected time');
      }
    }, 500);
  }

  private setupTeamsObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (this.isTeamsMessageElement(element)) {
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

  private isTeamsMessageElement(element: Element): boolean {
    return element.classList.contains('cke_editable') ||
           element.querySelector('.cke_editable') !== null ||
           element.classList.contains('ts-message-compose-box') ||
           element.querySelector('.ts-message-compose-box') !== null ||
           element.querySelector('[data-tid="ckeditor"]') !== null;
  }

  private attachToExistingElements(): void {
    const selectors = this.getTeamsSelectors();

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
        console.error('Error attaching to Teams elements:', error);
      }
    });
  }

  private getTeamsSelectors(): string[] {
    return [
      // CKEditor instances
      '.cke_editable[contenteditable="true"]',
      '[data-tid="ckeditor"] [contenteditable="true"]',
      
      // Message compose box
      '.ts-message-compose-box [contenteditable="true"]',
      
      // Chat input
      '[data-tid="message-editor"] [contenteditable="true"]',
      
      // Reply input
      '[data-tid="reply-editor"] [contenteditable="true"]',
      
      // Channel post
      '[data-tid="channel-post-editor"] [contenteditable="true"]',
      
      // Meeting chat
      '[data-tid="meeting-chat-input"] [contenteditable="true"]',
      
      // Search box
      'input[data-tid="search-box"]',
      
      // Subject line
      'input[data-tid="subject-input"]',
      
      // Generic Teams inputs
      '.ui-box [contenteditable="true"]',
      '.fui-Input input',
      
      // Legacy selectors
      '#compose-text-area',
      '.compose-box-input'
    ];
  }

  protected getTextElementSelectors(): string[] {
    return [
      ...super.getTextElementSelectors(),
      ...this.getTeamsSelectors()
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

    // Teams-specific checks
    const isTeamsInput = element.classList.contains('cke_editable') ||
                        element.closest('.cke_editable') !== null ||
                        element.closest('[data-tid="ckeditor"]') !== null ||
                        element.closest('.ts-message-compose-box') !== null ||
                        element.hasAttribute('data-tid') &&
                        element.getAttribute('data-tid')?.includes('editor') ||
                        element.hasAttribute('data-tid') &&
                        element.getAttribute('data-tid')?.includes('input');

    // Exclude search and navigation elements
    const isExcluded = element.getAttribute('data-tid')?.includes('search') ||
                      element.closest('[data-tid*="search"]') !== null ||
                      element.closest('.fui-CommandBar') !== null ||
                      element.closest('[role="navigation"]') !== null;

    return isTeamsInput && !isExcluded;
  }

  protected isPlatformReady(): boolean {
    return this.isTeamsLoaded();
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