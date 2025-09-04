import { UniversalTextDetector } from './universal-detector';

export class SlackDetector extends UniversalTextDetector {
  private mutationObserver: MutationObserver | null = null;

  constructor() {
    super('slack');
    this.initializeSlackSpecific();
  }

  private initializeSlackSpecific(): void {
    // Wait for Slack to load
    if (this.isSlackLoaded()) {
      this.setupSlackObserver();
      this.attachToExistingElements();
    } else {
      this.waitForSlackLoad();
    }
  }

  private isSlackLoaded(): boolean {
    return document.querySelector('.p-workspace, .ql-editor') !== null;
  }

  private waitForSlackLoad(): void {
    let attempts = 0;
    const maxAttempts = 40;

    const checkInterval = setInterval(() => {
      attempts++;
      
      if (this.isSlackLoaded()) {
        clearInterval(checkInterval);
        this.setupSlackObserver();
        this.attachToExistingElements();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('WriteWise: Slack did not load within expected time');
      }
    }, 500);
  }

  private setupSlackObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (this.isSlackMessageElement(element)) {
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

  private isSlackMessageElement(element: Element): boolean {
    return element.classList.contains('ql-editor') ||
           element.querySelector('.ql-editor') !== null ||
           element.classList.contains('c-texty_input') ||
           element.querySelector('.c-texty_input') !== null ||
           element.querySelector('[data-qa="message_input"]') !== null;
  }

  private attachToExistingElements(): void {
    const selectors = this.getSlackSelectors();

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
        console.error('Error attaching to Slack elements:', error);
      }
    });
  }

  private getSlackSelectors(): string[] {
    return [
      // Quill editor (main message input)
      '.ql-editor[contenteditable="true"]',
      '.ql-editor p',
      
      // Message input areas
      '[data-qa="message_input"]',
      '.c-texty_input[contenteditable="true"]',
      
      // Thread replies
      '[data-qa="message_input_thread"]',
      
      // DM input
      '[data-qa="dm_input"]',
      
      // Search input
      '[data-qa="top_nav_search"]',
      
      // Channel description
      '[data-qa="channel_description_input"]',
      
      // Canvas editing
      '.c-wysiwyg_container [contenteditable="true"]',
      
      // Legacy inputs
      '#message-input',
      '.msg_input_txt'
    ];
  }

  protected getTextElementSelectors(): string[] {
    return [
      ...super.getTextElementSelectors(),
      ...this.getSlackSelectors()
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

    // Slack-specific checks
    const isSlackInput = element.classList.contains('ql-editor') ||
                        element.classList.contains('c-texty_input') ||
                        element.hasAttribute('data-qa') && 
                        element.getAttribute('data-qa')?.includes('input') ||
                        element.closest('.ql-editor') !== null ||
                        element.closest('[data-qa*="input"]') !== null;

    // Exclude search and other non-message inputs
    const isExcluded = element.getAttribute('data-qa')?.includes('search') ||
                      element.closest('[data-qa*="search"]') !== null ||
                      element.classList.contains('c-search_modal__input') ||
                      element.closest('.c-search_modal__input') !== null;

    return isSlackInput && !isExcluded;
  }

  protected isPlatformReady(): boolean {
    return this.isSlackLoaded();
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