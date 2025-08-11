import { createClient } from '@/utils/supabase/server';
import { 
  UserContext, 
  UserState, 
  GoalSummary, 
  RecentInsight, 
  EmotionalContext, 
  SessionContext, 
  GraphMetrics, 
  CoachingPreferences, 
  AgentRecommendationContext,
  UserContextQueryParams,
  DatabaseUserProfile,
  DatabaseGoalNode,
  DatabaseInsightNode,
  DatabaseSessionNode,
  DatabaseEmotionNode
} from '@/types/agent-context';

export class UserContextService {
  private supabase: any;
  private userId: string;

  constructor(supabase: any, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  async getUserContext(params: UserContextQueryParams = {}): Promise<UserContext> {
    const {
      include_detailed_insights = true,
      include_session_summaries = true,
      insights_limit = 10,
      sessions_limit = 5,
      time_range_days = 30
    } = params;

    // Execute all queries in parallel for performance
    const [
      userProfile,
      userState,
      goalSummaries,
      recentInsights,
      emotionalContext,
      sessionContext,
      graphMetrics
    ] = await Promise.all([
      this.getUserProfile(),
      this.calculateUserState(),
      this.getGoalSummaries(),
      this.getRecentInsights(insights_limit, time_range_days, include_detailed_insights),
      this.getEmotionalContext(time_range_days),
      this.getSessionContext(sessions_limit, time_range_days, include_session_summaries),
      this.getGraphMetrics(time_range_days)
    ]);

    const coachingPreferences = this.extractCoachingPreferences(userProfile);
    const agentRecommendation = this.calculateAgentRecommendation(userState, goalSummaries, sessionContext);

    const context: UserContext = {
      user_id: this.userId,
      username: userProfile.username,
      full_name: userProfile.full_name,
      user_state: userState,
      active_goals: goalSummaries.active,
      completed_goals: goalSummaries.completed,
      goal_completion_rate: goalSummaries.completion_rate,
      recent_insights: recentInsights.insights,
      insight_categories: recentInsights.categories,
      emotional_context: emotionalContext,
      session_context: sessionContext,
      graph_metrics: graphMetrics,
      coaching_preferences: coachingPreferences,
      agent_recommendation: agentRecommendation,
      context_generated_at: new Date().toISOString(),
      cache_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      data_freshness: {
        goals_updated_at: userProfile.goals_updated_at,
        insights_updated_at: recentInsights.last_updated,
        sessions_updated_at: sessionContext.last_session_date,
        preferences_updated_at: userProfile.updated_at
      }
    };

    return context;
  }

  private async getUserProfile(): Promise<DatabaseUserProfile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', this.userId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }

    return data;
  }

  private async calculateUserState(): Promise<UserState> {
    const profile = await this.getUserProfile();
    const hasCompletedOnboarding = !!profile.onboarding_completed_at;
    
    // Get last session date
    const { data: lastSession } = await this.supabase
      .from('graph_nodes')
      .select('created_at')
      .eq('user_id', this.userId)
      .eq('node_type', 'session_start')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get total session count
    const { count: totalSessions } = await this.supabase
      .from('graph_nodes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId)
      .eq('node_type', 'session_start');

    const now = new Date();
    const signupDate = new Date(profile.created_at);
    const daysSinceSignup = Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let daysSinceLastActivity = null;
    let userType: 'first_time' | 'returning_active' | 'returning_dormant' = 'first_time';

    if (lastSession) {
      const lastActivityDate = new Date(lastSession.created_at);
      daysSinceLastActivity = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastActivity <= 7) {
        userType = 'returning_active';
      } else {
        userType = 'returning_dormant';
      }
    }

    return {
      type: userType,
      daysSinceLastActivity,
      daysSinceSignup,
      totalSessions: totalSessions || 0,
      hasCompletedOnboarding
    };
  }

  private async getGoalSummaries(): Promise<{ active: GoalSummary[], completed: GoalSummary[], completion_rate: number }> {
    const { data: goalNodes, error } = await this.supabase
      .from('graph_nodes')
      .select('*')
      .eq('user_id', this.userId)
      .eq('node_type', 'goal')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch goals: ${error.message}`);
    }

    const active: GoalSummary[] = [];
    const completed: GoalSummary[] = [];

    for (const node of goalNodes || []) {
      const isCompleted = node.properties?.status === 'completed' || node.properties?.progress === 100;
      
      const goalSummary: GoalSummary = {
        id: node.id,
        label: node.label,
        description: node.description,
        status: node.status,
        progress: node.properties?.progress || 0,
        created_at: node.created_at,
        last_discussed_at: node.last_discussed_at,
        priority: node.properties?.priority,
        category: node.properties?.category,
        targetDate: node.properties?.target_date,
        milestones: node.properties?.milestones || []
      };

      if (isCompleted) {
        completed.push(goalSummary);
      } else {
        active.push(goalSummary);
      }
    }

    const totalGoals = active.length + completed.length;
    const completion_rate = totalGoals > 0 ? completed.length / totalGoals : 0;

    return { active, completed, completion_rate };
  }

  private async getRecentInsights(limit: number, timeRangeDays: number, includeDetails: boolean): Promise<{ insights: RecentInsight[], categories: Record<string, number>, last_updated: string }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRangeDays);

    const { data: insightNodes, error } = await this.supabase
      .from('graph_nodes')
      .select('*')
      .eq('user_id', this.userId)
      .eq('node_type', 'insight')
      .gte('created_at', cutoffDate.toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch insights: ${error.message}`);
    }

    const insights: RecentInsight[] = [];
    const categories: Record<string, number> = {};
    let lastUpdated = '';

    for (const node of insightNodes || []) {
      const category = node.properties?.category || 'uncategorized';
      categories[category] = (categories[category] || 0) + 1;

      if (!lastUpdated || node.updated_at > lastUpdated) {
        lastUpdated = node.updated_at;
      }

      insights.push({
        id: node.id,
        label: node.label,
        description: includeDetails ? node.description : undefined,
        created_at: node.created_at,
        session_id: node.session_mentions?.[0]?.session_id,
        category,
        emotional_valence: node.properties?.emotional_valence,
        actionable: node.properties?.actionable || false
      });
    }

    return { insights, categories, last_updated: lastUpdated };
  }

  private async getEmotionalContext(timeRangeDays: number): Promise<EmotionalContext> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRangeDays);

    const { data: emotionNodes, error } = await this.supabase
      .from('graph_nodes')
      .select('*')
      .eq('user_id', this.userId)
      .eq('node_type', 'emotion')
      .gte('created_at', cutoffDate.toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch emotional context: ${error.message}`);
    }

    const recentEmotions = (emotionNodes || []).map(node => ({
      emotion: node.label,
      intensity: node.properties?.intensity || 0.5,
      timestamp: node.created_at,
      session_id: node.session_mentions?.[0]?.session_id
    }));

    // Calculate emotional trends
    const emotionCounts: Record<string, number> = {};
    let totalIntensity = 0;
    let positiveCount = 0;
    let negativeCount = 0;

    for (const emotion of recentEmotions) {
      emotionCounts[emotion.emotion] = (emotionCounts[emotion.emotion] || 0) + 1;
      totalIntensity += emotion.intensity;

      // Simple positive/negative classification (you might want to use a more sophisticated approach)
      const positiveEmotions = ['joy', 'happiness', 'excitement', 'contentment', 'optimism', 'gratitude'];
      const negativeEmotions = ['sadness', 'anger', 'frustration', 'anxiety', 'worry', 'disappointment'];
      
      if (positiveEmotions.includes(emotion.emotion.toLowerCase())) {
        positiveCount++;
      } else if (negativeEmotions.includes(emotion.emotion.toLowerCase())) {
        negativeCount++;
      }
    }

    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'neutral';

    const avgIntensity = recentEmotions.length > 0 ? totalIntensity / recentEmotions.length : 0.5;
    const stabilityScore = Math.max(0, 1 - (Object.keys(emotionCounts).length / Math.max(recentEmotions.length, 1)));
    
    let trendDirection: 'improving' | 'stable' | 'declining' = 'stable';
    if (positiveCount > negativeCount * 1.5) {
      trendDirection = 'improving';
    } else if (negativeCount > positiveCount * 1.5) {
      trendDirection = 'declining';
    }

    return {
      currentMood: recentEmotions[0]?.emotion,
      recentEmotions,
      emotionalTrends: {
        dominant_emotion: dominantEmotion,
        stability_score: stabilityScore,
        trend_direction: trendDirection
      }
    };
  }

  private async getSessionContext(limit: number, timeRangeDays: number, includeSummaries: boolean): Promise<SessionContext> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRangeDays);

    const { data: sessionNodes, error } = await this.supabase
      .from('graph_nodes')
      .select('*')
      .eq('user_id', this.userId)
      .eq('node_type', 'session_start')
      .gte('created_at', cutoffDate.toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    const { count: totalSessions } = await this.supabase
      .from('graph_nodes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId)
      .eq('node_type', 'session_start');

    const recentSessions = (sessionNodes || []).map(node => ({
      id: node.id,
      created_at: node.created_at,
      duration: node.properties?.duration,
      topics: node.properties?.topics || [],
      agent_id: node.properties?.agent_id,
      summary: includeSummaries ? node.properties?.summary : undefined
    }));

    // Calculate average session length
    const sessionsWithDuration = recentSessions.filter(s => s.duration);
    const averageSessionLength = sessionsWithDuration.length > 0 
      ? sessionsWithDuration.reduce((sum, s) => sum + (s.duration || 0), 0) / sessionsWithDuration.length
      : undefined;

    // Extract preferred session times (simplified - you might want more sophisticated analysis)
    const sessionHours = recentSessions.map(s => new Date(s.created_at).getHours());
    const hourCounts: Record<number, number> = {};
    sessionHours.forEach(hour => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const preferredTimes = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);

    return {
      total_sessions: totalSessions || 0,
      recent_sessions: recentSessions,
      average_session_length: averageSessionLength,
      preferred_session_times: preferredTimes,
      last_session_date: recentSessions[0]?.created_at
    };
  }

  private async getGraphMetrics(timeRangeDays: number): Promise<GraphMetrics> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRangeDays);

    const [totalNodesResult, totalEdgesResult, nodeTypesResult, recentGrowthResult] = await Promise.all([
      this.supabase
        .from('graph_nodes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.userId)
        .is('deleted_at', null),
      
      this.supabase
        .from('graph_edges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.userId),
      
      this.supabase
        .from('graph_nodes')
        .select('node_type')
        .eq('user_id', this.userId)
        .is('deleted_at', null),
      
      this.supabase
        .from('graph_nodes')
        .select('node_type, created_at, session_mentions')
        .eq('user_id', this.userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .is('deleted_at', null)
    ]);

    const totalNodes = totalNodesResult.count || 0;
    const totalEdges = totalEdgesResult.count || 0;

    // Calculate node type distribution
    const nodeTypeDistribution: Record<string, number> = {};
    (nodeTypesResult.data || []).forEach((node: any) => {
      nodeTypeDistribution[node.node_type] = (nodeTypeDistribution[node.node_type] || 0) + 1;
    });

    // Calculate recent growth
    const recentNodes = recentGrowthResult.data || [];
    const nodesAddedLast7Days = recentNodes.length;

    // Count edges added in last 7 days
    const { count: edgesAddedLast7Days } = await this.supabase
      .from('graph_edges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Find most active session (session with most node creations)
    const sessionActivity: Record<string, number> = {};
    recentNodes.forEach((node: any) => {
      const sessionId = node.session_mentions?.[0]?.session_id;
      if (sessionId) {
        sessionActivity[sessionId] = (sessionActivity[sessionId] || 0) + 1;
      }
    });

    const mostActiveSession = Object.entries(sessionActivity)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    // Calculate knowledge depth score (simplified interconnectedness metric)
    const avgConnectionsPerNode = totalNodes > 0 ? totalEdges / totalNodes : 0;
    const knowledgeDepthScore = Math.min(1, avgConnectionsPerNode / 3); // Normalize to 0-1

    return {
      total_nodes: totalNodes,
      total_edges: totalEdges,
      node_type_distribution: nodeTypeDistribution,
      recent_growth: {
        nodes_added_last_7_days: nodesAddedLast7Days,
        edges_added_last_7_days: edgesAddedLast7Days || 0,
        most_active_session: mostActiveSession
      },
      knowledge_depth_score: knowledgeDepthScore
    };
  }

  private extractCoachingPreferences(profile: DatabaseUserProfile): CoachingPreferences {
    const preferences = profile.coaching_preferences || {};
    
    return {
      preferred_style: preferences.preferred_style,
      communication_frequency: preferences.communication_frequency,
      focus_areas: preferences.focus_areas || [],
      coaching_goals: preferences.coaching_goals || [],
      feedback_style: preferences.feedback_style,
      reminder_preferences: {
        goal_check_ins: preferences.reminder_preferences?.goal_check_ins !== false,
        progress_updates: preferences.reminder_preferences?.progress_updates !== false,
        insight_follow_ups: preferences.reminder_preferences?.insight_follow_ups !== false
      }
    };
  }

  private calculateAgentRecommendation(
    userState: UserState, 
    goalSummaries: { active: GoalSummary[], completed: GoalSummary[] }, 
    sessionContext: SessionContext
  ): AgentRecommendationContext {
    let shouldRecommend = false;
    let trigger: AgentRecommendationContext['trigger'];
    let reasoning = '';
    let priorityLevel: 'high' | 'medium' | 'low' = 'low';
    const recommendedAgentTypes: string[] = [];

    // Only recommend agents during specific triggers to avoid overwhelming users
    if (userState.type === 'first_time' || !userState.hasCompletedOnboarding) {
      shouldRecommend = true;
      trigger = 'onboarding';
      reasoning = 'User is new and may benefit from agent guidance during onboarding';
      priorityLevel = 'high';
      recommendedAgentTypes.push('onboarding_specialist', 'goal_setting_coach');
    } else if (userState.type === 'returning_dormant' && (userState.daysSinceLastActivity || 0) > 14) {
      shouldRecommend = true;
      trigger = 'dormant_return';
      reasoning = 'User has been inactive for a while, gentle re-engagement recommended';
      priorityLevel = 'medium';
      recommendedAgentTypes.push('re_engagement_coach', 'motivation_specialist');
    } else {
      // Check for recent goal changes (within last 7 days)
      const recentGoalChanges = goalSummaries.active.some(goal => {
        const createdAt = new Date(goal.created_at);
        const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreated <= 7;
      });

      if (recentGoalChanges) {
        shouldRecommend = true;
        trigger = 'goal_change';
        reasoning = 'User has recently updated goals, agent support may be helpful';
        priorityLevel = 'medium';
        recommendedAgentTypes.push('goal_refinement_coach', 'accountability_partner');
      }

      // Check for milestone achievements
      const recentMilestones = goalSummaries.completed.some(goal => {
        const completedAt = new Date(goal.created_at);
        const daysSinceCompleted = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCompleted <= 3;
      });

      if (recentMilestones && !shouldRecommend) {
        shouldRecommend = true;
        trigger = 'milestone_achieved';
        reasoning = 'User has recently achieved goals, celebration and next steps planning recommended';
        priorityLevel = 'medium';
        recommendedAgentTypes.push('celebration_coach', 'progress_planner');
      }
    }

    return {
      shouldRecommendAgents: shouldRecommend,
      trigger,
      reasoning,
      recommended_agent_types: recommendedAgentTypes,
      priority_level: priorityLevel
    };
  }

  // Static factory method to create service instance
  static async create(userId: string): Promise<UserContextService> {
    const supabase = await createClient();
    return new UserContextService(supabase, userId);
  }
}