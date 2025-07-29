import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get unread count using the database function
    const { data: count, error } = await supabase
      .rpc('get_unread_message_count', { p_user_id: user.id })

    if (error) {
      console.error('Unread count error:', error)
      return NextResponse.json({ error: 'Failed to get unread count' }, { status: 500 })
    }

    return NextResponse.json({ 
      unreadCount: count || 0 
    })

  } catch (error) {
    console.error('Unread count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}