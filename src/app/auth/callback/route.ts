import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/agents'

  if (code) {
    const cookieStore = await cookies()
    const supabase = await createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successfully authenticated
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      // Auth error occurred
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  // No code provided, likely an error from the provider
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  
  console.error('OAuth error:', { error, errorDescription })
  
  // Redirect to login with error
  return NextResponse.redirect(
    `${origin}/login?error=${error || 'unknown_error'}&error_description=${errorDescription || 'Authentication failed'}`
  )
}