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

    const body = await request.json()
    const { readDurationSeconds, deviceInfo } = body

    // Mark message as read
    const { data: success, error } = await supabase
      .rpc('mark_message_as_read', {
        p_message_id: params.messageId,
        p_user_id: user.id
      })

    if (error) {
      console.error('Mark as read error:', error)
      return NextResponse.json({ error: 'Failed to mark message as read' }, { status: 500 })
    }

    if (!success) {
      return NextResponse.json({ error: 'Message not found or already read' }, { status: 404 })
    }

    // Update read receipt with additional info if provided
    if (readDurationSeconds || deviceInfo) {
      const updateData: {
        read_duration_seconds?: number;
        device_info?: string;
      } = {}
      if (readDurationSeconds) updateData.read_duration_seconds = readDurationSeconds
      if (deviceInfo) updateData.device_info = deviceInfo

      await supabase
        .from('message_read_receipts')
        .update(updateData)
        .eq('message_id', params.messageId)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Read status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}