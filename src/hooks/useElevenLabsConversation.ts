import { useConversation } from '@elevenlabs/react';
import { useEffect } from 'react';

interface ElevenLabsConfig {
  agentId: string;
  userId?: string;
  customCallId?: string;
  metadata?: Record<string, any>;
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
 */
export function useElevenLabsConversation(
  config: ElevenLabsConfig,
  handlers: ConversationHandlers
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

  // Use the standard ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: handlers.onConnect,
    onDisconnect: handlers.onDisconnect,
    onMessage: handlers.onMessage,
    onError: handlers.onError,
  });

  // Enhanced startSession that properly formats the WebSocket connection
  const startSession = async () => {
    try {
      // Start session with proper agent configuration
      await conversation.startSession({
        agentId: config.agentId,
        // Pass additional configuration for the conversation
        conversationConfig: {
          user_id: config.userId,
          custom_call_id: config.customCallId,
          metadata: config.metadata
        }
      });
    } catch (error) {
      console.error('Failed to start ElevenLabs session:', error);
      throw error;
    }
  };

  return {
    ...conversation,
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