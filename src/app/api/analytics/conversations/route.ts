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
    const timeframe = searchParams.get('timeframe') || '30d'
    const conversationId = searchParams.get('conversationId')

    // If specific conversation requested
    if (conversationId) {
      const { data: insight, error } = await supabase
        .from('conversation_insights')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      return NextResponse.json({ insight })
    }

    // Get conversation analytics for timeframe
    const startDate = getStartDate(timeframe)
    
    const { data: insights, error: insightsError } = await supabase
      .from('conversation_insights')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (insightsError) {
      console.error('Insights error:', insightsError)
      return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 })
    }

    // Calculate aggregate metrics
    const metrics = calculateConversationMetrics(insights || [])

    return NextResponse.json({
      insights: insights || [],
      metrics,
      timeframe
    })

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // This should be called by the webhook or service role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const insights = await request.json()

    // Calculate engagement score
    const engagementScore = await supabase
      .rpc('calculate_engagement_score', {
        message_count: insights.message_count || 0,
        duration_seconds: insights.duration_seconds || 0,
        tool_calls_count: insights.tool_calls_count || 0
      })

    // Insert or update conversation insights
    const { data, error } = await supabase
      .from('conversation_insights')
      .upsert({
        ...insights,
        engagement_score: engagementScore,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: 'Failed to save insights' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Analytics save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getStartDate(timeframe: string): Date {
  const now = new Date()
  switch (timeframe) {
    case '7d':
      return new Date(now.setDate(now.getDate() - 7))
    case '30d':
      return new Date(now.setDate(now.getDate() - 30))
    case '90d':
      return new Date(now.setDate(now.getDate() - 90))
    case 'all':
      return new Date('2024-01-01')
    default:
      return new Date(now.setDate(now.getDate() - 30))
  }
}

function calculateConversationMetrics(insights: any[]) {
  if (insights.length === 0) {
    return {
      totalConversations: 0,
      totalDuration: 0,
      averageDuration: 0,
      averageEngagement: 0,
      topTopics: [],
      goalsIdentified: 0,
      actionItems: 0
    }
  }

  const totalDuration = insights.reduce((sum, i) => sum + (i.duration_seconds || 0), 0)
  const totalEngagement = insights.reduce((sum, i) => sum + (i.engagement_score || 0), 0)
  
  // Aggregate topics
  const topicsMap = new Map<string, number>()
  insights.forEach(insight => {
    (insight.topics || []).forEach((topic: string) => {
      topicsMap.set(topic, (topicsMap.get(topic) || 0) + 1)
    })
  })
  
  const topTopics = Array.from(topicsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }))

  const totalGoals = insights.reduce((sum, i) => 
    sum + (i.goals_mentioned?.length || 0), 0
  )
  
  const totalActions = insights.reduce((sum, i) => 
    sum + (i.action_items?.length || 0), 0
  )

  return {
    totalConversations: insights.length,
    totalDuration,
    averageDuration: Math.round(totalDuration / insights.length),
    averageEngagement: (totalEngagement / insights.length).toFixed(2),
    topTopics,
    goalsIdentified: totalGoals,
    actionItems: totalActions
  }
}