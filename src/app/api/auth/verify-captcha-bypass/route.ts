import { NextRequest, NextResponse } from 'next/server';

// TEMPORARY: Bypass CAPTCHA verification for testing
// Remove this file once TURNSTILE_SECRET_KEY is properly set in production

export async function POST(request: NextRequest) {
  console.warn('USING CAPTCHA BYPASS - This should only be used for testing!');
  
  // Check if we're in development or if bypass is explicitly enabled
  const bypassEnabled = process.env.NODE_ENV === 'development' || 
                       process.env.ENABLE_CAPTCHA_BYPASS === 'true';
  
  if (!bypassEnabled) {
    return NextResponse.json({ 
      error: 'CAPTCHA bypass is not enabled',
      code: 'bypass-disabled'
    }, { status: 403 });
  }
  
  // Return success for any token
  return NextResponse.json({ 
    success: true,
    challengeTs: new Date().toISOString(),
    hostname: 'liveguide.ai',
    bypassed: true
  });
}