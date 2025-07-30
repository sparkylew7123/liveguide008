import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // unread, read, archived
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const isPinned = searchParams.get('pinned')
    const goalId = searchParams.get('goalId')
    const sessionId = searchParams.get('sessionId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('inbox_summary')
      .select('*')
      .eq('user_id', user.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (isPinned === 'true') {
      query = query.eq('is_pinned', true)
    }
    if (goalId) {
      query = query.eq('goal_node_id', goalId)
    }
    if (sessionId) {
      query = query.eq('session_node_id', sessionId)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error('Messages fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Get unread count
    const { data: unreadCount } = await supabase
      .rpc('get_unread_message_count', { p_user_id: user.id })

    return NextResponse.json({
      messages: messages || [],
      unreadCount: unreadCount || 0,
      pagination: {
        limit,
        offset,
        hasMore: messages?.length === limit
      }
    })

  } catch (error) {
    console.error('Inbox messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // This endpoint is typically used by services/agents to create messages
    // For now, we'll require authentication but in production, you might use
    // a service role key for agent-generated messages
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const messageData = await request.json()

    // Validate required fields
    if (!messageData.subject || !messageData.content || !messageData.sender_agent_id || !messageData.sender_name) {
      return NextResponse.json({ 
        error: 'Missing required fields: subject, content, sender_agent_id, sender_name' 
      }, { status: 400 })
    }

    // Create message with attachments using the database function
    const { data, error } = await supabase
      .rpc('create_message_with_attachments', {
        p_user_id: messageData.user_id || user.id,
        p_subject: messageData.subject,
        p_content: messageData.content,
        p_sender_agent_id: messageData.sender_agent_id,
        p_sender_name: messageData.sender_name,
        p_category: messageData.category || null,
        p_priority: messageData.priority || 'normal',
        p_session_node_id: messageData.session_node_id || null,
        p_goal_node_id: messageData.goal_node_id || null,
        p_attachments: messageData.attachments || []
      })

    if (error) {
      console.error('Message creation error:', error)
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      messageId: data 
    })

  } catch (error) {
    console.error('Message creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}