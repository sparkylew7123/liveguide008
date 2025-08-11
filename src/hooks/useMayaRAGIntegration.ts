import { useState, useEffect, useCallback, useRef } from 'react';
import { useRAGContext, RAGContextData } from './useRAGContext';
import { useElevenLabsConversation, formatMetadata, generateCallId } from './useElevenLabsConversation';

interface MayaRAGIntegrationOptions {
  userId: string;
  agentId: string;
  sessionType?: string;
  metadata?: Record<string, any>;
  autoUpdateContext?: boolean;
  conversationUpdateInterval?: number; // seconds
}

interface MayaConversationState {
  isConnected: boolean;
  isConnecting: boolean;
  messages: Array<{
    id: string;
    text: string;
    sender: 'user' | 'maya';
    timestamp: Date;
  }>;
  error: string | null;
}

/**
 * Advanced hook that integrates Maya conversations with RAG context
 * Provides real-time context updates based on conversation flow
 */
export function useMayaRAGIntegration(options: MayaRAGIntegrationOptions) {
  const {
    userId,
    agentId,
    sessionType = 'maya_conversation',
    metadata = {},
    autoUpdateContext = true,
    conversationUpdateInterval = 30
  } = options;

  const [conversationState, setConversationState] = useState<MayaConversationState>({
    isConnected: false,
    isConnecting: false,
    messages: [],
    error: null
  });

  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [contextUpdateTrigger, setContextUpdateTrigger] = useState<string>('');
  const messageCountRef = useRef(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize RAG context
  const ragContext = useRAGContext({
    userId,
    agentId,
    maxTokens: 12000,
    includeKnowledgeBase: true,
    includeSimilarPatterns: true,
    autoRefreshInterval: conversationState.isConnected ? conversationUpdateInterval : 0,
    cacheTtl: 60
  });

  // Enhanced conversation handlers
  const conversationHandlers = {
    onConnect: () => {
      console.log('🤖 Maya RAG Integration: Connected');
      setConversationState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null
      }));
    },
    
    onDisconnect: () => {
      console.log('👋 Maya RAG Integration: Disconnected');
      setConversationState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false
      }));
    },
    
    onMessage: (message: any) => {
      console.log('💬 Maya RAG Integration: Message received', message);
      
      if (message.message) {
        // Add Maya's message to state
        const newMessage = {
          id: `maya-${Date.now()}`,
          text: message.message,
          sender: 'maya' as const,
          timestamp: new Date()
        };
        
        setConversationState(prev => ({
          ...prev,
          messages: [...prev.messages, newMessage]
        }));
        
        // Trigger context update based on conversation content
        if (autoUpdateContext) {
          scheduleContextUpdate(message.message);
        }
      }
    },
    
    onError: (error: any) => {
      console.error('❌ Maya RAG Integration: Error', error);
      const errorMessage = typeof error === 'string' ? error : error?.message || 'Connection failed';
      
      setConversationState(prev => ({
        ...prev,
        error: errorMessage,
        isConnecting: false,
        isConnected: false
      }));
    }
  };

  // Schedule context updates based on conversation flow
  const scheduleContextUpdate = useCallback((messageText: string) => {
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Extract potential queries from Maya's response that might need context updates
    const contextTriggers = [
      'goal', 'insight', 'progress', 'learn', 'understand', 'help',
      'achieve', 'work on', 'focus on', 'challenge', 'obstacle'
    ];

    const shouldUpdateContext = contextTriggers.some(trigger => 
      messageText.toLowerCase().includes(trigger)
    );

    if (shouldUpdateContext) {
      // Debounce context updates
      updateTimeoutRef.current = setTimeout(() => {
        const query = `Based on our conversation: ${messageText.substring(0, 200)}. What's relevant to discuss next?`;
        setContextUpdateTrigger(query);
      }, 2000); // 2 second delay
    }
  }, []);

  // Update context when trigger changes
  useEffect(() => {
    if (contextUpdateTrigger && autoUpdateContext) {
      ragContext.updateContextForQuery(contextUpdateTrigger);
      setContextUpdateTrigger('');
    }
  }, [contextUpdateTrigger, autoUpdateContext, ragContext]);

  // Initialize ElevenLabs conversation
  const conversation = useElevenLabsConversation(
    {
      agentId,
      userId,
      customCallId: generateCallId(userId, sessionType),
      metadata: formatMetadata({
        userId,
        sessionType,
        agentName: 'Maya',
        ...metadata
      }),
      ragContext: ragContext.data?.context || undefined
    },
    conversationHandlers,
    {
      agent: {
        firstMessage: ragContext.data 
          ? `Hi! I can see you have ${ragContext.getRelevantGoals().length} active goals and ${ragContext.getRelevantInsights().length} recent insights. What would you like to explore today?`
          : "Hello! I'm Maya, your AI coach. What would you like to work on today?",
        language: "en",
      },
      conversation: {
        textOnly: false,
      }
    }
  );

  // Enhanced start session with context preparation
  const startSession = useCallback(async () => {
    try {
      setConversationState(prev => ({
        ...prev,
        isConnecting: true,
        error: null,
        messages: []
      }));

      // Ensure we have fresh context before starting
      if (!ragContext.data || ragContext.isStale) {
        await ragContext.refreshContext();
      }

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start the conversation
      await conversation.startSession();
      
    } catch (error) {
      console.error('Failed to start Maya session:', error);
      setConversationState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start session',
        isConnecting: false
      }));
    }
  }, [conversation, ragContext]);

  // Enhanced end session
  const endSession = useCallback(async () => {
    try {
      await conversation.endSession();
      
      // Clear any pending context updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      setConversationState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false
      }));
      
    } catch (error) {
      console.error('Error ending Maya session:', error);
    }
  }, [conversation]);

  // Manual context update with user query
  const updateContextWithQuery = useCallback(async (query: string) => {
    if (query.trim()) {
      await ragContext.updateContextForQuery(query);
      
      // Add user query to conversation history
      const newMessage = {
        id: `user-${Date.now()}`,
        text: query,
        sender: 'user' as const,
        timestamp: new Date()
      };
      
      setConversationState(prev => ({
        ...prev,
        messages: [...prev.messages, newMessage]
      }));
    }
  }, [ragContext]);

  // Search knowledge during conversation
  const searchKnowledge = useCallback(async (query: string) => {
    return await ragContext.searchKnowledge({ query });
  }, [ragContext]);

  // Get conversation insights (analyze conversation for patterns)
  const getConversationInsights = useCallback(() => {
    const { messages } = conversationState;
    
    if (messages.length < 2) return null;

    const topics = new Set<string>();
    const userMessages = messages.filter(m => m.sender === 'user');
    const mayaMessages = messages.filter(m => m.sender === 'maya');
    
    // Simple topic extraction (could be enhanced with NLP)
    const keywords = ['goal', 'challenge', 'learn', 'improve', 'achieve', 'help', 'work', 'focus'];
    
    messages.forEach(message => {
      keywords.forEach(keyword => {
        if (message.text.toLowerCase().includes(keyword)) {
          topics.add(keyword);
        }
      });
    });

    return {
      messageCount: messages.length,
      userMessageCount: userMessages.length,
      mayaMessageCount: mayaMessages.length,
      conversationDuration: messages.length > 0 
        ? messages[messages.length - 1].timestamp.getTime() - messages[0].timestamp.getTime()
        : 0,
      identifiedTopics: Array.from(topics),
      lastActivity: messages.length > 0 ? messages[messages.length - 1].timestamp : null
    };
  }, [conversationState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Conversation state
    conversationState,
    
    // RAG context
    ragContext: ragContext.data,
    ragContextState: {
      isLoading: ragContext.isLoading,
      error: ragContext.error,
      isStale: ragContext.isStale,
      hasData: ragContext.hasData
    },
    
    // Actions
    startSession,
    endSession,
    updateContextWithQuery,
    searchKnowledge,
    refreshContext: ragContext.refreshContext,
    
    // Analytics
    getConversationInsights,
    
    // Computed values
    isReady: ragContext.isInitialized && !ragContext.isLoading,
    contextStats: ragContext.getContextStats(),
    hasActiveConversation: conversationState.isConnected,
    
    // Context data helpers
    getRelevantGoals: ragContext.getRelevantGoals,
    getRelevantInsights: ragContext.getRelevantInsights,
    getKnowledgeChunks: ragContext.getKnowledgeChunks,
    getSimilarPatterns: ragContext.getSimilarPatterns,
  };
}