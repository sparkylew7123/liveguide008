'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOnboardingPersistence } from '@/hooks/useOnboardingPersistence';
import { 
  EyeIcon,
  SpeakerWaveIcon,
  HandRaisedIcon,
  BoltIcon,
  PlayIcon,
  UserGroupIcon,
  AcademicCapIcon,
  HeartIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { voiceUISync } from '@/lib/voice-ui-sync';
import type { VoiceCommand } from '@/hooks/useMayaVoiceOnboarding';

interface LearningPreferencesProps {
  learningPreferences?: {
    style?: 'visual' | 'auditory' | 'hands-on';
    pace?: 'fast' | 'moderate' | 'slow';
    support?: 'high' | 'moderate' | 'minimal';
  };
  onComplete: (learningPreferences: {
    style: 'visual' | 'auditory' | 'hands-on';
    pace: 'fast' | 'moderate' | 'slow';
    support: 'high' | 'moderate' | 'minimal';
  }) => void;
  isLoading?: boolean;
  voiceController?: {
    isConnected: boolean;
    isSpeaking: boolean;
    isListening: boolean;
    sendMessage: (message: string) => void;
    onVoiceCommand: (command: VoiceCommand) => void;
  };
}

type PreferenceOption<T> = {
  value: T;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  examples: string[];
};

const styleOptions: PreferenceOption<'visual' | 'auditory' | 'hands-on'>[] = [
  {
    value: 'visual',
    label: 'Visual Learner',
    description: 'I learn best through seeing and reading',
    icon: EyeIcon,
    color: '#3B82F6',
    examples: ['Charts & diagrams', 'Written instructions', 'Video demonstrations']
  },
  {
    value: 'auditory',
    label: 'Audio Learner',
    description: 'I learn best through listening and discussion',
    icon: SpeakerWaveIcon,
    color: '#10B981',
    examples: ['Voice coaching', 'Podcasts', 'Verbal feedback']
  },
  {
    value: 'hands-on',
    label: 'Hands-On Learner',
    description: 'I learn best by doing and practicing',
    icon: HandRaisedIcon,
    color: '#F59E0B',
    examples: ['Action plans', 'Practice exercises', 'Real-world application']
  }
];

const paceOptions: PreferenceOption<'fast' | 'moderate' | 'slow'>[] = [
  {
    value: 'fast',
    label: 'Fast Pace',
    description: 'I want to move quickly toward my goals',
    icon: BoltIcon,
    color: '#EF4444',
    examples: ['Weekly check-ins', 'Rapid progress', 'Intense sessions']
  },
  {
    value: 'moderate',
    label: 'Steady Pace',
    description: 'I prefer consistent, balanced progress',
    icon: PlayIcon,
    color: '#3B82F6',
    examples: ['Bi-weekly sessions', 'Sustainable habits', 'Balanced approach']
  },
  {
    value: 'slow',
    label: 'Gentle Pace',
    description: 'I like to take my time and be thorough',
    icon: StarIcon,
    color: '#8B5CF6',
    examples: ['Deep reflection', 'Careful planning', 'Thoughtful progress']
  }
];

const supportOptions: PreferenceOption<'high' | 'moderate' | 'minimal'>[] = [
  {
    value: 'high',
    label: 'High Support',
    description: 'I benefit from frequent guidance and encouragement',
    icon: HeartIcon,
    color: '#F59E0B',
    examples: ['Daily check-ins', 'Detailed feedback', 'Motivational support']
  },
  {
    value: 'moderate',
    label: 'Moderate Support',
    description: 'I like regular guidance with some independence',
    icon: UserGroupIcon,
    color: '#10B981',
    examples: ['Weekly guidance', 'Structured check-ins', 'Balanced coaching']
  },
  {
    value: 'minimal',
    label: 'Independent',
    description: 'I prefer to work mostly on my own',
    icon: AcademicCapIcon,
    color: '#8B5CF6',
    examples: ['Monthly check-ins', 'Self-directed', 'Minimal intervention']
  }
];

export function LearningPreferences({ 
  learningPreferences, 
  onComplete, 
  isLoading = false,
  voiceController 
}: LearningPreferencesProps) {
  // Use the persistence hook for automatic saving
  const { 
    onboardingState,
    saveLearningPrefs,
    debouncedSaveLearningPrefs,
    error: persistenceError,
    isLoading: isPersistenceLoading
  } = useOnboardingPersistence();

  const [selectedStyle, setSelectedStyle] = useState<'visual' | 'auditory' | 'hands-on'>(
    onboardingState?.learningPrefs?.learning_prefs?.[0] as any || learningPreferences?.style || 'visual'
  );
  const [selectedPace, setSelectedPace] = useState<'fast' | 'moderate' | 'slow'>(
    learningPreferences?.pace || 'moderate'
  );
  const [selectedSupport, setSelectedSupport] = useState<'high' | 'moderate' | 'minimal'>(
    learningPreferences?.support || 'moderate'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mayaIntroduced, setMayaIntroduced] = useState(false);
  const [isListeningForPreferences, setIsListeningForPreferences] = useState(false);
  const [highlightedPreference, setHighlightedPreference] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Update local state when onboarding state changes
  useEffect(() => {
    if (onboardingState?.learningPrefs) {
      const prefs = onboardingState.learningPrefs;
      if (prefs.learning_prefs?.[0]) {
        setSelectedStyle(prefs.learning_prefs[0] as any);
      }
    }
  }, [onboardingState?.learningPrefs]);

  // Maya voice introduction for learning preferences
  useEffect(() => {
    if (voiceController?.isConnected && !mayaIntroduced) {
      setTimeout(() => {
        voiceController.sendMessage(`Excellent! Now let's personalize your learning experience. I'd love to know more about how you prefer to learn. Are you more of a visual learner who likes charts and diagrams, an audio learner who prefers listening and discussion, or a hands-on learner who learns by doing? You can tell me something like "I'm a visual learner" or just click on what feels right.`);
        setMayaIntroduced(true);
        setIsListeningForPreferences(true);
      }, 1000);
    }
  }, [voiceController?.isConnected, mayaIntroduced]);

  // Handle voice commands for learning preferences
  useEffect(() => {
    if (!voiceController) return;

    const handleVoiceCommand = (command: VoiceCommand) => {
      console.log('🎓 Learning Preferences received voice command:', command);
      
      switch (command.intent) {
        case 'select_learning_style':
          if (command.data.style) {
            const style = command.data.style as 'visual' | 'auditory' | 'hands-on';
            if (styleOptions.some(opt => opt.value === style)) {
              voiceUISync.animateSelection(`style-${style}`, true);
              setTimeout(() => voiceUISync.animateSelection(`style-${style}`, false), 2000);
              
              setSelectedStyle(style);
              handleStyleChange(style);
              
              const option = styleOptions.find(opt => opt.value === style);
              if (option) {
                voiceController.sendMessage(`Great! ${option.label} it is. ${option.description}. Examples include: ${option.examples.slice(0, 2).join(' and ')}. Now, what pace feels comfortable for you?`);
              }
            }
          }
          break;
          
        case 'select_pace':
          if (command.data.pace) {
            const pace = command.data.pace as 'fast' | 'moderate' | 'slow';
            if (paceOptions.some(opt => opt.value === pace)) {
              voiceUISync.animateSelection(`pace-${pace}`, true);
              setTimeout(() => voiceUISync.animateSelection(`pace-${pace}`, false), 2000);
              
              setSelectedPace(pace);
              handlePaceChange(pace);
              
              const option = paceOptions.find(opt => opt.value === pace);
              if (option) {
                voiceController.sendMessage(`Perfect! ${option.label} sounds ideal. ${option.description}. Finally, how much support and guidance would you like?`);
              }
            }
          }
          break;
          
        case 'select_support':
          if (command.data.support) {
            const support = command.data.support as 'high' | 'moderate' | 'minimal';
            if (supportOptions.some(opt => opt.value === support)) {
              voiceUISync.animateSelection(`support-${support}`, true);
              setTimeout(() => voiceUISync.animateSelection(`support-${support}`, false), 2000);
              
              setSelectedSupport(support);
              handleSupportChange(support);
              
              const option = supportOptions.find(opt => opt.value === support);
              if (option) {
                voiceController.sendMessage(`Excellent choice! ${option.label} matches your style perfectly. ${option.description}. Your learning profile is looking great - we'll find you the perfect coach match!`);
              }
            }
          }
          break;
          
        case 'describe_learning_preference':
          if (command.data.preference_type && command.data.preference_value) {
            const type = command.data.preference_type;
            const value = command.data.preference_value;
            
            let options: any[] = [];
            let elementId = '';
            
            if (type === 'style') {
              options = styleOptions;
              elementId = `style-${value}`;
            } else if (type === 'pace') {
              options = paceOptions;
              elementId = `pace-${value}`;
            } else if (type === 'support') {
              options = supportOptions;
              elementId = `support-${value}`;
            }
            
            const option = options.find(opt => opt.value === value);
            if (option) {
              setHighlightedPreference(elementId);
              voiceUISync.highlightElement(`#${elementId}`, 3000);
              voiceController.sendMessage(`${option.label}: ${option.description}. Examples include: ${option.examples.slice(0, 2).join(' and ')}. Does this sound like you?`);
              
              setTimeout(() => setHighlightedPreference(null), 3000);
            }
          }
          break;
          
        case 'infer_learning_style':
          // Handle natural language that implies learning style
          if (command.data.description) {
            const description = command.data.description.toLowerCase();
            let inferredStyle: 'visual' | 'auditory' | 'hands-on' | null = null;
            
            if (description.includes('see') || description.includes('visual') || description.includes('read') || 
                description.includes('diagram') || description.includes('chart')) {
              inferredStyle = 'visual';
            } else if (description.includes('hear') || description.includes('listen') || description.includes('talk') || 
                      description.includes('discussion') || description.includes('audio')) {
              inferredStyle = 'auditory';
            } else if (description.includes('do') || description.includes('practice') || description.includes('hands') || 
                      description.includes('try') || description.includes('experiment')) {
              inferredStyle = 'hands-on';
            }
            
            if (inferredStyle) {
              setSelectedStyle(inferredStyle);
              handleStyleChange(inferredStyle);
              
              const option = styleOptions.find(opt => opt.value === inferredStyle);
              if (option) {
                voiceController.sendMessage(`It sounds like you're a ${option.label}! ${option.description}. I'll make sure to match you with coaching approaches that fit this style perfectly.`);
              }
            } else {
              voiceController.sendMessage(`That's interesting! Can you tell me more about whether you prefer seeing information, hearing it explained, or learning by doing hands-on activities?`);
            }
          }
          break;
      }
    };

    voiceController.onVoiceCommand = handleVoiceCommand;
  }, [voiceController, handleStyleChange, handlePaceChange, handleSupportChange]);

  const handleContinue = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Prepare learning preferences for persistence
      const learningPrefs = {
        time_horizon: onboardingState?.timeHorizon || 'medium',
        learning_prefs: [selectedStyle, selectedPace],
        preferred_categories: [],
        experience_level: 'beginner' as const,
        motivation_factors: [selectedSupport]
      };
      
      // Save learning preferences using the persistence layer
      await saveLearningPrefs(learningPrefs);
      
      // Call the parent's onComplete callback
      onComplete({
        style: selectedStyle,
        pace: selectedPace,
        support: selectedSupport
      });
      
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
      console.error('Failed to save learning preferences:', err);
      setError('Failed to save your preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save when preferences change
  const handleStyleChange = (style: 'visual' | 'auditory' | 'hands-on') => {
    setSelectedStyle(style);
    
    const learningPrefs = {
      time_horizon: onboardingState?.timeHorizon || 'medium',
      learning_prefs: [style, selectedPace],
      preferred_categories: [],
      experience_level: 'beginner' as const,
      motivation_factors: [selectedSupport]
    };
    
    debouncedSaveLearningPrefs(learningPrefs);
  };

  const handlePaceChange = (pace: 'fast' | 'moderate' | 'slow') => {
    setSelectedPace(pace);
    
    const learningPrefs = {
      time_horizon: onboardingState?.timeHorizon || 'medium',
      learning_prefs: [selectedStyle, pace],
      preferred_categories: [],
      experience_level: 'beginner' as const,
      motivation_factors: [selectedSupport]
    };
    
    debouncedSaveLearningPrefs(learningPrefs);
  };

  const handleSupportChange = (support: 'high' | 'moderate' | 'minimal') => {
    setSelectedSupport(support);
    
    const learningPrefs = {
      time_horizon: onboardingState?.timeHorizon || 'medium',
      learning_prefs: [selectedStyle, selectedPace],
      preferred_categories: [],
      experience_level: 'beginner' as const,
      motivation_factors: [support]
    };
    
    debouncedSaveLearningPrefs(learningPrefs);
  };

  const renderPreferenceSection = <T,>(
    title: string,
    subtitle: string,
    options: PreferenceOption<T>[],
    selectedValue: T,
    onSelect: (value: T) => void,
    delay: number = 0,
    idPrefix: string = ''
  ) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{title}</CardTitle>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {options.map((option) => {
              const IconComponent = option.icon;
              const isSelected = selectedValue === option.value;
              const elementId = `${idPrefix}-${option.value}`;

              return (
                <motion.button
                  key={String(option.value)}
                  id={elementId}
                  onClick={() => onSelect(option.value)}
                  className={`
                    p-4 rounded-lg text-left transition-all duration-300 border-2
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                    ${highlightedPreference === elementId ? 'ring-2 ring-purple-400 ring-offset-2' : ''}
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-pressed={isSelected}
                >
                  {/* Selection Indicator */}
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isSelected ? 1 : 0,
                      opacity: isSelected ? 1 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                  >
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: isSelected ? 1 : 0 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </motion.svg>
                  </motion.div>

                  {/* Icon */}
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${option.color}20` }}
                  >
                    <IconComponent 
                      className="w-5 h-5"
                      style={{ color: option.color }}
                    />
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {option.label}
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {option.description}
                    </p>
                    <div className="space-y-1">
                      {option.examples.slice(0, 2).map((example, i) => (
                        <p key={i} className="text-xs text-gray-500">
                          • {example}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Glow effect for selected option */}
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 rounded-lg pointer-events-none"
                      style={{
                        boxShadow: `0 0 15px ${option.color}30`,
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <section ref={sectionRef} className="space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <h2 
          tabIndex={-1}
          className="text-2xl md:text-3xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
        >
          How do you prefer to learn?
        </h2>
        <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
          Help us customize your coaching experience by sharing your learning preferences.
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {renderPreferenceSection(
          "Learning Style",
          "How do you absorb information best?",
          styleOptions,
          selectedStyle,
          handleStyleChange,
          0,
          'style'
        )}

        {renderPreferenceSection(
          "Learning Pace",
          "What pace feels right for your progress?",
          paceOptions,
          selectedPace,
          handlePaceChange,
          0.2,
          'pace'
        )}

        {renderPreferenceSection(
          "Support Level",
          "How much guidance do you prefer?",
          supportOptions,
          selectedSupport,
          handleSupportChange,
          0.4,
          'support'
        )}
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="max-w-2xl mx-auto"
      >
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 text-center">
            Your Learning Profile
          </h4>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { 
                value: selectedStyle, 
                options: styleOptions 
              },
              { 
                value: selectedPace, 
                options: paceOptions 
              },
              { 
                value: selectedSupport, 
                options: supportOptions 
              }
            ].map(({ value, options }) => {
              const option = options.find(opt => opt.value === value);
              return option ? (
                <Badge 
                  key={String(value)}
                  variant="secondary" 
                  className="text-xs"
                  style={{ 
                    backgroundColor: `${option.color}15`, 
                    color: option.color,
                    border: `1px solid ${option.color}30`
                  }}
                >
                  {option.label}
                </Badge>
              ) : null;
            })}
          </div>
          <p className="text-sm text-gray-600 text-center mt-2">
            We'll match you with a coach who fits your learning style perfectly.
          </p>
        </div>
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
              Find My Perfect Coach
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