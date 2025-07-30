import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // Get all cookies
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    // Filter auth-related cookies
    const authCookies = allCookies.filter(c => 
      c.name.startsWith('sb-') || 
      c.name.includes('auth') ||
      c.name === 'supabase-auth-token'
    )
    
    // Try to create client and get user
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    return NextResponse.json({
      status: 'ok',
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      } : null,
      session: session ? {
        access_token: session.access_token ? 'present' : 'missing',
        refresh_token: session.refresh_token ? 'present' : 'missing',
        expires_at: session.expires_at,
        expires_in: session.expires_in
      } : null,
      cookies: {
        total: allCookies.length,
        authCookies: authCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value,
          length: c.value?.length || 0
        }))
      },
      errors: {
        user: error?.message,
        session: sessionError?.message
      },
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    })
  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}