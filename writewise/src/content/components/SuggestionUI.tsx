import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StorageManager } from '../../shared/storage';
import type { SuggestionData } from '../../shared/types';

interface SuggestionPopupProps {
  suggestion: SuggestionData;
  onAccept: () => void;
  onDismiss: () => void;
  onRefine: (tone: string) => void;
}

const SuggestionPopup: React.FC<SuggestionPopupProps> = ({
  suggestion,
  onAccept,
  onDismiss,
  onRefine
}) => {
  const [showRefine, setShowRefine] = useState(false);
  
  return (
    <div className="writewise-container">
      <div className="writewise-popup">
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ 
            fontWeight: '600', 
            color: '#1f2937', 
            fontSize: '14px', 
            margin: '0 0 4px 0' 
          }}>
            ✨ WriteWise Suggestion
          </h3>
          <p style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            margin: '0' 
          }}>
            {suggestion.rationale}
          </p>
        </div>
        
        <div style={{ marginBottom: '12px' }}>
          <div className="writewise-original-text">
            <p style={{ 
              fontSize: '11px', 
              fontWeight: '500', 
              color: '#7f1d1d', 
              margin: '0 0 4px 0' 
            }}>
              Original:
            </p>
            <p style={{ 
              fontSize: '13px', 
              color: '#1f2937', 
              margin: '0',
              lineHeight: '1.4'
            }}>
              {suggestion.originalText}
            </p>
          </div>
          
          <div className="writewise-text-suggestion">
            <p style={{ 
              fontSize: '11px', 
              fontWeight: '500', 
              color: '#0c4a6e', 
              margin: '0 0 4px 0' 
            }}>
              Suggested:
            </p>
            <p style={{ 
              fontSize: '13px', 
              color: '#1f2937', 
              margin: '0',
              lineHeight: '1.4'
            }}>
              {suggestion.suggestedText}
            </p>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '6px', 
          marginBottom: showRefine ? '12px' : '0' 
        }}>
          <button
            onClick={onAccept}
            className="writewise-button"
            style={{ flex: '1' }}
          >
            Accept
          </button>
          <button
            onClick={() => setShowRefine(!showRefine)}
            className="writewise-button-secondary"
            style={{ flex: '1' }}
          >
            Refine
          </button>
          <button
            onClick={onDismiss}
            className="writewise-button-secondary"
            style={{ padding: '8px' }}
          >
            ✕
          </button>
        </div>
        
        {showRefine && (
          <div style={{
            paddingTop: '12px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: '0 0 8px 0'
            }}>
              Adjust tone:
            </p>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px'
            }}>
              {['more formal', 'more casual', 'more direct', 'more diplomatic'].map(tone => (
                <button
                  key={tone}
                  onClick={() => onRefine(tone)}
                  className="writewise-button-secondary"
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px'
                  }}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div style={{
          fontSize: '10px',
          color: '#9ca3af',
          textAlign: 'center',
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #f3f4f6'
        }}>
          Confidence: {Math.round(suggestion.confidence * 100)}% • Privacy-first local AI
        </div>
      </div>
    </div>
  );
};

const UpgradePrompt: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const openDashboard = () => {
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');
    window.open(dashboardUrl, '_blank');
  };

  return (
    <div className="writewise-container">
      <div className="writewise-popup">
        <div style={{ marginBottom: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚀</div>
          <h3 style={{ 
            fontWeight: '600', 
            color: '#1f2937', 
            fontSize: '14px', 
            margin: '0 0 4px 0' 
          }}>
            Daily Limit Reached
          </h3>
          <p style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            margin: '0' 
          }}>
            Upgrade to WriteWise Premium for unlimited suggestions
          </p>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '6px' 
        }}>
          <button
            onClick={openDashboard}
            className="writewise-button"
            style={{ flex: '1' }}
          >
            Upgrade Now
          </button>
          <button
            onClick={onDismiss}
            className="writewise-button-secondary"
            style={{ padding: '8px' }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export class SuggestionUI {
  private container: HTMLDivElement | null = null;
  private root: any = null;
  private storageManager = StorageManager.getInstance();
  private isVisible = false;

  constructor(private targetElement: HTMLElement, private platform: string) {
    this.createContainer();
  }

  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.className = 'writewise-suggestion-container';
    this.container.style.cssText = `
      position: absolute;
      z-index: 999999;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Append to body to avoid being affected by page styles
    document.body.appendChild(this.container);
    this.root = createRoot(this.container);
  }

  public showSuggestion(suggestion: SuggestionData): void {
    if (!this.container || this.isVisible) return;

    this.positionContainer();
    this.container.style.display = 'block';
    this.isVisible = true;

    this.root.render(
      <SuggestionPopup
        suggestion={suggestion}
        onAccept={() => this.acceptSuggestion(suggestion)}
        onDismiss={() => this.dismiss()}
        onRefine={(tone) => this.refineSuggestion(suggestion, tone)}
      />
    );

    this.highlightTarget();
    this.trackEvent('suggestion_shown', { 
      platform: this.platform,
      confidence: suggestion.confidence 
    });
  }

  public showUpgradePrompt(): void {
    if (!this.container || this.isVisible) return;

    this.positionContainer();
    this.container.style.display = 'block';
    this.isVisible = true;

    this.root.render(
      <UpgradePrompt onDismiss={() => this.dismiss()} />
    );

    this.trackEvent('upgrade_prompt_shown', { platform: this.platform });
  }

  private positionContainer(): void {
    if (!this.container) return;

    const rect = this.targetElement.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Position below the target element
    let top = rect.bottom + scrollY + 8;
    let left = rect.left + scrollX;

    // Adjust if would go off-screen
    const containerWidth = 320; // Approximate popup width
    const containerHeight = 200; // Approximate popup height

    if (left + containerWidth > window.innerWidth + scrollX) {
      left = window.innerWidth + scrollX - containerWidth - 16;
    }

    if (top + containerHeight > window.innerHeight + scrollY) {
      top = rect.top + scrollY - containerHeight - 8;
    }

    this.container.style.top = `${Math.max(0, top)}px`;
    this.container.style.left = `${Math.max(0, left)}px`;
  }

  private highlightTarget(): void {
    this.targetElement.classList.add('writewise-highlight');
  }

  private removeHighlight(): void {
    this.targetElement.classList.remove('writewise-highlight');
  }

  private acceptSuggestion(suggestion: SuggestionData): void {
    this.applySuggestionToTarget(suggestion.suggestedText);
    this.storageManager.addSuggestionToHistory(suggestion, 'accepted');
    this.trackEvent('suggestion_accepted', { 
      platform: this.platform,
      confidence: suggestion.confidence 
    });
    this.hide();
  }

  private applySuggestionToTarget(text: string): void {
    const tagName = this.targetElement.tagName.toLowerCase();

    if (tagName === 'input' || tagName === 'textarea') {
      const inputElement = this.targetElement as HTMLInputElement;
      inputElement.value = text;
      
      // Trigger input event to notify the page
      const event = new Event('input', { bubbles: true });
      inputElement.dispatchEvent(event);
    } else if (this.targetElement.contentEditable === 'true') {
      this.targetElement.textContent = text;
      
      // Trigger input event for contenteditable
      const event = new Event('input', { bubbles: true });
      this.targetElement.dispatchEvent(event);
      
      // Move cursor to end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(this.targetElement);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  private dismiss(): void {
    this.trackEvent('suggestion_dismissed', { platform: this.platform });
    this.hide();
  }

  private async refineSuggestion(suggestion: SuggestionData, tone: string): Promise<void> {
    this.trackEvent('suggestion_refined', { 
      platform: this.platform, 
      tone 
    });

    // Simple refinement logic - in production, this would use the AI engine
    let refinedText = suggestion.suggestedText;

    switch (tone) {
      case 'more formal':
        refinedText = suggestion.suggestedText
          .replace(/don't/g, 'do not')
          .replace(/can't/g, 'cannot')
          .replace(/won't/g, 'will not')
          .replace(/I'd/g, 'I would')
          .replace(/we'd/g, 'we would');
        break;
      case 'more casual':
        refinedText = suggestion.suggestedText
          .replace(/do not/g, 'don\'t')
          .replace(/cannot/g, 'can\'t')
          .replace(/will not/g, 'won\'t')
          .replace(/I would/g, 'I\'d')
          .replace(/we would/g, 'we\'d');
        break;
      case 'more direct':
        refinedText = suggestion.suggestedText
          .replace(/I think that /g, '')
          .replace(/perhaps /g, '')
          .replace(/maybe /g, '');
        break;
      case 'more diplomatic':
        refinedText = 'I believe ' + suggestion.suggestedText;
        break;
    }

    const refinedSuggestion: SuggestionData = {
      ...suggestion,
      suggestedText: refinedText,
      rationale: `${suggestion.rationale} (adjusted to be ${tone})`,
      id: crypto.randomUUID()
    };

    this.showSuggestion(refinedSuggestion);
  }

  private async trackEvent(event: string, data: Record<string, any>): Promise<void> {
    try {
      await this.storageManager.trackEvent(event, data);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
    this.removeHighlight();
    this.isVisible = false;
  }

  public destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.removeHighlight();
    this.root = null;
    this.isVisible = false;
  }
}