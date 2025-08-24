'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BriefcaseIcon, 
  HeartIcon, 
  UsersIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  PaintBrushIcon,
  SparklesIcon,
  BoltIcon,
  SpeakerWaveIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';
import { voiceUISync, categoryVoicePatterns } from '@/lib/voice-ui-sync';
import type { VoiceCommand } from '@/hooks/useMayaVoiceOnboarding';

interface GoalCategory {
  id: string;
  title: string;
  description: string;
  display_color: string;
  icon_name: string;
  sort_order: number;
  goal_count: number;
}

interface CategorySelectionGridProps {
  selectedCategories: string[];
  onComplete: (selectedCategories: string[]) => void;
  isLoading?: boolean;
  voiceController?: {
    isConnected: boolean
    isSpeaking: boolean
    isListening: boolean
    sendMessage: (message: string) => void
    onVoiceCommand: (command: VoiceCommand) => void
  }
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

export function CategorySelectionGrid({ 
  selectedCategories, 
  onComplete, 
  isLoading = false,
  voiceController 
}: CategorySelectionGridProps) {
  const [categories, setCategories] = useState<GoalCategory[]>([]);
  const [localSelected, setLocalSelected] = useState<string[]>(selectedCategories);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mayaIntroduced, setMayaIntroduced] = useState(false);
  const [isListeningForCategories, setIsListeningForCategories] = useState(false);
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Maya voice introduction for categories
  useEffect(() => {
    if (voiceController?.isConnected && !mayaIntroduced && categories.length > 0) {
      setTimeout(() => {
        const categoryNames = categories.map(cat => cat.title).join(', ');
        voiceController.sendMessage(`Great! Now let's explore what areas of life you'd like to focus on. I can see we have ${categoryNames}. You can click on the categories that interest you, or tell me which ones you'd like to select. What catches your attention?`);
        setMayaIntroduced(true);
        setIsListeningForCategories(true);
      }, 1000);
    }
  }, [voiceController?.isConnected, mayaIntroduced, categories]);

  // Handle voice commands for category selection
  useEffect(() => {
    if (!voiceController) return;

    const handleVoiceCommand = (command: VoiceCommand) => {
      console.log('🎙️ Categories received voice command:', command);
      
      switch (command.intent) {
        case 'select_categories':
          if (command.data.categories && Array.isArray(command.data.categories)) {
            const categoryIds = categories
              .filter(cat => command.data.categories.includes(cat.title))
              .map(cat => cat.id);
            
            // Animate selections
            categoryIds.forEach(categoryId => {
              voiceUISync.animateSelection(`category-${categoryId}`, true);
              setTimeout(() => voiceUISync.animateSelection(`category-${categoryId}`, false), 2000);
            });
            
            setLocalSelected(prev => [...new Set([...prev, ...categoryIds])]);
            
            // Maya's confirmation
            const selectedTitles = categories
              .filter(cat => categoryIds.includes(cat.id))
              .map(cat => cat.title);
            voiceController.sendMessage(`Excellent choices! You've selected ${selectedTitles.join(' and ')}. ${selectedTitles.length === 1 ? 'Would you like to add any other areas?' : 'These are great focus areas for your goals!'}`);
          }
          break;
          
        case 'describe_category':
          if (command.data.category) {
            const category = categories.find(cat => 
              cat.title.toLowerCase().includes(command.data.category.toLowerCase())
            );
            if (category) {
              setHighlightedCategory(category.id);
              voiceUISync.highlightElement(`#category-${category.id}`, 3000);
              voiceController.sendMessage(`${category.title}: ${category.description}. This area has ${category.goal_count} goals available. Would you like to select this category?`);
              
              setTimeout(() => setHighlightedCategory(null), 3000);
            }
          }
          break;
      }
    };

    voiceController.onVoiceCommand = handleVoiceCommand;
  }, [voiceController, categories, voiceUISync]);

  // Listen for voice input when Maya is connected
  const handleVoiceSelection = useCallback((transcript: string) => {
    if (!isListeningForCategories || !voiceController?.isConnected) return;

    const availableCategories = categories.map(cat => cat.title);
    const selectedCategoryNames = categoryVoicePatterns.parseCategories(transcript, availableCategories);
    
    if (selectedCategoryNames.length > 0) {
      const categoryIds = categories
        .filter(cat => selectedCategoryNames.includes(cat.title))
        .map(cat => cat.id);
      
      // Visual feedback for voice selections
      categoryIds.forEach(categoryId => {
        voiceUISync.animateSelection(`category-${categoryId}`, true);
        setTimeout(() => voiceUISync.animateSelection(`category-${categoryId}`, false), 2000);
      });
      
      setLocalSelected(prev => [...new Set([...prev, ...categoryIds])]);
      
      // Maya's confirmation
      voiceController.sendMessage(`Perfect! I've selected ${selectedCategoryNames.join(' and ')} for you. ${selectedCategoryNames.length === 1 ? 'Would you like to add any other areas?' : 'Great choices for your focus areas!'}`);
    }
  }, [isListeningForCategories, voiceController, categories, categoryVoicePatterns]);

  // Cleanup voice sync on unmount
  useEffect(() => {
    return () => {
      voiceUISync.cleanup();
    };
  }, []);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .rpc('get_top_goal_categories');

      if (error) {
        throw error;
      }

      // Filter to top 4 categories for 2x2 grid and sort by sort_order
      const topCategories = data
        .sort((a: GoalCategory, b: GoalCategory) => a.sort_order - b.sort_order)
        .slice(0, 4);

      setCategories(topCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load goal categories. Please try again.');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setLocalSelected(prev => {
      const isSelected = prev.includes(categoryId);
      const newSelected = isSelected 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      
      // Maya's response to manual selection
      if (voiceController?.isConnected) {
        const category = categories.find(cat => cat.id === categoryId);
        if (category) {
          if (isSelected) {
            voiceController.sendMessage(`Okay, I've removed ${category.title} from your selections.`);
          } else {
            voiceController.sendMessage(`Great choice! I've added ${category.title} to your focus areas.`);
          }
        }
      }
      
      return newSelected;
    });
  };

  const handleContinue = () => {
    if (localSelected.length === 0) return;
    
    // Maya's confirmation before moving to next step
    if (voiceController?.isConnected) {
      const selectedTitles = categories
        .filter(cat => localSelected.includes(cat.id))
        .map(cat => cat.title);
      voiceController.sendMessage(`Perfect! You've chosen to focus on ${selectedTitles.join(', ')}. These are excellent areas to work on. Now let's dive deeper into your specific goals within these categories.`);
    }
    
    onComplete(localSelected);
    
    // Scroll to next section for accessibility
    setTimeout(() => {
      const nextSection = sectionRef.current?.parentElement?.nextElementSibling;
      if (nextSection) {
        nextSection.scrollIntoView({ behavior: 'smooth' });
        // Focus the next section's heading for accessibility
        const nextHeading = nextSection.querySelector('h2');
        if (nextHeading) {
          (nextHeading as HTMLElement).focus();
        }
      }
    }, 150);
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || SparklesIcon;
    return IconComponent;
  };

  if (loadingCategories) {
    return (
      <section ref={sectionRef} className="space-y-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading goal categories...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section ref={sectionRef} className="space-y-8 py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchCategories} variant="outline">
            Try Again
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <h2 
          tabIndex={-1}
          className="text-2xl md:text-3xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
        >
          What areas interest you most?
        </h2>
        <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
          Choose the categories that align with your current priorities. You can select multiple areas.
        </p>
        
        {/* Voice interaction status */}
        {voiceController?.isConnected && (
          <div className="flex items-center justify-center gap-2 text-sm">
            {voiceController.isSpeaking ? (
              <>
                <SpeakerWaveIcon className="w-4 h-4 text-blue-500 animate-pulse" />
                <span className="text-blue-600">Maya is describing the categories...</span>
              </>
            ) : isListeningForCategories ? (
              <>
                <MicrophoneIcon className="w-4 h-4 text-green-500 animate-pulse" />
                <span className="text-green-600">Say "I want..." or click to select categories</span>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
        <AnimatePresence>
          {categories.map((category) => {
            const IconComponent = getIcon(category.icon_name);
            const isSelected = localSelected.includes(category.id);
            
            return (
              <motion.div
                key={category.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  ...(highlightedCategory === category.id ? {
                    boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
                    scale: 1.05
                  } : {})
                }}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 } 
                }}
                whileTap={{ scale: 0.98 }}
                className="relative"
              >
                <motion.button
                  id={`category-${category.id}`}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`
                    w-full h-32 sm:h-40 rounded-xl p-4 sm:p-6 text-left transition-all duration-300 ease-out
                    border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }
                    ${highlightedCategory === category.id ? 'ring-4 ring-blue-300' : ''}
                  `}
                  aria-pressed={isSelected}
                  aria-describedby={`category-${category.id}-description`}
                  onMouseEnter={() => {
                    // Describe category when hovered (if Maya is connected and not speaking)
                    if (voiceController?.isConnected && !voiceController.isSpeaking && isListeningForCategories) {
                      voiceController.sendMessage(`${category.title}: ${category.description}`);
                    }
                  }}
                >
                  {/* Selection Indicator */}
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isSelected ? 1 : 0,
                      opacity: isSelected ? 1 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
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

                  {/* Category Icon */}
                  <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${category.display_color}20` }}
                  >
                    <IconComponent 
                      className="w-5 h-5 sm:w-6 sm:h-6"
                      style={{ color: category.display_color }}
                    />
                  </div>

                  {/* Category Content */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
                      {category.title}
                    </h3>
                    <p 
                      id={`category-${category.id}-description`}
                      className="text-xs sm:text-sm text-gray-600 leading-relaxed"
                    >
                      {category.description}
                    </p>
                    <Badge 
                      variant="secondary" 
                      className="text-xs bg-gray-100 text-gray-700 border-0"
                    >
                      {category.goal_count} goals available
                    </Badge>
                  </div>

                  {/* Glow effect for selected items */}
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        boxShadow: `0 0 20px ${category.display_color}40`,
                      }}
                    />
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Selection Summary and Continue Button */}
      <div className="text-center space-y-4">
        {localSelected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-gray-600"
          >
            {localSelected.length} categor{localSelected.length === 1 ? 'y' : 'ies'} selected
          </motion.div>
        )}

        <Button
          onClick={handleContinue}
          size="lg"
          disabled={localSelected.length === 0 || isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-8 py-3 min-w-48"
        >
          {isLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
              />
              Processing...
            </>
          ) : (
            <>
              Continue with {localSelected.length} categor{localSelected.length === 1 ? 'y' : 'ies'}
            </>
          )}
        </Button>

        {localSelected.length === 0 && (
          <div className="text-sm text-gray-500 mt-2 space-y-1">
            <p>Select at least one category to continue</p>
            {voiceController?.isConnected && isListeningForCategories && (
              <p className="text-blue-600">
                💬 Try saying: "I want career and health" or "I'm interested in personal growth"
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}