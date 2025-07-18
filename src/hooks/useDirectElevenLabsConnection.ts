import { useState, useCallback } from 'react';

interface UseDirectElevenLabsConnectionProps {
  apiKey: string;
  agentId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
}

export function useDirectElevenLabsConnection({
  apiKey,
  agentId,
  onConnect,
  onDisconnect,
  onMessage,
  onError
}: UseDirectElevenLabsConnectionProps) {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);

  const startSession = useCallback(async (config: any) => {
    try {
      setStatus('connecting');
      
      // Build WebSocket URL
      const baseUrl = 'wss://api.elevenlabs.io/v1/convai/conversation';
      const params = new URLSearchParams({
        agent_id: agentId,
        ...(config.options?.conversationId && { conversation_id: config.options.conversationId })
      });
      
      const wsUrl = `${baseUrl}?${params.toString()}`;
      
      console.log('🔌 Connecting to ElevenLabs WebSocket:', wsUrl);
      
      // Create WebSocket with authorization as subprotocol
      const ws = new WebSocket(wsUrl, [`xi-api-key.${apiKey}`]);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setStatus('connected');
        setWebsocket(ws);
        onConnect?.();
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setStatus('disconnected');
        setWebsocket(null);
        onDisconnect?.();
        
        if (event.code === 3000) {
          onError?.(new Error(`Authorization failed: ${event.reason}`));
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setStatus('disconnected');
        onError?.(error);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received message:', data);
          onMessage?.(data);
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };
      
      return ws;
    } catch (error) {
      console.error('Failed to start session:', error);
      setStatus('disconnected');
      onError?.(error);
      throw error;
    }
  }, [apiKey, agentId, onConnect, onDisconnect, onMessage, onError]);

  const endSession = useCallback(async () => {
    if (websocket) {
      websocket.close();
      setWebsocket(null);
      setStatus('disconnected');
    }
  }, [websocket]);

  return {
    status,
    startSession,
    endSession
  };
}