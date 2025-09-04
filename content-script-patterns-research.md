# Content Script Patterns for Writing Assistance Tools

## Executive Summary

This research document provides comprehensive patterns and techniques for building writing assistance browser extensions that work across major platforms including Gmail, Slack, Microsoft Teams, LinkedIn, Twitter/X, and other dynamic web applications. The focus is on robust DOM manipulation, performance optimization, and non-intrusive user experience patterns.

## Platform-Specific Integration Patterns

### Gmail Compose Box Detection

**DOM Selectors:**
```javascript
// Primary compose box selector
const gmailComposeSelectors = [
  'div[contenteditable="true"][role="textbox"]',
  '.editable[contenteditable="true"]',
  'div[aria-label*="Message Body"]',
  'div[data-message-id] div[contenteditable="true"]'
];

// Backup selectors for different Gmail interfaces
const gmailFallbackSelectors = [
  '.Am.Al.editable',
  '.ii.gt div[contenteditable]',
  'div[aria-describedby*="compose"]'
];
```

**Implementation Pattern:**
```javascript
// Gmail integration using InboxSDK (recommended)
InboxSDK.load(2, 'your-app-id').then(function(sdk) {
  sdk.Compose.registerComposeViewHandler(function(composeView) {
    const bodyElement = composeView.getBodyElement();
    // Attach writing assistance UI
    addWritingAssistanceUI(bodyElement);
  });
});

// Alternative DOM-based approach
function detectGmailCompose() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      const addedNodes = Array.from(mutation.addedNodes);
      addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const composeBox = node.querySelector(gmailComposeSelectors.join(', '));
          if (composeBox) {
            initializeWritingAssistance(composeBox);
          }
        }
      });
    });
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
}
```

**Text Extraction:**
```javascript
function extractGmailText(composeElement) {
  // Handle both plain text and rich text content
  if (composeElement.textContent) {
    return composeElement.textContent.trim();
  }
  // Fallback for rich content
  return composeElement.innerText || '';
}
```

### Slack Message Input Integration

**DOM Selectors:**
```javascript
const slackSelectors = [
  '.ql-editor[contenteditable="true"][role="textbox"]',
  'div[data-qa="message-input"]',
  'div[aria-label*="Message"]',
  '.p-message_input .ql-editor'
];

// Additional context selectors
const slackContextSelectors = [
  '[data-qa="message-input-container"]',
  '.p-message_input_field',
  '.c-texty_input'
];
```

**Integration Challenges:**
```javascript
// Slack uses Quill.js editor - special handling required
function handleSlackQuillEditor(element) {
  // Get Quill instance if available
  const quillInstance = element.__quill;
  
  if (quillInstance) {
    // Work with Quill API
    const text = quillInstance.getText();
    const delta = quillInstance.getContents();
    
    // Listen for text changes
    quillInstance.on('text-change', (delta, oldDelta, source) => {
      if (source === 'user') {
        handleTextChange(quillInstance.getText());
      }
    });
  } else {
    // Fallback to DOM observation
    observeContentChanges(element);
  }
}
```

**Performance Optimization:**
```javascript
// Debounced text analysis for Slack
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

const analyzeslackText = debounce((text) => {
  // Perform writing assistance analysis
  analyzeWriting(text);
}, 300);
```

### Microsoft Teams Message Input

**DOM Selectors:**
```javascript
const teamsSelectors = [
  'div[contenteditable="true"][role="textbox"]',
  '.ck-editor__editable',
  'div[aria-label*="Type a message"]',
  'div[data-tid="ckeditor-new-message"]'
];

// CKEditor specific selectors
const ckeditorSelectors = [
  '.ck-editor .ck-editor__editable',
  '[contenteditable="true"].ck-editor__editable'
];
```

**CKEditor Integration:**
```javascript
function handleTeamsCKEditor(element) {
  // Teams uses CKEditor - check for editor instance
  if (element.ckeditorInstance) {
    const editor = element.ckeditorInstance;
    
    // Listen for content changes
    editor.model.document.on('change:data', () => {
      const text = editor.getData();
      handleTextAnalysis(text);
    });
  } else {
    // Fallback to mutation observer
    observeContentChanges(element);
  }
}

// Handle iframe contexts in Teams
function handleTeamsIframes() {
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const messageInput = iframeDoc.querySelector(teamsSelectors.join(', '));
      if (messageInput) {
        handleTeamsCKEditor(messageInput);
      }
    } catch (e) {
      // Cross-origin iframe - can't access
      console.log('Cannot access iframe content due to CORS policy');
    }
  });
}
```

### LinkedIn Post/Message Composition

**DOM Selectors:**
```javascript
const linkedinSelectors = [
  // Post composition
  'div[contenteditable="true"][data-placeholder*="Start a post"]',
  '.ql-editor[contenteditable="true"]',
  
  // Message composition
  'div[aria-label*="Write a message"]',
  '.msg-form__contenteditable',
  
  // Comment areas
  'div[contenteditable="true"][data-placeholder*="Add a comment"]'
];
```

**Dynamic Content Detection:**
```javascript
function detectLinkedInCompose() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        const target = mutation.target;
        
        // Check for LinkedIn compose areas
        linkedinSelectors.forEach(selector => {
          const elements = target.querySelectorAll(selector);
          elements.forEach(element => {
            if (!element.hasWritingAssistance) {
              initializeWritingAssistance(element);
              element.hasWritingAssistance = true;
            }
          });
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
```

### Twitter/X Compose Interface

**DOM Selectors:**
```javascript
const twitterSelectors = [
  // Main tweet compose
  'div[contenteditable="true"][data-testid="tweetTextarea_0"]',
  'div[role="textbox"][data-testid="tweetTextarea_0"]',
  
  // Reply compose
  'div[contenteditable="true"][data-testid*="tweetTextarea"]',
  
  // DM compose
  'div[contenteditable="true"][data-testid="dmComposerTextInput"]',
  
  // Generic fallbacks
  'div[contenteditable="true"][aria-label*="Tweet text"]',
  'div[contenteditable="true"][placeholder*="What is happening"]'
];
```

**React SPA Handling:**
```javascript
function handleTwitterSPA() {
  let currentPath = window.location.pathname;
  
  // Listen for route changes in React SPA
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== currentPath) {
      currentPath = window.location.pathname;
      // Re-initialize when navigating
      setTimeout(initializeTwitterCompose, 100);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Initial setup
  initializeTwitterCompose();
}

function initializeTwitterCompose() {
  twitterSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (!element.hasWritingAssistance) {
        attachWritingTools(element);
        element.hasWritingAssistance = true;
      }
    });
  });
}
```

## Universal Text Detection Patterns

### MutationObserver for Dynamic Content

**Comprehensive Observer Setup:**
```javascript
class UniversalTextDetector {
  constructor(options = {}) {
    this.options = {
      debounceDelay: 300,
      maxNodes: 1000,
      ...options
    };
    
    this.observer = null;
    this.processedNodes = new WeakSet();
    this.debouncedHandler = this.debounce(this.handleMutations.bind(this), this.options.debounceDelay);
  }
  
  start() {
    this.observer = new MutationObserver(this.debouncedHandler);
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['contenteditable', 'role', 'aria-label']
    });
  }
  
  handleMutations(mutations) {
    const textElements = new Set();
    
    mutations.forEach(mutation => {
      // Handle added nodes
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          this.findTextElements(node, textElements);
        });
      }
      
      // Handle attribute changes that might create text inputs
      if (mutation.type === 'attributes') {
        if (this.isTextElement(mutation.target)) {
          textElements.add(mutation.target);
        }
      }
      
      // Handle text content changes
      if (mutation.type === 'characterData') {
        const textNode = mutation.target;
        const parentElement = textNode.parentElement;
        if (parentElement && this.isTextElement(parentElement)) {
          textElements.add(parentElement);
        }
      }
    });
    
    // Process found elements
    textElements.forEach(element => {
      if (!this.processedNodes.has(element)) {
        this.initializeElement(element);
        this.processedNodes.add(element);
      }
    });
  }
  
  findTextElements(node, results) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    // Check current node
    if (this.isTextElement(node)) {
      results.add(node);
    }
    
    // Recursively check children
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (element) => {
          return this.isTextElement(element) ? 
            NodeFilter.FILTER_ACCEPT : 
            NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    let element;
    while (element = walker.nextNode()) {
      results.add(element);
    }
  }
  
  isTextElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    
    // Check for contenteditable
    if (element.contentEditable === 'true') return true;
    
    // Check for input/textarea
    if (['INPUT', 'TEXTAREA'].includes(element.tagName)) {
      const type = element.type?.toLowerCase();
      return !type || ['text', 'email', 'password', 'search', 'url'].includes(type);
    }
    
    // Check for role textbox
    if (element.getAttribute('role') === 'textbox') return true;
    
    // Check for common text area patterns
    const ariaLabel = element.getAttribute('aria-label') || '';
    const placeholder = element.getAttribute('placeholder') || '';
    const className = element.className || '';
    
    const textPatterns = [
      /message|compose|write|text|input|comment|post|reply|chat/i
    ];
    
    return textPatterns.some(pattern => 
      pattern.test(ariaLabel) || 
      pattern.test(placeholder) || 
      pattern.test(className)
    );
  }
  
  initializeElement(element) {
    // Add writing assistance to detected text element
    this.addWritingAssistance(element);
  }
  
  debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
}
```

### Cross-Platform Compatibility

**Manifest V3 Content Script Configuration:**
```json
{
  "manifest_version": 3,
  "content_scripts": [
    {
      "matches": [
        "*://mail.google.com/*",
        "*://*.slack.com/*",
        "*://teams.microsoft.com/*",
        "*://www.linkedin.com/*",
        "*://linkedin.com/*",
        "*://twitter.com/*",
        "*://x.com/*",
        "*://*/*"
      ],
      "js": ["content-script.js"],
      "run_at": "document_end",
      "all_frames": true
    }
  ],
  "permissions": [
    "activeTab",
    "storage"
  ],
  "web_accessible_resources": [
    {
      "resources": ["overlay.html", "styles.css"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

**Cross-Browser API Compatibility:**
```javascript
// Universal API wrapper for cross-browser compatibility
const BrowserAPI = {
  runtime: typeof browser !== 'undefined' ? browser.runtime : chrome.runtime,
  storage: typeof browser !== 'undefined' ? browser.storage : chrome.storage,
  tabs: typeof browser !== 'undefined' ? browser.tabs : chrome.tabs
};

// Promise wrapper for Chrome APIs
function promisify(fn, context) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn.call(context, ...args, (result) => {
        if (BrowserAPI.runtime.lastError) {
          reject(new Error(BrowserAPI.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
  };
}
```

## Text Highlighting and Suggestion Overlay Techniques

### Performance-Optimized Highlighting

**Shadow DOM Isolation:**
```javascript
class WritingAssistanceOverlay {
  constructor(targetElement) {
    this.targetElement = targetElement;
    this.shadowRoot = null;
    this.overlayContainer = null;
    this.suggestions = [];
  }
  
  initialize() {
    // Create shadow DOM for style isolation
    this.shadowRoot = this.targetElement.attachShadow({ mode: 'closed' });
    
    // Create overlay container
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.className = 'writing-assistance-overlay';
    
    // Add isolated styles
    const styles = document.createElement('style');
    styles.textContent = `
      .writing-assistance-overlay {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 999999;
      }
      
      .suggestion-highlight {
        position: absolute;
        background: rgba(255, 193, 7, 0.3);
        border-bottom: 2px solid #ffc107;
        border-radius: 2px;
        pointer-events: auto;
        cursor: pointer;
      }
      
      .suggestion-tooltip {
        position: absolute;
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      }
    `;
    
    this.shadowRoot.appendChild(styles);
    this.shadowRoot.appendChild(this.overlayContainer);
  }
  
  highlightText(ranges) {
    // Clear existing highlights
    this.overlayContainer.innerHTML = '';
    
    ranges.forEach((range, index) => {
      const rect = range.getBoundingClientRect();
      const targetRect = this.targetElement.getBoundingClientRect();
      
      const highlight = document.createElement('div');
      highlight.className = 'suggestion-highlight';
      highlight.style.left = `${rect.left - targetRect.left}px`;
      highlight.style.top = `${rect.top - targetRect.top}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;
      
      highlight.addEventListener('click', () => {
        this.showSuggestion(index, rect);
      });
      
      this.overlayContainer.appendChild(highlight);
    });
  }
  
  showSuggestion(index, rect) {
    const suggestion = this.suggestions[index];
    if (!suggestion) return;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'suggestion-tooltip';
    tooltip.textContent = suggestion.text;
    
    // Position tooltip
    const targetRect = this.targetElement.getBoundingClientRect();
    tooltip.style.left = `${rect.left - targetRect.left}px`;
    tooltip.style.top = `${rect.bottom - targetRect.top + 5}px`;
    
    this.overlayContainer.appendChild(tooltip);
    
    // Auto-remove tooltip after delay
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    }, 3000);
  }
}
```

**Efficient Range Detection:**
```javascript
function findTextRanges(element, patterns) {
  const ranges = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let textNode;
  while (textNode = walker.nextNode()) {
    const text = textNode.textContent;
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const range = document.createRange();
        range.setStart(textNode, match.index);
        range.setEnd(textNode, match.index + match[0].length);
        
        ranges.push({
          range,
          suggestion: pattern.suggestion,
          type: pattern.type
        });
        
        // Prevent infinite loop for global regexes
        if (!pattern.regex.global) break;
      }
    });
  }
  
  return ranges;
}
```

### Non-Intrusive User Experience

**Contextual Suggestion Timing:**
```javascript
class ContextualWritingAssistant {
  constructor(element) {
    this.element = element;
    this.isTyping = false;
    this.typingTimer = null;
    this.lastAnalysis = '';
    this.analysisDelay = 1000; // Wait 1 second after typing stops
  }
  
  initialize() {
    this.element.addEventListener('input', this.handleInput.bind(this));
    this.element.addEventListener('focus', this.handleFocus.bind(this));
    this.element.addEventListener('blur', this.handleBlur.bind(this));
    this.element.addEventListener('keydown', this.handleKeydown.bind(this));
  }
  
  handleInput(event) {
    this.isTyping = true;
    clearTimeout(this.typingTimer);
    
    // Debounce analysis until user stops typing
    this.typingTimer = setTimeout(() => {
      this.isTyping = false;
      this.analyzeText();
    }, this.analysisDelay);
  }
  
  handleKeydown(event) {
    // Hide suggestions on certain keys
    if (['Escape', 'Enter', 'Tab'].includes(event.key)) {
      this.hideSuggestions();
    }
  }
  
  analyzeText() {
    const currentText = this.getElementText();
    
    // Only analyze if text has changed significantly
    if (this.textSimilarity(currentText, this.lastAnalysis) < 0.8) {
      this.performAnalysis(currentText);
      this.lastAnalysis = currentText;
    }
  }
  
  textSimilarity(str1, str2) {
    // Simple similarity check
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}
```

## Performance Optimization Strategies

### Lazy Loading and Resource Management

**Memory-Efficient Pattern Detection:**
```javascript
class MemoryEfficientAnalyzer {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 100;
    this.analysisWorker = null;
  }
  
  async analyzeText(text, options = {}) {
    const cacheKey = this.getCacheKey(text, options);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // Use Web Worker for heavy analysis
    const result = await this.analyzeInWorker(text, options);
    
    // Cache with LRU eviction
    this.cacheResult(cacheKey, result);
    
    return result;
  }
  
  analyzeInWorker(text, options) {
    return new Promise((resolve, reject) => {
      if (!this.analysisWorker) {
        this.analysisWorker = new Worker('/analysis-worker.js');
      }
      
      const messageId = Date.now() + Math.random();
      
      const handleMessage = (event) => {
        if (event.data.id === messageId) {
          this.analysisWorker.removeEventListener('message', handleMessage);
          resolve(event.data.result);
        }
      };
      
      this.analysisWorker.addEventListener('message', handleMessage);
      this.analysisWorker.postMessage({
        id: messageId,
        text,
        options
      });
    });
  }
  
  cacheResult(key, result) {
    // Implement LRU cache
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, result);
  }
}
```

**Analysis Worker (analysis-worker.js):**
```javascript
// Web Worker for heavy text analysis
self.addEventListener('message', function(event) {
  const { id, text, options } = event.data;
  
  // Perform analysis without blocking main thread
  const result = performTextAnalysis(text, options);
  
  self.postMessage({
    id,
    result
  });
});

function performTextAnalysis(text, options) {
  // Grammar checking
  const grammarIssues = checkGrammar(text);
  
  // Style suggestions
  const styleIssues = checkStyle(text);
  
  // Tone analysis
  const toneAnalysis = analyzeTone(text);
  
  return {
    grammarIssues,
    styleIssues,
    toneAnalysis,
    processedAt: Date.now()
  };
}
```

### Throttling and Batching

**Request Batching for API Calls:**
```javascript
class BatchedAnalysisManager {
  constructor() {
    this.pendingRequests = [];
    this.batchTimeout = null;
    this.batchDelay = 500;
    this.maxBatchSize = 10;
  }
  
  requestAnalysis(text, callback) {
    this.pendingRequests.push({ text, callback });
    
    // Process immediately if batch is full
    if (this.pendingRequests.length >= this.maxBatchSize) {
      this.processBatch();
    } else {
      // Otherwise, wait for more requests
      clearTimeout(this.batchTimeout);
      this.batchTimeout = setTimeout(() => {
        this.processBatch();
      }, this.batchDelay);
    }
  }
  
  async processBatch() {
    if (this.pendingRequests.length === 0) return;
    
    const batch = this.pendingRequests.splice(0);
    clearTimeout(this.batchTimeout);
    
    try {
      const results = await this.analyzeTextBatch(
        batch.map(req => req.text)
      );
      
      // Distribute results back to callbacks
      batch.forEach((request, index) => {
        request.callback(results[index]);
      });
    } catch (error) {
      // Handle batch failure
      batch.forEach(request => {
        request.callback({ error: error.message });
      });
    }
  }
  
  async analyzeTextBatch(texts) {
    // Implement actual batch analysis
    return texts.map(text => this.analyzeSingleText(text));
  }
}
```

## Security Considerations

### Content Security Policy Compliance

**CSP-Safe Implementation:**
```javascript
// Avoid inline styles and scripts
class CSPCompliantOverlay {
  constructor() {
    this.styles = null;
    this.initialized = false;
  }
  
  async initialize() {
    if (this.initialized) return;
    
    // Load styles from extension resources
    const styleUrl = chrome.runtime.getURL('overlay-styles.css');
    await this.injectStylesheet(styleUrl);
    
    this.initialized = true;
  }
  
  injectStylesheet(url) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = resolve;
      link.onerror = reject;
      
      document.head.appendChild(link);
    });
  }
  
  createOverlay(element) {
    // Use classes instead of inline styles
    const overlay = document.createElement('div');
    overlay.className = 'writing-assistance-overlay';
    
    // Add to shadow DOM for isolation
    const shadow = element.attachShadow({ mode: 'closed' });
    shadow.appendChild(overlay);
    
    return overlay;
  }
}
```

### Data Privacy Patterns

**Local-First Analysis:**
```javascript
class PrivacyFriendlyAnalyzer {
  constructor() {
    this.localAnalysisEnabled = true;
    this.cloudAnalysisEnabled = false;
    this.sensitiveDataPatterns = [
      /\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b/, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
    ];
  }
  
  async analyzeText(text) {
    // Check for sensitive data
    if (this.containsSensitiveData(text)) {
      // Use only local analysis
      return this.analyzeLocally(text);
    }
    
    // Use preferred analysis method
    if (this.localAnalysisEnabled) {
      return this.analyzeLocally(text);
    } else if (this.cloudAnalysisEnabled) {
      return this.analyzeWithCloud(text);
    }
  }
  
  containsSensitiveData(text) {
    return this.sensitiveDataPatterns.some(pattern => pattern.test(text));
  }
  
  analyzeLocally(text) {
    // Implement local analysis algorithms
    return {
      source: 'local',
      analysis: this.performLocalAnalysis(text)
    };
  }
}
```

## Testing and Quality Assurance

### Cross-Platform Testing Framework

**Automated Testing Pattern:**
```javascript
class ContentScriptTester {
  constructor() {
    this.testResults = [];
    this.platforms = [
      { name: 'Gmail', url: 'https://mail.google.com', selectors: gmailSelectors },
      { name: 'Slack', url: 'https://app.slack.com', selectors: slackSelectors },
      { name: 'Teams', url: 'https://teams.microsoft.com', selectors: teamsSelectors },
      { name: 'LinkedIn', url: 'https://linkedin.com', selectors: linkedinSelectors },
      { name: 'Twitter', url: 'https://twitter.com', selectors: twitterSelectors }
    ];
  }
  
  async runTests() {
    for (const platform of this.platforms) {
      const results = await this.testPlatform(platform);
      this.testResults.push({
        platform: platform.name,
        results
      });
    }
    
    return this.testResults;
  }
  
  async testPlatform(platform) {
    const results = [];
    
    // Test selector detection
    for (const selector of platform.selectors) {
      const elements = document.querySelectorAll(selector);
      results.push({
        selector,
        found: elements.length > 0,
        count: elements.length,
        elements: Array.from(elements).map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id
        }))
      });
    }
    
    return results;
  }
  
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      platforms: this.testResults,
      summary: this.generateSummary()
    };
    
    console.table(report.summary);
    return report;
  }
  
  generateSummary() {
    return this.testResults.map(platform => ({
      platform: platform.platform,
      totalSelectors: platform.results.length,
      workingSelectors: platform.results.filter(r => r.found).length,
      successRate: `${Math.round(
        (platform.results.filter(r => r.found).length / platform.results.length) * 100
      )}%`
    }));
  }
}
```

## Conclusion

This comprehensive research provides robust patterns for building writing assistance browser extensions that work across major platforms. Key takeaways include:

1. **Platform-Specific Adaptations**: Each platform requires tailored selectors and integration approaches
2. **Universal Detection**: MutationObserver patterns enable broad compatibility across dynamic SPAs
3. **Performance Optimization**: Web Workers, batching, and caching strategies ensure smooth user experience
4. **Cross-Browser Compatibility**: Manifest V3 patterns support modern browser extension standards
5. **Privacy and Security**: Local-first analysis and CSP compliance protect user data
6. **Testing Framework**: Automated testing ensures reliability across platform updates

The patterns presented here provide a solid foundation for building non-intrusive, performant writing assistance tools that work seamlessly across the modern web landscape.