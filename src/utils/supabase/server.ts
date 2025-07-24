import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name)
          // Handle both chunked and non-chunked cookies
          if (name === 'sb-auth-token') {
            // Try to get chunked cookies
            const chunks: string[] = []
            let chunkIndex = 0
            
            while (true) {
              const chunk = cookieStore.get(`sb-auth-token.${chunkIndex}`)
              if (!chunk) break
              chunks.push(chunk.value)
              chunkIndex++
            }
            
            if (chunks.length > 0) {
              return chunks.join('')
            }
          }
          
          // Also check for legacy cookie names
          if (!cookie && name === 'sb-auth-token') {
            // Try various cookie patterns
            const patterns = [
              'sb-liveguide-auth-token',
              `sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}-auth-token`,
              'sb-auth-token.0',
              'sb-auth.0'
            ]
            
            for (const pattern of patterns) {
              const altCookie = cookieStore.get(pattern)
              if (altCookie?.value) {
                return altCookie.value
              }
            }
          }
          
          return cookie?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            const baseOptions = {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax' as const,
              path: '/'
            }
            
            // Handle chunked cookies for large tokens
            if (value && value.length > 3180) {
              const chunkSize = 3180
              const chunks = Math.ceil(value.length / chunkSize)
              
              for (let i = 0; i < chunks; i++) {
                const chunkValue = value.slice(i * chunkSize, (i + 1) * chunkSize)
                cookieStore.set({ 
                  name: `${name}.${i}`, 
                  value: chunkValue, 
                  ...baseOptions 
                })
              }
            } else {
              cookieStore.set({ name, value, ...baseOptions })
            }
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            const baseOptions = {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax' as const,
              path: '/'
            }
            
            // Remove all possible cookie variations
            cookieStore.set({ name, value: '', ...baseOptions, maxAge: 0 })
            
            // Also remove chunked versions
            for (let i = 0; i < 10; i++) {
              try {
                cookieStore.set({ 
                  name: `${name}.${i}`, 
                  value: '', 
                  ...baseOptions, 
                  maxAge: 0 
                })
              } catch {
                break
              }
            }
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}