'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  PhoneIcon,
  PhoneArrowDownLeftIcon,
  MicrophoneIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { MicrophoneIcon as MicrophoneOffIcon } from '@heroicons/react/24/solid';
import { useElevenLabsConversation, formatMetadata, generateCallId } from '@/hooks/useElevenLabsConversation';
import { useRAGContext, RAGContextData } from '@/hooks/useRAGContext';
import { createEnhancedClient } from '@/utils/supabase/enhanced-client';
import { User } from '@supabase/supabase-js';

interface MayaWidgetProps {
  agentId?: string;
  showContextPreview?: boolean;
  compact?: boolean;
  className?: string;
  onConversationStart?: () => void;
  onConversationEnd?: () => void;
  onContextUpdate?: (context: RAGContextData) => void;
}

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'SuIlXQ4S6dyjrNViOrQ8';

/**
 * Reusable Maya conversation widget with integrated RAG context
 * Can be embedded into any page for voice coaching sessions
 */
export const MayaWidget: React.FC<MayaWidgetProps> = ({
  agentId = AGENT_ID,
  showContextPreview = true,
  compact = false,
  className = "",
  onConversationStart,
  onConversationEnd,
  onContextUpdate
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const [conversationMessages, setConversationMessages] = useState<string[]>([]);
  const [ragContextData, setRAGContextData] = useState<RAGContextData | null>(null);
  const [supabase] = useState(() => createEnhancedClient());

  // Fetch authenticated user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const userId = user?.id || 'anonymous-user';
  const userName = user?.email?.split('@')[0] || 'Anonymous User';

  // Handle RAG context updates
  const handleRAGContextUpdate = useCallback((contextData: RAGContextData) => {
    setRAGContextData(contextData);
    onContextUpdate?.(contextData);
  }, [onContextUpdate]);

  // Initialize RAG context
  const ragContext = useRAGContext({
    userId,
    agentId,
    maxTokens: 8000, // Smaller context for widget
    includeKnowledgeBase: true,
    includeSimilarPatterns: true,
    autoRefreshInterval: isCallActive ? 30 : 0,
    cacheTtl: 60
  });

  // ElevenLabs conversation setup
  const conversation = useElevenLabsConversation(
    {
      agentId,
      userId,
      customCallId: generateCallId(userId, 'maya_widget'),
      metadata: formatMetadata({
        userId,
        userName,
        sessionType: 'maya_widget',
        agentName: 'Maya',
        authenticated: !!user,
        timestamp: new Date().toISOString()
      }),
      ragContext: ragContext.data?.context || undefined
    },
    {
      onConnect: () => {
        console.log('✅ Maya Widget: Connected');
        setCallStatus('connected');
        setConversationMessages(prev => [...prev, '✅ Connected to Maya']);
        onConversationStart?.();
      },
      onDisconnect: () => {
        console.log('👋 Maya Widget: Disconnected');
        setCallStatus('ended');
        setIsCallActive(false);
        setConversationMessages(prev => [...prev, '👋 Conversation ended']);
        onConversationEnd?.();
      },
      onMessage: (message) => {
        console.log('💬 Maya Widget: Message', message);
        if (message.message) {
          setConversationMessages(prev => [...prev, `Maya: ${message.message.substring(0, 100)}...`]);
        }
      },
      onError: (error) => {
        console.error('❌ Maya Widget: Error', error);
        const errorMessage = typeof error === 'string' ? error : error?.message || 'Connection failed';
        setConversationMessages(prev => [...prev, `❌ Error: ${errorMessage}`]);
        setCallStatus('ended');
        setIsCallActive(false);
      }
    },
    {
      agent: {
        firstMessage: user 
          ? `Hi ${userName}! I'm Maya, ready to help you explore your goals and insights. What would you like to work on?`
          : "Hello! I'm Maya. While we can chat, logging in will allow me to access your personal knowledge graph. What brings you here today?",
        language: "en",
      },
      conversation: {
        textOnly: false,
      }
    }
  );

  const startCall = useCallback(async () => {
    try {
      setCallStatus('connecting');
      setIsCallActive(true);
      setConversationMessages([]);
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start conversation
      await conversation.startSession();
      
      setConversationMessages(prev => [...prev, '🎤 Starting conversation with Maya...']);
    } catch (error) {
      console.error('Failed to start Maya conversation:', error);
      const errorMessage = error?.message || 'Connection failed';
      setConversationMessages(prev => [...prev, `❌ Failed to start: ${errorMessage}`]);
      setCallStatus('ended');
      setIsCallActive(false);
    }
  }, [conversation]);

  const endCall = useCallback(async () => {
    try {
      await conversation.endSession();
      setCallStatus('ended');
      setIsCallActive(false);
      setTimeout(() => setCallStatus('idle'), 2000);
    } catch (error) {
      console.error('Error ending Maya call:', error);
    }
  }, [conversation]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Note: ElevenLabs SDK doesn't directly support muting
  };

  if (loading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className={compact ? "pb-3" : ""}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">M</span>
              </div>
              Maya Coach
            </CardTitle>
            {!compact && (
              <CardDescription>
                Voice-powered AI coaching with your personal knowledge graph
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            {isCallActive && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                Live
              </Badge>
            )}
            {ragContext.hasData && showContextPreview && (
              <Badge variant="outline" className="text-xs">
                <ChartBarIcon className="w-3 h-3 mr-1" />
                Context
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Authentication Warning */}
        {!user && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 text-sm">
              Login to unlock personalized coaching with your goal and insight history.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Interface */}
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar */}
          <div className="relative">
            <div className={`${compact ? 'w-20 h-20' : 'w-24 h-24'} rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center`}>
              <span className={`text-white ${compact ? 'text-2xl' : 'text-3xl'} font-bold`}>M</span>
            </div>
            {callStatus === 'connected' && (
              <div className="absolute inset-0 rounded-full animate-ping bg-green-400 opacity-25" />
            )}
          </div>

          {/* Status */}
          <div className="text-center">
            <p className={`${compact ? 'text-sm' : 'text-lg'} font-medium`}>
              {callStatus === 'idle' && 'Ready to chat'}
              {callStatus === 'connecting' && 'Connecting to Maya...'}
              {callStatus === 'connected' && 'Listening...'}
              {callStatus === 'ended' && 'Call ended'}
            </p>
            {callStatus === 'connected' && !compact && (
              <p className="text-sm text-gray-500">Speak naturally - Maya is listening!</p>
            )}
          </div>

          {/* RAG Context Preview */}
          {showContextPreview && ragContext.hasData && !compact && (
            <div className="w-full bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <InformationCircleIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Maya's Knowledge</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="text-xs">
                  <div className="font-semibold text-blue-600">{ragContext.getRelevantGoals().length}</div>
                  <div className="text-gray-500">Goals</div>
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-green-600">{ragContext.getRelevantInsights().length}</div>
                  <div className="text-gray-500">Insights</div>
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-purple-600">{ragContext.getKnowledgeChunks().length}</div>
                  <div className="text-gray-500">Knowledge</div>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            {!isCallActive ? (
              <Button
                onClick={startCall}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                size={compact ? "sm" : "default"}
              >
                <PhoneIcon className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} mr-2`} />
                Start Chat
              </Button>
            ) : (
              <>
                <Button
                  variant={isMuted ? "destructive" : "secondary"}
                  onClick={toggleMute}
                  size={compact ? "sm" : "default"}
                >
                  {isMuted ? 
                    <MicrophoneOffIcon className={compact ? "w-4 h-4" : "w-5 h-5"} /> : 
                    <MicrophoneIcon className={compact ? "w-4 h-4" : "w-5 h-5"} />
                  }
                </Button>
                <Button
                  variant="destructive"
                  onClick={endCall}
                  size={compact ? "sm" : "default"}
                >
                  <PhoneArrowDownLeftIcon className={compact ? "w-4 h-4" : "w-5 h-5"} />
                </Button>
              </>
            )}
          </div>

          {/* Recent Messages */}
          {conversationMessages.length > 0 && !compact && (
            <div className="w-full bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              {conversationMessages.slice(-3).map((message, index) => (
                <div key={index} className="text-sm text-gray-700 mb-1">
                  {message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RAG Context Error */}
        {ragContext.hasError && (
          <Alert className="bg-red-50 border-red-200">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">
              Knowledge context unavailable: {ragContext.error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default MayaWidget;