import { StorageManager } from '../shared/storage';
import { aiEngine } from '../shared/ai-engine';

class BackgroundManager {
  private storageManager = StorageManager.getInstance();

  constructor() {
    this.initializeBackground();
    this.setupMessageHandlers();
    this.setupAlarms();
  }

  private async initializeBackground(): Promise<void> {
    console.log('WriteWise background script initialized');
    
    // Initialize AI engine
    try {
      await aiEngine.initialize();
      console.log('AI engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI engine:', error);
    }
    
    // Clean up old data on startup
    await this.storageManager.cleanup();
  }

  private setupMessageHandlers(): void {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  private async handleMessage(request: any, sender: chrome.runtime.MessageSender, sendResponse: Function): Promise<void> {
    try {
      switch (request.action) {
        case 'generateSuggestion':
          const suggestion = await this.handleGenerateSuggestion(request.data);
          sendResponse({ success: true, data: suggestion });
          break;

        case 'getUserProfile':
          const profile = await this.storageManager.getUserProfile();
          sendResponse({ success: true, data: profile });
          break;

        case 'getUsageStats':
          const remaining = await this.storageManager.getRemainingUsage();
          const profile2 = await this.storageManager.getUserProfile();
          sendResponse({ 
            success: true, 
            data: { 
              remaining, 
              total: profile2?.dailyLimit || 50,
              subscription: profile2?.subscription || 'free'
            }
          });
          break;

        case 'trackSuggestionAction':
          await this.handleTrackSuggestion(request.data);
          sendResponse({ success: true });
          break;

        case 'openDashboard':
          const dashboardUrl = chrome.runtime.getURL('src/dashboard/index.html');
          await chrome.tabs.create({ url: dashboardUrl });
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error: any) {
      console.error('Background message handler error:', error);
      sendResponse({ success: false, error: error?.message || 'Unknown error' });
    }
  }

  private async handleGenerateSuggestion(data: any): Promise<any> {
    const { text, platform } = data;
    
    // Check usage limits
    const canUse = await this.storageManager.incrementUsage();
    if (!canUse) {
      throw new Error('Daily usage limit exceeded');
    }

    // Get user goals
    const goals = await this.storageManager.getWritingGoals();
    
    // Generate suggestion using AI engine
    const suggestion = await aiEngine.generateSuggestion(text, goals, platform);
    
    if (suggestion) {
      // Track analytics
      await this.storageManager.trackEvent('suggestion_generated', {
        platform,
        textLength: text.length,
        goalCategory: goals.category,
        goalPrimary: goals.primary,
        confidence: suggestion.confidence
      });
    }
    
    return suggestion;
  }

  private async handleTrackSuggestion(data: any): Promise<void> {
    const { suggestion, action } = data;
    
    await this.storageManager.addSuggestionToHistory(suggestion, action);
    await this.storageManager.trackEvent('suggestion_action', {
      action,
      platform: suggestion.platform,
      confidence: suggestion.confidence
    });
  }

  private setupAlarms(): void {
    // Set up daily reset alarm
    chrome.alarms.create('dailyReset', { 
      delayInMinutes: this.getMinutesUntilMidnight(),
      periodInMinutes: 24 * 60 // 24 hours
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'dailyReset') {
        this.handleDailyReset();
      }
    });
  }

  private getMinutesUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / (1000 * 60));
  }

  private async handleDailyReset(): Promise<void> {
    await this.storageManager.resetDailyUsage();
    await this.storageManager.trackEvent('daily_reset', {
      timestamp: Date.now()
    });
    console.log('Daily usage reset completed');
  }
}

// Initialize background manager
const backgroundManager = new BackgroundManager();

// Handle installation
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('WriteWise extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // First-time installation
    await StorageManager.getInstance().createDefaultProfile('user@example.com');
    
    // Open welcome page
    const welcomeUrl = chrome.runtime.getURL('src/dashboard/index.html?welcome=true');
    chrome.tabs.create({ url: welcomeUrl });
  }
});

// Handle startup
chrome.runtime.onStartup.addListener(() => {
  console.log('WriteWise extension started');
});

// Keep service worker alive
let keepAliveInterval: number;

function keepAlive() {
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // This keeps the service worker active
    });
  }, 20000); // Every 20 seconds
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
}

// Start keep alive
keepAlive();

// Clean up on suspension
chrome.runtime.onSuspend.addListener(() => {
  console.log('WriteWise service worker suspending');
  stopKeepAlive();
  aiEngine.destroy();
});