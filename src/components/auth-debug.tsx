'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export function AuthDebug() {
  const [authState, setAuthState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    checkAuth()
  }, [])
  
  async function checkAuth() {
    const supabase = createClient()
    
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Get cookies
    const cookies = document.cookie.split(';').map(c => c.trim())
    const authCookies = cookies.filter(c => c.startsWith('sb-'))
    
    setAuthState({
      session: session ? {
        user: session.user.email,
        expires_at: new Date(session.expires_at! * 1000).toLocaleString()
      } : null,
      user: user ? {
        id: user.id,
        email: user.email
      } : null,
      cookies: authCookies.map(c => c.split('=')[0]),
      errors: {
        session: sessionError?.message,
        user: userError?.message
      }
    })
    
    setLoading(false)
  }
  
  async function refreshSession() {
    setLoading(true)
    const response = await fetch('/api/auth/refresh', { method: 'POST' })
    const data = await response.json()
    console.log('Refresh result:', data)
    await checkAuth()
  }
  
  async function testUpload() {
    const testFile = new File(['Test content'], 'test.txt', { type: 'text/plain' })
    const formData = new FormData()
    formData.append('file', testFile)
    formData.append('agentId', 'maya')
    
    const response = await fetch('/api/knowledge/upload', {
      method: 'POST',
      body: formData
    })
    
    const result = await response.json()
    console.log('Upload test result:', result)
  }
  
  if (loading) return <div>Loading auth state...</div>
  
  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold mb-2">Auth Debug Info</h3>
      <pre className="text-xs bg-white p-2 rounded overflow-auto">
        {JSON.stringify(authState, null, 2)}
      </pre>
      <div className="mt-4 space-x-2">
        <button
          onClick={checkAuth}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Refresh State
        </button>
        <button
          onClick={refreshSession}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm"
        >
          Refresh Session
        </button>
        <button
          onClick={testUpload}
          className="px-3 py-1 bg-purple-500 text-white rounded text-sm"
        >
          Test Upload
        </button>
      </div>
    </div>
  )
}