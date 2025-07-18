'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface AgentDetails {
  uuid: string;
  Name: string;
  Speciality: string;
  'Key Features': string;
  Personality: string;
  Image: string;
  '11labs_agentID': string;
  availability_status: string;
  average_rating: number | null;
}

interface SimpleVoiceOnboardingProps {
  onComplete?: (data: Record<string, unknown>) => void;
  agentId?: string;
  agentDetails?: AgentDetails | null;
  loading?: boolean;
  userName?: string;
}

export function SimpleVoiceOnboarding({ 
  agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'SuIlXQ4S6dyjrNViOrQ8',
  agentDetails,
  loading = false,
  userName = 'User'
}: SimpleVoiceOnboardingProps) {
  const [messages, setMessages] = useState<string[]>([]);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('🎯 Connected to ElevenLabs');
      setMessages(prev => [...prev, 'Connected to AI coach']);
    },
    onDisconnect: () => {
      console.log('👋 Disconnected from ElevenLabs');
      setMessages(prev => [...prev, 'Conversation ended']);
    },
    onMessage: (message) => {
      console.log('💬 Message:', message);
      setMessages(prev => [...prev, `AI: ${message.message}`]);
    },
    onError: (error) => {
      console.error('❌ Error:', error);
      const errorMessage = typeof error === 'string' ? error : (error as Error)?.message || 'Connection failed';
      setMessages(prev => [...prev, `Error: ${errorMessage}`]);
    },
  });

  const startConversation = useCallback(async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsPermissionGranted(true);
      
      // Start conversation with ElevenLabs
      await conversation.startSession({
        agentId: agentId
      });
      
      setMessages(prev => [...prev, 'Starting conversation...']);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setMessages(prev => [...prev, 'Failed to start: Please allow microphone access']);
    }
  }, [conversation, agentId, userName]);

  const endConversation = useCallback(async () => {
    await conversation.endSession();
    setMessages(prev => [...prev, 'Ending conversation...']);
  }, [conversation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          {agentDetails && (
            <div className="mb-4">
              {agentDetails.Image && (
                <div className="relative w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden">
                  <img 
                    src={agentDetails.Image} 
                    alt={agentDetails.Name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardTitle className="text-xl">{agentDetails.Name}</CardTitle>
              <CardDescription className="text-sm font-medium mb-2">
                {agentDetails.Speciality}
              </CardDescription>
              {agentDetails.Personality && (
                <div className="inline-block px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs mb-2">
                  {agentDetails.Personality}
                </div>
              )}
              {agentDetails['Key Features'] && (
                <p className="text-xs text-muted-foreground">
                  {agentDetails['Key Features']}
                </p>
              )}
            </div>
          )}
          {loading && (
            <div className="mb-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading agent details...</p>
            </div>
          )}
          {!agentDetails && !loading && (
            <>
              <CardTitle>Voice Onboarding</CardTitle>
              <CardDescription>
                Chat with your AI coach to get started
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Display */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              {conversation.status === 'connected' ? (
                <Mic className="h-5 w-5 text-green-500" />
              ) : conversation.status === 'connecting' ? (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              ) : (
                <MicOff className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-sm font-medium">
                Status: {conversation.status || 'disconnected'}
              </span>
            </div>
          </div>

          {/* Messages */}
          {messages.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              {messages.slice(-3).map((message, index) => (
                <div key={index} className="text-xs text-gray-600 mb-1">
                  {message}
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="space-y-3">
            {conversation.status === 'connected' ? (
              <Button 
                onClick={endConversation} 
                variant="destructive" 
                className="w-full"
              >
                End Conversation
              </Button>
            ) : (
              <Button 
                onClick={startConversation} 
                disabled={conversation.status === 'connecting'}
                className="w-full"
              >
                {conversation.status === 'connecting' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Start Voice Chat'
                )}
              </Button>
            )}
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-500 text-center">
            {!isPermissionGranted && (
              <p>Click &quot;Start Voice Chat&quot; and allow microphone access</p>
            )}
            {isPermissionGranted && conversation.status !== 'connected' && (
              <p>Ready to connect with your AI coach</p>
            )}
            {conversation.status === 'connected' && (
              <p>Speak naturally - your AI coach is listening</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}