'use client';

import { useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestWebSocketPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ WebSocket connected successfully');
      setIsConnected(true);
      setMessages(prev => [...prev, 'Connected to ElevenLabs WebSocket']);
    },
    onDisconnect: () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
      setMessages(prev => [...prev, 'Disconnected from ElevenLabs WebSocket']);
    },
    onMessage: (message) => {
      console.log('📨 Received message:', message);
      setMessages(prev => [...prev, `Agent: ${message.message}`]);
    },
    onError: (error) => {
      console.error('❌ WebSocket error:', error);
      setMessages(prev => [...prev, `Error: ${JSON.stringify(error)}`]);
    },
  });

  const testConnection = async () => {
    try {
      const config = {
        agentId: 'SuIlXQ4S6dyjrNViOrQ8',
        options: {
          conversationId: `test-${Date.now()}`,
          metadata: {
            user_id: 'test-user',
            user_name: 'Test User',
            session_type: 'test',
            timestamp: new Date().toISOString()
          }
        }
      };

      console.log('🚀 Starting WebSocket connection test...');
      setMessages(prev => [...prev, 'Starting WebSocket connection test...']);
      
      await conversation.startSession(config);
      console.log('✅ WebSocket connection initiated');
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      setMessages(prev => [...prev, `Connection failed: ${error}`]);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>ElevenLabs WebSocket Connection Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p>Status: {conversation.status || 'disconnected'}</p>
            <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
          </div>
          
          <Button 
            onClick={testConnection}
            disabled={conversation.status === 'connecting' || conversation.status === 'connected'}
            className="w-full"
          >
            {conversation.status === 'connecting' ? 'Connecting...' : 'Test WebSocket Connection'}
          </Button>
          
          {conversation.status === 'connected' && (
            <Button 
              onClick={() => conversation.endSession()}
              variant="outline"
              className="w-full"
            >
              End Session
            </Button>
          )}
          
          <div className="space-y-2">
            <h3 className="font-semibold">Messages:</h3>
            <div className="bg-gray-50 p-3 rounded-lg max-h-64 overflow-y-auto">
              {messages.map((msg, index) => (
                <div key={index} className="text-sm mb-1">
                  {msg}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}