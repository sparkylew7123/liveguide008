'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MicrophoneIcon, 
  PhoneIcon,
  PhoneArrowDownLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SpeakerWaveIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { MicrophoneIcon as MicrophoneOffIcon } from '@heroicons/react/24/solid';
import { useElevenLabsConversation, formatMetadata, generateCallId } from '@/hooks/useElevenLabsConversation';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

interface Agent {
  uuid?: string;
  Name: string;
  Speciality?: string;
  'Key Features'?: string;
  Personality?: string;
  Image?: string;
  '11labs_agentID': string;
  Category?: string;
  Backstory?: string;
}

interface VoiceInterfaceProps {
  agent: Agent;
  user?: User | null;
  mode?: 'onboarding' | 'coaching' | 'conversation';
  onConversationComplete?: (data: {
    transcript: string[];
    duration: number;
    goals?: any[];
    insights?: any;
  }) => void;
  className?: string;
}

export function VoiceInterface({ 
  agent, 
  user,
  mode = 'conversation',
  onConversationComplete,
  className = ''
}: VoiceInterfaceProps) {
  // State management
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [conversationStartTime, setConversationStartTime] = useState<Date | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const conversationRef = useRef<any>(null);
  const hasConnectedRef = useRef(false); // Track if we've successfully connected

  // Get user info
  const userId = user?.id || 'anonymous';
  const userName = user?.email?.split('@')[0] || 'Guest';
  const isAnonymous = !user?.email || user?.is_anonymous === true || userId.startsWith('anon_');
  
  // Update debug info
  useEffect(() => {
    setDebugInfo({
      userId,
      userName,
      isAnonymous,
      agentId: agent['11labs_agentID'],
      agentName: agent.Name,
      mode,
      callStatus,
      permissionStatus,
      timestamp: new Date().toISOString()
    });
  }, [userId, userName, isAnonymous, agent, mode, callStatus, permissionStatus]);

  // Generate stable values for the session
  const callId = useMemo(() => generateCallId(userId, mode), []);
  const sessionTimestamp = useMemo(() => new Date().toISOString(), []);

  // Memoize the conversation config to prevent recreating on every render
  const conversationConfig = useMemo(() => ({
    agentId: agent['11labs_agentID'],
    userId: userId,
    customCallId: callId,
    metadata: formatMetadata({
      userId: userId,
      userName: userName,
      sessionType: mode,
      agentName: agent.Name,
      agentSpecialty: agent.Speciality,
      agentCategory: agent.Category,
      authenticated: !isAnonymous,
      timestamp: sessionTimestamp
      // Removed microphoneWorking as it changes during the session
    })
  }), [agent, userId, userName, mode, isAnonymous, callId, sessionTimestamp]);

  // Memoize callbacks to prevent recreating the conversation
  const conversationHandlers = useMemo(() => ({
    onConnect: () => {
      console.log('✅ Connected to', agent.Name);
      hasConnectedRef.current = true; // Mark that we've successfully connected
      setCallStatus('connected');
      setIsCallActive(true);
      setConversationStartTime(new Date());
      setTranscript(prev => [...prev, `Connected to ${agent.Name}`]);
    },
    onDisconnect: () => {
      console.log('👋 Disconnected from', agent.Name);
      // Only set to idle if we had actually connected (not during initial connection)
      if (hasConnectedRef.current) {
        setCallStatus('idle');
        hasConnectedRef.current = false; // Reset for next connection
      }
      setIsCallActive(false);
      
      // We'll handle completion in a useEffect to access latest state
    },
    onMessage: (message: any) => {
      console.log('💬 Message:', message);
      
      // Handle different message types
      if (message.type === 'analysis' || message.type === 'evaluation') {
        console.log('📊 Analysis received:', message);
        // Analysis data will be handled by webhook
      } else if (message.message || message.text) {
        const text = message.message || message.text;
        setTranscript(prev => [...prev, text]);
      }
    },
    onError: (error: any) => {
      console.error('❌ Voice Interface Error:', error);
      let errorMsg = typeof error === 'string' ? error : error?.message || error?.error || JSON.stringify(error) || 'Connection failed';
      
      // Check for specific error about missing dynamic variables
      if (errorMsg.includes('Missing required dynamic variables')) {
        errorMsg = 'Configuration error: Agent requires user information. Please ensure you are logged in or try refreshing the page.';
      }
      
      setError(`Voice connection error: ${errorMsg}`);
      setCallStatus('error');
      setIsCallActive(false);
      hasConnectedRef.current = false; // Reset connection flag on error
      
      // Log additional debug info
      console.error('Error details:', {
        error,
        userId,
        userName,
        agentId: agent['11labs_agentID'],
        timestamp: new Date().toISOString()
      });
    }
  }), [agent.Name, agent['11labs_agentID'], userId, userName]);

  // Initialize conversation
  const conversation = useElevenLabsConversation(
    conversationConfig,
    conversationHandlers
  );

  // Store conversation ref for cleanup
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  // Handle conversation completion when disconnecting
  useEffect(() => {
    if (callStatus === 'idle' && conversationStartTime) {
      const duration = Math.round((new Date().getTime() - conversationStartTime.getTime()) / 1000);
      
      // Only trigger completion if there was an actual conversation (duration > 1 second)
      if (onConversationComplete && duration > 1) {
        console.log('Triggering conversation complete with duration:', duration);
        onConversationComplete({
          transcript,
          duration,
          goals: [], // Will be populated by webhook
          insights: {} // Will be populated by webhook
        });
        setConversationStartTime(null); // Reset to prevent re-triggering
      } else if (duration <= 1) {
        console.warn('Conversation ended too quickly (duration:', duration, 'seconds), not triggering completion');
      }
    }
  }, [callStatus, conversationStartTime, onConversationComplete, transcript]);

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      setPermissionStatus('granted');
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setPermissionStatus('denied');
      setError('Microphone access is required for voice conversations');
      return false;
    }
  }, []);

  // Start conversation
  const startConversation = useCallback(async () => {
    // Prevent any default form submission or navigation
    const currentUrl = window.location.href;
    
    console.log('🎯 Starting conversation with debug info:', {
      userId,
      userName,
      isAnonymous,
      agentId: agent['11labs_agentID'],
      mode,
      currentUrl
    });
    
    setError(null);
    setCallStatus('connecting');
    
    // Add a small delay to ensure state is settled
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if we're still on the same page
    if (window.location.href !== currentUrl) {
      console.error('❌ Navigation detected, aborting conversation start');
      return;
    }
    
    // Check microphone permission
    if (permissionStatus !== 'granted') {
      console.log('📢 Requesting microphone permission...');
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        setCallStatus('idle');
        return;
      }
    }

    try {
      console.log('🚀 Starting ElevenLabs session...');
      
      // Add timeout to detect if something is blocking
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session start timeout after 10 seconds')), 10000)
      );
      
      await Promise.race([
        conversation.startSession(),
        timeoutPromise
      ]);
      
      console.log('✅ Session started successfully');
    } catch (err: any) {
      console.error('❌ Failed to start conversation:', err);
      
      // Check if it's a timeout
      if (err.message?.includes('timeout')) {
        setError('Connection timeout. Please check your internet connection and try again.');
      } else {
        setError('Failed to connect. Please try again.');
      }
      setCallStatus('error');
    }
  }, [conversation, permissionStatus, requestMicrophonePermission, userId, userName, isAnonymous, agent, mode]);

  // End conversation
  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error('Error ending conversation:', err);
    }
    setCallStatus('idle');
    setIsCallActive(false);
  }, [conversation]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    // Note: Actual mute implementation depends on ElevenLabs SDK
    console.log('Mute toggled:', !isMuted);
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationRef.current?.status === 'connected' || conversationRef.current?.status === 'connecting') {
        console.log('VoiceInterface: Cleaning up conversation on unmount');
        conversationRef.current.endSession().catch((error: any) => {
          if (!error?.message?.includes('WebSocket is already in CLOSING or CLOSED state')) {
            console.warn('Cleanup error:', error);
          }
        });
      }
    };
  }, []);

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader className="text-center">
        {/* Agent Info */}
        {agent.Image && (
          <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden">
            <img 
              src={agent.Image} 
              alt={agent.Name}
              className="w-full h-full object-cover"
            />
            {callStatus === 'connected' && (
              <div className="absolute inset-0 bg-green-500 bg-opacity-20 animate-pulse" />
            )}
          </div>
        )}
        
        <CardTitle className="text-2xl">{agent.Name}</CardTitle>
        {agent.Speciality && (
          <CardDescription className="text-base mt-1">
            {agent.Speciality}
          </CardDescription>
        )}
        
        {/* Status Badges */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {agent.Personality && (
            <Badge variant="secondary" className="text-xs">
              {agent.Personality}
            </Badge>
          )}
          
          <Badge 
            variant={callStatus === 'connected' ? 'default' : 
                    callStatus === 'connecting' ? 'secondary' : 
                    callStatus === 'error' ? 'destructive' : 'outline'}
          >
            {callStatus === 'connected' ? 'Connected' :
             callStatus === 'connecting' ? 'Connecting...' :
             callStatus === 'error' ? 'Error' : 'Ready'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Debug Panel - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs space-y-1">
            <div className="text-yellow-400 font-bold mb-2">🔍 DEBUG INFO</div>
            <div>User ID: {debugInfo.userId}</div>
            <div>User Name: {debugInfo.userName}</div>
            <div>Anonymous: {String(debugInfo.isAnonymous)}</div>
            <div>Agent ID: {debugInfo.agentId}</div>
            <div>Agent: {debugInfo.agentName}</div>
            <div>Mode: {debugInfo.mode}</div>
            <div>Call Status: {debugInfo.callStatus}</div>
            <div>Mic Permission: {debugInfo.permissionStatus}</div>
            <div>Timestamp: {debugInfo.timestamp}</div>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Permission Status */}
        {permissionStatus === 'denied' && (
          <Alert>
            <MicrophoneIcon className="h-4 w-4" />
            <AlertDescription>
              Microphone access is required. Please enable it in your browser settings.
            </AlertDescription>
          </Alert>
        )}

        {/* Transcript Display */}
        {transcript.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-48 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Conversation
              </span>
            </div>
            <div className="space-y-1">
              {transcript.slice(-5).map((message, index) => (
                <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
                  {message}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Call Controls */}
        <div className="flex gap-3">
          {callStatus === 'connected' ? (
            <>
              <Button
                onClick={endConversation}
                variant="destructive"
                className="flex-1"
              >
                <PhoneArrowDownLeftIcon className="w-5 h-5 mr-2" />
                End Conversation
              </Button>
              
              <Button
                onClick={toggleMute}
                variant={isMuted ? 'outline' : 'secondary'}
                size="icon"
              >
                {isMuted ? (
                  <MicrophoneOffIcon className="w-5 h-5" />
                ) : (
                  <MicrophoneIcon className="w-5 h-5" />
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                startConversation();
              }}
              disabled={callStatus === 'connecting'}
              className="w-full"
              type="button"
            >
              {callStatus === 'connecting' ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <PhoneIcon className="w-5 h-5 mr-2" />
                  Start Voice Conversation
                </>
              )}
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {callStatus === 'connected' 
              ? 'Speak naturally - I\'m listening'
              : callStatus === 'connecting'
              ? 'Setting up secure connection...'
              : `Click to start a conversation with ${agent.Name}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}