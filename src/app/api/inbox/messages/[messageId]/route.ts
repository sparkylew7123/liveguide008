import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get message with attachments
    const { data: message, error } = await supabase
      .from('inbox_messages')
      .select(`
        *,
        message_attachments (
          id,
          type,
          name,
          description,
          url,
          storage_path,
          mime_type,
          file_size_bytes,
          metadata
        ),
        session_node:graph_nodes!inbox_messages_session_node_id_fkey (
          id,
          label,
          description,
          properties
        ),
        goal_node:graph_nodes!inbox_messages_goal_node_id_fkey (
          id,
          label,
          description,
          properties
        )
      `)
      .eq('id', params.messageId)
      .eq('user_id', user.id)
      .single()

    if (error || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Mark as read automatically when fetching individual message
    if (message.status === 'unread') {
      await supabase.rpc('mark_message_as_read', {
        p_message_id: params.messageId,
        p_user_id: user.id
      })
    }

    return NextResponse.json({ message })

  } catch (error) {
    console.error('Message fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json()

    // Build update object with allowed fields only
    const allowedUpdates: {
      status?: string;
      read_at?: string;
      archived_at?: string;
      is_pinned?: boolean;
      is_starred?: boolean;
      user_tags?: string[];
      user_category?: string;
    } = {}
    
    if ('status' in updates) {
      allowedUpdates.status = updates.status
      if (updates.status === 'read') {
        allowedUpdates.read_at = new Date().toISOString()
      } else if (updates.status === 'archived') {
        allowedUpdates.archived_at = new Date().toISOString()
      }
    }
    
    if ('is_pinned' in updates) {
      allowedUpdates.is_pinned = updates.is_pinned
    }
    
    if ('is_starred' in updates) {
      allowedUpdates.is_starred = updates.is_starred
    }
    
    if ('tags' in updates && Array.isArray(updates.tags)) {
      allowedUpdates.tags = updates.tags
    }

    // Update message
    const { data: message, error } = await supabase
      .from('inbox_messages')
      .update(allowedUpdates)
      .eq('id', params.messageId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !message) {
      return NextResponse.json({ error: 'Message not found or update failed' }, { status: 404 })
    }

    return NextResponse.json({ message })

  } catch (error) {
    console.error('Message update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Soft delete by archiving
    const { error } = await supabase
      .rpc('archive_message', {
        p_message_id: params.messageId,
        p_user_id: user.id
      })

    if (error) {
      return NextResponse.json({ error: 'Failed to archive message' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Message deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}