import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Toggle pin status
    const { data: success, error } = await supabase
      .rpc('toggle_message_pin', {
        p_message_id: params.messageId,
        p_user_id: user.id
      })

    if (error) {
      console.error('Pin toggle error:', error)
      return NextResponse.json({ error: 'Failed to toggle pin status' }, { status: 500 })
    }

    if (!success) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Get updated message to return new pin status
    const { data: message } = await supabase
      .from('inbox_messages')
      .select('id, is_pinned')
      .eq('id', params.messageId)
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({ 
      success: true,
      isPinned: message?.is_pinned || false
    })

  } catch (error) {
    console.error('Pin toggle error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}