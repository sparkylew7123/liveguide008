import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  // Look for Supabase auth cookies
  const authCookies = allCookies.filter(cookie => 
    cookie.name.includes('supabase') || 
    cookie.name.includes('auth-token')
  )
  
  return NextResponse.json({
    totalCookies: allCookies.length,
    authCookies: authCookies.map(c => ({
      name: c.name,
      hasValue: !!c.value,
      valueLength: c.value?.length || 0
    })),
    allCookieNames: allCookies.map(c => c.name)
  })
}