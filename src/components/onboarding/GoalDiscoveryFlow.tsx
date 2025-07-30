'use client';

import { useState, useEffect } from 'react';
import { useElevenLabsConversation } from '@/hooks/useElevenLabsConversation';
import { Conversation } from '@elevenlabs/client';
import { useDirectElevenLabsConnection } from '@/hooks/useDirectElevenLabsConnection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Loader2, Target, Sparkles, Zap } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { GoalCategoriesDisplay } from './GoalCategoriesDisplay';
import { generateCallId, formatMetadata } from '@/hooks/useElevenLabsConversation';
import { useRealtimeGoals } from '@/hooks/useRealtimeGoals';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  confidence?: number;
  selected?: boolean;
}

interface GoalDiscoveryFlowProps {
  user: any;
  userName: string;
  onComplete: (data: { selectedGoals: string[], context: any, confidence: number }) => void;
  isLoading: boolean;
}

export function GoalDiscoveryFlow({ 
  user, 
  userName, 
  onComplete, 
  isLoading 
}: GoalDiscoveryFlowProps) {
  const [phase, setPhase] = useState<'introduction' | 'conversation' | 'confirmation'>('introduction');
  const [detectedGoals, setDetectedGoals] = useState<Goal[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [conversationTranscript, setConversationTranscript] = useState<string>('');
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');

  // ElevenLabs agent for goal discovery
  const ELEVENLABS_AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'SuIlXQ4S6dyjrNViOrQ8';

  // Realtime goal detection
  const { 
    detectedGoals: realtimeGoals, 
    isListening, 
    goalCount,
    fetchExistingGoals
  } = useRealtimeGoals({
    userId: user.id,
    conversationId: currentConversationId,
    enabled: phase === 'conversation'
  });

  const conversation = useElevenLabsConversation(
    {
      agentId: ELEVENLABS_AGENT_ID,
      userId: user?.id,
      customCallId: generateCallId(user?.id || 'anonymous', 'goal_discovery'),
      metadata: formatMetadata({
        userName,
        sessionType: 'goal_discovery'
      })
    },
    {
      onConnect: () => {
        console.log('🎯 Connected to Maya (Goal Discovery Agent)');
        setMessages(prev => [...prev, 'Connected to Maya, your goal discovery guide']);
      },
      onDisconnect: () => {
        console.log('👋 Disconnected from Maya');
        setMessages(prev => [...prev, 'Conversation ended']);
      },
      onMessage: (message) => {
        console.log('💬 Maya:', message);
        setMessages(prev => [...prev, `Maya: ${message.message}`]);
        
        // TODO: Parse message for goal detection using MCP tool
        // This would integrate with the custom goal extraction tool
        handleGoalDetection(message.message);
      },
      onError: (error) => {
        console.error('❌ Goal Discovery Error:', error);
        const errorMessage = typeof error === 'string' ? error : (error as Error)?.message || 'Connection failed';
        setMessages(prev => [...prev, `Error: ${errorMessage}`]);
      },
    },
    // Pass overrides as third parameter
    {
      agent: {
        firstMessage: `Hello ${userName}! I'm Maya, your goal discovery guide. Let's explore what you'd like to achieve. What's been on your mind lately that you'd like to work on?`,
        language: "en",
      },
      conversation: {
        textOnly: false,
      },
    }
  );

  // Sync realtime goals with local state
  useEffect(() => {
    if (realtimeGoals.length > 0) {
      console.log('🔄 Syncing realtime goals with local state:', realtimeGoals.length);
      
      // Convert realtime goals to Goal format
      const goals: Goal[] = realtimeGoals.map(rtGoal => ({
        id: rtGoal.id,
        title: rtGoal.goal_title,
        description: rtGoal.goal_description || `Detected from conversation with ${Math.round((rtGoal.metadata?.voice_confidence || 0.8) * 100)}% confidence`,
        category: rtGoal.metadata?.category || 'personal_growth',
        confidence: rtGoal.metadata?.voice_confidence || 0.8
      }));
      
      setDetectedGoals(goals);
      
      // Auto-select highly confident goals
      const highConfidenceGoals = goals
        .filter(g => (g.confidence || 0) > 0.8)
        .map(g => g.id);
      
      setSelectedGoals(prev => {
        const combined = [...new Set([...prev, ...highConfidenceGoals])];
        return combined;
      });
    }
  }, [realtimeGoals]);

  const handleGoalDetection = async (agentMessage: string) => {
    // Real-time goal detection now happens via webhook/realtime subscription
    // This function is kept for backward compatibility and immediate feedback
    console.log('📝 Processing message for goal hints:', agentMessage);
    
    // Add conversation context for better webhook processing
    setConversationTranscript(prev => prev + '\n' + agentMessage);
  };

  // Helper functions for goal formatting
  const formatGoalTitle = (goalId: string): string => {
    const goalTitles: Record<string, string> = {
      'public_speaking_confidence': 'Public Speaking Confidence',
      'leadership_skills': 'Leadership Skills',
      'emotional_intelligence': 'Emotional Intelligence',
      'mindfulness_meditation': 'Mindfulness & Meditation',
      'time_management': 'Time Management',
      'career_advancement': 'Career Advancement',
      'skill_development': 'Skill Development',
      'networking': 'Professional Networking',
      'work_life_balance': 'Work-Life Balance',
      'entrepreneurship': 'Entrepreneurship',
      'fitness_goals': 'Fitness Goals',
      'nutrition_habits': 'Nutrition & Healthy Eating',
      'stress_management': 'Stress Management',
      'sleep_optimization': 'Sleep Optimization',
      'mental_health': 'Mental Health & Wellbeing',
      'communication_skills': 'Communication Skills',
      'dating_relationships': 'Dating & Relationships',
      'family_dynamics': 'Family Dynamics',
      'social_skills': 'Social Skills',
      'conflict_resolution': 'Conflict Resolution'
    };
    
    return goalTitles[goalId] || goalId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getGoalCategory = (goalId: string): string => {
    const goalCategories: Record<string, string> = {
      'public_speaking_confidence': 'personal_growth',
      'leadership_skills': 'personal_growth',
      'emotional_intelligence': 'personal_growth',
      'mindfulness_meditation': 'personal_growth',
      'time_management': 'personal_growth',
      'career_advancement': 'professional',
      'skill_development': 'professional',
      'networking': 'professional',
      'work_life_balance': 'professional',
      'entrepreneurship': 'professional',
      'fitness_goals': 'health_wellness',
      'nutrition_habits': 'health_wellness',
      'stress_management': 'health_wellness',
      'sleep_optimization': 'health_wellness',
      'mental_health': 'health_wellness',
      'communication_skills': 'relationships',
      'dating_relationships': 'relationships',
      'family_dynamics': 'relationships',
      'social_skills': 'relationships',
      'conflict_resolution': 'relationships'
    };
    
    return goalCategories[goalId] || 'personal_growth';
  };

  const startGoalDiscovery = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsPermissionGranted(true);
      
      // Generate a unique call ID for tracking
      const customCallId = generateCallId(user.id, 'goal_discovery');
      
      // Set conversation ID for realtime tracking
      setCurrentConversationId(customCallId);
      
      console.log('🚀 Starting connection to agent (auth disabled)...');
      
      console.log('🚀 Starting ElevenLabs conversation with custom first message...');
      
      // Start session - overrides are configured in the hook initialization
      const conversationId = await conversation.startSession();
      
      console.log('✅ ElevenLabs conversation started successfully:', conversationId);
      
      // Store the call ID for tracking
      sessionStorage.setItem('current_call_id', customCallId);
      
      // Fetch any existing goals for this conversation
      await fetchExistingGoals();
      
      setPhase('conversation');
      setMessages(prev => [...prev, 'Starting goal discovery conversation...']);
    } catch (error) {
      console.error('Failed to start goal discovery:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessages(prev => [...prev, `Failed to start: ${errorMessage}`]);
    }
  };

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoals(prev => {
      const isSelected = prev.includes(goalId);
      if (isSelected) {
        return prev.filter(id => id !== goalId);
      } else {
        return [...prev, goalId];
      }
    });
  };

  const handleConfirmGoals = () => {
    if (selectedGoals.length === 0) {
      alert('Please select at least one goal to continue.');
      return;
    }
    
    // Calculate average confidence
    const avgConfidence = detectedGoals
      .filter(g => selectedGoals.includes(g.id))
      .reduce((acc, g) => acc + (g.confidence || 0.8), 0) / selectedGoals.length;
    
    onComplete({
      selectedGoals,
      context: {
        transcript: conversationTranscript,
        detectedGoals: detectedGoals,
        conversation_method: 'voice',
        discovery_duration: Date.now() // Would calculate actual duration
      },
      confidence: avgConfidence
    });
  };

  const handleSkipToManualSelection = () => {
    setPhase('confirmation');
    // TODO: Load goal categories for manual selection
  };

  if (phase === 'introduction') {
    return (
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Target className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to Goal Discovery, {userName}!
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            I'm Maya, your goal discovery guide. I'll help you discover what you'd like to achieve through a natural conversation. 
            This usually takes 3-5 minutes and will help us find the perfect coach for you.
          </p>
        </div>
        
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              How it works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-600">1</span>
              </div>
              <p className="text-sm text-gray-600">
                We'll have a relaxed conversation about what's on your mind lately
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-600">2</span>
              </div>
              <p className="text-sm text-gray-600">
                I'll help you identify specific goals you'd like to work on
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-600">3</span>
              </div>
              <p className="text-sm text-gray-600">
                You'll confirm which goals resonate most with you
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          <Button 
            onClick={startGoalDiscovery}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Start Voice Discovery
              </>
            )}
          </Button>
          
          <div className="text-center">
            <Button 
              variant="ghost" 
              onClick={handleSkipToManualSelection}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip to manual goal selection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'conversation') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Goal Discovery with Maya
          </CardTitle>
          <CardDescription>
            Having a natural conversation about your goals and aspirations
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Conversation Status */}
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

          {/* Detected Goals */}
          {/* Realtime Goal Detection Status */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              {isListening ? (
                <Zap className="w-4 h-4 text-blue-600 animate-pulse" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isListening ? 'Listening for goals...' : 'Goals detected:'}
              {goalCount > 0 && (
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                  {goalCount} found
                </Badge>
              )}
            </h3>
            
            {detectedGoals.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {detectedGoals.map(goal => (
                  <Badge 
                    key={goal.id}
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {goal.title} ({Math.round((goal.confidence || 0) * 100)}%)
                  </Badge>
                ))}
              </div>
            )}
          </div>

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
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Finish Discovery & Review Goals
                </Button>
                <p className="text-xs text-center text-gray-500">
                  Speak naturally - I'm listening and identifying your goals
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Button 
                  onClick={startGoalDiscovery}
                  disabled={conversation.status === 'connecting'}
                  className="w-full"
                >
                  {conversation.status === 'connecting' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Reconnect to Maya'
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setPhase('confirmation')}
                  className="w-full text-gray-500"
                >
                  Skip to manual selection
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
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Let's confirm your goals
          </h2>
          <p className="text-gray-600">
            {detectedGoals.length > 0 
              ? "I identified these goals from our conversation. Select the ones that resonate most with you:"
              : "Choose the goals you'd like to work on:"
            }
          </p>
        </div>

        {detectedGoals.length > 0 ? (
          <div className="space-y-4">
            {detectedGoals.map(goal => (
              <Card 
                key={goal.id}
                className={`cursor-pointer transition-all ${
                  selectedGoals.includes(goal.id) 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleGoalSelect(goal.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{goal.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                      {goal.confidence && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            {Math.round(goal.confidence * 100)}% confidence
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className={`ml-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedGoals.includes(goal.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedGoals.includes(goal.id) && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <GoalCategoriesDisplay 
            selectedGoals={selectedGoals}
            onGoalSelect={handleGoalSelect}
          />
        )}

        <div className="text-center">
          <Button 
            onClick={handleConfirmGoals}
            size="lg"
            disabled={selectedGoals.length === 0 || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Goals...
              </>
            ) : (
              <>
                Continue with {selectedGoals.length} goal{selectedGoals.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}