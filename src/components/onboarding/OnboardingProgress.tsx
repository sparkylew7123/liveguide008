'use client';

import { Check, Target, Brain, Users } from 'lucide-react';
import { OnboardingPhase } from './VoiceGuidedOnboarding';

interface OnboardingProgressProps {
  currentPhase: OnboardingPhase;
  completedGoals: number;
  hasCoachingPreferences: boolean;
}

export function OnboardingProgress({ 
  currentPhase, 
  completedGoals, 
  hasCoachingPreferences 
}: OnboardingProgressProps) {
  const phases = [
    {
      id: 'goal_discovery',
      title: 'Goal Discovery',
      description: 'Share your aspirations',
      icon: Target,
      completed: completedGoals > 0,
      active: currentPhase === 'goal_discovery'
    },
    {
      id: 'coaching_style',
      title: 'Coaching Style',
      description: 'Discover your preferences',
      icon: Brain,
      completed: hasCoachingPreferences,
      active: currentPhase === 'coaching_style'
    },
    {
      id: 'agent_matching',
      title: 'Coach Matching',
      description: 'Meet your perfect coach',
      icon: Users,
      completed: false,
      active: currentPhase === 'agent_matching'
    }
  ];

  const getPhaseNumber = (phaseId: string) => {
    return phases.findIndex(p => p.id === phaseId) + 1;
  };

  return (
    <div className="w-full bg-white/80 backdrop-blur-sm border-b border-blue-200 py-4 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          {phases.map((phase, index) => (
            <div key={phase.id} className="flex items-center flex-1">
              {/* Phase Step */}
              <div className="flex items-center">
                <div className={`
                  relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                  ${phase.completed 
                    ? 'bg-green-500 border-green-500' 
                    : phase.active 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'bg-white border-gray-300'
                  }
                `}>
                  {phase.completed ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : phase.active ? (
                    <phase.icon className="w-5 h-5 text-white" />
                  ) : (
                    <span className="text-gray-400 font-medium">
                      {getPhaseNumber(phase.id)}
                    </span>
                  )}
                </div>
                
                <div className="ml-3">
                  <h3 className={`
                    text-sm font-medium transition-colors
                    ${phase.completed 
                      ? 'text-green-600' 
                      : phase.active 
                        ? 'text-blue-600' 
                        : 'text-gray-500'
                    }
                  `}>
                    {phase.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {phase.description}
                  </p>
                </div>
              </div>
              
              {/* Connector Line */}
              {index < phases.length - 1 && (
                <div className="flex-1 mx-4">
                  <div className={`
                    h-0.5 transition-colors duration-300
                    ${phase.completed ? 'bg-green-500' : 'bg-gray-300'}
                  `} />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Progress Summary */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            {completedGoals > 0 && (
              <span className="text-green-600 font-medium">
                {completedGoals} goals selected
              </span>
            )}
            {completedGoals > 0 && hasCoachingPreferences && (
              <span className="text-gray-400 mx-2">•</span>
            )}
            {hasCoachingPreferences && (
              <span className="text-green-600 font-medium">
                Coaching style discovered
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}