import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name)
          // Handle chunked cookies
          if (!cookie && name === 'sb-auth-token') {
            const chunks: string[] = []
            let i = 0
            while (true) {
              const chunk = request.cookies.get(`sb-auth-token.${i}`)
              if (!chunk) break
              chunks.push(chunk.value)
              i++
            }
            if (chunks.length > 0) {
              return chunks.join('')
            }
          }
          return cookie?.value
        },
        set(name: string, value: string, options: any) {
          // Handle chunked cookies for large values
          if (value && value.length > 3180) {
            const chunkSize = 3180
            const chunks = Math.ceil(value.length / chunkSize)
            
            for (let i = 0; i < chunks; i++) {
              const chunkValue = value.slice(i * chunkSize, (i + 1) * chunkSize)
              request.cookies.set({
                name: `${name}.${i}`,
                value: chunkValue,
                ...options,
              })
              response.cookies.set({
                name: `${name}.${i}`,
                value: chunkValue,
                ...options,
              })
            }
          } else {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          }
        },
        remove(name: string, options: any) {
          // Remove all possible cookie variations
          request.cookies.delete(name)
          response.cookies.delete(name)
          
          // Also remove chunked versions
          for (let i = 0; i < 10; i++) {
            const chunkName = `${name}.${i}`
            if (request.cookies.has(chunkName)) {
              request.cookies.delete(chunkName)
              response.cookies.delete(chunkName)
            }
          }
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
        cookies: request.cookies.getAll().filter(c => c.name.startsWith('sb-')).map(c => c.name)
      })
    }
  } catch (error) {
    console.error('Middleware auth error:', error)
  }

  return response
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