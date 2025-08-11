'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      // First, ensure we're on localhost, not 127.0.0.1
      if (window.location.hostname === '127.0.0.1') {
        const newUrl = window.location.href.replace('127.0.0.1', 'localhost')
        window.location.href = newUrl
        return
      }
      
      const supabase = createClient()
      
      // Get error from URL if present
      const params = new URLSearchParams(window.location.search)
      const error = params.get('error')
      const errorDescription = params.get('error_description')
      
      if (error) {
        console.error('OAuth error:', { error, errorDescription })
        router.push(`/login?error=${encodeURIComponent(errorDescription || error)}`)
        return
      }
      
      try {
        // Let Supabase handle the callback automatically
        // The client is configured with detectSessionInUrl: true
        // which will automatically exchange the code for a session
        
        // Wait a moment for Supabase to process the callback
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          router.push(`/login?error=${encodeURIComponent(sessionError.message)}`)
          return
        }
        
        if (session) {
          // Successfully authenticated, redirect to lobby or requested page
          const next = params.get('next') || '/lobby'
          console.log('Successfully authenticated, redirecting to:', next)
          
          // Ensure we redirect to localhost, not 127.0.0.1
          if (window.location.hostname === '127.0.0.1') {
            window.location.href = `http://localhost:3000${next}`
          } else {
            router.push(next)
          }
        } else {
          // No session found, redirect to login
          router.push('/login?error=Failed to establish session')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push(`/login?error=${encodeURIComponent(error?.message || 'Authentication failed')}`)
      }
    }
    
    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white mb-4">Completing sign in...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
      </div>
    </div>
  )
}