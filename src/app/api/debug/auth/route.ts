import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    return NextResponse.json({
      authenticated: !!user,
      user: user ? { id: user.id, email: user.email } : null,
      error: error?.message || null,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check auth',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}