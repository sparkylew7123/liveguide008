import { useConversation } from '@elevenlabs/react';
import { useEffect, useRef } from 'react';

interface ElevenLabsConfig {
  agentId: string;
  userId?: string;
  customCallId?: string;
  metadata?: Record<string, any>;
  ragContext?: string; // RAG context to pass to the agent
}

interface ConversationHandlers {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
}

/**
 * Custom hook that properly configures ElevenLabs conversation with WebSocket API requirements
 * According to https://elevenlabs.io/docs/conversational-ai/api-reference/conversational-ai/websocket
 * 
 * Supports overriding the agent's first message and other settings when starting a session.
 * Note: Overrides must be enabled in the agent's security settings on ElevenLabs dashboard.
 */
export function useElevenLabsConversation(
  config: ElevenLabsConfig,
  handlers: ConversationHandlers,
  overrides?: {
    agent?: {
      firstMessage?: string;
      language?: string;
      prompt?: string;
    };
    conversation?: {
      textOnly?: boolean;
    };
    tts?: {
      voiceId?: string;
    };
  }
) {
  // Build the WebSocket URL with proper query parameters
  const buildWebSocketUrl = () => {
    const baseUrl = 'wss://api.elevenlabs.io/v1/convai/conversation';
    const params = new URLSearchParams();
    
    // Required: agent_id
    params.append('agent_id', config.agentId);
    
    // Optional: user_id (for webhook association)
    if (config.userId) {
      params.append('user_id', config.userId);
    }
    
    // Optional: custom_call_id (for tracking)
    if (config.customCallId) {
      params.append('custom_call_id', config.customCallId);
    }
    
    // Optional: metadata (URL-encoded JSON)
    if (config.metadata) {
      params.append('metadata', JSON.stringify(config.metadata));
    }
    
    return `${baseUrl}?${params.toString()}`;
  };

  // Use the standard ElevenLabs conversation hook with overrides
  const conversationConfig: any = {
    onConnect: handlers.onConnect,
    onDisconnect: handlers.onDisconnect,
    onMessage: handlers.onMessage,
    onError: handlers.onError,
    // Pass userId and RAG context as dynamic variables for webhooks/tools
    dynamicVariables: {
      name: config.metadata?.userName || 'User', // Add 'name' as required by agent
      userId: config.userId || '',
      userName: config.metadata?.userName || '',
      sessionType: config.metadata?.sessionType || '',
      ragContext: config.ragContext || '',
    }
  };

  // Add overrides if provided
  if (overrides) {
    conversationConfig.overrides = overrides;
    console.log('🎨 Configuring conversation with overrides:', JSON.stringify(overrides, null, 2));
  }

  const conversation = useConversation(conversationConfig);
  
  // Store conversation in a ref for cleanup
  const conversationRef = useRef(conversation);
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Ensure proper cleanup when component unmounts
      const conv = conversationRef.current;
      if (conv && (conv.status === 'connected' || conv.status === 'connecting')) {
        console.log('useElevenLabsConversation: Cleaning up WebSocket connection on unmount');
        conv.endSession?.().catch((error: any) => {
          if (!error?.message?.includes('WebSocket is already in CLOSING or CLOSED state')) {
            console.warn('Cleanup error:', error);
          }
        });
      }
    };
  }, []); // Empty dependency array - only run cleanup on unmount

  // Enhanced startSession that properly formats the WebSocket connection
  const startSession = async () => {
    try {
      // Ensure we have an agent ID at minimum
      const agentId = config?.agentId || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'SuIlXQ4S6dyjrNViOrQ8';
      
      const requestBody = {
        agentId: agentId,
        userId: config?.userId || 'anonymous',
        customCallId: config?.customCallId || `session_${Date.now()}`,
        metadata: config?.metadata || {},
        ragContext: config?.ragContext || ''
      };
      
      console.log('Starting ElevenLabs session with:', requestBody);
      console.log('Current URL before fetch:', window.location.href);
      console.log('Current conversation status:', conversation.status);
      
      // Get signed URL from server for authentication with all user details
      const response = await fetch('/api/elevenlabs/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('After fetch, current URL:', window.location.href);

      if (!response.ok) {
        throw new Error('Failed to get signed URL');
      }

      const { signedUrl } = await response.json();
      console.log('Got signed URL, current URL:', window.location.href);
      
      console.log('🔐 Got signed URL with user details:', {
        userId: config.userId,
        customCallId: config.customCallId,
        metadata: config.metadata
      });
      
      // Start session with signed URL for authentication
      console.log('About to start conversation.startSession, current URL:', window.location.href);
      console.log('Conversation status before startSession:', conversation.status);
      
      const sessionResult = await conversation.startSession({
        signedUrl: signedUrl,
      });
      
      console.log('✅ startSession completed successfully');
      console.log('After conversation.startSession, current URL:', window.location.href);
      console.log('Conversation status after startSession:', conversation.status);
      console.log('Session result:', sessionResult);
      
      return sessionResult;
    } catch (error) {
      console.error('Failed to start ElevenLabs session:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        conversationStatus: conversation.status
      });
      throw error;
    }
  };

  // Safe endSession that checks connection state before closing
  const endSession = async () => {
    try {
      // Only attempt to end session if we're in a valid state
      if (conversation.status === 'connected' || conversation.status === 'connecting') {
        await conversation.endSession();
      }
    } catch (error) {
      // Ignore WebSocket closing errors - they're expected during cleanup
      if (!error?.message?.includes('WebSocket is already in CLOSING or CLOSED state')) {
        console.warn('Error ending ElevenLabs session:', error);
      }
      // Don't throw - session cleanup should be non-blocking
    }
  };

  // Safe sendMessage wrapper that checks WebSocket state
  const sendMessage = (message: any) => {
    try {
      if (conversation.status === 'connected') {
        return conversation.sendMessage?.(message);
      }
    } catch (error) {
      if (!error?.message?.includes('WebSocket is already in CLOSING or CLOSED state')) {
        console.error('Error sending message:', error);
      }
    }
  };

  // Safe wrapper for any conversation methods that might send messages
  const safeConversation = {
    ...conversation,
    endSession,
    sendMessage: conversation.sendMessage ? sendMessage : undefined
  };

  return {
    ...safeConversation,
    startSession,
    websocketUrl: buildWebSocketUrl() // For debugging purposes
  };
}

/**
 * Format metadata for ElevenLabs WebSocket API
 * Metadata should be a flat object with string values
 */
export function formatMetadata(data: any): Record<string, string> {
  const metadata: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      // Convert arrays and objects to JSON strings
      if (typeof value === 'object') {
        metadata[key] = JSON.stringify(value);
      } else {
        metadata[key] = String(value);
      }
    }
  }
  
  return metadata;
}

/**
 * Generate a unique call ID for tracking conversations
 */
export function generateCallId(userId: string, sessionType: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${sessionType}_${userId}_${timestamp}_${random}`;
}