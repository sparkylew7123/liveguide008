/**
 * React Hook for Agent Matching Integration
 * 
 * This hook provides an easy way to integrate agent matching into React components.
 * It handles the API calls, loading states, and error handling for agent matching operations.
 */

import { useState, useCallback } from 'react';
import { AgentMatch, TriggerType, AgentMatchingResult } from '@/services/agent-matching.service';

interface UseAgentMatchingReturn {
  matches: AgentMatch[];
  isLoading: boolean;
  error: string | null;
  lastTrigger: TriggerType | null;
  shouldNotifyUser: boolean;
  priorityLevel: 'high' | 'medium' | 'low';
  findMatches: (trigger: TriggerType, options?: {
    maxAgents?: number;
    minScore?: number;
    includeContext?: boolean;
  }) => Promise<AgentMatchingResult | null>;
  getHistory: () => Promise<any[]>;
  getAnalytics: (daysBack?: number) => Promise<Record<string, any>>;
  clearMatches: () => void;
}

export function useAgentMatching(): UseAgentMatchingReturn {
  const [matches, setMatches] = useState<AgentMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTrigger, setLastTrigger] = useState<TriggerType | null>(null);
  const [shouldNotifyUser, setShouldNotifyUser] = useState(false);
  const [priorityLevel, setPriorityLevel] = useState<'high' | 'medium' | 'low'>('low');

  const findMatches = useCallback(async (
    trigger: TriggerType,
    options: {
      maxAgents?: number;
      minScore?: number;
      includeContext?: boolean;
    } = {}
  ): Promise<AgentMatchingResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agent-matching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trigger,
          max_agents: options.maxAgents || 3,
          min_score: options.minScore || 0.5,
          include_context: options.includeContext !== false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to find matching agents');
      }

      const { data } = await response.json();
      
      setMatches(data.matches);
      setLastTrigger(trigger);
      setShouldNotifyUser(data.should_notify_user);
      setPriorityLevel(data.priority_level);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Agent matching error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getHistory = useCallback(async (): Promise<any[]> => {
    try {
      const response = await fetch('/api/agent-matching?action=history');
      
      if (!response.ok) {
        throw new Error('Failed to fetch matching history');
      }

      const { data } = await response.json();
      return data.history || [];
    } catch (err) {
      console.error('Failed to fetch matching history:', err);
      return [];
    }
  }, []);

  const getAnalytics = useCallback(async (daysBack: number = 30): Promise<Record<string, any>> => {
    try {
      const response = await fetch(`/api/agent-matching?action=analytics&days_back=${daysBack}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const { data } = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      return {};
    }
  }, []);

  const clearMatches = useCallback(() => {
    setMatches([]);
    setError(null);
    setLastTrigger(null);
    setShouldNotifyUser(false);
    setPriorityLevel('low');
  }, []);

  return {
    matches,
    isLoading,
    error,
    lastTrigger,
    shouldNotifyUser,
    priorityLevel,
    findMatches,
    getHistory,
    getAnalytics,
    clearMatches,
  };
}

// Hook for agent handoffs
interface UseAgentHandoffReturn {
  activeHandoffs: any[];
  isLoading: boolean;
  error: string | null;
  initiateHandoff: (
    fromAgentId: string | undefined,
    toAgentId: string,
    options: {
      handoff_type: 'user_requested' | 'system_recommended' | 'agent_suggested';
      conversation_context?: any;
      session_data?: any;
      immediate?: boolean;
      notify_user?: boolean;
    }
  ) => Promise<any>;
  completeHandoff: (handoffId: string, success?: boolean, reason?: string) => Promise<boolean>;
  getHandoffContext: (handoffId: string) => Promise<any>;
  getHandoffStatus: (handoffId: string) => Promise<any>;
  refreshActiveHandoffs: () => Promise<void>;
}

export function useAgentHandoff(): UseAgentHandoffReturn {
  const [activeHandoffs, setActiveHandoffs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateHandoff = useCallback(async (
    fromAgentId: string | undefined,
    toAgentId: string,
    options: {
      handoff_type: 'user_requested' | 'system_recommended' | 'agent_suggested';
      conversation_context?: any;
      session_data?: any;
      immediate?: boolean;
      notify_user?: boolean;
    }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agent-handoff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'initiate',
          from_agent_id: fromAgentId,
          to_agent_id: toAgentId,
          ...options,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initiate handoff');
      }

      const { data } = await response.json();
      
      // Refresh active handoffs
      await refreshActiveHandoffs();
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Handoff initiation error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeHandoff = useCallback(async (
    handoffId: string,
    success: boolean = true,
    reason?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/agent-handoff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete',
          handoff_id: handoffId,
          success,
          failure_reason: reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete handoff');
      }

      const { data } = await response.json();
      
      // Refresh active handoffs
      await refreshActiveHandoffs();
      
      return data.completed;
    } catch (err) {
      console.error('Handoff completion error:', err);
      return false;
    }
  }, []);

  const getHandoffContext = useCallback(async (handoffId: string) => {
    try {
      const response = await fetch(`/api/agent-handoff?action=context&handoff_id=${handoffId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get handoff context');
      }

      const { data } = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to get handoff context:', err);
      return null;
    }
  }, []);

  const getHandoffStatus = useCallback(async (handoffId: string) => {
    try {
      const response = await fetch(`/api/agent-handoff?action=status&handoff_id=${handoffId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get handoff status');
      }

      const { data } = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to get handoff status:', err);
      return null;
    }
  }, []);

  const refreshActiveHandoffs = useCallback(async () => {
    try {
      const response = await fetch('/api/agent-handoff?action=active');
      
      if (response.ok) {
        const { data } = await response.json();
        setActiveHandoffs(data.active_handoffs || []);
      }
    } catch (err) {
      console.error('Failed to refresh active handoffs:', err);
    }
  }, []);

  return {
    activeHandoffs,
    isLoading,
    error,
    initiateHandoff,
    completeHandoff,
    getHandoffContext,
    getHandoffStatus,
    refreshActiveHandoffs,
  };
}