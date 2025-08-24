'use client';

import React from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

export type OnboardingStep = 
  | 'select_agent'
  | 'select_goals' 
  | 'select_knowledge'
  | 'determine_learning'
  | 'match_guide'
  | 'completed';

interface StepInfo {
  id: OnboardingStep;
  label: string;
  shortLabel: string;
  description: string;
}

const STEPS: StepInfo[] = [
  {
    id: 'select_agent',
    label: 'Select onboarding agent',
    shortLabel: 'Step 1',
    description: 'Choose your onboarding guide'
  },
  {
    id: 'select_goals',
    label: 'Select Goals',
    shortLabel: 'Step 2',
    description: 'Define your objectives'
  },
  {
    id: 'select_knowledge',
    label: 'Select Knowledge',
    shortLabel: 'Step 3',
    description: 'Choose learning areas'
  },
  {
    id: 'determine_learning',
    label: 'Determine Learning Preferences',
    shortLabel: 'Step 4',
    description: 'Set your learning style'
  },
  {
    id: 'match_guide',
    label: 'Match the Guide to the Goal',
    shortLabel: 'Step 5',
    description: 'Find your perfect coach'
  }
];

interface OnboardingStepIndicatorProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  onStepClick?: (step: OnboardingStep) => void;
  className?: string;
}

export default function OnboardingStepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
  className
}: OnboardingStepIndicatorProps) {
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const getStepStatus = (step: StepInfo, index: number) => {
    if (completedSteps.includes(step.id)) return 'completed';
    if (step.id === currentStep) return 'current';
    if (index < currentStepIndex) return 'past';
    return 'future';
  };

  const canNavigateToStep = (step: StepInfo) => {
    return completedSteps.includes(step.id) && onStepClick;
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile view - Dots */}
      <div className="flex md:hidden justify-center items-center gap-2 mb-4">
        {STEPS.map((step, index) => {
          const status = getStepStatus(step, index);
          const canNavigate = canNavigateToStep(step);
          
          return (
            <button
              key={step.id}
              onClick={() => canNavigate && onStepClick(step.id)}
              disabled={!canNavigate}
              className={cn(
                "transition-all duration-300",
                status === 'current' && "scale-125"
              )}
              aria-label={`${step.shortLabel}: ${step.label}`}
              aria-current={status === 'current' ? 'step' : undefined}
            >
              <div className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                status === 'completed' && "bg-green-500",
                status === 'current' && "bg-blue-600 ring-4 ring-blue-200",
                status === 'past' && "bg-gray-400",
                status === 'future' && "bg-gray-300"
              )} />
            </button>
          );
        })}
      </div>

      {/* Desktop view - Full steps */}
      <div className="hidden md:flex items-center justify-between">
        {STEPS.map((step, index) => {
          const status = getStepStatus(step, index);
          const canNavigate = canNavigateToStep(step);
          const isLast = index === STEPS.length - 1;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <button
                  onClick={() => canNavigate && onStepClick(step.id)}
                  disabled={!canNavigate}
                  className={cn(
                    "group flex flex-col items-center",
                    canNavigate && "cursor-pointer"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                    "border-2",
                    status === 'completed' && "bg-green-500 border-green-500",
                    status === 'current' && "bg-blue-600 border-blue-600 ring-4 ring-blue-200",
                    status === 'past' && "bg-gray-400 border-gray-400",
                    status === 'future' && "bg-white border-gray-300",
                    canNavigate && "group-hover:scale-110"
                  )}>
                    {status === 'completed' ? (
                      <CheckIcon className="w-6 h-6 text-white" />
                    ) : (
                      <span className={cn(
                        "text-sm font-semibold",
                        (status === 'current' || status === 'past') ? "text-white" : "text-gray-500"
                      )}>
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={cn(
                      "text-xs font-medium",
                      status === 'current' ? "text-blue-600" : "text-gray-600"
                    )}>
                      {step.shortLabel}
                    </p>
                    <p className={cn(
                      "text-xs mt-1 max-w-[100px]",
                      status === 'current' ? "text-gray-900 font-medium" : "text-gray-500"
                    )}>
                      {step.label}
                    </p>
                  </div>
                </button>
              </div>

              {!isLast && (
                <div className="flex-1 max-w-[100px]">
                  <div className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    status === 'completed' || STEPS[index + 1] && getStepStatus(STEPS[index + 1], index + 1) !== 'future'
                      ? "bg-blue-600"
                      : "bg-gray-300"
                  )} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current step description - Mobile only */}
      <div className="md:hidden text-center mt-2">
        <p className="text-sm font-medium text-gray-900">
          {STEPS[currentStepIndex]?.label}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {STEPS[currentStepIndex]?.description}
        </p>
      </div>
    </div>
  );
}