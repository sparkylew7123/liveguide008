import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ToolInvocation {
  tool_name: string;
  parameters: any;
  user_id: string;
  session_id: string;
  conversation_id: string;
  timestamp: string;
}

interface ToolResult {
  type: string;
  error?: string;
  retry_after?: number;
  [key: string]: any;
}

interface ClientToolsState {
  isConnected: boolean;
  lastResult: ToolResult | null;
  error: string | null;
  recommendationEligible: boolean;
  recommendationCooldownUntil: Date | null;
  pendingHandoff: any | null;
}

export function useClientTools() {
  const { user } = useAuth();
  const [state, setState] = useState<ClientToolsState>({
    isConnected: false,
    lastResult: null,
    error: null,
    recommendationEligible: false,
    recommendationCooldownUntil: null,
    pendingHandoff: null,
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string>(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const connect = useCallback(() => {
    if (!user) return;
    
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    const eventSource = new EventSource('/api/client-tools/stream');
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      setState(prev => ({ ...prev, isConnected: true, error: null }));
    };
    
    eventSource.onmessage = (event) => {
      try {
        const result: ToolResult = JSON.parse(event.data);
        handleToolResult(result);
      } catch (error) {
        console.error('Failed to parse tool result:', error);
      }
    };
    
    eventSource.onerror = () => {
      setState(prev => ({ ...prev, isConnected: false, error: 'Connection lost' }));
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (user) connect();
      }, 5000);
    };
  }, [user]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  const handleToolResult = useCallback((result: ToolResult) => {
    setState(prev => ({ ...prev, lastResult: result }));
    
    switch (result.type) {
      case 'eligibility_check':
        setState(prev => ({
          ...prev,
          recommendationEligible: result.eligible,
          recommendationCooldownUntil: result.retry_after ? new Date(result.retry_after) : null
        }));
        break;
        
      case 'handoff_prepared':
        setState(prev => ({
          ...prev,
          pendingHandoff: {
            handoff_id: result.handoff_id,
            target_agent_id: result.target_agent_id,
            estimated_time: result.estimated_handoff_time
          }
        }));
        break;
        
      case 'error':
        setState(prev => ({ ...prev, error: result.error || 'Unknown error' }));
        break;
    }
  }, []);

  const invokeTool = useCallback(async (
    toolName: string,
    parameters: any,
    conversationId?: string
  ): Promise<ToolResult | null> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const invocation: ToolInvocation = {
      tool_name: toolName,
      parameters,
      user_id: user.id,
      session_id: sessionIdRef.current,
      conversation_id: conversationId || `conv_${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/client-tools/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invocation),
      });

      if (!response.ok) {
        throw new Error(`Tool invocation failed: ${response.statusText}`);
      }

      // For non-streaming tools, parse the response
      if (!response.headers.get('content-type')?.includes('text/event-stream')) {
        return await response.json();
      }

      return null; // Streaming result will be handled by event source
    } catch (error) {
      console.error('Tool invocation error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Tool invocation failed' 
      }));
      return null;
    }
  }, [user]);

  // Specific tool methods with validation
  const checkRecommendationEligibility = useCallback(async (
    triggerEvent: string,
    currentContext: {
      primary_goals: string[];
      current_phase: string;
      last_recommendation_timestamp?: string;
      conversation_depth: number;
    }
  ) => {
    return await invokeTool('check_recommendation_eligibility', {
      trigger_event: triggerEvent,
      user_id: user?.id,
      current_context: currentContext
    });
  }, [invokeTool, user]);

  const recommendSpecialistAgent = useCallback(async (
    recommendationContext: {
      user_goals: string[];
      conversation_insights?: string[];
      emotional_state?: string;
      complexity_level: string;
    }
  ) => {
    if (!state.recommendationEligible) {
      throw new Error('Recommendation not eligible at this time');
    }
    
    return await invokeTool('recommend_specialist_agent', {
      recommendation_context: recommendationContext,
      eligibility_validated: true
    });
  }, [invokeTool, state.recommendationEligible]);

  const prepareHandoff = useCallback(async (
    targetAgentId: string,
    handoffReason: string,
    contextPackage: {
      conversation_summary: string;
      key_insights: string[];
      goals_status: Record<string, any>;
      emotional_journey?: any[];
      next_steps?: string[];
      conversation_metadata?: {
        duration_minutes: number;
        topics_covered: string[];
        breakthrough_moments: string[];
      };
    }
  ) => {
    return await invokeTool('prepare_handoff_context', {
      target_agent_id: targetAgentId,
      handoff_reason: handoffReason,
      context_package: contextPackage
    });
  }, [invokeTool]);

  const updateUI = useCallback(async (
    updateType: string,
    data: {
      message: string;
      action_required?: boolean;
      ui_component?: string;
      priority?: string;
    }
  ) => {
    return await invokeTool('update_user_interface', {
      update_type: updateType,
      data,
      session_id: sessionIdRef.current
    });
  }, [invokeTool]);

  // Helper methods
  const canRecommendAgent = useCallback((): boolean => {
    if (!state.recommendationEligible) return false;
    if (state.recommendationCooldownUntil && new Date() < state.recommendationCooldownUntil) return false;
    return true;
  }, [state.recommendationEligible, state.recommendationCooldownUntil]);

  const getRecommendationCooldownRemaining = useCallback((): number => {
    if (!state.recommendationCooldownUntil) return 0;
    return Math.max(0, state.recommendationCooldownUntil.getTime() - Date.now());
  }, [state.recommendationCooldownUntil]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearPendingHandoff = useCallback(() => {
    setState(prev => ({ ...prev, pendingHandoff: null }));
  }, []);

  // Auto-connect when user is available
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // State
    isConnected: state.isConnected,
    lastResult: state.lastResult,
    error: state.error,
    recommendationEligible: state.recommendationEligible,
    recommendationCooldownUntil: state.recommendationCooldownUntil,
    pendingHandoff: state.pendingHandoff,
    
    // Methods
    invokeTool,
    checkRecommendationEligibility,
    recommendSpecialistAgent,
    prepareHandoff,
    updateUI,
    
    // Helpers
    canRecommendAgent,
    getRecommendationCooldownRemaining,
    clearError,
    clearPendingHandoff,
    
    // Connection management
    connect,
    disconnect,
    
    // Session info
    sessionId: sessionIdRef.current
  };
}