import { createClient } from '@/utils/supabase/client'

export interface GraphGoal {
  goal_id: string
  goal_title: string
  category: string
  target_date: string
  priority: string
  session_count: number
  total_duration_minutes: number
  accomplishment_count: number
  latest_session_date: string | null
}

export interface GraphNode {
  id: string
  user_id: string
  node_type: 'goal' | 'skill' | 'emotion' | 'session' | 'accomplishment'
  label: string
  description?: string
  properties: any
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface GraphEdge {
  id: string
  user_id: string
  edge_type: 'works_on' | 'has_skill' | 'derived_from' | 'feels' | 'achieves'
  source_node_id: string
  target_node_id: string
  properties: any
  valid_from: string
  valid_to?: string
  created_at: string
  updated_at: string
}

export class GraphGoalService {
  private supabase = createClient()

  async getUserGoalsWithProgress(userId: string): Promise<GraphGoal[]> {
    // Return empty array for anonymous users or if no userId
    if (!userId) {
      console.log('No userId provided to getUserGoalsWithProgress, returning empty goals')
      return []
    }
    
    console.log('Fetching goals for userId:', userId)

    const { data, error } = await this.supabase
      .rpc('get_user_goals_with_progress', { p_user_id: userId })

    if (error) {
      console.error('Error fetching user goals with progress:', error.message || error)
      console.error('Full error details:', JSON.stringify(error, null, 2))
      return []
    }

    console.log('Goals fetched successfully:', data?.length || 0, 'goals')
    return data || []
  }

  async createGoalNode(
    userId: string,
    title: string,
    category: string,
    properties: Record<string, any> = {}
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .rpc('create_goal_node', {
        p_user_id: userId,
        p_title: title,
        p_category: category,
        p_properties: properties
      })

    if (error) {
      console.error('Error creating goal node:', error)
      return null
    }

    return data
  }

  async createSkillNode(
    userId: string,
    skillName: string,
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'beginner',
    transferableFrom: string[] = []
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .rpc('create_skill_node', {
        p_user_id: userId,
        p_skill_name: skillName,
        p_level: level,
        p_transferable_from: transferableFrom
      })

    if (error) {
      console.error('Error creating skill node:', error)
      return null
    }

    return data
  }

  async trackEmotion(
    userId: string,
    emotion: 'confident' | 'anxious' | 'motivated' | 'uncertain' | 'accomplished' | 'frustrated',
    intensity: number = 0.5,
    context?: string
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .rpc('track_emotion', {
        p_user_id: userId,
        p_emotion: emotion,
        p_intensity: intensity,
        p_context: context
      })

    if (error) {
      console.error('Error tracking emotion:', error)
      return null
    }

    return data
  }

  async createSessionNode(
    userId: string,
    goalId: string,
    durationMinutes: number,
    summary: string,
    properties: Record<string, any> = {}
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .rpc('create_session_node', {
        p_user_id: userId,
        p_goal_id: goalId,
        p_duration: durationMinutes,
        p_summary: summary,
        p_properties: properties
      })

    if (error) {
      console.error('Error creating session node:', error)
      return null
    }

    return data
  }

  async getRecentSessions(userId: string, limit: number = 5): Promise<GraphNode[]> {
    // Return empty array for anonymous users or if no userId
    if (!userId) {
      console.log('No userId provided to getRecentSessions, returning empty sessions')
      return []
    }

    console.log('Fetching recent sessions for userId:', userId)

    const { data, error } = await this.supabase
      .from('graph_nodes')
      .select('*')
      .eq('user_id', userId)
      .eq('node_type', 'session')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent sessions:', error)
      return []
    }

    return data || []
  }

  async getEmotionalJourney(userId: string, days: number = 30): Promise<GraphNode[]> {
    // Return empty array for anonymous users or if no userId
    if (!userId) {
      console.log('No userId provided, returning empty emotional journey')
      return []
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await this.supabase
      .from('graph_nodes')
      .select('*')
      .eq('user_id', userId)
      .eq('node_type', 'emotion')
      .is('deleted_at', null)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching emotional journey:', error)
      return []
    }

    return data || []
  }

  async getUserSkills(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .rpc('get_user_skills_graph', { p_user_id: userId })

    if (error) {
      console.error('Error fetching user skills:', error)
      return []
    }

    return data || []
  }

  async getGoalAccomplishments(userId: string, goalId: string): Promise<GraphNode[]> {
    // First, get accomplishment nodes for this user
    const { data: accomplishments, error: accomplishmentsError } = await this.supabase
      .from('graph_nodes')
      .select('*')
      .eq('user_id', userId)
      .eq('node_type', 'accomplishment')
      .is('deleted_at', null)

    if (accomplishmentsError) {
      console.error('Error fetching accomplishments:', accomplishmentsError)
      return []
    }

    if (!accomplishments || accomplishments.length === 0) {
      return []
    }

    // Then, get edges connecting accomplishments to the specific goal
    const { data: edges, error: edgesError } = await this.supabase
      .from('graph_edges')
      .select('*')
      .eq('from_node_id', goalId)
      .in('to_node_id', accomplishments.map(a => a.id))
      .eq('edge_type', 'accomplishment_for_goal')

    if (edgesError) {
      console.error('Error fetching accomplishment edges:', edgesError)
      return []
    }

    // Filter accomplishments that have edges to the specific goal
    const connectedAccomplishmentIds = new Set(edges?.map(e => e.to_node_id) || [])
    const connectedAccomplishments = accomplishments.filter(a => 
      connectedAccomplishmentIds.has(a.id)
    )

    return connectedAccomplishments
  }

  // Helper function to group goals by category
  groupGoalsByCategory(goals: GraphGoal[]): Record<string, GraphGoal[]> {
    return goals.reduce((acc, goal) => {
      const category = goal.category || 'Uncategorized'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(goal)
      return acc
    }, {} as Record<string, GraphGoal[]>)
  }

  // Calculate overall progress
  calculateOverallProgress(goals: GraphGoal[]): {
    totalGoals: number
    sessionsCompleted: number
    totalDurationMinutes: number
    accomplishments: number
    averageConfidence?: number
  } {
    const totalGoals = goals.length
    const sessionsCompleted = goals.reduce((sum, goal) => sum + goal.session_count, 0)
    const totalDurationMinutes = goals.reduce((sum, goal) => sum + goal.total_duration_minutes, 0)
    const accomplishments = goals.reduce((sum, goal) => sum + goal.accomplishment_count, 0)

    return {
      totalGoals,
      sessionsCompleted,
      totalDurationMinutes,
      accomplishments
    }
  }
}

export const graphGoalService = new GraphGoalService()