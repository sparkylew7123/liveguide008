import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Force redirect from 127.0.0.1 to localhost
  const url = request.nextUrl.clone()
  if (url.hostname === '127.0.0.1') {
    url.hostname = 'localhost'
    return NextResponse.redirect(url)
  }
  
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Add CSP headers for Plasmic Studio in development
  if (process.env.NODE_ENV === 'development') {
    supabaseResponse.headers.set(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://studio.plasmic.app https://*.plasmic.app"
    );
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    // Refresh session if expired - required for Server Components
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // Log auth state for debugging
    if (request.nextUrl.pathname.startsWith('/api/')) {
      console.log('Middleware auth check:', {
        path: request.nextUrl.pathname,
        authenticated: !!user,
        error: error?.message,
        cookies: request.cookies.getAll().map(c => ({ name: c.name, length: c.value?.length || 0 }))
      })
    }
  } catch (error) {
    console.error('Middleware auth error:', error)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}