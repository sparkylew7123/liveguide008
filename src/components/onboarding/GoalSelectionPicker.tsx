'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useOnboardingPersistence } from '@/hooks/useOnboardingPersistence';
import { 
  BriefcaseIcon, 
  HeartIcon, 
  UsersIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  PaintBrushIcon,
  SparklesIcon,
  BoltIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { voiceUISync } from '@/lib/voice-ui-sync';
import type { VoiceCommand } from '@/hooks/useMayaVoiceOnboarding';

interface Goal {
  goal_id: string;
  category_id: string;
  category_title: string;
  category_color: string;
  category_icon: string;
  title: string;
  description: string;
  difficulty_level: string;
  typical_timeframe: string;
  tags: string[];
  sort_order: number;
}

interface GoalSelectionPickerProps {
  selectedCategories: string[];
  selectedGoals: string[];
  onComplete: (selectedGoals: string[]) => void;
  isLoading?: boolean;
  voiceController?: {
    isConnected: boolean;
    isSpeaking: boolean;
    isListening: boolean;
    sendMessage: (message: string) => void;
    onVoiceCommand: (command: VoiceCommand) => void;
  };
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  briefcase: BriefcaseIcon,
  heart: HeartIcon,
  users: UsersIcon,
  'trending-up': ChartBarIcon,
  'dollar-sign': CurrencyDollarIcon,
  palette: PaintBrushIcon,
  sparkles: SparklesIcon,
  brain: BoltIcon,
};

const MAX_GOALS_PER_CATEGORY = 3;
const MAX_TOTAL_GOALS = 5;
const MIN_TOTAL_GOALS = 1;

export function GoalSelectionPicker({ 
  selectedCategories, 
  selectedGoals, 
  onComplete, 
  isLoading = false,
  voiceController 
}: GoalSelectionPickerProps) {
  // Use the persistence hook for automatic saving
  const { 
    onboardingState,
    saveGoals,
    debouncedSaveGoals,
    error: persistenceError,
    isLoading: isPersistenceLoading
  } = useOnboardingPersistence();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [localSelected, setLocalSelected] = useState<string[]>(
    onboardingState?.selectedGoals.map(g => g.goalId) || selectedGoals
  );
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mayaIntroduced, setMayaIntroduced] = useState(false);
  const [isListeningForGoals, setIsListeningForGoals] = useState(false);
  const [highlightedGoal, setHighlightedGoal] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (selectedCategories.length > 0) {
      fetchGoals();
    }
  }, [selectedCategories]);

  // Maya voice introduction for goals
  useEffect(() => {
    if (voiceController?.isConnected && !mayaIntroduced && goals.length > 0) {
      setTimeout(() => {
        const totalGoals = goals.length;
        const categoryCount = selectedCategories.length;
        voiceController.sendMessage(`Perfect! I found ${totalGoals} goals across your ${categoryCount} selected ${categoryCount === 1 ? 'category' : 'categories'}. You can select up to ${MAX_GOALS_PER_CATEGORY} goals per category and ${MAX_TOTAL_GOALS} total. Let me walk through each category with you, or you can tell me which specific goals interest you most.`);
        setMayaIntroduced(true);
        setIsListeningForGoals(true);
        
        // Auto-expand first category for voice navigation
        if (goals.length > 0) {
          setExpandedCategory(goals[0].category_id);
        }
      }, 1000);
    }
  }, [voiceController?.isConnected, mayaIntroduced, goals, selectedCategories]);

  // Handle voice commands for goal selection
  useEffect(() => {
    if (!voiceController) return;

    const handleVoiceCommand = (command: VoiceCommand) => {
      console.log('🎯 Goals received voice command:', command);
      
      switch (command.intent) {
        case 'select_goals':
          if (command.data.goals && Array.isArray(command.data.goals)) {
            const goalIds = goals
              .filter(goal => command.data.goals.some((voiceGoal: string) => 
                goal.title.toLowerCase().includes(voiceGoal.toLowerCase()) ||
                voiceGoal.toLowerCase().includes(goal.title.toLowerCase())
              ))
              .map(goal => goal.goal_id);
            
            // Check limits before selection
            const validGoalIds = goalIds.filter(goalId => {
              const goal = goals.find(g => g.goal_id === goalId);
              if (!goal) return false;
              
              const goalsInCategory = localSelected.filter(id => {
                const existingGoal = goals.find(g => g.goal_id === id);
                return existingGoal?.category_id === goal.category_id;
              });
              
              return goalsInCategory.length < MAX_GOALS_PER_CATEGORY && 
                     localSelected.length < MAX_TOTAL_GOALS;
            });
            
            if (validGoalIds.length !== goalIds.length) {
              const limitType = goalIds.length > validGoalIds.length ? 'limit reached' : 'invalid selection';
              voiceController.sendMessage(`I can only select ${validGoalIds.length} of those goals due to our limits. Remember, you can choose up to ${MAX_GOALS_PER_CATEGORY} goals per category and ${MAX_TOTAL_GOALS} total.`);
            }
            
            // Animate and select valid goals
            validGoalIds.forEach(goalId => {
              voiceUISync.animateSelection(`goal-${goalId}`, true);
              setTimeout(() => voiceUISync.animateSelection(`goal-${goalId}`, false), 2000);
            });
            
            setLocalSelected(prev => [...new Set([...prev, ...validGoalIds])]);
            
            // Maya's confirmation
            const selectedTitles = goals
              .filter(goal => validGoalIds.includes(goal.goal_id))
              .map(goal => goal.title);
            
            if (selectedTitles.length > 0) {
              voiceController.sendMessage(`Great choices! You've selected: ${selectedTitles.join(', ')}. ${localSelected.length + validGoalIds.length < MAX_TOTAL_GOALS ? 'Would you like to add any other goals?' : 'You\'re at your goal limit - these are excellent selections!'}`);
            }
          }
          break;
          
        case 'describe_goal':
          if (command.data.goal) {
            const goal = goals.find(g => 
              g.title.toLowerCase().includes(command.data.goal.toLowerCase()) ||
              command.data.goal.toLowerCase().includes(g.title.toLowerCase())
            );
            if (goal) {
              setHighlightedGoal(goal.goal_id);
              voiceUISync.highlightElement(`#goal-${goal.goal_id}`, 3000);
              voiceController.sendMessage(`${goal.title}: ${goal.description}. This is a ${goal.difficulty_level} level goal that typically takes ${goal.typical_timeframe}. Would you like to select this goal?`);
              
              // Auto-expand the goal's category
              setExpandedCategory(goal.category_id);
              setTimeout(() => setHighlightedGoal(null), 3000);
            }
          }
          break;
          
        case 'expand_category':
          if (command.data.category) {
            const categoryGoals = goals.filter(g => 
              g.category_title.toLowerCase().includes(command.data.category.toLowerCase())
            );
            if (categoryGoals.length > 0) {
              const categoryId = categoryGoals[0].category_id;
              setExpandedCategory(categoryId);
              voiceUISync.highlightElement(`#category-${categoryId}-content`, 2000);
              
              const goalTitles = categoryGoals.map(g => g.title).slice(0, 3);
              voiceController.sendMessage(`Here are the goals in ${categoryGoals[0].category_title}: ${goalTitles.join(', ')}${categoryGoals.length > 3 ? ` and ${categoryGoals.length - 3} more` : ''}. Which ones interest you?`);
            }
          }
          break;
      }
    };

    voiceController.onVoiceCommand = handleVoiceCommand;
  }, [voiceController, goals, localSelected, voiceUISync]);

  const fetchGoals = async () => {
    try {
      setLoadingGoals(true);
      const supabase = createClient();
      
      // Fetch goals for each selected category
      const goalPromises = selectedCategories.map(categoryId =>
        supabase.rpc('get_onboarding_goals', { p_category_id: categoryId })
      );

      const results = await Promise.all(goalPromises);
      
      const allGoals: Goal[] = [];
      results.forEach(result => {
        if (result.data && !result.error) {
          allGoals.push(...result.data);
        }
      });

      // Sort goals by category sort order, then by goal sort order
      const sortedGoals = allGoals.sort((a, b) => {
        if (a.category_id !== b.category_id) {
          const categoryOrder = selectedCategories.indexOf(a.category_id) - selectedCategories.indexOf(b.category_id);
          return categoryOrder;
        }
        return (a.sort_order || 0) - (b.sort_order || 0);
      });

      setGoals(sortedGoals);
      
      // Auto-expand first category
      if (sortedGoals.length > 0 && !expandedCategory) {
        setExpandedCategory(sortedGoals[0].category_id);
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
      setError('Failed to load goals. Please try again.');
    } finally {
      setLoadingGoals(false);
    }
  };

  const handleGoalToggle = (goalId: string, categoryId: string) => {
    const isSelected = localSelected.includes(goalId);
    
    if (isSelected) {
      // Removing a goal - always allowed
      const newSelected = localSelected.filter(id => id !== goalId);
      setLocalSelected(newSelected);
      
      // Auto-save in background (debounced)
      debouncedSaveGoals(newSelected.map(id => ({ goalId: id })));
    } else {
      // Adding a goal - check limits
      const goalsInCategory = localSelected.filter(id => {
        const goal = goals.find(g => g.goal_id === id);
        return goal?.category_id === categoryId;
      });

      // Check category limit
      if (goalsInCategory.length >= MAX_GOALS_PER_CATEGORY) {
        return; // Can't add more to this category
      }

      // Check total limit
      if (localSelected.length >= MAX_TOTAL_GOALS) {
        return; // Can't add more goals total
      }

      const newSelected = [...localSelected, goalId];
      setLocalSelected(newSelected);
      
      // Auto-save in background (debounced)
      debouncedSaveGoals(newSelected.map(id => ({ goalId: id })));
    }
  };

  const handleContinue = async () => {
    if (localSelected.length < MIN_TOTAL_GOALS) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Save goals using the persistence layer
      const goalSelections = localSelected.map(goalId => ({ goalId }));
      await saveGoals(goalSelections);
      
      // Call the parent's onComplete callback
      onComplete(localSelected);
      
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
      console.error('Failed to save goals:', err);
      setError('Failed to save your goals. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getGoalsByCategory = (categoryId: string): Goal[] => {
    return goals.filter(goal => goal.category_id === categoryId);
  };

  const getSelectedGoalsInCategory = (categoryId: string): number => {
    return localSelected.filter(goalId => {
      const goal = goals.find(g => g.goal_id === goalId);
      return goal?.category_id === categoryId;
    }).length;
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || SparklesIcon;
    return IconComponent;
  };

  const canAddMoreToCategory = (categoryId: string): boolean => {
    return getSelectedGoalsInCategory(categoryId) < MAX_GOALS_PER_CATEGORY;
  };

  const canAddMoreTotal = (): boolean => {
    return localSelected.length < MAX_TOTAL_GOALS;
  };

  if (loadingGoals) {
    return (
      <section ref={sectionRef} className="space-y-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your goals...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section ref={sectionRef} className="space-y-8 py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchGoals} variant="outline">
            Try Again
          </Button>
        </div>
      </section>
    );
  }

  const groupedGoals = selectedCategories.map(categoryId => {
    const categoryGoals = getGoalsByCategory(categoryId);
    if (categoryGoals.length === 0) return null;

    const category = categoryGoals[0]; // Get category info from first goal
    return {
      categoryId,
      categoryInfo: category,
      goals: categoryGoals
    };
  }).filter(Boolean);

  return (
    <section ref={sectionRef} className="space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <h2 
          tabIndex={-1}
          className="text-2xl md:text-3xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
        >
          Choose your specific goals
        </h2>
        <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
          Select up to {MAX_GOALS_PER_CATEGORY} goals per category, {MAX_TOTAL_GOALS} total. Choose goals that truly excite you.
        </p>
      </div>

      {/* Goal Limits Overview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <Badge 
            variant="secondary" 
            className={`${
              localSelected.length >= MAX_TOTAL_GOALS 
                ? 'bg-orange-100 text-orange-700 border-orange-200' 
                : localSelected.length >= MIN_TOTAL_GOALS
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-gray-100 text-gray-700 border-gray-200'
            }`}
          >
            {localSelected.length} / {MAX_TOTAL_GOALS} goals selected
          </Badge>
          {localSelected.length >= MAX_TOTAL_GOALS && (
            <div className="flex items-center gap-1 text-orange-600 text-xs">
              <ExclamationTriangleIcon className="w-4 h-4" />
              Goal limit reached
            </div>
          )}
        </div>
      </div>

      {/* Goals by Category */}
      <div className="space-y-6 max-w-4xl mx-auto">
        {groupedGoals.map((group, index) => {
          if (!group) return null;
          
          const { categoryId, categoryInfo, goals } = group;
          const IconComponent = getIcon(categoryInfo.category_icon);
          const selectedInCategory = getSelectedGoalsInCategory(categoryId);
          const canAddMore = canAddMoreToCategory(categoryId) && canAddMoreTotal();
          const isExpanded = expandedCategory === categoryId;

          return (
            <motion.div
              key={categoryId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="overflow-hidden">
                {/* Category Header */}
                <motion.button
                  onClick={() => setExpandedCategory(isExpanded ? null : categoryId)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                  aria-expanded={isExpanded}
                  aria-controls={`category-${categoryId}-content`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${categoryInfo.category_color}20` }}
                      >
                        <IconComponent 
                          className="w-5 h-5"
                          style={{ color: categoryInfo.category_color }}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{categoryInfo.category_title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              selectedInCategory >= MAX_GOALS_PER_CATEGORY 
                                ? 'bg-orange-100 text-orange-700 border-orange-200' 
                                : selectedInCategory > 0
                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {selectedInCategory} / {MAX_GOALS_PER_CATEGORY} in this category
                          </Badge>
                          {!canAddMore && selectedInCategory < MAX_GOALS_PER_CATEGORY && (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                              Goal limit reached
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </motion.div>
                  </div>
                </motion.button>

                {/* Category Goals */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      id={`category-${categoryId}-content`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CardContent className="p-0 border-t">
                        <div className="p-4 space-y-3">
                          {goals.map((goal) => {
                            const isSelected = localSelected.includes(goal.goal_id);
                            const canSelect = canAddMore || isSelected;

                            return (
                              <motion.button
                                key={goal.goal_id}
                                id={`goal-${goal.goal_id}`}
                                onClick={() => canSelect && handleGoalToggle(goal.goal_id, categoryId)}
                                className={`
                                  w-full p-3 rounded-lg text-left transition-all duration-300 border-2
                                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                                  ${isSelected 
                                    ? 'border-blue-500 bg-blue-50 shadow-sm' 
                                    : canSelect
                                    ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50' 
                                    : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                  }
                                  ${highlightedGoal === goal.goal_id ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
                                `}
                                disabled={!canSelect}
                                aria-pressed={isSelected}
                                whileHover={canSelect ? { scale: 1.01 } : {}}
                                whileTap={canSelect ? { scale: 0.99 } : {}}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 text-sm leading-tight">
                                      {goal.title}
                                    </h4>
                                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                      {goal.description}
                                    </p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {goal.difficulty_level && (
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs h-5 px-1.5 bg-white"
                                        >
                                          {goal.difficulty_level}
                                        </Badge>
                                      )}
                                      {goal.typical_timeframe && (
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs h-5 px-1.5 bg-white"
                                        >
                                          {goal.typical_timeframe}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Selection Indicator */}
                                  <motion.div
                                    className={`
                                      ml-3 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                                      ${isSelected 
                                        ? 'bg-blue-500 border-blue-500' 
                                        : canSelect
                                        ? 'border-gray-300'
                                        : 'border-gray-200'
                                      }
                                    `}
                                    animate={{
                                      scale: isSelected ? [1, 1.2, 1] : 1,
                                    }}
                                    transition={{ duration: 0.3 }}
                                  >
                                    {isSelected && (
                                      <motion.svg
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-3 h-3 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </motion.svg>
                                    )}
                                  </motion.div>
                                </div>

                                {/* Glow effect for selected items */}
                                {isSelected && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute inset-0 rounded-lg pointer-events-none"
                                    style={{
                                      boxShadow: `0 0 15px ${categoryInfo.category_color}30`,
                                    }}
                                  />
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="text-center space-y-4">
        <Button
          onClick={handleContinue}
          size="lg"
          disabled={localSelected.length < MIN_TOTAL_GOALS || isLoading || isSaving}
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
              Continue with {localSelected.length} goal{localSelected.length === 1 ? '' : 's'}
            </>
          )}
        </Button>

        {localSelected.length < MIN_TOTAL_GOALS && (
          <p className="text-sm text-gray-500 mt-2">
            Select at least {MIN_TOTAL_GOALS} goal{MIN_TOTAL_GOALS === 1 ? '' : 's'} to continue
          </p>
        )}

        {/* Error Display */}
        {(error || persistenceError) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              {error || persistenceError}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setError(null);
                // Clear persistence error is handled by the hook
              }}
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