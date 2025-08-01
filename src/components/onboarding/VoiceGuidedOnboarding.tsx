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
      // Skip profile check for anonymous users
      if (user.id?.startsWith('anon_')) {
        setLoading(false);
        return;
      }
      
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
      
      // This function now integrates with both the traditional tables and the new graph model:
      // 1. goal_discovery: Creates Goal nodes and tracks initial confidence as Emotion nodes
      // 2. coaching_style: Tracks emotional state based on preferences (confident, motivated, anxious, uncertain)
      // 3. Maintains backward compatibility with existing profile and user_goals tables
      
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
          
          // Save selected goals to both profile and user_goals table
          if (data.selectedGoals.length > 0) {
            try {
              // Extract goal information from the selected goals
              const goalInfo = data.selectedGoals.map((goal: any) => ({
                id: goal.id || goal,
                title: goal.title || goal,
                category: goal.category || 'Personal Growth',
                timescale: goal.timescale || '3-months',
                confidence: goal.confidence || 0.8
              }));
              
              // Check if this is an anonymous user
              const isAnonymousUser = user.id?.startsWith('anon_');
              
              // Save goals to profile (for backward compatibility) - skip for anonymous users
              if (!isAnonymousUser) {
                await supabase
                  .from('profiles')
                  .update({
                    selected_goals: goalInfo,
                    goals_updated_at: new Date().toISOString()
                  })
                  .eq('id', user.id);
              }
              
              // Save goals to user_goals table for the app to use
              const goalInserts = data.selectedGoals.map((goal: any) => ({
                user_id: user.id,
                profile_id: user.id,
                title: goal.title || goal,
                category: goal.category || 'Personal Growth',
                selection_method: 'voice',
                voice_confidence: goal.confidence || 0.8,
                selection_context: {
                  timescale: goal.timescale || '3-months',
                  original_id: goal.id || '',
                  onboarding_phase: 'voice_guided',
                  selected_at: new Date().toISOString()
                }
              }));
              
              // Skip the old user_goals table insert since we're using graph database now
              // The old table doesn't exist in the new schema
              console.log('Skipping old user_goals table insert, using graph database instead');
              
              // NEW: Create Goal nodes in graph model
              const goalNodePromises = data.selectedGoals.map(async (goal: any) => {
                try {
                  // Check if this is an anonymous user
                  const isAnonymousUser = user.id?.startsWith('anon_');
                  
                  // Skip creating goal nodes for anonymous users
                  if (isAnonymousUser) {
                    console.log('Skipping goal node creation for anonymous user');
                    return null;
                  }
                  
                  // Create goal node using the database function
                  const { data: goalNode, error: goalNodeError } = await supabase
                    .rpc('create_goal_node', {
                      p_user_id: user.id,
                      p_title: goal.title || goal,
                      p_category: goal.category || 'Personal Growth',
                      p_properties: {
                        description: `Goal selected during voice-guided onboarding${goal.timescale ? ` with ${goal.timescale} timeline` : ''}`,
                        target_date: goal.timescale === '3-months' 
                          ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                          : goal.timescale === '6-months'
                          ? new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                          : goal.timescale === '1-year'
                          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                          : null,
                        priority: 'high' // Goals selected during onboarding are high priority
                      }
                    });
                  
                  if (goalNodeError) {
                    console.error('Error creating goal node:', goalNodeError);
                    return null;
                  }
                  
                  // Track initial confidence as emotion (only for authenticated users)
                  if (!isAnonymousUser) {
                    const confidence = goal.confidence || 0.8;
                    const emotionType = confidence >= 0.7 ? 'confident' : confidence >= 0.4 ? 'motivated' : 'uncertain';
                    const emotionIntensity = confidence >= 0.7 ? confidence : confidence >= 0.4 ? 0.6 : 0.4;
                    
                    const { error: emotionError } = await supabase
                      .rpc('track_emotion', {
                        p_user_id: user.id,
                        p_emotion: emotionType,
                        p_intensity: emotionIntensity,
                        p_context: `Initial confidence for goal: ${goal.title || goal}`
                      });
                    
                    if (emotionError) {
                      console.error('Error tracking emotion:', emotionError);
                    }
                  }
                  
                  return goalNode;
                } catch (error) {
                  console.error('Error in graph operations for goal:', goal, error);
                  return null;
                }
              });
              
              // Wait for all graph operations to complete
              const goalNodes = await Promise.all(goalNodePromises);
              console.log('Created goal nodes:', goalNodes.filter(n => n !== null));
                
            } catch (error) {
              console.error('Error saving goals:', error);
              // Continue with onboarding even if goal saving fails
            }
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
          
          // Check if this is an anonymous user
          const isAnonymousUser = user.id?.startsWith('anon_');
          
          // Save coaching preferences to profile (for backward compatibility) - skip for anonymous users
          if (!isAnonymousUser) {
            await supabase
              .from('profiles')
              .update({
                coaching_preferences: data.coachingPreferences,
                onboarding_method: 'voice'
              })
              .eq('id', user.id);
          }
          
          // NEW: Track emotions based on coaching preferences
          // Analyze preferences to determine initial emotional state
          try {
            const prefs = data.coachingPreferences;
            
            // Determine overall emotional state based on preferences
            // High Energy + High Structure = Confident/Motivated
            // Low Energy + Low Structure = Uncertain/Anxious
            const energyLevel = prefs.Energy?.level || 'balanced';
            const structureLevel = prefs.Structure?.level || 'balanced';
            
            let emotionType: string;
            let emotionIntensity: number;
            
            if (energyLevel === 'high' && structureLevel === 'high') {
              emotionType = 'confident';
              emotionIntensity = 0.8;
            } else if (energyLevel === 'high' && structureLevel === 'low') {
              emotionType = 'motivated';
              emotionIntensity = 0.7;
            } else if (energyLevel === 'low' && structureLevel === 'high') {
              emotionType = 'anxious';
              emotionIntensity = 0.5;
            } else if (energyLevel === 'low' && structureLevel === 'low') {
              emotionType = 'uncertain';
              emotionIntensity = 0.6;
            } else {
              // Balanced preferences
              emotionType = 'motivated';
              emotionIntensity = 0.7;
            }
            
            // Track the initial emotional state (only for authenticated users)
            if (!isAnonymousUser) {
              const { error: emotionError } = await supabase
                .rpc('track_emotion', {
                  p_user_id: user.id,
                  p_emotion: emotionType,
                  p_intensity: emotionIntensity,
                  p_context: `Initial emotional state based on coaching preferences: Energy=${energyLevel}, Structure=${structureLevel}`
                });
              
              if (emotionError) {
                console.error('Error tracking coaching preference emotion:', emotionError);
              } else {
                console.log(`Tracked initial emotion: ${emotionType} (${emotionIntensity})`);
              }
            }
            
            // Also track if user has specific concerns
            if (prefs.Information?.level === 'high' && !isAnonymousUser) {
              // User wants lots of information - might indicate uncertainty
              await supabase
                .rpc('track_emotion', {
                  p_user_id: user.id,
                  p_emotion: 'uncertain',
                  p_intensity: 0.4,
                  p_context: 'User prefers high information - may need extra clarity and guidance'
                });
            }
          } catch (error) {
            console.error('Error tracking coaching preference emotions:', error);
            // Continue with onboarding even if emotion tracking fails
          }
          
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
          
          // Check if this is an anonymous user
          const isAnonymousUser = user.id?.startsWith('anon_');
          
          // Mark onboarding as completed (skip for anonymous users)
          if (!isAnonymousUser) {
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
          }
          
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
            onSkip={() => handleSkipPhase('goal_discovery')}
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