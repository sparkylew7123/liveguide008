import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // Test OAuth provider configuration
    let oauthTest = null;
    try {
      // This will help us see if the OAuth provider is configured
      const testUrl = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
        }
      });
      oauthTest = {
        success: true,
        hasUrl: !!testUrl.data?.url,
        urlPreview: testUrl.data?.url ? testUrl.data.url.substring(0, 100) + '...' : null,
        error: testUrl.error?.message || null
      };
    } catch (oauthError) {
      oauthTest = {
        success: false,
        error: oauthError instanceof Error ? oauthError.message : 'OAuth test failed'
      };
    }
    
    return NextResponse.json({
      authenticated: !!user,
      user: user ? { id: user.id, email: user.email } : null,
      error: error?.message || null,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      oauthTest,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check auth',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}