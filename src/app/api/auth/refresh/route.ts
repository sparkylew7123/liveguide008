import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Try to refresh the session
    const { data: { session }, error } = await supabase.auth.refreshSession()
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    
    if (!session) {
      return NextResponse.json(
        { error: 'No session to refresh' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({
      success: true,
      user: session.user,
      access_token: session.access_token,
      refresh_token: session.refresh_token
    })
  } catch (error) {
    console.error('Refresh error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    )
  }
}