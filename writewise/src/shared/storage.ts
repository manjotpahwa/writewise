import type { UserProfile, UserPreferences, WritingGoal, SuggestionData, APIKeys } from './types';

export class StorageManager {
  private static instance: StorageManager;

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  // User Profile Management
  async getUserProfile(): Promise<UserProfile | null> {
    const result = await chrome.storage.local.get(['userProfile']);
    return result.userProfile || null;
  }

  async setUserProfile(profile: UserProfile): Promise<void> {
    await chrome.storage.local.set({ userProfile: profile });
  }

  async createDefaultProfile(email: string): Promise<UserProfile> {
    const profile: UserProfile = {
      id: crypto.randomUUID(),
      email,
      subscription: 'free',
      usageCount: 0,
      dailyLimit: 50, // Free tier limit
      goals: {
        id: 'default',
        category: 'professional',
        primary: 'clarity'
      },
      createdAt: new Date()
    };

    await this.setUserProfile(profile);
    return profile;
  }

  // User Preferences Management
  async getUserPreferences(): Promise<UserPreferences> {
    const result = await chrome.storage.local.get(['userPreferences']);
    return result.userPreferences || this.getDefaultPreferences();
  }

  async setUserPreferences(preferences: UserPreferences): Promise<void> {
    await chrome.storage.local.set({ userPreferences: preferences });
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      autoSuggest: true,
      tone: 'professional',
      length: 'medium',
      platforms: {
        gmail: { enabled: true, shortcuts: ['Ctrl+Space'] },
        slack: { enabled: true, shortcuts: ['Ctrl+Space'] },
        teams: { enabled: true, shortcuts: ['Ctrl+Space'] },
        linkedin: { enabled: true, shortcuts: ['Ctrl+Space'] },
        twitter: { enabled: true, shortcuts: ['Ctrl+Space'] }
      }
    };
  }

  // Writing Goals Management
  async getWritingGoals(): Promise<WritingGoal> {
    const profile = await this.getUserProfile();
    return profile?.goals || {
      id: 'default',
      category: 'professional',
      primary: 'clarity'
    };
  }

  async setWritingGoals(goals: WritingGoal): Promise<void> {
    const profile = await this.getUserProfile();
    if (profile) {
      profile.goals = goals;
      await this.setUserProfile(profile);
    }
  }

  // Usage Tracking
  async incrementUsage(): Promise<boolean> {
    const profile = await this.getUserProfile();
    if (!profile) return false;

    // Check if user has exceeded daily limit
    if (profile.usageCount >= profile.dailyLimit && profile.subscription === 'free') {
      return false; // Usage limit exceeded
    }

    profile.usageCount++;
    await this.setUserProfile(profile);
    return true;
  }

  async resetDailyUsage(): Promise<void> {
    const profile = await this.getUserProfile();
    if (profile) {
      profile.usageCount = 0;
      await this.setUserProfile(profile);
    }
  }

  async getRemainingUsage(): Promise<number> {
    const profile = await this.getUserProfile();
    if (!profile) return 0;

    return Math.max(0, profile.dailyLimit - profile.usageCount);
  }

  // Suggestion History
  async addSuggestionToHistory(suggestion: SuggestionData, action: 'accepted' | 'dismissed' | 'refined'): Promise<void> {
    const history = await this.getSuggestionHistory();
    const record = {
      ...suggestion,
      action,
      timestamp: Date.now()
    };

    history.unshift(record); // Add to beginning

    // Keep only last 1000 suggestions
    if (history.length > 1000) {
      history.splice(1000);
    }

    await chrome.storage.local.set({ suggestionHistory: history });
  }

  async getSuggestionHistory(): Promise<Array<SuggestionData & { action: string; timestamp: number }>> {
    const result = await chrome.storage.local.get(['suggestionHistory']);
    return result.suggestionHistory || [];
  }

  async clearSuggestionHistory(): Promise<void> {
    await chrome.storage.local.remove(['suggestionHistory']);
  }

  // API Keys Management (for premium features)
  async getAPIKeys(): Promise<APIKeys> {
    const result = await chrome.storage.local.get(['apiKeys']);
    return result.apiKeys || {};
  }

  async setAPIKey(provider: string, key: string): Promise<void> {
    const apiKeys = await this.getAPIKeys();
    apiKeys[provider] = key;
    await chrome.storage.local.set({ apiKeys });
  }

  // Settings
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const result = await chrome.storage.local.get([key]);
    return result[key] !== undefined ? result[key] : defaultValue;
  }

  async setSetting(key: string, value: any): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  }

  // Analytics
  async trackEvent(event: string, data: Record<string, any>): Promise<void> {
    const analytics = await this.getSetting('analytics', []);
    const record = {
      event,
      data,
      timestamp: Date.now(),
      url: window.location.hostname
    };

    analytics.push(record);

    // Keep only last 500 events
    if (analytics.length > 500) {
      analytics.splice(0, analytics.length - 500);
    }

    await this.setSetting('analytics', analytics);
  }

  async getAnalytics(): Promise<Array<{ event: string; data: any; timestamp: number; url: string }>> {
    return await this.getSetting('analytics', []);
  }

  // Cleanup and maintenance
  async cleanup(): Promise<void> {
    // Clear old analytics data (older than 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const analytics = await this.getAnalytics();
    const recentAnalytics = analytics.filter(record => record.timestamp > thirtyDaysAgo);
    await this.setSetting('analytics', recentAnalytics);

    // Clear old suggestion history (older than 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const history = await this.getSuggestionHistory();
    const recentHistory = history.filter(record => record.timestamp > sevenDaysAgo);
    await chrome.storage.local.set({ suggestionHistory: recentHistory });
  }
}