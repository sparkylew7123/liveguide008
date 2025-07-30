import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  // Group cookies by prefix
  const sbCookies = allCookies.filter(c => c.name.startsWith('sb-'))
  const authCookies = allCookies.filter(c => c.name.includes('auth'))
  
  return NextResponse.json({
    totalCookies: allCookies.length,
    cookieNames: allCookies.map(c => c.name),
    cookieDetails: allCookies.map(c => ({
      name: c.name,
      valueLength: c.value?.length || 0,
      firstChars: c.value?.substring(0, 50) + (c.value?.length > 50 ? '...' : '')
    })),
    groups: {
      sbPrefixed: sbCookies.map(c => c.name),
      authRelated: authCookies.map(c => c.name)
    },
    environment: {
      projectRef: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF || 'NOT_SET',
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
  })
}