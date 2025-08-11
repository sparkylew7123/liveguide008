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
   * Only performs matching during specific triggers to avoid overwhelming users
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
      } catch (error) {
        console.warn('Failed to fetch user context for agent matching:', error);
        // Continue with empty context rather than failing
      }
    }

    // Perform agent matching using database function
    const { data: matches, error } = await this.supabase
      .rpc('match_agents_for_user', {
        p_user_id: this.userId,
        p_trigger_type: trigger,
        p_user_context: userContext,
        p_limit: maxAgents
      });

    if (error) {
      throw new Error(`Agent matching failed: ${error.message}`);
    }

    // Filter by minimum score
    const filteredMatches: AgentMatch[] = (matches || [])
      .filter((match: any) => match.matching_score >= minScore)
      .map((match: any) => ({
        agent_id: match.agent_id,
        agent_name: match.agent_name,
        speciality: match.speciality,
        category: match.category,
        matching_score: match.matching_score,
        reasoning: match.reasoning
      }));

    // Determine priority and notification settings
    const { priority_level, should_notify_user } = this.calculateNotificationPriority(
      trigger, 
      filteredMatches.length,
      shouldPerformMatching.last_matching_hours_ago
    );

    // Log the matching attempt
    await this.logMatchingHistory(trigger, filteredMatches, userContext);

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
   * Static factory method to create service instance
   */
  static async create(userId: string): Promise<AgentMatchingService> {
    const supabase = await createClient();
    return new AgentMatchingService(supabase, userId);
  }
}