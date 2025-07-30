import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string; attachmentId: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get attachment with message ownership check
    const { data: attachment, error } = await supabase
      .from('message_attachments')
      .select(`
        *,
        inbox_messages!inner (
          user_id
        )
      `)
      .eq('id', params.attachmentId)
      .eq('message_id', params.messageId)
      .eq('inbox_messages.user_id', user.id)
      .single()

    if (error || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // If stored in Supabase storage, generate a signed URL
    if (attachment.storage_path) {
      const { data: signedUrl, error: urlError } = await supabase
        .storage
        .from('inbox-attachments')
        .createSignedUrl(attachment.storage_path, 3600) // 1 hour expiry

      if (!urlError && signedUrl) {
        attachment.url = signedUrl.signedUrl
      }
    }

    return NextResponse.json({ attachment })

  } catch (error) {
    console.error('Attachment fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string; attachmentId: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get attachment to check ownership and get storage path
    const { data: attachment, error: fetchError } = await supabase
      .from('message_attachments')
      .select(`
        *,
        inbox_messages!inner (
          user_id
        )
      `)
      .eq('id', params.attachmentId)
      .eq('message_id', params.messageId)
      .eq('inbox_messages.user_id', user.id)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Delete from storage if applicable
    if (attachment.storage_path) {
      await supabase
        .storage
        .from('inbox-attachments')
        .remove([attachment.storage_path])
    }

    // Delete attachment record
    const { error: deleteError } = await supabase
      .from('message_attachments')
      .delete()
      .eq('id', params.attachmentId)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Attachment deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}