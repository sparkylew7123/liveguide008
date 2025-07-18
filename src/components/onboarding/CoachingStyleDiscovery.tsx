'use client';

import { useState, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Mic, MicOff, Loader2, CheckCircle, XCircle, Users } from 'lucide-react';
import { generateCallId, formatMetadata } from '@/hooks/useElevenLabsConversation';
import { useRealtimeCoachingPreferences } from '@/hooks/useRealtimeCoachingPreferences';

interface CoachingStyleDiscoveryProps {
  user: any;
  userName: string;
  selectedGoals: string[];
  onComplete: (data: { coachingPreferences: any, discoveryMethod: string, confidence: number }) => void;
  onSkip: () => void;
  isLoading: boolean;
}

interface CoachingPreference {
  dimension: string;
  preference: string;
  confidence: number;
  reasoning: string;
}

type DiscoveryPhase = 'consent' | 'conversation' | 'confirmation' | 'opt_out';

export function CoachingStyleDiscovery({
  user,
  userName,
  selectedGoals,
  onComplete,
  onSkip,
  isLoading
}: CoachingStyleDiscoveryProps) {
  const [phase, setPhase] = useState<DiscoveryPhase>('consent');
  const [hasConsented, setHasConsented] = useState(false);
  const [discoveredPreferences, setDiscoveredPreferences] = useState<CoachingPreference[]>([]);
  const [conversationProgress, setConversationProgress] = useState(0);
  const [messages, setMessages] = useState<string[]>([]);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  // Realtime coaching preferences detection
  const { 
    coachingPreferences: realtimePreferences, 
    isListening, 
    preferenceCount,
    isDiscoveryComplete,
    fetchExistingPreferences
  } = useRealtimeCoachingPreferences({
    userId: user.id,
    enabled: phase === 'conversation'
  });

  // ElevenLabs agent for coaching style discovery
  const ELEVENLABS_AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'SuIlXQ4S6dyjrNViOrQ8';

  const conversation = useConversation({
    onConnect: () => {
      console.log('🧠 Connected to Maya (Coaching Style Discovery)');
      setMessages(prev => [...prev, 'Connected to Maya for coaching style discovery']);
    },
    onDisconnect: () => {
      console.log('👋 Disconnected from Maya');
      setMessages(prev => [...prev, 'Conversation ended']);
    },
    onMessage: (message) => {
      console.log('💬 Maya:', message);
      setMessages(prev => [...prev, `Maya: ${message.message}`]);
      
      // TODO: Parse message for coaching preference detection using MCP tool
      handlePreferenceDetection(message.message);
      
      // Update progress based on conversation length
      const progress = Math.min((messages.length / 20) * 100, 90);
      setConversationProgress(progress);
    },
    onError: (error) => {
      console.error('❌ Coaching Style Discovery Error:', error);
      const errorMessage = typeof error === 'string' ? error : (error as Error)?.message || 'Connection failed';
      setMessages(prev => [...prev, `Error: ${errorMessage}`]);
    },
  });

  const handlePreferenceDetection = async (agentMessage: string) => {
    // TODO: This would integrate with the MCP preference detection tool
    // For now, simulate preference detection based on conversation content
    const message = agentMessage.toLowerCase();
    
    // Energy dimension detection
    if (message.includes('energy') || message.includes('enthusiasm') || message.includes('quiet')) {
      const newPreference: CoachingPreference = {
        dimension: 'Energy',
        preference: message.includes('quiet') || message.includes('calm') ? 'Reflective' : 'Energetic',
        confidence: 0.75,
        reasoning: 'Based on conversation about energy levels and interaction style'
      };
      
      setDiscoveredPreferences(prev => {
        const exists = prev.find(p => p.dimension === 'Energy');
        if (!exists) {
          return [...prev, newPreference];
        }
        return prev.map(p => p.dimension === 'Energy' ? newPreference : p);
      });
    }
    
    // Information dimension detection
    if (message.includes('details') || message.includes('overview') || message.includes('big picture')) {
      const newPreference: CoachingPreference = {
        dimension: 'Information',
        preference: message.includes('details') || message.includes('specific') ? 'Detail-Oriented' : 'Big Picture',
        confidence: 0.8,
        reasoning: 'Based on conversation about information processing preferences'
      };
      
      setDiscoveredPreferences(prev => {
        const exists = prev.find(p => p.dimension === 'Information');
        if (!exists) {
          return [...prev, newPreference];
        }
        return prev.map(p => p.dimension === 'Information' ? newPreference : p);
      });
    }
    
    // Decisions dimension detection
    if (message.includes('logical') || message.includes('feelings') || message.includes('emotional')) {
      const newPreference: CoachingPreference = {
        dimension: 'Decisions',
        preference: message.includes('logical') || message.includes('analytical') ? 'Logical' : 'Values-Based',
        confidence: 0.7,
        reasoning: 'Based on conversation about decision-making approach'
      };
      
      setDiscoveredPreferences(prev => {
        const exists = prev.find(p => p.dimension === 'Decisions');
        if (!exists) {
          return [...prev, newPreference];
        }
        return prev.map(p => p.dimension === 'Decisions' ? newPreference : p);
      });
    }
    
    // Structure dimension detection
    if (message.includes('structure') || message.includes('flexible') || message.includes('spontaneous')) {
      const newPreference: CoachingPreference = {
        dimension: 'Structure',
        preference: message.includes('structure') || message.includes('organized') ? 'Structured' : 'Flexible',
        confidence: 0.75,
        reasoning: 'Based on conversation about structure and planning preferences'
      };
      
      setDiscoveredPreferences(prev => {
        const exists = prev.find(p => p.dimension === 'Structure');
        if (!exists) {
          return [...prev, newPreference];
        }
        return prev.map(p => p.dimension === 'Structure' ? newPreference : p);
      });
    }
  };

  const handleConsentGiven = () => {
    setHasConsented(true);
    setPhase('conversation');
  };

  const handleOptOut = () => {
    setPhase('opt_out');
  };

  const startCoachingStyleDiscovery = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsPermissionGranted(true);
      
      // Generate a unique call ID for tracking
      const customCallId = generateCallId(user.id, 'coaching_style_discovery');
      
      // According to ElevenLabs WebSocket API, we need to pass these as URL parameters
      const sessionConfig = {
        agentId: ELEVENLABS_AGENT_ID,
        // These will be passed as URL parameters in the WebSocket connection
        options: {
          conversationId: customCallId,
          metadata: {
            user_id: user.id,
            user_name: userName,
            session_type: 'coaching_style_discovery',
            onboarding_phase: 'coaching_style_discovery',
            selected_goals: selectedGoals.join(','),
            webhook_enabled: 'true',
            timestamp: new Date().toISOString()
          }
        }
      };
      
      await conversation.startSession(sessionConfig);
      
      // Store the call ID for tracking
      sessionStorage.setItem('current_call_id', customCallId);
      
      setMessages(prev => [...prev, 'Starting coaching style discovery conversation...']);
    } catch (error) {
      console.error('Failed to start coaching style discovery:', error);
      setMessages(prev => [...prev, 'Failed to start: Please allow microphone access']);
    }
  };

  const handleConfirmPreferences = () => {
    if (discoveredPreferences.length === 0) {
      alert('No coaching preferences were discovered. Please try the conversation again or skip this step.');
      return;
    }
    
    // Convert preferences to the expected format
    const coachingPreferences = discoveredPreferences.reduce((acc, pref) => {
      acc[pref.dimension] = {
        preference: pref.preference,
        confidence: pref.confidence,
        reasoning: pref.reasoning
      };
      return acc;
    }, {} as any);
    
    const avgConfidence = discoveredPreferences.reduce((acc, pref) => acc + pref.confidence, 0) / discoveredPreferences.length;
    
    onComplete({
      coachingPreferences,
      discoveryMethod: 'voice_situational',
      confidence: avgConfidence
    });
  };

  const handleSkipDiscovery = () => {
    onSkip();
  };

  if (phase === 'consent') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
            <Brain className="w-10 h-10 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Coaching Style Discovery
          </h1>
          <p className="text-lg text-gray-600">
            Let's discover your coaching preferences to find the perfect match
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              How This Works
            </CardTitle>
            <CardDescription>
              This is a transparent, consent-based preference discovery process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">What We'll Discover:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your preferred coaching energy level (energetic vs. reflective)</li>
                <li>• How you like to process information (details vs. big picture)</li>
                <li>• Your decision-making style (logical vs. values-based)</li>
                <li>• Your preference for structure (planned vs. flexible)</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">What This Is NOT:</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Personality assessment or psychological testing</li>
                <li>• Permanent labels or categories</li>
                <li>• Judgment about your character or abilities</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-medium text-yellow-900 mb-2">Your Rights:</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• You can stop or skip this process at any time</li>
                <li>• Your responses are used only for coach matching</li>
                <li>• You can request different coaching styles later</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button 
            onClick={handleConsentGiven}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            I Understand & Want to Continue
          </Button>
          <Button 
            onClick={handleOptOut}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Skip This Step
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'conversation') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Coaching Style Discovery with Maya
          </CardTitle>
          <CardDescription>
            Natural conversation about your coaching preferences
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Discovery Progress</span>
              <span>{Math.round(conversationProgress)}%</span>
            </div>
            <Progress value={conversationProgress} className="h-2" />
          </div>

          {/* Conversation Status */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              {conversation.status === 'connected' ? (
                <Mic className="h-5 w-5 text-green-500" />
              ) : conversation.status === 'connecting' ? (
                <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
              ) : (
                <MicOff className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-sm font-medium">
                Status: {conversation.status || 'disconnected'}
              </span>
            </div>
          </div>

          {/* Discovered Preferences */}
          {discoveredPreferences.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Coaching Preferences I'm Discovering:
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {discoveredPreferences.map(pref => (
                  <div key={pref.dimension} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                    <span className="text-sm font-medium text-purple-900">
                      {pref.dimension}: {pref.preference}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(pref.confidence * 100)}% confident
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Messages */}
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
              <div className="space-y-2">
                <Button 
                  onClick={() => {
                    conversation.endSession();
                    setPhase('confirmation');
                    setConversationProgress(100);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Finish Discovery & Review Preferences
                </Button>
                <p className="text-xs text-center text-gray-500">
                  Speak naturally about your preferences - I'm listening
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Button 
                  onClick={startCoachingStyleDiscovery}
                  disabled={conversation.status === 'connecting'}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {conversation.status === 'connecting' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Start Discovery Conversation
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleSkipDiscovery}
                  className="w-full text-gray-500"
                >
                  Skip to agent matching
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'confirmation') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Your Coaching Style Preferences
          </h2>
          <p className="text-gray-600">
            Based on our conversation, here are your coaching preferences:
          </p>
        </div>

        {discoveredPreferences.length > 0 ? (
          <div className="space-y-4">
            {discoveredPreferences.map(pref => (
              <Card key={pref.dimension} className="bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-purple-900">
                        {pref.dimension}: {pref.preference}
                      </h3>
                      <p className="text-sm text-purple-700 mt-1">
                        {pref.reasoning}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      {Math.round(pref.confidence * 100)}% confidence
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-yellow-50">
            <CardContent className="p-4 text-center">
              <p className="text-yellow-800">
                We weren't able to clearly identify your coaching preferences from our conversation.
                Don't worry - we'll use a balanced approach to match you with coaches.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button 
            onClick={handleConfirmPreferences}
            disabled={isLoading}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Preferences...
              </>
            ) : (
              <>
                Confirm & Find My Coach
              </>
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={() => setPhase('conversation')}
            disabled={isLoading}
            size="lg"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'opt_out') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-10 h-10 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            No Problem!
          </h2>
          <p className="text-gray-600">
            We'll use a balanced approach to match you with coaches who can work with different styles.
          </p>
        </div>

        <Card className="bg-blue-50">
          <CardContent className="p-4">
            <h3 className="font-medium text-blue-900 mb-2">What happens next:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• We'll show you coaches who excel with various coaching styles</li>
              <li>• You can always request specific coaching approaches later</li>
              <li>• Your coach will adapt to your natural preferences over time</li>
            </ul>
          </CardContent>
        </Card>

        <Button 
          onClick={handleSkipDiscovery}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          Continue to Coach Matching
        </Button>
      </div>
    );
  }

  return null;
}