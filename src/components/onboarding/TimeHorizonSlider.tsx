'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOnboardingPersistence } from '@/hooks/useOnboardingPersistence';
import { 
  CalendarIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { voiceUISync } from '@/lib/voice-ui-sync';
import type { VoiceCommand } from '@/hooks/useMayaVoiceOnboarding';

interface TimeHorizonSliderProps {
  timeHorizon?: 'short' | 'medium' | 'long';
  onComplete: (timeHorizon: 'short' | 'medium' | 'long') => void;
  isLoading?: boolean;
  voiceController?: {
    isConnected: boolean;
    isSpeaking: boolean;
    isListening: boolean;
    sendMessage: (message: string) => void;
    onVoiceCommand: (command: VoiceCommand) => void;
  };
}

type TimeHorizonOption = {
  value: 'short' | 'medium' | 'long';
  label: string;
  duration: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  examples: string[];
};

const timeHorizonOptions: TimeHorizonOption[] = [
  {
    value: 'short',
    label: 'Quick Wins',
    duration: '2-8 weeks',
    description: 'Build momentum with achievable goals',
    icon: ClockIcon,
    color: '#10B981', // green
    examples: ['Start a daily habit', 'Learn a basic skill', 'Improve a routine']
  },
  {
    value: 'medium',
    label: 'Steady Progress',
    duration: '3-6 months',
    description: 'Develop skills and create lasting change',
    icon: CalendarIcon,
    color: '#3B82F6', // blue
    examples: ['Master a new skill', 'Improve fitness significantly', 'Build stronger relationships']
  },
  {
    value: 'long',
    label: 'Life Changing',
    duration: '6+ months',
    description: 'Transform your life with major goals',
    icon: ChartBarIcon,
    color: '#8B5CF6', // purple
    examples: ['Career transition', 'Major health transformation', 'Start a business']
  }
];

export function TimeHorizonSlider({ 
  timeHorizon, 
  onComplete, 
  isLoading = false,
  voiceController 
}: TimeHorizonSliderProps) {
  // Use the persistence hook for automatic saving
  const { 
    onboardingState,
    saveTimeHorizon,
    debouncedSaveTimeHorizon,
    error: persistenceError,
    isLoading: isPersistenceLoading
  } = useOnboardingPersistence();

  const [selectedHorizon, setSelectedHorizon] = useState<'short' | 'medium' | 'long'>(
    onboardingState?.timeHorizon || timeHorizon || 'medium'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mayaIntroduced, setMayaIntroduced] = useState(false);
  const [isListeningForTimeline, setIsListeningForTimeline] = useState(false);
  const [highlightedOption, setHighlightedOption] = useState<'short' | 'medium' | 'long' | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Update local state when onboarding state changes
  useEffect(() => {
    if (onboardingState?.timeHorizon && onboardingState.timeHorizon !== selectedHorizon) {
      setSelectedHorizon(onboardingState.timeHorizon);
    }
  }, [onboardingState?.timeHorizon]);

  // Maya voice introduction for timeline
  useEffect(() => {
    if (voiceController?.isConnected && !mayaIntroduced) {
      setTimeout(() => {
        voiceController.sendMessage(`Now let's talk about timing! I see three options: Quick wins for 2-8 weeks, steady progress for 3-6 months, or life-changing goals for 6 months or more. What timeline feels right for your current situation? You can tell me something like "I'm thinking 3 to 6 months" or just click on your preferred option.`);
        setMayaIntroduced(true);
        setIsListeningForTimeline(true);
      }, 1000);
    }
  }, [voiceController?.isConnected, mayaIntroduced]);

  // Handle voice commands for timeline selection
  useEffect(() => {
    if (!voiceController) return;

    const handleVoiceCommand = (command: VoiceCommand) => {
      console.log('⏰ Timeline received voice command:', command);
      
      switch (command.intent) {
        case 'select_timeline':
          if (command.data.timeline) {
            const timeline = command.data.timeline as 'short' | 'medium' | 'long';
            if (timeHorizonOptions.some(opt => opt.value === timeline)) {
              // Animate selection
              voiceUISync.animateSelection(`timeline-${timeline}`, true);
              setTimeout(() => voiceUISync.animateSelection(`timeline-${timeline}`, false), 2000);
              
              setSelectedHorizon(timeline);
              debouncedSaveTimeHorizon(timeline);
              
              const option = timeHorizonOptions.find(opt => opt.value === timeline);
              if (option) {
                voiceController.sendMessage(`Perfect! You've chosen ${option.label} (${option.duration}). ${option.description} This is a great timeline for sustainable progress!`);
              }
            }
          }
          break;
          
        case 'describe_timeline':
          if (command.data.timeline) {
            const timeline = command.data.timeline as 'short' | 'medium' | 'long';
            const option = timeHorizonOptions.find(opt => opt.value === timeline);
            if (option) {
              setHighlightedOption(timeline);
              voiceUISync.highlightElement(`#timeline-${timeline}`, 3000);
              voiceController.sendMessage(`${option.label}: ${option.description}. This typically takes ${option.duration}. Examples include: ${option.examples.slice(0, 2).join(' and ')}. Does this timeline sound right for you?`);
              
              setTimeout(() => setHighlightedOption(null), 3000);
            }
          }
          break;
          
        case 'parse_natural_timeline':
          // Handle natural language like "3 months", "I want quick results", etc.
          if (command.data.natural_timeline) {
            const naturalInput = command.data.natural_timeline.toLowerCase();
            let detectedTimeline: 'short' | 'medium' | 'long' | null = null;
            
            // Parse common timeline expressions
            if (naturalInput.includes('quick') || naturalInput.includes('fast') || 
                naturalInput.includes('2 week') || naturalInput.includes('month') && naturalInput.includes('1')) {
              detectedTimeline = 'short';
            } else if (naturalInput.includes('3 month') || naturalInput.includes('4 month') || 
                      naturalInput.includes('5 month') || naturalInput.includes('6 month') || 
                      naturalInput.includes('steady') || naturalInput.includes('moderate')) {
              detectedTimeline = 'medium';
            } else if (naturalInput.includes('long') || naturalInput.includes('year') || 
                      naturalInput.includes('major') || naturalInput.includes('life chang')) {
              detectedTimeline = 'long';
            }
            
            if (detectedTimeline) {
              setSelectedHorizon(detectedTimeline);
              debouncedSaveTimeHorizon(detectedTimeline);
              
              const option = timeHorizonOptions.find(opt => opt.value === detectedTimeline);
              if (option) {
                voiceController.sendMessage(`I understand! Based on what you said, ${option.label} (${option.duration}) sounds like the right fit. ${option.description}`);
              }
            } else {
              voiceController.sendMessage(`I didn't quite catch that timeline. Could you tell me if you're thinking more short-term like a few weeks, medium-term like 3-6 months, or long-term like 6+ months?`);
            }
          }
          break;
      }
    };

    voiceController.onVoiceCommand = handleVoiceCommand;
  }, [voiceController, debouncedSaveTimeHorizon]);

  const handleContinue = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Save time horizon using the persistence layer
      await saveTimeHorizon(selectedHorizon);
      
      // Call the parent's onComplete callback
      onComplete(selectedHorizon);
      
      // Scroll to next section for accessibility
      setTimeout(() => {
        const nextSection = sectionRef.current?.parentElement?.nextElementSibling;
        if (nextSection) {
          nextSection.scrollIntoView({ behavior: 'smooth' });
          const nextHeading = nextSection.querySelector('h2');
          if (nextHeading) {
            (nextHeading as HTMLElement).focus();
          }
        }
      }, 150);
    } catch (err) {
      console.error('Failed to save time horizon:', err);
      setError('Failed to save your time preference. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHorizonSelect = (horizon: 'short' | 'medium' | 'long') => {
    setSelectedHorizon(horizon);
    
    // Auto-save in background (debounced)
    debouncedSaveTimeHorizon(horizon);
  };

  return (
    <section ref={sectionRef} className="space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <h2 
          tabIndex={-1}
          className="text-2xl md:text-3xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
        >
          What's your timeline?
        </h2>
        <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
          Choose the timeline that feels right for your current situation and motivation level.
        </p>
      </div>

      {/* Time Horizon Options */}
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {timeHorizonOptions.map((option, index) => {
            const IconComponent = option.icon;
            const isSelected = selectedHorizon === option.value;
            
            return (
              <motion.div
                key={option.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="relative"
              >
                <motion.button
                  id={`timeline-${option.value}`}
                  onClick={() => handleHorizonSelect(option.value)}
                  className={`
                    w-full p-6 rounded-xl text-center transition-all duration-300 border-2
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }
                    ${highlightedOption === option.value ? 'ring-2 ring-purple-400 ring-offset-2' : ''}
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-pressed={isSelected}
                  aria-describedby={`horizon-${option.value}-description`}
                >
                  {/* Selection Indicator */}
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isSelected ? 1 : 0,
                      opacity: isSelected ? 1 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                  >
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: isSelected ? 1 : 0 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </motion.svg>
                  </motion.div>

                  {/* Icon */}
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${option.color}20` }}
                  >
                    <IconComponent 
                      className="w-8 h-8"
                      style={{ color: option.color }}
                    />
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {option.label}
                      </h3>
                      <Badge 
                        variant="secondary" 
                        className="mt-1 text-xs"
                        style={{ 
                          backgroundColor: `${option.color}15`, 
                          color: option.color,
                          border: `1px solid ${option.color}30`
                        }}
                      >
                        {option.duration}
                      </Badge>
                    </div>

                    <p 
                      id={`horizon-${option.value}-description`}
                      className="text-sm text-gray-600 leading-relaxed"
                    >
                      {option.description}
                    </p>

                    {/* Examples */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Examples
                      </p>
                      <div className="space-y-1">
                        {option.examples.map((example, i) => (
                          <p key={i} className="text-xs text-gray-600 leading-tight">
                            • {example}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Glow effect for selected option */}
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        boxShadow: `0 0 20px ${option.color}40`,
                      }}
                    />
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Selected Timeline Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        {selectedHorizon && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {(() => {
                const selected = timeHorizonOptions.find(opt => opt.value === selectedHorizon);
                const IconComponent = selected?.icon || ClockIcon;
                return (
                  <>
                    <IconComponent 
                      className="w-5 h-5" 
                      style={{ color: selected?.color || '#3B82F6' }}
                    />
                    <span className="font-medium text-gray-900">
                      {selected?.label} ({selected?.duration})
                    </span>
                  </>
                );
              })()}
            </div>
            <p className="text-sm text-gray-600">
              Perfect! We'll focus on goals that can be achieved within this timeframe.
            </p>
          </div>
        )}
      </motion.div>

      {/* Continue Button */}
      <div className="text-center">
        <Button
          onClick={handleContinue}
          size="lg"
          disabled={isLoading || isSaving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-8 py-3 min-w-48"
        >
          {(isLoading || isSaving) ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
              />
              {isSaving ? 'Saving...' : 'Processing...'}
            </>
          ) : (
            <>
              Continue with {timeHorizonOptions.find(opt => opt.value === selectedHorizon)?.label}
            </>
          )}
        </Button>

        {/* Error Display */}
        {(error || persistenceError) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              {error || persistenceError}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setError(null)}
              className="mt-2"
            >
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}