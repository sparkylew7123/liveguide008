import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, messageIds } = await request.json()

    if (!action || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid request: action and messageIds array required' 
      }, { status: 400 })
    }

    // Validate message ownership
    const { data: validMessages, error: validationError } = await supabase
      .from('inbox_messages')
      .select('id')
      .eq('user_id', user.id)
      .in('id', messageIds)

    if (validationError || !validMessages) {
      return NextResponse.json({ error: 'Failed to validate messages' }, { status: 500 })
    }

    const validIds = validMessages.map(m => m.id)
    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid messages found' }, { status: 404 })
    }

    let result
    
    switch (action) {
      case 'mark_read':
        // Mark all as read
        for (const messageId of validIds) {
          await supabase.rpc('mark_message_as_read', {
            p_message_id: messageId,
            p_user_id: user.id
          })
        }
        result = { updated: validIds.length }
        break

      case 'mark_unread':
        // Mark all as unread
        const { error: unreadError } = await supabase
          .from('inbox_messages')
          .update({ 
            status: 'unread',
            read_at: null 
          })
          .eq('user_id', user.id)
          .in('id', validIds)

        if (unreadError) {
          return NextResponse.json({ error: 'Failed to mark messages as unread' }, { status: 500 })
        }
        result = { updated: validIds.length }
        break

      case 'archive':
        // Archive all
        for (const messageId of validIds) {
          await supabase.rpc('archive_message', {
            p_message_id: messageId,
            p_user_id: user.id
          })
        }
        result = { archived: validIds.length }
        break

      case 'unarchive':
        // Unarchive all
        const { error: unarchiveError } = await supabase
          .from('inbox_messages')
          .update({ 
            status: 'read',
            archived_at: null 
          })
          .eq('user_id', user.id)
          .in('id', validIds)

        if (unarchiveError) {
          return NextResponse.json({ error: 'Failed to unarchive messages' }, { status: 500 })
        }
        result = { unarchived: validIds.length }
        break

      case 'delete':
        // Permanent delete (only for archived messages)
        const { error: deleteError } = await supabase
          .from('inbox_messages')
          .delete()
          .eq('user_id', user.id)
          .in('id', validIds)
          .not('archived_at', 'is', null)

        if (deleteError) {
          return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 })
        }
        result = { deleted: validIds.length }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      ...result
    })

  } catch (error) {
    console.error('Bulk action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}