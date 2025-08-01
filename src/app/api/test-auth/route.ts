import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // Log all cookies for debugging
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    console.log('All cookies:', allCookies.map(c => ({ name: c.name, length: c.value?.length })))
    
    // Get auth cookies specifically
    const authCookies = allCookies.filter(c => c.name.startsWith('sb-auth'))
    console.log('Auth cookies found:', authCookies.length)
    
    // Try to get user
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    return NextResponse.json({
      authenticated: !!user,
      user: user ? { id: user.id, email: user.email } : null,
      error: error?.message || null,
      cookieInfo: {
        totalCookies: allCookies.length,
        authCookiesFound: authCookies.length,
        cookieNames: allCookies.map(c => c.name)
      }
    })
  } catch (error) {
    console.error('Test auth error:', error)
    return NextResponse.json({ 
      error: 'Failed to check auth',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}