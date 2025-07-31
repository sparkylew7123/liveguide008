'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRealtimeGoalDetection } from '@/hooks/useRealtimeGoalDetection'
import { goalService, GOAL_CATEGORY_COLORS, GOAL_CATEGORY_ICONS } from '@/lib/goals'
import { cn } from '@/lib/utils'
import { ViewfinderCircleIcon, BriefcaseIcon, HeartIcon, UsersIcon, SparklesIcon, CheckIcon, SpeakerWaveIcon, ChevronRightIcon, BoltIcon } from '@heroicons/react/24/outline'

interface GoalCategory {
  id: string
  title: string
  description: string
  color: string
  icon: React.ReactNode
  goals: Goal[]
}

interface Goal {
  id: string
  title: string
  description: string
  category: string
  isSelected: boolean
  isMatched: boolean
  matchConfidence?: number
  originalText?: string
}

interface VisualGoalMatchingProps {
  detectedGoals: any[]
  onGoalSelect: (goal: Goal) => void
  onCategoryHighlight: (category: string) => void
  onComplete: (selectedGoals: Goal[]) => void
  className?: string
}

export default function VisualGoalMatching({
  detectedGoals = [],
  onGoalSelect,
  onCategoryHighlight,
  onComplete,
  className
}: VisualGoalMatchingProps) {
  const [categories, setCategories] = useState<GoalCategory[]>([])
  const [selectedGoals, setSelectedGoals] = useState<Goal[]>([])
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { playChime } = useRealtimeGoalDetection()

  // Load categories and goals from database
  useEffect(() => {
    const loadCategoriesAndGoals = async () => {
      try {
        const categoryData = await goalService.getGoalCategories()
        
        const categoriesWithGoals: GoalCategory[] = categoryData.map(cat => ({
          id: cat.id,
          title: cat.title || '',
          description: cat.description || '',
          color: GOAL_CATEGORY_COLORS[cat.title || ''] || '#6B7280',
          icon: getIconForCategory(cat.title || ''),
          goals: generateGoalsForCategory(cat.title || '')
        }))
        
        setCategories(categoriesWithGoals)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading categories:', error)
        setIsLoading(false)
      }
    }
    
    loadCategoriesAndGoals()
  }, [])

  // Handle detected goals from voice
  useEffect(() => {
    if (detectedGoals.length === 0) return
    
    detectedGoals.forEach(detectedGoal => {
      // Find matching category
      const matchingCategory = categories.find(cat => 
        cat.title === detectedGoal.category
      )
      
      if (matchingCategory) {
        // Highlight the category
        setHighlightedCategory(matchingCategory.id)
        onCategoryHighlight(matchingCategory.title)
        
        // Expand the category
        setExpandedCategory(matchingCategory.id)
        
        // Find and highlight matching goals
        const matchingGoals = matchingCategory.goals.filter(goal =>
          goal.title.toLowerCase().includes(detectedGoal.title.toLowerCase()) ||
          detectedGoal.title.toLowerCase().includes(goal.title.toLowerCase())
        )
        
        if (matchingGoals.length > 0) {
          // Mark goals as matched
          setCategories(prev => prev.map(cat => ({
            ...cat,
            goals: cat.goals.map(goal => ({
              ...goal,
              isMatched: matchingGoals.some(mg => mg.id === goal.id),
              matchConfidence: matchingGoals.find(mg => mg.id === goal.id) 
                ? detectedGoal.confidence 
                : undefined,
              originalText: matchingGoals.find(mg => mg.id === goal.id) 
                ? detectedGoal.title 
                : undefined
            }))
          })))
          
          // Play chime for successful match
          playChime('match')
        }
      }
    })
  }, [detectedGoals, categories, onCategoryHighlight, playChime])

  const getIconForCategory = (categoryTitle: string) => {
    switch (categoryTitle) {
      case 'Personal Growth':
        return <ViewfinderCircleIcon />
      case 'Professional':
        return <BriefcaseIcon />
      case 'Health & Wellness':
        return <HeartIcon />
      case 'Relationships':
        return <UsersIcon />
      default:
        return <SparklesIcon />
    }
  }

  const generateGoalsForCategory = (categoryTitle: string): Goal[] => {
    const goalsByCategory = {
      'Personal Growth': [
        'Develop better time management skills',
        'Build confidence in public speaking',
        'Improve emotional intelligence',
        'Create a daily mindfulness practice',
        'Set and achieve personal boundaries'
      ],
      'Professional': [
        'Advance to a leadership role',
        'Develop new technical skills',
        'Build a professional network',
        'Start a side business',
        'Improve work-life balance'
      ],
      'Health & Wellness': [
        'Establish a consistent exercise routine',
        'Improve sleep quality',
        'Develop healthier eating habits',
        'Reduce stress and anxiety',
        'Build mental resilience'
      ],
      'Relationships': [
        'Improve communication skills',
        'Build stronger friendships',
        'Develop romantic relationships',
        'Strengthen family bonds',
        'Learn conflict resolution skills'
      ]
    }
    
    const goals = goalsByCategory[categoryTitle as keyof typeof goalsByCategory] || []
    
    return goals.map((goal, index) => ({
      id: `${categoryTitle.toLowerCase().replace(/\s+/g, '_')}_${index}`,
      title: goal,
      description: `Work towards ${goal.toLowerCase()}`,
      category: categoryTitle,
      isSelected: false,
      isMatched: false
    }))
  }

  const handleGoalClick = (goal: Goal) => {
    const updatedGoal = { ...goal, isSelected: !goal.isSelected }
    
    setCategories(prev => prev.map(cat => ({
      ...cat,
      goals: cat.goals.map(g => g.id === goal.id ? updatedGoal : g)
    })))
    
    if (updatedGoal.isSelected) {
      setSelectedGoals(prev => [...prev, updatedGoal])
      playChime('match')
    } else {
      setSelectedGoals(prev => prev.filter(g => g.id !== goal.id))
    }
    
    onGoalSelect(updatedGoal)
  }

  const handleCategoryClick = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId)
    if (category) {
      setHighlightedCategory(categoryId)
      onCategoryHighlight(category.title)
      playChime('category')
    }
  }

  const handleComplete = () => {
    onComplete(selectedGoals)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className={cn('w-full max-w-4xl mx-auto', className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          Select Your Goals
        </h2>
        <p className="text-gray-300">
          Choose the goals that resonate with you. Matched goals are highlighted based on our conversation.
        </p>
      </div>

      {/* Selected Goals Summary */}
      {selectedGoals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckIcon  className="h-5 w-5 text-green-400" />
                  <span className="text-white font-medium">
                    {selectedGoals.length} Goal{selectedGoals.length !== 1 ? 's' : ''} Selected
                  </span>
                </div>
                <Button
                  onClick={handleComplete}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Continue
                  <ChevronRightIcon  className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Goal Categories */}
      <Accordion
        type="single"
        collapsible
        value={expandedCategory || ''}
        onValueChange={setExpandedCategory}
        className="space-y-4"
      >
        {categories.map((category) => {
          const matchedGoals = category.goals.filter(goal => goal.isMatched)
          const selectedGoalsInCategory = category.goals.filter(goal => goal.isSelected)
          const isHighlighted = highlightedCategory === category.id
          
          return (
            <AccordionItem
              key={category.id}
              value={category.id}
              className={cn(
                'border-0 bg-slate-800/50 rounded-lg overflow-hidden transition-all duration-300',
                isHighlighted && 'ring-2 ring-blue-400 shadow-lg shadow-blue-400/20'
              )}
            >
              <AccordionTrigger
                className={cn(
                  'px-6 py-4 hover:no-underline',
                  isHighlighted && 'bg-gradient-to-r from-blue-600/10 to-purple-600/10'
                )}
                onClick={() => handleCategoryClick(category.id)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div 
                    className={cn(
                      'p-3 rounded-lg transition-all duration-300',
                      isHighlighted ? 'bg-blue-500 text-white' : 'bg-slate-700 text-gray-300'
                    )}
                    style={{ 
                      backgroundColor: isHighlighted ? undefined : category.color + '20',
                      color: isHighlighted ? undefined : category.color
                    }}
                  >
                    {category.icon}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-white">
                        {category.title}
                      </h3>
                      
                      {/* Badges */}
                      <div className="flex gap-2">
                        {matchedGoals.length > 0 && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <BoltIcon  className="h-3 w-3 mr-1" />
                            {matchedGoals.length} Matched
                          </Badge>
                        )}
                        
                        {selectedGoalsInCategory.length > 0 && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            <CheckIcon  className="h-3 w-3 mr-1" />
                            {selectedGoalsInCategory.length} Selected
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-400 text-sm">
                      {category.description || `Goals related to ${category.title.toLowerCase()}`}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.goals.map((goal) => (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card
                        className={cn(
                          'cursor-pointer transition-all duration-200 hover:shadow-lg',
                          goal.isSelected 
                            ? 'bg-blue-500/20 border-blue-500/50 shadow-blue-500/20' 
                            : goal.isMatched 
                              ? 'bg-green-500/10 border-green-500/30 shadow-green-500/10'
                              : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                        )}
                        onClick={() => handleGoalClick(goal)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-white font-medium text-sm">
                                  {goal.title}
                                </h4>
                                
                                {goal.isMatched && (
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                    <SpeakerWaveIcon  className="h-2 w-2 mr-1" />
                                    Voice Match
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-gray-400 text-xs">
                                {goal.description}
                              </p>
                              
                              {goal.originalText && (
                                <p className="text-green-400 text-xs mt-1 italic">
                                  "{goal.originalText}"
                                </p>
                              )}
                            </div>
                            
                            <div className="ml-3 flex flex-col items-end gap-1">
                              {goal.isSelected && (
                                <CheckIcon  className="h-5 w-5 text-blue-400" />
                              )}
                              
                              {goal.matchConfidence && (
                                <span className="text-xs text-green-400">
                                  {Math.round(goal.matchConfidence * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-gray-400 text-sm">
          You can select multiple goals across different categories. 
          Goals with voice matches are highlighted in green.
        </p>
      </div>
    </div>
  )
}