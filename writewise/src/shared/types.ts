export interface WritingGoal {
  id: string;
  category: 'professional' | 'personal' | 'academic';
  primary: 'confidence' | 'clarity' | 'warmth' | 'conciseness';
  customizations?: Record<string, any>;
}

export interface SuggestionData {
  id: string;
  originalText: string;
  suggestedText: string;
  rationale: string;
  platform: 'gmail' | 'slack' | 'teams' | 'linkedin' | 'twitter';
  goalCategory: string;
  confidence: number;
  timestamp: number;
}

export interface UserProfile {
  id: string;
  name?: string;
  email: string;
  goals: WritingGoal;
  subscription: 'free' | 'premium';
  usageCount: number;
  dailyLimit: number;
  createdAt: Date;
}

export interface ProgressMetrics {
  suggestionAcceptanceRate: number;
  editFrequency: number;
  streakDays: number;
  platformBreakdown: Record<string, number>;
  improvementScore: number;
}

export interface AIRequest {
  id: string;
  text: string;
  context: SuggestionContext;
  model: string;
  timestamp: number;
}

export interface SuggestionContext {
  platform: string;
  textLength: number;
  goal: WritingGoal;
  urgency: 'low' | 'medium' | 'high';
}

export interface UserPreferences {
  autoSuggest: boolean;
  tone: 'professional' | 'casual' | 'friendly' | 'formal';
  length: 'short' | 'medium' | 'long';
  platforms: {
    [key: string]: {
      enabled: boolean;
      shortcuts: string[];
    };
  };
}

export interface APIKeys {
  [provider: string]: string;
}

export interface AnalysisResult {
  suggestions: SuggestionData[];
  sentiment: {
    label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    score: number;
  };
  metrics: {
    readability: number;
    confidence: number;
    professionalism: number;
  };
}