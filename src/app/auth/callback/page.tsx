'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()
      
      // Get the code from the URL
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const error = params.get('error')
      const errorDescription = params.get('error_description')
      
      if (error) {
        console.error('OAuth error:', { error, errorDescription })
        router.push(`/login?error=${encodeURIComponent(errorDescription || error)}`)
        return
      }
      
      if (code) {
        // Exchange code for session
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        
        if (exchangeError) {
          console.error('Code exchange error:', exchangeError)
          router.push(`/login?error=${encodeURIComponent(exchangeError.message)}`)
          return
        }
        
        // Check if we have a session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // Successfully authenticated, redirect to agents or requested page
          const next = params.get('next') || '/agents'
          router.push(next)
        } else {
          router.push('/login?error=Failed to establish session')
        }
      } else {
        router.push('/login?error=No authorization code received')
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