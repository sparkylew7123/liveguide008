'use client';

import { useElevenLabsConversation, formatMetadata } from '@/hooks/useElevenLabsConversation';
import { useCallback, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MicrophoneIcon, NoSymbolIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useUser } from '@/contexts/UserContext';

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

interface GoalContext {
  goalId: string;
  goalTitle: string;
  category: string;
  sessionCount: number;
  accomplishmentCount: number;
}

interface SimpleVoiceOnboardingProps {
  onComplete?: (data: { 
    goals?: Array<{ 
      original: string; 
      text?: string; 
      category?: string; 
      timeline?: string;
      confidence?: number;
    }>;
    transcript?: string[];
    duration?: number;
  }) => void;
  agentId?: string;
  agentDetails?: AgentDetails | null;
  loading?: boolean;
  userName?: string;
  goalContext?: GoalContext;
}

export function SimpleVoiceOnboarding({ 
  agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'SuIlXQ4S6dyjrNViOrQ8',
  agentDetails,
  loading = false,
  userName = 'User',
  goalContext,
  onComplete
}: SimpleVoiceOnboardingProps) {
  const [messages, setMessages] = useState<string[]>([]);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [capturedGoals, setCapturedGoals] = useState<Array<{ original: string; category?: string; timeline?: string; confidence?: number }>>([]);
  const [conversationStartTime, setConversationStartTime] = useState<number | null>(null);
  const { effectiveUserId } = useUser();
  const conversationSessionId = useRef(`voice_onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Handle analysis messages with goal extraction
  const handleAnalysisMessage = useCallback((message: any) => {
    console.log('🔍 Processing analysis message:', message);
    
    try {
      // Extract goals from multiple possible locations in the analysis data
      const extractGoalsFromData = (data: any): Array<{ original: string; category?: string; timeline?: string; confidence?: number }> => {
        const goals: Array<{ original: string; category?: string; timeline?: string; confidence?: number }> = [];
        
        // Check for User_Goals field (configured in ElevenLabs Analysis tab)
        if (data.User_Goals && Array.isArray(data.User_Goals)) {
          console.log('Found User_Goals:', data.User_Goals);
          data.User_Goals.forEach((goal: any) => {
            if (goal && (goal.original_text || goal.text)) {
              goals.push({
                original: goal.original_text || goal.text,
                category: goal.goal_category || goal.category,
                timeline: goal.timeline,
                confidence: goal.confidence_level || goal.confidence || 0.9
              });
            }
          });
        }
        
        // Check for goals field (alternative format)
        if (data.goals && Array.isArray(data.goals)) {
          console.log('Found goals array:', data.goals);
          data.goals.forEach((goal: any) => {
            if (goal && (typeof goal === 'string' || goal.text || goal.original)) {
              goals.push({
                original: typeof goal === 'string' ? goal : (goal.text || goal.original),
                category: goal.category,
                timeline: goal.timeline,
                confidence: goal.confidence || 0.8
              });
            }
          });
        }
        
        // Check for individual goal-related fields
        if (data.user_goal && typeof data.user_goal === 'string') {
          goals.push({
            original: data.user_goal,
            confidence: 0.7
          });
        }
        
        return goals;
      };
      
      const extractedGoals = extractGoalsFromData(message.data || message);
      
      if (extractedGoals.length > 0) {
        console.log('✅ Extracted goals from analysis:', extractedGoals);
        
        // Update captured goals state
        setCapturedGoals(prev => {
          const newGoals = [...prev];
          extractedGoals.forEach(goal => {
            // Avoid duplicates by checking if we already have this goal
            const exists = newGoals.some(existing => 
              existing.original.toLowerCase().trim() === goal.original.toLowerCase().trim()
            );
            if (!exists) {
              newGoals.push(goal);
            }
          });
          return newGoals;
        });
        
        // Show user feedback
        extractedGoals.forEach(goal => {
          setMessages(prev => [...prev, `Goal captured: "${goal.original}"`]);
        });
      } else {
        console.log('⚠️ No goals found in analysis data');
        
        // Check if the conversation just ended and we should extract from overall context
        if (message.data?.transcript || message.data?.summary) {
          console.log('Attempting to extract goals from transcript/summary');
          // This will be handled by the webhook, but we can show a message
          setMessages(prev => [...prev, 'Analyzing conversation for goals...']);
        }
      }
      
    } catch (error) {
      console.error('Error processing analysis message:', error);
    }
  }, []);

  const conversation = useElevenLabsConversation(
    {
      agentId: agentId,
      userId: effectiveUserId,
      customCallId: conversationSessionId.current,
      metadata: formatMetadata({
        userId: effectiveUserId,
        userName: userName || 'there',
        sessionType: goalContext ? 'coaching_session' : 'voice_onboarding',
        agentName: agentDetails?.Name || 'AI Coach',
        agentSpecialty: agentDetails?.Speciality,
        authenticated: effectiveUserId && !effectiveUserId.startsWith('anon_'),
        timestamp: new Date().toISOString(),
        microphoneWorking: true,
        conversationType: 'onboarding',
        integrationMode: 'standalone',
        ...(goalContext && {
          goalId: goalContext.goalId,
          goalTitle: goalContext.goalTitle,
          goalCategory: goalContext.category,
          previousSessions: goalContext.sessionCount,
          previousAccomplishments: goalContext.accomplishmentCount
        })
      })
    },
    {
      onConnect: () => {
        console.log('🎯 Connected to ElevenLabs');
        setMessages(prev => [...prev, 'Connected to AI coach']);
        setConversationStartTime(Date.now());
      },
      onDisconnect: () => {
        console.log('👋 Disconnected from ElevenLabs');
        setMessages(prev => [...prev, 'Conversation ended']);
        
        // When conversation ends, trigger onComplete with captured goals
        if (onComplete && conversationStartTime) {
          const duration = (Date.now() - conversationStartTime) / 1000; // in seconds
          onComplete({
            goals: capturedGoals,
            transcript: messages,
            duration
          });
        }
      },
      onMessage: (message) => {
        console.log('💬 Message:', message);
        
        // Handle different types of messages from ElevenLabs
        if (message.type === 'analysis' || message.type === 'evaluation') {
          console.log('📊 Analysis event received:', message);
          handleAnalysisMessage(message);
        } else if (message.type === 'conversation_initiation_metadata') {
          console.log('🚀 Conversation initiated with metadata:', message);
          setMessages(prev => [...prev, 'Connected to AI coach with personalized context']);
        } else if (message.message || message.text) {
          const messageText = message.message || message.text;
          setMessages(prev => [...prev, `AI: ${messageText}`]);
        } else if (message.type && message.type !== 'pong') {
          // Log other message types for debugging
          console.log('📝 Other message type:', message.type, message);
        }
      },
      onError: (error) => {
        console.error('❌ Error:', error);
        const errorMessage = typeof error === 'string' ? error : (error as Error)?.message || 'Connection failed';
        setMessages(prev => [...prev, `Error: ${errorMessage}`]);
      },
    },
    // Custom overrides for agent configuration
    {
      agent: {
        firstMessage: agentDetails?.Name 
          ? `Hello ${userName}! I'm ${agentDetails.Name}, your ${agentDetails.Speciality || 'AI coach'}. I'm here to help you identify and work towards your goals. Let's start by getting to know what you'd like to achieve. What brings you here today?`
          : `Hello ${userName}! I'm your AI coach, and I'm here to help you identify and work towards your goals. What would you like to work on?`,
        language: "en",
      },
      conversation: {
        textOnly: false,
      }
    }
  );

  const startConversation = useCallback(async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsPermissionGranted(true);
      
      // Start conversation with ElevenLabs
      // The hook handles metadata and userName properly
      await conversation.startSession();
      
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

  // Cleanup on unmount to prevent WebSocket conflicts
  useEffect(() => {
    return () => {
      // Clean up the conversation when component unmounts
      if (conversation.status === 'connected' || conversation.status === 'connecting') {
        console.log('SimpleVoiceOnboarding: Cleaning up conversation on unmount');
        conversation.endSession().catch(error => {
          // Ignore errors during cleanup
          if (!error?.message?.includes('WebSocket is already in CLOSING or CLOSED state')) {
            console.warn('Error during cleanup:', error);
          }
        });
      }
    };
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
              <ArrowPathIcon  className="w-8 h-8 animate-spin mx-auto mb-2" />
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
                <MicrophoneIcon  className="h-5 w-5 text-green-500" />
              ) : conversation.status === 'connecting' ? (
                <ArrowPathIcon  className="h-5 w-5 text-blue-500 animate-spin" />
              ) : (
                <NoSymbolIcon  className="h-5 w-5 text-gray-400" />
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
                    <ArrowPathIcon  className="mr-2 h-4 w-4 animate-spin" />
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