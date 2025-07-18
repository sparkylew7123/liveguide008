'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { GoalDiscoveryFlow } from './GoalDiscoveryFlow';
import TypeformGoalSelection from './TypeformGoalSelection';
import VisualGoalMatching from './VisualGoalMatching';
import { CoachingStyleDiscovery } from './CoachingStyleDiscovery';
import { AgentMatchingPresentation } from './AgentMatchingPresentation';
import { OnboardingProgress } from './OnboardingProgress';
import SoundCheckSetup from './SoundCheckSetup';

export type OnboardingPhase = 'setup' | 'goal_discovery' | 'coaching_style' | 'agent_matching' | 'completed';

interface OnboardingData {
  selectedGoals: string[];
  userPreferences?: {
    userName: string;
    voicePreference: 'male' | 'female' | 'no-preference';
    microphoneWorking: boolean;
  };
  coachingPreferences?: {
    Energy?: any;
    Information?: any;
    Decisions?: any;
    Structure?: any;
  };
  matchedAgents?: any[];
  selectedAgent?: any;
}

interface VoiceGuidedOnboardingProps {
  user: any;
  userName: string;
}

export function VoiceGuidedOnboarding({ user, userName }: VoiceGuidedOnboardingProps) {
  const router = useRouter();
  const [currentPhase, setCurrentPhase] = useState<OnboardingPhase>('setup');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    selectedGoals: []
  });
  const [isLoading, setIsLoading] = useState(false);

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed_at, coaching_preferences')
        .eq('id', user.id)
        .single();

      if (profile?.onboarding_completed_at) {
        // User has completed onboarding, redirect to agents
        router.push('/agents');
      }
    };

    if (user) {
      checkOnboardingStatus();
    }
  }, [user, router]);

  const handlePhaseComplete = async (phase: OnboardingPhase, data: any) => {
    setIsLoading(true);
    
    try {
      const supabase = createClient();
      
      switch (phase) {
        case 'setup':
          // Update onboarding data with user preferences
          const withSetupData = {
            ...onboardingData,
            userPreferences: data
          };
          setOnboardingData(withSetupData);
          
          // Move to goal discovery
          setCurrentPhase('goal_discovery');
          break;
          
        case 'goal_discovery':
          // Update onboarding data with selected goals
          const updatedData = {
            ...onboardingData,
            selectedGoals: data.selectedGoals
          };
          setOnboardingData(updatedData);
          
          // Save selected goals to database
          if (data.selectedGoals.length > 0) {
            const goalInserts = data.selectedGoals.map((goalId: string) => ({
              user_id: user.id,
              profile_id: user.id,
              goal_id: goalId,
              selection_method: 'voice',
              selection_context: data.context || {},
              voice_confidence: data.confidence || 0.8
            }));
            
            await supabase.from('user_goals').insert(goalInserts);
          }
          
          // Move to coaching style discovery
          setCurrentPhase('coaching_style');
          break;
          
        case 'coaching_style':
          // Update onboarding data with coaching preferences
          const withCoachingData = {
            ...onboardingData,
            coachingPreferences: data.coachingPreferences
          };
          setOnboardingData(withCoachingData);
          
          // Save coaching preferences to profile
          await supabase
            .from('profiles')
            .update({
              coaching_preferences: data.coachingPreferences,
              onboarding_method: 'voice'
            })
            .eq('id', user.id);
          
          // Move to agent matching
          setCurrentPhase('agent_matching');
          break;
          
        case 'agent_matching':
          // Update onboarding data with selected agent
          const finalData = {
            ...onboardingData,
            selectedAgent: data.selectedAgent
          };
          setOnboardingData(finalData);
          
          // Mark onboarding as completed
          await supabase
            .from('profiles')
            .update({
              onboarding_completed_at: new Date().toISOString()
            })
            .eq('id', user.id);
          
          // Create agent matching session record
          await supabase
            .from('agent_matching_sessions')
            .insert({
              user_id: user.id,
              user_goals: finalData.selectedGoals,
              coaching_preferences: finalData.coachingPreferences || {},
              matched_agents: data.matchedAgents || [],
              selected_agent_id: data.selectedAgent?.uuid,
              matching_algorithm_version: '2.0'
            });
          
          // Redirect to agent conversation
          router.push('/agents');
          break;
      }
    } catch (error) {
      console.error('Error completing onboarding phase:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipPhase = async (phase: OnboardingPhase) => {
    switch (phase) {
      case 'coaching_style':
        // Skip to agent matching with balanced algorithm
        setCurrentPhase('agent_matching');
        break;
      default:
        console.log('Skip not supported for this phase');
    }
  };

  const renderCurrentPhase = () => {
    switch (currentPhase) {
      case 'setup':
        return (
          <SoundCheckSetup
            onComplete={(preferences) => handlePhaseComplete('setup', preferences)}
          />
        );
        
      case 'goal_discovery':
        return (
          <TypeformGoalSelection
            onComplete={(selectedGoals) => handlePhaseComplete('goal_discovery', { selectedGoals })}
            onSkip={() => handlePhaseSkip('goal_discovery')}
            userPreferences={onboardingData.userPreferences}
          />
        );
        
      case 'coaching_style':
        return (
          <CoachingStyleDiscovery
            user={user}
            userName={userName}
            selectedGoals={onboardingData.selectedGoals}
            onComplete={(data) => handlePhaseComplete('coaching_style', data)}
            onSkip={() => handleSkipPhase('coaching_style')}
            isLoading={isLoading}
          />
        );
        
      case 'agent_matching':
        return (
          <AgentMatchingPresentation
            user={user}
            userName={userName}
            selectedGoals={onboardingData.selectedGoals}
            coachingPreferences={onboardingData.coachingPreferences}
            onComplete={(data) => handlePhaseComplete('agent_matching', data)}
            isLoading={isLoading}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress Indicator */}
      <OnboardingProgress 
        currentPhase={currentPhase}
        completedGoals={onboardingData.selectedGoals.length}
        hasCoachingPreferences={!!onboardingData.coachingPreferences}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {renderCurrentPhase()}
        </div>
      </div>
    </div>
  );
}