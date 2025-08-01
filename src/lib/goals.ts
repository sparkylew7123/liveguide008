import { createClient } from '@/utils/supabase/client'
import { Database } from '@/types/database'

export type GoalCategory = Database['public']['Tables']['goal_categories']['Row']
export type UserGoal = Database['public']['Tables']['user_goals']['Row']

export interface GoalCategoryWithGoals extends GoalCategory {
  goals: UserGoal[]
}

// Color mapping for goal categories
export const GOAL_CATEGORY_COLORS: Record<string, string> = {
  'Personal Growth': '#8B5CF6', // purple
  'Professional': '#3B82F6', // blue
  'Health & Wellness': '#10B981', // green
  'Relationships': '#F59E0B', // amber
  'Financial': '#EF4444', // red
  'Creative': '#EC4899', // pink
  'Spiritual': '#6366F1', // indigo
  'Education': '#14B8A6', // teal
}

// Icon mapping for goal categories (icon names as strings)
export const GOAL_CATEGORY_ICONS: Record<string, string> = {
  'Personal Growth': 'viewfinder-circle',
  'Professional': 'briefcase',
  'Health & Wellness': 'heart',
  'Relationships': 'users',
  'Financial': 'currency-dollar',
  'Creative': 'paint-brush',
  'Spiritual': 'sparkles',
  'Education': 'academic-cap',
}

// Predefined goals for each category (as fallback)
export const PREDEFINED_GOALS: Record<string, string[]> = {
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

export class GoalService {
  private supabase = createClient()

  async getGoalCategories(): Promise<GoalCategory[]> {
    const { data, error } = await this.supabase
      .from('goal_categories')
      .select('*')
      .order('title')

    if (error) {
      console.error('Error fetching goal categories:', error)
      return []
    }

    return data || []
  }

  async getUserGoals(userId: string): Promise<UserGoal[]> {
    const { data, error } = await this.supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user goals:', error)
      return []
    }

    return data || []
  }

  async getUserGoalsByCategory(userId: string): Promise<GoalCategoryWithGoals[]> {
    const categories = await this.getGoalCategories()
    const userGoals = await this.getUserGoals(userId)

    return categories.map(category => ({
      ...category,
      goals: userGoals.filter(goal => goal.category_id === category.id)
    }))
  }

  async createUserGoal(goal: Omit<UserGoal, 'id' | 'created_at' | 'updated_at'>): Promise<UserGoal | null> {
    const { data, error } = await this.supabase
      .from('user_goals')
      .insert(goal)
      .select()
      .single()

    if (error) {
      console.error('Error creating user goal:', error)
      return null
    }

    return data
  }

  async updateUserGoal(id: string, updates: Partial<UserGoal>): Promise<UserGoal | null> {
    const { data, error } = await this.supabase
      .from('user_goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user goal:', error)
      return null
    }

    return data
  }

  async deleteUserGoal(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('user_goals')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting user goal:', error)
      return false
    }

    return true
  }

  // Check if a goal matches predefined goals or categories
  matchGoalToCategory(goalText: string): { category: string; confidence: number } | null {
    const text = goalText.toLowerCase()
    
    // Check for exact or partial matches in predefined goals
    for (const [category, goals] of Object.entries(PREDEFINED_GOALS)) {
      for (const goal of goals) {
        const goalWords = goal.toLowerCase().split(' ')
        const textWords = text.split(' ')
        
        // Calculate word overlap
        const overlap = goalWords.filter(word => textWords.includes(word)).length
        const confidence = overlap / goalWords.length
        
        if (confidence > 0.5) {
          return { category, confidence }
        }
      }
    }
    
    // Check for category keywords
    const categoryKeywords: Record<string, string[]> = {
      'Personal Growth': ['confidence', 'mindfulness', 'personal', 'growth', 'self', 'develop'],
      'Professional': ['career', 'work', 'job', 'business', 'professional', 'leadership'],
      'Health & Wellness': ['health', 'fitness', 'exercise', 'wellness', 'sleep', 'nutrition'],
      'Relationships': ['relationship', 'communication', 'friends', 'family', 'social']
    }
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const matches = keywords.filter(keyword => text.includes(keyword)).length
      if (matches > 0) {
        return { category, confidence: matches / keywords.length }
      }
    }
    
    return null
  }

  // Generate goals for a category if none exist
  async ensureCategoryHasGoals(categoryId: string, categoryTitle: string): Promise<void> {
    const { data: existingGoals } = await this.supabase
      .from('user_goals')
      .select('id')
      .eq('category_id', categoryId)

    if (existingGoals && existingGoals.length > 0) {
      return // Category already has goals
    }

    // Add predefined goals for this category
    const predefinedGoals = PREDEFINED_GOALS[categoryTitle] || []
    
    for (const goalTitle of predefinedGoals) {
      await this.supabase
        .from('user_goals')
        .insert({
          category_id: categoryId,
          goal_title: goalTitle,
          goal_description: goalTitle,
          goal_status: 'template',
          user_id: null, // Template goals don't belong to specific users
          metadata: {
            is_template: true,
            predefined: true
          }
        })
    }
  }
}

export const goalService = new GoalService()