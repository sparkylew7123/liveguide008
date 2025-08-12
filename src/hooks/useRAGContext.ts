import { useState, useEffect, useCallback, useRef } from 'react';
import { createEnhancedClient } from '@/utils/supabase/enhanced-client';

// Types for RAG context
export interface RAGContextData {
  context: string;
  userSummary: string;
  relevantGoals: any[];
  relevantInsights: any[];
  knowledgeChunks: any[];
  similarPatterns?: {
    pattern_summary: string;
    similar_goals_count: number;
    avg_completion_rate: number;
    common_strategies: any;
    timeframe_patterns: any;
  };
  tokenCount: number;
  truncated: boolean;
  lastUpdated: string;
}

export interface RAGContextState {
  data: RAGContextData | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  cacheAge: number; // seconds since last update
}

export interface UseRAGContextOptions {
  userId: string;
  agentId?: string;
  conversationId?: string;
  maxTokens?: number;
  includeKnowledgeBase?: boolean;
  includeSimilarPatterns?: boolean;
  autoRefreshInterval?: number; // seconds, 0 to disable
  cacheTtl?: number; // seconds, how long to consider cache valid
}

export interface RAGSearchOptions {
  query: string;
  maxResults?: number;
  includeKnowledge?: boolean;
  includePatterns?: boolean;
}

/**
 * Hook for managing RAG context in Maya conversations
 * Provides initial context, real-time updates, and search capabilities
 */
export function useRAGContext(options: UseRAGContextOptions) {
  const {
    userId,
    agentId,
    conversationId,
    maxTokens = 12000,
    includeKnowledgeBase = true,
    includeSimilarPatterns = true,
    autoRefreshInterval = 30, // 30 seconds default
    cacheTtl = 60 // 1 minute cache
  } = options;

  const [state, setState] = useState<RAGContextState>({
    data: null,
    isLoading: false,
    error: null,
    isInitialized: false,
    cacheAge: 0
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Map<string, { data: RAGContextData; timestamp: number }>>(new Map());
  const supabase = createEnhancedClient();

  // Generate cache key based on query and options
  const generateCacheKey = useCallback((query: string) => {
    return `${userId}-${query.substring(0, 50)}-${includeKnowledgeBase}-${includeSimilarPatterns}`;
  }, [userId, includeKnowledgeBase, includeSimilarPatterns]);

  // Check if cached data is still valid
  const isCacheValid = useCallback((timestamp: number) => {
    return (Date.now() - timestamp) / 1000 < cacheTtl;
  }, [cacheTtl]);

  // Fetch RAG context from the edge function
  const fetchRAGContext = useCallback(async (query: string, fromCache = true): Promise<RAGContextData> => {
    const cacheKey = generateCacheKey(query);
    
    // Check cache first if enabled
    if (fromCache) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached && isCacheValid(cached.timestamp)) {
        console.log('RAG: Using cached context for query:', query.substring(0, 50));
        return cached.data;
      }
    }

    console.log('RAG: Fetching fresh context for query:', query.substring(0, 50));

    // Get the user's session token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch('/api/functions/agent-rag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
      },
      body: JSON.stringify({
        userId,
        query,
        agentId,
        conversationId,
        maxTokens,
        includeKnowledgeBase,
        includeSimilarPatterns
      }),
    });

    if (!response.ok) {
      throw new Error(`RAG context fetch failed: ${response.statusText}`);
    }

    const data: RAGContextData = await response.json();
    data.lastUpdated = new Date().toISOString();

    // Cache the result
    cacheRef.current.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    // Limit cache size to prevent memory issues
    if (cacheRef.current.size > 50) {
      const oldestKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(oldestKey);
    }

    return data;
  }, [userId, agentId, conversationId, maxTokens, includeKnowledgeBase, includeSimilarPatterns, generateCacheKey, isCacheValid, supabase]);

  // Initialize RAG context with user overview
  const initializeContext = useCallback(async () => {
    if (!userId || state.isInitialized) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const initialQuery = "What are my current goals and recent insights? Please provide an overview of my progress.";
      const data = await fetchRAGContext(initialQuery, false); // Don't use cache for initialization

      setState(prev => ({
        ...prev,
        data,
        isLoading: false,
        isInitialized: true,
        cacheAge: 0
      }));

      console.log('RAG: Context initialized successfully');
    } catch (error) {
      console.error('RAG: Failed to initialize context:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize RAG context',
        isLoading: false
      }));
    }
  }, [userId, state.isInitialized, fetchRAGContext]);

  // Update context based on conversation progress
  const updateContextForQuery = useCallback(async (query: string) => {
    if (!userId || !query.trim()) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await fetchRAGContext(query);
      
      setState(prev => ({
        ...prev,
        data,
        isLoading: false,
        cacheAge: 0
      }));

      console.log('RAG: Context updated for query:', query.substring(0, 50));
    } catch (error) {
      console.error('RAG: Failed to update context:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update RAG context',
        isLoading: false
      }));
    }
  }, [userId, fetchRAGContext]);

  // Search knowledge base during conversation
  const searchKnowledge = useCallback(async (options: RAGSearchOptions): Promise<RAGContextData | null> => {
    if (!userId || !options.query.trim()) return null;

    try {
      const data = await fetchRAGContext(options.query);
      
      // Update state with search results but don't replace main context
      setState(prev => ({
        ...prev,
        cacheAge: prev.data ? (Date.now() - new Date(prev.data.lastUpdated).getTime()) / 1000 : 0
      }));

      return data;
    } catch (error) {
      console.error('RAG: Knowledge search failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Knowledge search failed'
      }));
      return null;
    }
  }, [userId, fetchRAGContext]);

  // Refresh current context
  const refreshContext = useCallback(async () => {
    if (!state.data || !userId) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const refreshQuery = "Please provide an updated overview of my current progress and recent activity.";
      const data = await fetchRAGContext(refreshQuery, false); // Skip cache for manual refresh
      
      setState(prev => ({
        ...prev,
        data,
        isLoading: false,
        cacheAge: 0
      }));

      console.log('RAG: Context refreshed successfully');
    } catch (error) {
      console.error('RAG: Failed to refresh context:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh context',
        isLoading: false
      }));
    }
  }, [state.data, userId, fetchRAGContext]);

  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    console.log('RAG: Cache cleared');
  }, []);

  // Set up auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval > 0 && state.isInitialized && !state.isLoading) {
      refreshIntervalRef.current = setInterval(() => {
        setState(prev => {
          if (prev.data) {
            const newCacheAge = (Date.now() - new Date(prev.data.lastUpdated).getTime()) / 1000;
            return { ...prev, cacheAge: newCacheAge };
          }
          return prev;
        });

        // Auto-refresh if cache is stale
        if (state.cacheAge > cacheTtl && !state.isLoading) {
          refreshContext();
        }
      }, autoRefreshInterval * 1000);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefreshInterval, state.isInitialized, state.isLoading, state.cacheAge, cacheTtl, refreshContext]);

  // Initialize context on mount
  useEffect(() => {
    initializeContext();
  }, [initializeContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    // Current state
    ...state,
    
    // Actions
    initializeContext,
    updateContextForQuery,
    searchKnowledge,
    refreshContext,
    clearCache,
    
    // Computed values
    isStale: state.cacheAge > cacheTtl,
    hasData: !!state.data,
    hasError: !!state.error,
    
    // Context data helpers
    getFormattedContext: () => state.data?.context || '',
    getRelevantGoals: () => state.data?.relevantGoals || [],
    getRelevantInsights: () => state.data?.relevantInsights || [],
    getKnowledgeChunks: () => state.data?.knowledgeChunks || [],
    getSimilarPatterns: () => state.data?.similarPatterns,
    getContextStats: () => ({
      tokenCount: state.data?.tokenCount || 0,
      truncated: state.data?.truncated || false,
      goalsCount: state.data?.relevantGoals?.length || 0,
      insightsCount: state.data?.relevantInsights?.length || 0,
      knowledgeChunksCount: state.data?.knowledgeChunks?.length || 0,
      hasSimilarPatterns: !!state.data?.similarPatterns
    })
  };
}