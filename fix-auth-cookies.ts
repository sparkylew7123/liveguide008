// Auth Cookie Fix Script
// This script helps debug and fix authentication cookie issues

import { createClient } from '@supabase/supabase-js'

// Replace with your actual Supabase URL and anon key
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: {
      getItem: (key: string) => {
        if (typeof window !== 'undefined') {
          // Try to get from cookies
          const cookies = document.cookie.split(';')
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=')
            if (name === key || name.startsWith('sb-auth')) {
              console.log(`Found cookie: ${name} = ${value.substring(0, 50)}...`)
              return value
            }
          }
        }
        return null
      },
      setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined') {
          // Set cookie with proper attributes
          const expires = new Date()
          expires.setFullYear(expires.getFullYear() + 1)
          
          document.cookie = `${key}=${value}; path=/; expires=${expires.toUTCString()}; SameSite=Lax; ${window.location.protocol === 'https:' ? 'Secure;' : ''}`
          console.log(`Set cookie: ${key}`)
        }
      },
      removeItem: (key: string) => {
        if (typeof window !== 'undefined') {
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
          console.log(`Removed cookie: ${key}`)
        }
      }
    }
  }
})

export async function debugAuthState() {
  console.log('=== Auth Debug Info ===')
  
  // Check session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  console.log('Session:', session ? 'Active' : 'None')
  if (sessionError) console.error('Session error:', sessionError)
  
  // Check user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  console.log('User:', user ? `${user.email} (${user.id})` : 'None')
  if (userError) console.error('User error:', userError)
  
  // Check cookies
  if (typeof window !== 'undefined') {
    const cookies = document.cookie.split(';').map(c => c.trim())
    const authCookies = cookies.filter(c => c.startsWith('sb-'))
    console.log('Auth cookies:', authCookies.map(c => c.split('=')[0]))
  }
  
  return { session, user }
}

export async function clearAuthAndRelogin(email: string, password: string) {
  console.log('=== Clearing auth and re-logging in ===')
  
  // Sign out first
  await supabase.auth.signOut()
  
  // Clear all auth-related cookies
  if (typeof window !== 'undefined') {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name] = cookie.trim().split('=')
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      }
    }
  }
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Sign in again
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    console.error('Login error:', error)
    return { success: false, error }
  }
  
  console.log('Login successful:', data.user?.email)
  return { success: true, data }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).authDebug = {
    debugAuthState,
    clearAuthAndRelogin,
    supabase
  }
}