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
    const period = searchParams.get('period') || 'current_month'

    // Get period dates
    const { startDate, endDate } = getPeriodDates(period)

    // Get or create coaching effectiveness record
    let { data: effectiveness, error } = await supabase
      .from('coaching_effectiveness')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_start', startDate.toISOString().split('T')[0])
      .eq('period_end', endDate.toISOString().split('T')[0])
      .single()

    if (error || !effectiveness) {
      // Create new effectiveness record
      effectiveness = await createEffectivenessRecord(
        supabase, 
        user.id, 
        startDate, 
        endDate
      )
    }

    // Get user journey
    const { data: journey } = await supabase
      .from('user_coaching_journey')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Get recent insights for trends
    const { data: recentInsights } = await supabase
      .from('conversation_insights')
      .select('topics, coaching_areas, sentiment')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Calculate trends
    const trends = calculateTrends(recentInsights || [])

    return NextResponse.json({
      effectiveness,
      journey,
      trends,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    })

  } catch (error) {
    console.error('Coaching analytics error:', error)
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

    const update = await request.json()

    // Update user journey preferences
    if (update.preferences) {
      const { error } = await supabase
        .from('user_coaching_journey')
        .upsert({
          user_id: user.id,
          preferred_coaching_style: update.preferences.coaching_style,
          preferred_session_length: update.preferences.session_length,
          preferred_frequency: update.preferences.frequency,
          interests: update.preferences.interests || [],
          challenges: update.preferences.challenges || [],
          strengths: update.preferences.strengths || [],
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Journey update error:', error)
        return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
      }
    }

    // Update satisfaction metrics
    if (update.satisfaction) {
      const { startDate, endDate } = getPeriodDates('current_month')
      
      const { error } = await supabase
        .from('coaching_effectiveness')
        .update({
          user_satisfaction_score: update.satisfaction.score,
          recommendation_likelihood: update.satisfaction.nps
        })
        .eq('user_id', user.id)
        .eq('period_start', startDate.toISOString().split('T')[0])
        .eq('period_end', endDate.toISOString().split('T')[0])

      if (error) {
        console.error('Satisfaction update error:', error)
        return NextResponse.json({ error: 'Failed to update satisfaction' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Coaching update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getPeriodDates(period: string) {
  const now = new Date()
  let startDate: Date
  let endDate: Date

  switch (period) {
    case 'current_week':
      startDate = new Date(now)
      startDate.setDate(now.getDate() - now.getDay())
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      break
    case 'current_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      break
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0)
      break
    case 'current_year':
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31)
      break
    default:
      // Default to current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  }

  return { startDate, endDate }
}

async function createEffectivenessRecord(
  supabase: any,
  userId: string,
  startDate: Date,
  endDate: Date
) {
  // Calculate metrics for the period
  const { data: conversations } = await supabase
    .from('conversation_insights')
    .select('duration_seconds, goals_mentioned, action_items')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  const { data: goals } = await supabase
    .from('user_goals')
    .select('status')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  const { data: progress } = await supabase
    .from('goal_progress')
    .select('status')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  const totalConversations = conversations?.length || 0
  const totalDuration = conversations?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0
  const totalGoals = goals?.length || 0
  const completedGoals = goals?.filter(g => g.status === 'achieved').length || 0
  const milestones = progress?.filter(p => p.status === 'completed').length || 0

  const metrics = {
    user_id: userId,
    period_start: startDate.toISOString().split('T')[0],
    period_end: endDate.toISOString().split('T')[0],
    total_conversations: totalConversations,
    total_duration_minutes: Math.round(totalDuration / 60),
    average_conversation_length: totalConversations > 0 
      ? (totalDuration / 60 / totalConversations).toFixed(2) 
      : 0,
    goals_set: totalGoals,
    goals_completed: completedGoals,
    goals_in_progress: totalGoals - completedGoals,
    goal_completion_rate: totalGoals > 0 
      ? (completedGoals / totalGoals).toFixed(2) 
      : 0,
    milestones_reached: milestones
  }

  const { data, error } = await supabase
    .from('coaching_effectiveness')
    .insert(metrics)
    .select()
    .single()

  if (error) {
    console.error('Effectiveness creation error:', error)
    return metrics
  }

  return data
}

function calculateTrends(insights: any[]) {
  // Topic frequency
  const topicCounts = new Map<string, number>()
  insights.forEach(insight => {
    (insight.topics || []).forEach((topic: string) => {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
    })
  })

  // Coaching area focus
  const areaCounts = new Map<string, number>()
  insights.forEach(insight => {
    (insight.coaching_areas || []).forEach((area: string) => {
      areaCounts.set(area, (areaCounts.get(area) || 0) + 1)
    })
  })

  // Average sentiment
  let totalSentiment = 0
  let sentimentCount = 0
  insights.forEach(insight => {
    if (insight.sentiment?.overall) {
      totalSentiment += insight.sentiment.overall
      sentimentCount++
    }
  })

  return {
    topTopics: Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count })),
    focusAreas: Array.from(areaCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([area, count]) => ({ area, count })),
    averageSentiment: sentimentCount > 0 
      ? (totalSentiment / sentimentCount).toFixed(2) 
      : null,
    totalInsights: insights.length
  }
}