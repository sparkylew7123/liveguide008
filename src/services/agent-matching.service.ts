/**
 * Agent Matching Service for Maya Multi-Agent System
 * 
 * This service provides selective agent matching that only triggers during specific events
 * to prevent overwhelming users with too many agent recommendations.
 * 
 * Key Features:
 * - Selective matching based on specific triggers (onboarding, goal changes, etc.)
 * - Cooldown periods to prevent spam
 * - Context-aware matching using user goals, emotions, and preferences
 * - Analytics and history tracking
 * 
 * Usage Example:
 * ```typescript
 * const matchingService = await AgentMatchingService.create(userId);
 * 
 * const result = await matchingService.findMatchingAgents({
 *   trigger: 'goal_change',
 *   maxAgents: 3,
 *   minScore: 0.7
 * });
 * 
 * if (result.should_notify_user && result.matches.length > 0) {
 *   // Show agent recommendations to user
 *   console.log(`Found ${result.matches.length} matching agents:`, result.matches);
 * }
 * ```
 * 
 * Trigger Types:
 * - onboarding: New users or completing setup (no cooldown)
 * - goal_change: Goals added/updated/completed (24h cooldown)
 * - user_request: Explicit user request (no cooldown)
 * - milestone_achieved: Major accomplishments (12h cooldown)
 * - dormant_return: Inactive users returning (72h cooldown)
 */

import { createClient } from '@/utils/supabase/server';
import { UserContextService } from './user-context.service';

export type TriggerType = 'onboarding' | 'goal_change' | 'user_request' | 'milestone_achieved' | 'dormant_return';

export interface AgentMatch {
  agent_id: string;
  agent_name: string;
  speciality: string;
  category: string;
  matching_score: number;
  reasoning: string;
}

export interface AgentMatchingOptions {
  trigger: TriggerType;
  includeContext?: boolean;
  maxAgents?: number;
  minScore?: number;
}

export interface AgentMatchingResult {
  matches: AgentMatch[];
  trigger: TriggerType;
  context_used: Record<string, any>;
  matching_performed_at: string;
  should_notify_user: boolean;
  priority_level: 'high' | 'medium' | 'low';
}

export interface AgentMatchingHistory {
  id: string;
  user_id: string;
  trigger_type: TriggerType;
  matched_agent_ids: string[];
  matching_score: Record<string, any>;
  context_data: Record<string, any>;
  created_at: string;
}

export class AgentMatchingService {
  private supabase: any;
  private userId: string;

  constructor(supabase: any, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  /**
   * Find matching agents for the user based on current context and trigger
   * Uses sophisticated scoring algorithm considering goals, learning preferences, and context
   */
  async findMatchingAgents(options: AgentMatchingOptions): Promise<AgentMatchingResult> {
    const {
      trigger,
      includeContext = true,
      maxAgents = 3,
      minScore = 0.5
    } = options;

    // Validate trigger to prevent abuse
    if (!this.isValidTrigger(trigger)) {
      throw new Error(`Invalid trigger type: ${trigger}`);
    }

    // Check if we should perform matching for this trigger
    const shouldPerformMatching = await this.shouldPerformMatching(trigger);
    if (!shouldPerformMatching.should_match) {
      return {
        matches: [],
        trigger,
        context_used: {},
        matching_performed_at: new Date().toISOString(),
        should_notify_user: false,
        priority_level: 'low'
      };
    }

    let userContext = {};
    let selectedGoalIds: string[] | null = null;
    
    // Get user context if requested
    if (includeContext) {
      try {
        const contextService = new UserContextService(this.supabase, this.userId);
        const fullContext = await contextService.getUserContext();
        
        // Extract relevant context for matching
        userContext = {
          active_goals: fullContext.active_goals,
          emotional_context: fullContext.emotional_context,
          session_context: fullContext.session_context,
          user_state: fullContext.user_state,
          coaching_preferences: fullContext.coaching_preferences
        };

        // Extract goal IDs if available
        if (fullContext.active_goals && Array.isArray(fullContext.active_goals)) {
          selectedGoalIds = fullContext.active_goals.map((goal: any) => goal.id).filter(Boolean);
        }
      } catch (error) {
        console.warn('Failed to fetch user context for agent matching:', error);
        // Continue with empty context rather than failing
      }
    }

    // Use the new sophisticated matching function
    const { data: matches, error } = await this.supabase
      .rpc('find_matching_agents', {
        p_user_id: this.userId,
        p_trigger_type: trigger,
        p_max_agents: maxAgents,
        p_selected_goal_ids: selectedGoalIds
      });

    if (error) {
      console.warn('Primary matching function failed, trying fallback:', error);
      // Fallback to simpler matching if sophisticated function fails
      return await this.fallbackMatching(options, userContext);
    }

    // Process and format matches
    const filteredMatches: AgentMatch[] = (matches || [])
      .filter((match: any) => match.total_score >= minScore)
      .map((match: any) => ({
        agent_id: match.agent_id,
        agent_name: match.agent_name,
        speciality: match.agent_specialty,
        category: match.agent_category,
        matching_score: match.total_score,
        reasoning: this.formatReasoningText(match)
      }));

    // Determine priority and notification settings
    const { priority_level, should_notify_user } = this.calculateNotificationPriority(
      trigger, 
      filteredMatches.length,
      shouldPerformMatching.last_matching_hours_ago
    );

    // Log the matching attempt with detailed scores
    await this.logDetailedMatchingHistory(trigger, matches || [], userContext);

    const result: AgentMatchingResult = {
      matches: filteredMatches,
      trigger,
      context_used: userContext,
      matching_performed_at: new Date().toISOString(),
      should_notify_user,
      priority_level
    };

    return result;
  }

  /**
   * Format reasoning text from database match result
   */
  private formatReasoningText(match: any): string {
    const reasoning = match.reasoning || {};
    let text = `${match.agent_name} scored ${(match.total_score * 100).toFixed(0)}% based on `;
    
    const factors = [];
    
    if (reasoning.goal_category_match === 'direct_match') {
      factors.push(`strong alignment with your ${match.goal_category} goals`);
    }
    
    if (reasoning.learning_preference_alignment !== 'general_fit') {
      const alignmentType = reasoning.learning_preference_alignment.replace('_match', '').replace('_', ' ');
      factors.push(`${alignmentType} learning style compatibility`);
    }
    
    if (reasoning.timeframe_compatibility) {
      factors.push(`suitable for ${reasoning.timeframe_compatibility} timeframe`);
    }
    
    if (match.agent_specialty) {
      factors.push(`expertise in "${match.agent_specialty}"`);
    }
    
    if (factors.length === 0) {
      return `${match.agent_name} is a good general match for your coaching needs.`;
    }
    
    return text + factors.join(', ') + '.';
  }

  /**
   * Fallback matching when sophisticated function fails
   */
  private async fallbackMatching(options: AgentMatchingOptions, userContext: any): Promise<AgentMatchingResult> {
    const { trigger, maxAgents = 3 } = options;
    
    // Simple fallback: get agents by category or random
    const { data: agents, error } = await this.supabase
      .from('agent_personae')
      .select(`
        uuid,
        "Name",
        "Speciality",
        "Category",
        "Goal Category",
        "11labs_agentID"
      `)
      .not('"11labs_agentID"', 'is', null)
      .not('"Name"', 'is', null)
      .limit(maxAgents);

    if (error || !agents) {
      return {
        matches: [],
        trigger,
        context_used: userContext,
        matching_performed_at: new Date().toISOString(),
        should_notify_user: false,
        priority_level: 'low'
      };
    }

    const matches: AgentMatch[] = agents.map(agent => ({
      agent_id: agent.uuid,
      agent_name: agent.Name,
      speciality: agent.Speciality,
      category: agent.Category,
      matching_score: 0.5, // Default score for fallback
      reasoning: `${agent.Name} was selected as a general match. Complete your onboarding for personalized recommendations.`
    }));

    return {
      matches,
      trigger,
      context_used: userContext,
      matching_performed_at: new Date().toISOString(),
      should_notify_user: trigger === 'onboarding' || trigger === 'user_request',
      priority_level: 'medium'
    };
  }

  /**
   * Log detailed matching history with component scores
   */
  private async logDetailedMatchingHistory(
    trigger: TriggerType,
    matches: any[],
    userContext: Record<string, any>
  ): Promise<void> {
    try {
      const matchingScore = {
        total_matches: matches.length,
        avg_score: matches.length > 0 ? matches.reduce((sum: number, m: any) => sum + m.total_score, 0) / matches.length : 0,
        top_score: matches.length > 0 ? Math.max(...matches.map((m: any) => m.total_score)) : 0,
        component_scores: matches.map((m: any) => ({
          agent_id: m.agent_id,
          total_score: m.total_score,
          goal_match: m.goal_match_score,
          learning_pref: m.learning_pref_score,
          timeframe: m.timeframe_score,
          experience: m.experience_score
        })),
        categories: matches.map((m: any) => m.agent_category)
      };

      await this.supabase
        .from('agent_matching_history')
        .insert({
          user_id: this.userId,
          trigger_type: trigger,
          matched_agent_ids: matches.map((m: any) => m.agent_id),
          matching_score: matchingScore,
          context_data: userContext
        });

      // Log interaction for top match
      if (matches.length > 0) {
        await this.supabase
          .from('agent_interaction_logs')
          .insert({
            user_id: this.userId,
            agent_id: matches[0].agent_id,
            interaction_type: 'match_generated',
            context_data: {
              trigger,
              total_matches: matches.length,
              top_score: matchingScore.top_score,
              matching_algorithm: 'sophisticated_scoring'
            }
          });
      }
    } catch (error) {
      console.error('Failed to log detailed matching history:', error);
      // Don't throw - logging failures shouldn't break matching
    }
  }

  /**
   * Get agent matching history for analytics
   */
  async getMatchingHistory(limit: number = 20): Promise<AgentMatchingHistory[]> {
    const { data, error } = await this.supabase
      .from('agent_matching_history')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch matching history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get agent interaction analytics
   */
  async getAnalytics(daysBack: number = 30): Promise<Record<string, any>> {
    const { data, error } = await this.supabase
      .rpc('get_agent_analytics', {
        p_user_id: this.userId,
        p_days_back: daysBack
      });

    if (error) {
      throw new Error(`Failed to fetch agent analytics: ${error.message}`);
    }

    return data || {};
  }

  /**
   * Check if a trigger type is valid and allowed
   */
  private isValidTrigger(trigger: TriggerType): boolean {
    const validTriggers: TriggerType[] = [
      'onboarding',
      'goal_change', 
      'user_request',
      'milestone_achieved',
      'dormant_return'
    ];
    
    return validTriggers.includes(trigger);
  }

  /**
   * Determine if we should perform matching for this trigger
   * Prevents overwhelming users with too many recommendations
   */
  private async shouldPerformMatching(trigger: TriggerType): Promise<{
    should_match: boolean;
    reason: string;
    last_matching_hours_ago?: number;
  }> {
    // Always allow user-requested matching
    if (trigger === 'user_request') {
      return { should_match: true, reason: 'User explicitly requested agent matching' };
    }

    // Check recent matching history to avoid spam
    const { data: recentMatching, error } = await this.supabase
      .from('agent_matching_history')
      .select('created_at')
      .eq('user_id', this.userId)
      .eq('trigger_type', trigger)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Failed to check recent matching history:', error);
      // Allow matching if we can't check history
      return { should_match: true, reason: 'Unable to verify recent matching history' };
    }

    const lastMatching = recentMatching?.[0];
    if (lastMatching) {
      const hoursAgo = (Date.now() - new Date(lastMatching.created_at).getTime()) / (1000 * 60 * 60);
      
      // Define cooldown periods for different triggers
      const cooldownHours = {
        onboarding: 0, // No cooldown for onboarding
        goal_change: 24, // Once per day
        milestone_achieved: 12, // Twice per day
        dormant_return: 72 // Once every 3 days
      };

      const requiredCooldown = cooldownHours[trigger] || 24;
      
      if (hoursAgo < requiredCooldown) {
        return {
          should_match: false,
          reason: `Cooldown period active. Last matching was ${hoursAgo.toFixed(1)} hours ago, required: ${requiredCooldown} hours`,
          last_matching_hours_ago: hoursAgo
        };
      }

      return {
        should_match: true,
        reason: 'Cooldown period has passed',
        last_matching_hours_ago: hoursAgo
      };
    }

    return { should_match: true, reason: 'No previous matching found for this trigger' };
  }

  /**
   * Calculate notification priority and whether to notify user
   */
  private calculateNotificationPriority(
    trigger: TriggerType,
    matchCount: number,
    lastMatchingHoursAgo?: number
  ): { priority_level: 'high' | 'medium' | 'low'; should_notify_user: boolean } {
    // High priority triggers that should always notify
    if (trigger === 'onboarding' || trigger === 'user_request') {
      return {
        priority_level: 'high',
        should_notify_user: true
      };
    }

    // No matches = no notification
    if (matchCount === 0) {
      return {
        priority_level: 'low',
        should_notify_user: false
      };
    }

    // Medium priority for significant events
    if (trigger === 'milestone_achieved' || trigger === 'goal_change') {
      return {
        priority_level: 'medium',
        should_notify_user: true
      };
    }

    // Low priority for dormant return (gentle approach)
    if (trigger === 'dormant_return') {
      return {
        priority_level: 'low',
        should_notify_user: lastMatchingHoursAgo ? lastMatchingHoursAgo > 168 : true // Only if it's been a week
      };
    }

    return {
      priority_level: 'low',
      should_notify_user: false
    };
  }

  /**
   * Log matching attempt for analytics and history
   */
  private async logMatchingHistory(
    trigger: TriggerType,
    matches: AgentMatch[],
    userContext: Record<string, any>
  ): Promise<void> {
    try {
      const matchingScore = {
        total_matches: matches.length,
        avg_score: matches.length > 0 ? matches.reduce((sum, m) => sum + m.matching_score, 0) / matches.length : 0,
        top_score: matches.length > 0 ? Math.max(...matches.map(m => m.matching_score)) : 0,
        categories: matches.map(m => m.category)
      };

      await this.supabase
        .from('agent_matching_history')
        .insert({
          user_id: this.userId,
          trigger_type: trigger,
          matched_agent_ids: matches.map(m => m.agent_id),
          matching_score: matchingScore,
          context_data: userContext
        });

      // Log interaction
      if (matches.length > 0) {
        await this.supabase
          .from('agent_interaction_logs')
          .insert({
            user_id: this.userId,
            agent_id: matches[0].agent_id, // Log the top match
            interaction_type: 'match',
            context_data: {
              trigger,
              total_matches: matches.length,
              top_score: matchingScore.top_score
            }
          });
      }
    } catch (error) {
      console.error('Failed to log matching history:', error);
      // Don't throw - logging failures shouldn't break matching
    }
  }

  /**
   * Simple interface for finding matching agents (as requested)
   * Returns deterministic top-3 agents with clear reasoning
   */
  async getMatchingAgents(options: { trigger: string, maxAgents?: number }): Promise<{
    matches: Array<{
      agent_id: string;
      agent_name: string;
      agent_category: string;
      elevenlabs_agent_id: string;
      total_score: number;
      reasoning: string;
    }>;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const matchingOptions: AgentMatchingOptions = {
      trigger: options.trigger as TriggerType,
      maxAgents: options.maxAgents || 3
    };

    const result = await this.findMatchingAgents(matchingOptions);
    
    return {
      matches: result.matches.map(match => ({
        agent_id: match.agent_id,
        agent_name: match.agent_name,
        agent_category: match.category,
        elevenlabs_agent_id: '', // Would need to fetch from agent_personae if needed
        total_score: match.matching_score,
        reasoning: match.reasoning
      })),
      reasoning: this.generateOverallReasoning(result.matches, options.trigger),
      priority: result.priority_level
    };
  }

  /**
   * Generate overall reasoning for the matching result
   */
  private generateOverallReasoning(matches: AgentMatch[], trigger: string): string {
    if (matches.length === 0) {
      return `No suitable agents found for ${trigger} trigger. Please complete your user questionnaire for better matching.`;
    }

    const topMatch = matches[0];
    const scorePercentage = Math.round(topMatch.matching_score * 100);
    
    let reasoning = `For ${trigger} trigger, found ${matches.length} suitable agent${matches.length > 1 ? 's' : ''}. `;
    reasoning += `Top match: ${topMatch.agent_name} (${scorePercentage}% compatibility) specializing in ${topMatch.category}.`;
    
    if (matches.length > 1) {
      const otherAgents = matches.slice(1, 3).map(m => `${m.agent_name} (${Math.round(m.matching_score * 100)}%)`).join(', ');
      reasoning += ` Additional matches: ${otherAgents}.`;
    }

    return reasoning;
  }

  /**
   * Static factory method to create service instance
   */
  static async create(userId: string): Promise<AgentMatchingService> {
    const supabase = await createClient();
    return new AgentMatchingService(supabase, userId);
  }
}