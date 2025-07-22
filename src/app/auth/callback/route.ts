import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const redirectTo = requestUrl.searchParams.get('redirect_to')?.toString()

  if (code) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        // Redirect to local URL in development
        return NextResponse.redirect(`${origin}${redirectTo || '/dashboard'}`)
      } else if (forwardedHost) {
        // Redirect to production URL
        return NextResponse.redirect(`https://${forwardedHost}${redirectTo || '/dashboard'}`)
      } else {
        return NextResponse.redirect(`${origin}${redirectTo || '/dashboard'}`)
      }
    } else {
      // Auth error occurred
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=${error.message}`)
    }
  }

  // No code provided, likely an error from the provider
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  
  console.error('OAuth error:', { error, errorDescription })
  
  // Redirect to login with error
  return NextResponse.redirect(
    `${origin}/login?error=${error || 'unknown_error'}&error_description=${errorDescription || 'Authentication failed'}`
  )
}