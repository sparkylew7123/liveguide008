import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('goalId')
    const status = searchParams.get('status')

    if (goalId) {
      // Get specific goal progress
      const { data: progress, error } = await supabase
        .from('goal_progress')
        .select(`
          *,
          user_goals!inner(
            title,
            description,
            category,
            target_date
          )
        `)
        .eq('goal_id', goalId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Goal progress not found' }, { status: 404 })
      }

      // Calculate overall progress
      const latestProgress = progress?.[0]
      const overallProgress = latestProgress?.progress_percentage || 0

      return NextResponse.json({
        goal: progress?.[0]?.user_goals,
        progress: progress || [],
        overallProgress
      })
    }

    // Get all goals with progress
    let query = supabase
      .from('user_goals')
      .select(`
        *,
        goal_progress(
          id,
          milestone,
          progress_percentage,
          status,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: goals, error } = await query

    if (error) {
      console.error('Goals fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
    }

    // Calculate metrics
    const metrics = calculateGoalMetrics(goals || [])

    return NextResponse.json({
      goals: goals || [],
      metrics
    })

  } catch (error) {
    console.error('Goals analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const progressUpdate = await request.json()

    // Validate goal ownership
    const { data: goal, error: goalError } = await supabase
      .from('user_goals')
      .select('id')
      .eq('id', progressUpdate.goal_id)
      .eq('user_id', user.id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Insert progress update
    const { data, error } = await supabase
      .from('goal_progress')
      .insert({
        user_id: user.id,
        goal_id: progressUpdate.goal_id,
        milestone: progressUpdate.milestone,
        description: progressUpdate.description,
        progress_percentage: progressUpdate.progress_percentage,
        conversation_id: progressUpdate.conversation_id,
        evidence: progressUpdate.evidence || {},
        status: progressUpdate.status || 'in_progress',
        completed_at: progressUpdate.status === 'completed' ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (error) {
      console.error('Progress insert error:', error)
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
    }

    // Update goal status if completed
    if (progressUpdate.progress_percentage === 100) {
      await supabase
        .from('user_goals')
        .update({
          status: 'achieved',
          achieved_at: new Date().toISOString()
        })
        .eq('id', progressUpdate.goal_id)
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Progress update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateGoalMetrics(goals: {
  status: string;
  category?: string;
  goal_progress?: {
    created_at: string;
    progress_percentage?: number;
  }[];
}[]) {
  const total = goals.length
  const completed = goals.filter(g => g.status === 'achieved').length
  const inProgress = goals.filter(g => g.status === 'active').length
  const paused = goals.filter(g => g.status === 'paused').length

  // Calculate average progress
  let totalProgress = 0
  let goalsWithProgress = 0

  goals.forEach(goal => {
    if (goal.goal_progress && goal.goal_progress.length > 0) {
      const latestProgress = goal.goal_progress
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      
      if (latestProgress.progress_percentage) {
        totalProgress += latestProgress.progress_percentage
        goalsWithProgress++
      }
    }
  })

  const averageProgress = goalsWithProgress > 0 
    ? Math.round(totalProgress / goalsWithProgress) 
    : 0

  // Calculate completion rate
  const completionRate = total > 0 
    ? (completed / total * 100).toFixed(1) 
    : '0.0'

  // Category breakdown
  const categoryBreakdown = goals.reduce((acc, goal) => {
    const category = goal.category || 'uncategorized'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    total,
    completed,
    inProgress,
    paused,
    averageProgress,
    completionRate,
    categoryBreakdown
  }
}