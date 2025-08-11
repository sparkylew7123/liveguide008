// Agent context types for Maya multi-agent system

export interface UserState {
  type: 'first_time' | 'returning_active' | 'returning_dormant';
  daysSinceLastActivity?: number;
  daysSinceSignup?: number;
  totalSessions?: number;
  hasCompletedOnboarding: boolean;
}

export interface GoalSummary {
  id: string;
  label: string;
  description?: string;
  status?: 'draft_verbal' | 'curated';
  progress?: number;
  created_at: string;
  last_discussed_at?: string;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  targetDate?: string;
  milestones?: Array<{
    id: string;
    label: string;
    completed: boolean;
    completedAt?: string;
  }>;
}

export interface RecentInsight {
  id: string;
  label: string;
  description?: string;
  created_at: string;
  session_id?: string;
  category?: string;
  emotional_valence?: 'positive' | 'neutral' | 'negative';
  actionable: boolean;
}

export interface EmotionalContext {
  currentMood?: string;
  recentEmotions: Array<{
    emotion: string;
    intensity: number;
    timestamp: string;
    session_id?: string;
  }>;
  emotionalTrends: {
    dominant_emotion: string;
    stability_score: number; // 0-1, higher is more stable
    trend_direction: 'improving' | 'stable' | 'declining';
  };
}

export interface SessionContext {
  total_sessions: number;
  recent_sessions: Array<{
    id: string;
    created_at: string;
    duration?: number;
    topics?: string[];
    agent_id?: string;
    summary?: string;
  }>;
  average_session_length?: number;
  preferred_session_times?: string[];
  last_session_date?: string;
}

export interface GraphMetrics {
  total_nodes: number;
  total_edges: number;
  node_type_distribution: Record<string, number>;
  recent_growth: {
    nodes_added_last_7_days: number;
    edges_added_last_7_days: number;
    most_active_session: string | null;
  };
  knowledge_depth_score: number; // 0-1, based on interconnectedness
}

export interface CoachingPreferences {
  preferred_style?: 'direct' | 'supportive' | 'socratic' | 'collaborative';
  communication_frequency?: 'daily' | 'weekly' | 'bi_weekly' | 'monthly';
  focus_areas?: string[];
  coaching_goals?: string[];
  feedback_style?: 'detailed' | 'concise' | 'visual';
  reminder_preferences?: {
    goal_check_ins: boolean;
    progress_updates: boolean;
    insight_follow_ups: boolean;
  };
}

export interface AgentRecommendationContext {
  shouldRecommendAgents: boolean;
  trigger?: 'onboarding' | 'goal_change' | 'dormant_return' | 'milestone_achieved';
  reasoning?: string;
  recommended_agent_types?: string[];
  priority_level?: 'high' | 'medium' | 'low';
}

export interface UserContext {
  // Core user information
  user_id: string;
  username?: string;
  full_name?: string;
  
  // User state and activity
  user_state: UserState;
  
  // Goal and progress context
  active_goals: GoalSummary[];
  completed_goals: GoalSummary[];
  goal_completion_rate: number; // 0-1
  
  // Recent insights and learnings
  recent_insights: RecentInsight[];
  insight_categories: Record<string, number>;
  
  // Emotional and psychological context
  emotional_context: EmotionalContext;
  
  // Session and engagement context
  session_context: SessionContext;
  
  // Knowledge graph metrics
  graph_metrics: GraphMetrics;
  
  // Coaching preferences and style
  coaching_preferences: CoachingPreferences;
  
  // Agent recommendation logic
  agent_recommendation: AgentRecommendationContext;
  
  // Metadata
  context_generated_at: string;
  cache_expires_at: string;
  data_freshness: {
    goals_updated_at?: string;
    insights_updated_at?: string;
    sessions_updated_at?: string;
    preferences_updated_at?: string;
  };
}

export interface UserContextQueryParams {
  include_detailed_insights?: boolean;
  include_session_summaries?: boolean;
  insights_limit?: number;
  sessions_limit?: number;
  time_range_days?: number;
}

export interface UserContextError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface UserContextResponse {
  success: boolean;
  data?: UserContext;
  error?: UserContextError;
  cached: boolean;
  cache_age_seconds?: number;
}

// Helper types for database queries
export interface DatabaseUserProfile {
  id: string;
  username?: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
  onboarding_completed_at?: string;
  coaching_preferences?: any;
  selected_goals?: any;
  goals_updated_at?: string;
}

export interface DatabaseGoalNode {
  id: string;
  label: string;
  description?: string;
  status?: 'draft_verbal' | 'curated';
  properties?: any;
  created_at: string;
  updated_at: string;
  last_discussed_at?: string;
}

export interface DatabaseInsightNode {
  id: string;
  label: string;
  description?: string;
  created_at: string;
  properties?: any;
  session_mentions?: any;
}

export interface DatabaseSessionNode {
  id: string;
  label: string;
  created_at: string;
  properties?: any;
}

export interface DatabaseEmotionNode {
  id: string;
  label: string;
  created_at: string;
  properties?: any;
  session_mentions?: any;
}