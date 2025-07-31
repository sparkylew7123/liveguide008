'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ViewfinderCircleIcon, BriefcaseIcon, HeartIcon, UsersIcon } from '@heroicons/react/24/outline';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
}

interface GoalCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  goals: Goal[];
}

interface GoalCategoriesDisplayProps {
  selectedGoals: string[];
  onGoalSelect: (goalId: string) => void;
}

export function GoalCategoriesDisplay({ selectedGoals, onGoalSelect }: GoalCategoriesDisplayProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const goalCategories: GoalCategory[] = [
    {
      id: 'personal_growth',
      title: 'Personal Growth',
      description: 'Develop yourself and build confidence',
      icon: Target,
      color: 'text-blue-600',
      goals: [
        {
          id: 'public_speaking_confidence',
          title: 'Public Speaking Confidence',
          description: 'Build confidence in public speaking and presentations',
          category: 'personal_growth'
        },
        {
          id: 'leadership_skills',
          title: 'Leadership Skills',
          description: 'Develop leadership abilities and team management',
          category: 'personal_growth'
        },
        {
          id: 'emotional_intelligence',
          title: 'Emotional Intelligence',
          description: 'Improve emotional awareness and regulation',
          category: 'personal_growth'
        },
        {
          id: 'mindfulness_meditation',
          title: 'Mindfulness & Meditation',
          description: 'Develop mindfulness practices and meditation habits',
          category: 'personal_growth'
        },
        {
          id: 'time_management',
          title: 'Time Management',
          description: 'Improve productivity and time organization skills',
          category: 'personal_growth'
        }
      ]
    },
    {
      id: 'professional',
      title: 'Professional',
      description: 'Advance your career and skills',
      icon: Briefcase,
      color: 'text-green-600',
      goals: [
        {
          id: 'career_advancement',
          title: 'Career Advancement',
          description: 'Navigate promotions and career growth opportunities',
          category: 'professional'
        },
        {
          id: 'skill_development',
          title: 'Skill Development',
          description: 'Learn new technical or professional skills',
          category: 'professional'
        },
        {
          id: 'networking',
          title: 'Professional Networking',
          description: 'Build meaningful professional relationships',
          category: 'professional'
        },
        {
          id: 'work_life_balance',
          title: 'Work-Life Balance',
          description: 'Achieve better balance between work and personal life',
          category: 'professional'
        },
        {
          id: 'entrepreneurship',
          title: 'Entrepreneurship',
          description: 'Start or grow your own business venture',
          category: 'professional'
        }
      ]
    },
    {
      id: 'health_wellness',
      title: 'Health & Wellness',
      description: 'Improve your physical and mental well-being',
      icon: Heart,
      color: 'text-red-600',
      goals: [
        {
          id: 'fitness_goals',
          title: 'Fitness Goals',
          description: 'Achieve specific fitness and exercise objectives',
          category: 'health_wellness'
        },
        {
          id: 'nutrition_habits',
          title: 'Nutrition & Healthy Eating',
          description: 'Develop sustainable healthy eating habits',
          category: 'health_wellness'
        },
        {
          id: 'stress_management',
          title: 'Stress Management',
          description: 'Learn effective stress reduction techniques',
          category: 'health_wellness'
        },
        {
          id: 'sleep_optimization',
          title: 'Sleep Optimization',
          description: 'Improve sleep quality and establish better sleep habits',
          category: 'health_wellness'
        },
        {
          id: 'mental_health',
          title: 'Mental Health',
          description: 'Support overall mental wellness and resilience',
          category: 'health_wellness'
        }
      ]
    },
    {
      id: 'relationships',
      title: 'Relationships',
      description: 'Build stronger connections with others',
      icon: Users,
      color: 'text-purple-600',
      goals: [
        {
          id: 'communication_skills',
          title: 'Communication Skills',
          description: 'Improve verbal and non-verbal communication',
          category: 'relationships'
        },
        {
          id: 'dating_relationships',
          title: 'Dating & Relationships',
          description: 'Navigate dating and build romantic relationships',
          category: 'relationships'
        },
        {
          id: 'family_dynamics',
          title: 'Family Dynamics',
          description: 'Improve relationships with family members',
          category: 'relationships'
        },
        {
          id: 'social_skills',
          title: 'Social Skills',
          description: 'Build confidence in social situations',
          category: 'relationships'
        },
        {
          id: 'conflict_resolution',
          title: 'Conflict Resolution',
          description: 'Learn to handle conflicts constructively',
          category: 'relationships'
        }
      ]
    }
  ];

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const getSelectedGoalsInCategory = (categoryId: string) => {
    const category = goalCategories.find(cat => cat.id === categoryId);
    if (!category) return 0;
    return category.goals.filter(goal => selectedGoals.includes(goal.id)).length;
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Choose Your Goals
        </h3>
        <p className="text-sm text-gray-600">
          Select the goals that resonate most with you. You can choose from multiple categories.
        </p>
      </div>

      <div className="grid gap-4">
        {goalCategories.map((category) => {
          const selectedCount = getSelectedGoalsInCategory(category.id);
          const isExpanded = expandedCategory === category.id;

          return (
            <Card key={category.id} className="transition-all duration-200">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center`}>
                      <category.icon className={`w-5 h-5 ${category.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedCount > 0 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {selectedCount} selected
                      </Badge>
                    )}
                    <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {category.goals.map((goal) => {
                      const isSelected = selectedGoals.includes(goal.id);
                      
                      return (
                        <div
                          key={goal.id}
                          className={`
                            p-3 border rounded-lg cursor-pointer transition-all duration-200
                            ${isSelected 
                              ? 'border-blue-500 bg-blue-50 shadow-sm' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }
                          `}
                          onClick={() => onGoalSelect(goal.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{goal.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                            </div>
                            <div className={`
                              ml-3 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                              ${isSelected 
                                ? 'bg-blue-500 border-blue-500' 
                                : 'border-gray-300'
                              }
                            `}>
                              {isSelected && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {selectedGoals.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">
            Selected Goals ({selectedGoals.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedGoals.map((goalId) => {
              const goal = goalCategories
                .flatMap(cat => cat.goals)
                .find(g => g.id === goalId);
              
              return goal ? (
                <Badge key={goalId} variant="secondary" className="bg-blue-100 text-blue-700">
                  {goal.title}
                </Badge>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}