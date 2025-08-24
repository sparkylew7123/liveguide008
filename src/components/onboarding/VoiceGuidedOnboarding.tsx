'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { GoalDiscoveryFlow } from './GoalDiscoveryFlow';
import TypeformGoalSelection from './TypeformGoalSelection';
import VisualGoalMatching from './VisualGoalMatching';
import { CoachingStyleDiscovery } from './CoachingStyleDiscovery';
import { AgentMatchingPresentation } from './AgentMatchingPresentation';
import { OnboardingProgress } from './OnboardingProgress';
import SoundCheckSetup from './SoundCheckSetup';
import { CategorySelectionGrid } from './CategorySelectionGrid';
import { GoalSelectionPicker } from './GoalSelectionPicker';
import { TimeHorizonSlider } from './TimeHorizonSlider';
import { LearningPreferences } from './LearningPreferences';
import { SimpleVoiceOnboarding } from '../SimpleVoiceOnboarding';
import { AICoachesShowcase } from './AICoachesShowcase';

export type OnboardingPhase = 'agent_selection' | 'voice_onboarding' | 'goal_confirmation' | 'completed' | 'sound_check' | 'category_selection' | 'goal_selection' | 'time_horizon' | 'learning_preferences' | 'agent_matching' | 'agent_conversation';

interface OnboardingData {
  selectedAgent?: any;
  userName?: string;
  userGoals: Array<{
    userPhrase: string;
    matchedGoal?: any;
    preferredTerm?: string;
    confirmed: boolean;
    timeline?: 'short' | 'medium' | 'long';
    category?: string;
  }>;
  learningPreferences?: {
    style?: 'visual' | 'auditory' | 'hands-on';
    pace?: 'fast' | 'moderate' | 'slow';
    support?: 'high' | 'moderate' | 'minimal';
  };
  conversationComplete?: boolean;
}

interface VoiceGuidedOnboardingProps {
  user: any;
  userName: string;
}

export function VoiceGuidedOnboarding({ user, userName }: VoiceGuidedOnboardingProps) {
  const router = useRouter();
  const [currentPhase, setCurrentPhase] = useState<OnboardingPhase>('agent_selection');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    userGoals: [],
    userName: userName
  });
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0);
  const [voiceSession, setVoiceSession] = useState<any>(null);

  // Load agents and check onboarding status
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      
      try {
        const supabase = createClient();
        
        // Load agents with video URLs
        const { data: agentsData, error: agentsError } = await supabase
          .from('agent_personae')
          .select('*')
          .order('Name', { ascending: true });
        
        console.log('Loading agents:', { agentsData, agentsError });
        
        if (!agentsError && agentsData && agentsData.length > 0) {
          setAgents(agentsData);
        } else if (agentsError) {
          console.error('Error loading agents:', agentsError);
        }
        
        // Check if user has already completed onboarding
        if (user?.id && !user.id.startsWith('anon_')) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('onboarding_completed_at')
            .eq('id', user.id)
            .single();

          if (!error && profile?.onboarding_completed_at) {
            router.push('/agents');
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [user, router]);

  // Trigger save when all goals are confirmed
  useEffect(() => {
    if (currentPhase === 'goal_confirmation' && 
        currentGoalIndex >= onboardingData.userGoals.length && 
        onboardingData.userGoals.length > 0 &&
        onboardingData.userGoals.some(g => g.confirmed)) { // At least one goal must be confirmed
      saveOnboardingData();
    }
  }, [currentPhase, currentGoalIndex, onboardingData.userGoals.length]);

  const handleAgentSelect = useCallback((agentWithData: any) => {
    // Check if this includes conversation data from the voice call
    if (agentWithData.conversationData) {
      const { conversationData, ...agent } = agentWithData;
      setOnboardingData(prev => ({ 
        ...prev, 
        selectedAgent: agent,
        conversationComplete: true
      }));
      
      // Extract goals from conversation data
      if (conversationData.goals && conversationData.goals.length > 0) {
        const goals = conversationData.goals.map((g: any) => ({
          userPhrase: g.original || g.text,
          matchedGoal: g,
          confirmed: false,
          timeline: g.timeline || 'medium',
          category: g.category || 'Personal Growth'
        }));
        setOnboardingData(prev => ({ ...prev, userGoals: goals }));
        setCurrentGoalIndex(0);
        setCurrentPhase('goal_confirmation');
      } else {
        // No goals captured, but conversation completed - move to completion
        setCurrentPhase('completed');
      }
    } else {
      // Legacy flow - just agent selected without voice call
      setOnboardingData(prev => ({ ...prev, selectedAgent: agentWithData }));
      setIsLoading(true);
      setTimeout(() => {
        setCurrentPhase('voice_onboarding');
        setIsLoading(false);
      }, 500);
    }
  }, []);

  const handleInitiateCall = async () => {
    if (!onboardingData.selectedAgent) return;
    
    setIsLoading(true);
    try {
      // Initialize voice session with selected agent
      // This will trigger the voice-guided goal collection
      setCurrentPhase('voice_onboarding');
      
      // TODO: Initialize ElevenLabs conversation with selected agent
      // The agent will:
      // 1. Greet the user and get their name with pronunciation check
      // 2. Guide them through selecting 1-5 goals
      // 3. For each goal, seek confirmation on terminology
      // 4. Capture timeline preferences
      // 5. Learn about their learning style
      
    } catch (error) {
      console.error('Error initiating call:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoalConfirmation = async (goalIndex: number, confirmed: boolean, preferredTerm?: string) => {
    const updatedGoals = [...onboardingData.userGoals];
    updatedGoals[goalIndex] = {
      ...updatedGoals[goalIndex],
      confirmed,
      preferredTerm: preferredTerm || updatedGoals[goalIndex].userPhrase
    };
    
    setOnboardingData(prev => ({ ...prev, userGoals: updatedGoals }));
    
    // Move to next goal or complete
    if (goalIndex < updatedGoals.length - 1) {
      setCurrentGoalIndex(goalIndex + 1);
    } else {
      // All goals confirmed, save to database
      await saveOnboardingData();
    }
  };

  const saveOnboardingData = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const isAnonymousUser = user?.id?.startsWith('anon_');
      
      // Save confirmed goals to database
      if (!isAnonymousUser && onboardingData.userGoals.length > 0) {
        // Save to goal_translations table
        for (const goal of onboardingData.userGoals) {
          if (goal.confirmed) {
            await supabase
              .from('goal_translations')
              .insert({
                user_id: user.id,
                user_phrase: goal.userPhrase,
                matched_goal_id: goal.matchedGoal?.id,
                user_confirmed: true,
                user_preferred_term: goal.preferredTerm,
                confidence_score: 0.95
              });
            
            // Create goal node in graph
            await supabase.rpc('create_goal_node', {
              p_user_id: user.id,
              p_title: goal.preferredTerm || goal.userPhrase,
              p_category: goal.category || 'Personal Growth',
              p_properties: {
                description: `Goal: ${goal.preferredTerm || goal.userPhrase}`,
                timeline: goal.timeline,
                source: 'voice_onboarding',
                agent_id: onboardingData.selectedAgent?.uuid
              }
            });
          }
        }
        
        // Mark onboarding complete
        await supabase
          .from('profiles')
          .update({
            onboarding_completed_at: new Date().toISOString(),
            selected_agent_id: onboardingData.selectedAgent?.uuid
          })
          .eq('id', user.id);
      }
      
      setCurrentPhase('completed');
      router.push('/agents');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle voice conversation events
  const handleVoiceEvent = (event: any) => {
    console.log('Voice event:', event);
    
    if (event.type === 'goal_captured') {
      // Add captured goal to list for confirmation
      const newGoal = {
        userPhrase: event.userPhrase,
        matchedGoal: event.matchedGoal,
        confirmed: false,
        timeline: event.timeline,
        category: event.category
      };
      
      setOnboardingData(prev => ({
        ...prev,
        userGoals: [...prev.userGoals, newGoal]
      }));
    } else if (event.type === 'conversation_complete') {
      // Voice conversation finished, move to confirmation
      setCurrentPhase('goal_confirmation');
      setCurrentGoalIndex(0);
    } else if (event.type === 'user_name_captured') {
      setOnboardingData(prev => ({
        ...prev,
        userName: event.userName
      }));
    }
  };

  const renderCurrentPhase = () => {
    switch (currentPhase) {
      case 'agent_selection':
        return (
          <AICoachesShowcase 
            onSelectCoach={handleAgentSelect}
            selectedCoachId={onboardingData.selectedAgent?.uuid}
          />
        );

      case 'voice_onboarding':
        return (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-gray-900">
                Let's Get to Know You
              </h1>
              <p className="text-lg text-gray-600">
                {onboardingData.selectedAgent?.Name} will guide you through a brief conversation to understand your goals
              </p>
            </div>
            
            <SimpleVoiceOnboarding
              agentId={onboardingData.selectedAgent?.['11labs_agentID']}
              agentDetails={onboardingData.selectedAgent}
              userName={onboardingData.userName || userName}
              onComplete={(data) => {
                // Extract goals from conversation data
                if (data.goals && data.goals.length > 0) {
                  const goals = data.goals.map((g: any) => ({
                    userPhrase: g.original || g.text,
                    matchedGoal: g,
                    confirmed: false,
                    timeline: g.timeline || 'medium',
                    category: g.category || 'Personal Growth'
                  }));
                  setOnboardingData(prev => ({ ...prev, userGoals: goals }));
                  setCurrentGoalIndex(0); // Reset index for confirmation
                  setCurrentPhase('goal_confirmation');
                } else {
                  // No goals captured, stay in voice onboarding to try again
                  console.warn('No goals captured in voice conversation');
                  alert('No goals were captured. Please try speaking about your goals again, or refresh to restart.');
                  // Don't change phase - stay in voice_onboarding
                }
              }}
            />
          </div>
        );

      case 'goal_confirmation':
        const currentGoal = onboardingData.userGoals[currentGoalIndex];
        if (!currentGoal) {
          // Check if we have any confirmed goals
          const hasConfirmedGoals = onboardingData.userGoals.some(g => g.confirmed);
          if (hasConfirmedGoals) {
            // All goals processed and at least one confirmed, return loading state
            // saveOnboardingData will be triggered by useEffect
            return (
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                <p className="text-lg text-gray-600">Saving your preferences...</p>
              </div>
            );
          } else {
            // No goals confirmed, return to voice onboarding
            return (
              <div className="text-center space-y-4">
                <p className="text-lg text-gray-600">No goals were confirmed. Please try again.</p>
                <Button onClick={() => setCurrentPhase('voice_onboarding')}>
                  Try Again
                </Button>
              </div>
            );
          }
        }
        
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Goal {currentGoalIndex + 1} of {onboardingData.userGoals.length}
              </h2>
            </div>
            
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Confirm Your Goal</CardTitle>
                <CardDescription>
                  We heard: "{currentGoal.userPhrase}"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Is this what you meant? You can adjust the wording if needed.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleGoalConfirmation(currentGoalIndex, true)}
                    disabled={isLoading}
                  >
                    Yes, that's right
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleGoalConfirmation(currentGoalIndex, false)}
                    disabled={isLoading}
                  >
                    Skip this goal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'completed':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome to LiveGuide!
            </h1>
            <p className="text-lg text-gray-600">
              Your personalized onboarding is complete. Let's start your journey!
            </p>
          </div>
        );
        
      default:
        return null;
    }
  };

  const getProgressInfo = () => {
    const completedSteps = [];
    if (onboardingData.selectedAgent) completedSteps.push('Agent Selected');
    if (onboardingData.userGoals.length > 0) completedSteps.push(`${onboardingData.userGoals.length} Goals Captured`);
    if (onboardingData.userGoals.some(g => g.confirmed)) completedSteps.push('Goals Confirmed');
    return completedSteps;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header with Step Indicator */}
      <div className="bg-white shadow-sm px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-end mb-4">
            <div className="flex items-center space-x-2">
              {getProgressInfo().map((step, idx) => (
                <Badge key={idx} variant="secondary">{step}</Badge>
              ))}
            </div>
          </div>
          <OnboardingProgress
            currentPhase={currentPhase}
            onStepClick={(step) => {
              // Allow navigation to completed steps
              if (step === 'select_agent') setCurrentPhase('agent_selection');
              else if (step === 'select_goals' && onboardingData.selectedAgent) setCurrentPhase('voice_onboarding');
            }}
          />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-7xl">
          {isLoading && agents.length === 0 ? (
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
              <p className="text-lg text-gray-600">Loading onboarding experience...</p>
            </div>
          ) : (
            renderCurrentPhase()
          )}
        </div>
      </div>
    </div>
  );
}