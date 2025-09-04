import React from 'react';
import { createRoot } from 'react-dom/client';
import { UniversalTextDetector } from './detectors/universal-detector';
import { GmailDetector } from './detectors/gmail-detector';
import { SlackDetector } from './detectors/slack-detector';
import { TeamsDetector } from './detectors/teams-detector';
import { LinkedInDetector } from './detectors/linkedin-detector';
import { TwitterDetector } from './detectors/twitter-detector';

class ContentScriptManager {
  private detector: UniversalTextDetector | null = null;

  constructor() {
    this.initializeDetector();
    this.injectStyles();
  }

  private initializeDetector(): void {
    const hostname = window.location.hostname;
    
    try {
      if (hostname.includes('gmail.com')) {
        this.detector = new GmailDetector();
      } else if (hostname.includes('slack.com')) {
        this.detector = new SlackDetector();
      } else if (hostname.includes('teams.microsoft.com')) {
        this.detector = new TeamsDetector();
      } else if (hostname.includes('linkedin.com')) {
        this.detector = new LinkedInDetector();
      } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        this.detector = new TwitterDetector();
      } else {
        // Fallback to universal detector
        this.detector = new UniversalTextDetector('unknown');
      }

      console.log(`WriteWise: Initialized detector for ${hostname}`);
    } catch (error) {
      console.error('WriteWise: Failed to initialize detector:', error);
    }
  }

  private injectStyles(): void {
    const styleId = 'writewise-styles';
    
    // Check if styles already injected
    if (document.getElementById(styleId)) {
      return;
    }

    const styles = `
      .writewise-container {
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        color: #1f2937;
        z-index: 999999;
      }
      
      .writewise-popup {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        padding: 16px;
        max-width: 320px;
        min-width: 280px;
        position: absolute;
        z-index: 999999;
        font-family: inherit;
      }
      
      .writewise-highlight {
        border: 2px solid #3b82f6 !important;
        border-radius: 4px !important;
        background-color: rgba(59, 130, 246, 0.05) !important;
      }
      
      .writewise-button {
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        cursor: pointer;
        font-family: inherit;
      }
      
      .writewise-button:hover {
        background: #2563eb;
      }
      
      .writewise-button-secondary {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        cursor: pointer;
        font-family: inherit;
      }
      
      .writewise-button-secondary:hover {
        background: #e5e7eb;
      }
      
      .writewise-text-suggestion {
        background: #f0f9ff;
        border: 1px solid #0ea5e9;
        border-radius: 4px;
        padding: 8px;
        margin: 8px 0;
        font-size: 13px;
      }
      
      .writewise-original-text {
        background: #fef2f2;
        border: 1px solid #fca5a5;
        border-radius: 4px;
        padding: 8px;
        margin: 8px 0;
        font-size: 13px;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }

  destroy(): void {
    if (this.detector) {
      this.detector.destroy();
      this.detector = null;
    }
  }
}

// Initialize content script manager
let manager: ContentScriptManager | null = null;

function initialize() {
  if (manager) {
    manager.destroy();
  }
  manager = new ContentScriptManager();
}

// Initialize immediately if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Handle page navigation in SPAs
let currentUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    console.log('WriteWise: Page navigation detected, reinitializing...');
    setTimeout(initialize, 1000); // Delay to allow page to stabilize
  }
});

observer.observe(document, { 
  subtree: true, 
  childList: true 
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (manager) {
    manager.destroy();
  }
  observer.disconnect();
});