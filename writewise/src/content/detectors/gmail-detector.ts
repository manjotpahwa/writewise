import { UniversalTextDetector } from './universal-detector';

export class GmailDetector extends UniversalTextDetector {
  private mutationObserver: MutationObserver | null = null;

  constructor() {
    super('gmail');
    this.initializeGmailSpecific();
  }

  private initializeGmailSpecific(): void {
    // Wait for Gmail to load
    if (this.isGmailLoaded()) {
      this.setupGmailObserver();
      this.attachToExistingComposeBoxes();
    } else {
      this.waitForGmailLoad();
    }
  }

  private isGmailLoaded(): boolean {
    // Check if Gmail interface elements are present
    return document.querySelector('[data-message-id], .Ar.Au') !== null;
  }

  private waitForGmailLoad(): void {
    let attempts = 0;
    const maxAttempts = 50; // 25 seconds max wait time

    const checkInterval = setInterval(() => {
      attempts++;
      
      if (this.isGmailLoaded()) {
        clearInterval(checkInterval);
        this.setupGmailObserver();
        this.attachToExistingComposeBoxes();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('WriteWise: Gmail did not load within expected time');
      }
    }, 500);
  }

  private setupGmailObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;

      mutations.forEach((mutation) => {
        // Check for added nodes that might contain compose boxes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (this.isComposeRelatedElement(element)) {
              shouldCheck = true;
            }
          }
        });
      });

      if (shouldCheck) {
        // Debounce the check to avoid excessive processing
        setTimeout(() => this.attachToExistingComposeBoxes(), 500);
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private isComposeRelatedElement(element: Element): boolean {
    return element.querySelector('[contenteditable="true"]') !== null ||
           element.classList.contains('Am') || // Gmail compose window class
           element.querySelector('.Am') !== null ||
           element.innerHTML.includes('contenteditable');
  }

  private attachToExistingComposeBoxes(): void {
    const selectors = this.getGmailComposeSelectors();

    selectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(element => {
          const htmlElement = element as HTMLElement;
          if (this.isWritingElement(htmlElement) && !this.isAlreadyAttached(htmlElement)) {
            // Mark as attached to prevent duplicate processing
            htmlElement.setAttribute('data-writewise-attached', 'true');
            
            // Small delay to ensure Gmail's own initialization is complete
            setTimeout(() => {
              this.attachSuggestionUI(htmlElement);
            }, 100);
          }
        });
      } catch (error) {
        console.error('Error attaching to Gmail compose boxes:', error);
      }
    });
  }

  private getGmailComposeSelectors(): string[] {
    return [
      // Gmail compose message body (new interface)
      'div[contenteditable="true"][aria-label*="Message"]',
      'div[contenteditable="true"][aria-label*="message"]',
      
      // Gmail compose message body (legacy interface)
      'div[contenteditable="true"][dir="ltr"]',
      
      // Gmail reply/forward boxes
      'div[contenteditable="true"][role="textbox"]',
      
      // Gmail subject lines
      'input[name="subject"]',
      'input[aria-label*="Subject"]',
      
      // Chat/Hangouts integration
      '.editable[contenteditable="true"]',
      
      // Generic Gmail contenteditable elements
      '.Am.Al.editable[contenteditable="true"]',
      '.Ar.Au > div[contenteditable="true"]'
    ];
  }

  protected getTextElementSelectors(): string[] {
    return [
      ...super.getTextElementSelectors(),
      ...this.getGmailComposeSelectors()
    ];
  }

  private isAlreadyAttached(element: HTMLElement): boolean {
    return element.hasAttribute('data-writewise-attached') || super.isElementSupported(element);
  }

  protected isWritingElement(element: HTMLElement): boolean {
    // First check universal detection
    if (super.isWritingElement(element)) {
      return true;
    }

    // Gmail-specific checks
    if (!element) return false;

    // Check for Gmail compose elements
    const isGmailCompose = element.getAttribute('aria-label')?.toLowerCase().includes('message') ||
                          element.getAttribute('aria-label')?.toLowerCase().includes('subject') ||
                          element.closest('.Am') !== null || // Gmail compose window
                          element.closest('.Ar.Au') !== null; // Gmail message area

    // Exclude elements that are not meant for user input
    const isExcluded = element.getAttribute('aria-label')?.toLowerCase().includes('search') ||
                      element.closest('[role="search"]') !== null ||
                      element.classList.contains('gb_') || // Google bar elements
                      element.closest('.gb_') !== null;

    return isGmailCompose && !isExcluded;
  }

  protected isPlatformReady(): boolean {
    return this.isGmailLoaded();
  }

  public destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // Remove Gmail-specific attributes
    document.querySelectorAll('[data-writewise-attached]').forEach(element => {
      element.removeAttribute('data-writewise-attached');
    });

    super.destroy();
  }
}