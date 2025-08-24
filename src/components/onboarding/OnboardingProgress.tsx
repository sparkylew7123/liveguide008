'use client';

import { CheckIcon, ViewfinderCircleIcon, CpuChipIcon, UsersIcon, AcademicCapIcon, SparklesIcon, FolderIcon, ClockIcon, LightBulbIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { OnboardingPhase } from './VoiceGuidedOnboarding';

interface OnboardingProgressProps {
  currentPhase: OnboardingPhase;
  completedGoals: number;
  selectedCategories: number;
  hasTimeHorizon: boolean;
  hasLearningPreferences: boolean;
  hasCoachingPreferences: boolean;
  hasSelectedAgent?: boolean;
  hasConversationComplete?: boolean;
}

export function OnboardingProgress({ 
  currentPhase, 
  completedGoals,
  selectedCategories,
  hasTimeHorizon,
  hasLearningPreferences,
  hasCoachingPreferences,
  hasSelectedAgent = false,
  hasConversationComplete = false
}: OnboardingProgressProps) {
  const phases = [
    {
      id: 'category_selection',
      title: 'Categories',
      description: 'Choose your focus areas',
      icon: FolderIcon,
      completed: selectedCategories > 0,
      active: currentPhase === 'category_selection'
    },
    {
      id: 'goal_selection',
      title: 'Goals',
      description: 'Select specific goals',
      icon: AcademicCapIcon,
      completed: completedGoals > 0,
      active: currentPhase === 'goal_selection'
    },
    {
      id: 'time_horizon',
      title: 'Timeline',
      description: 'Set your timeframe',
      icon: ClockIcon,
      completed: hasTimeHorizon,
      active: currentPhase === 'time_horizon'
    },
    {
      id: 'learning_preferences',
      title: 'Preferences',
      description: 'How you learn best',
      icon: LightBulbIcon,
      completed: hasLearningPreferences,
      active: currentPhase === 'learning_preferences'
    },
    {
      id: 'agent_matching',
      title: 'Coach Match',
      description: 'Find your perfect coach',
      icon: UsersIcon,
      completed: hasSelectedAgent,
      active: currentPhase === 'agent_matching'
    },
    {
      id: 'agent_conversation',
      title: 'Voice Chat',
      description: 'Talk with your coach',
      icon: ChatBubbleLeftRightIcon,
      completed: hasConversationComplete,
      active: currentPhase === 'agent_conversation'
    }
  ];

  const getPhaseNumber = (phaseId: string) => {
    return phases.findIndex(p => p.id === phaseId) + 1;
  };

  return (
    <div className="w-full bg-white/80 backdrop-blur-sm border-b border-blue-200 py-2 sm:py-4 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hide step indicators on mobile */}
        <div className="hidden sm:flex items-center justify-between">
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
                    <CheckIcon  className="w-5 h-5 text-white" />
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
        
        {/* Progress Summary - Hidden on mobile */}
        <div className="hidden sm:block mt-4 text-center">
          <p className="text-sm text-gray-600">
            {selectedCategories > 0 && (
              <span className="text-green-600 font-medium">
                {selectedCategories} categories chosen
              </span>
            )}
            {selectedCategories > 0 && completedGoals > 0 && (
              <span className="text-gray-400 mx-2">•</span>
            )}
            {completedGoals > 0 && (
              <span className="text-green-600 font-medium">
                {completedGoals} goals selected
              </span>
            )}
            {completedGoals > 0 && (hasTimeHorizon || hasLearningPreferences) && (
              <span className="text-gray-400 mx-2">•</span>
            )}
            {(hasTimeHorizon || hasLearningPreferences) && (
              <span className="text-green-600 font-medium">
                Preferences set
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}