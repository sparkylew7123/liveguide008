import { NextRequest, NextResponse } from 'next/server';

function getClientIP(request: NextRequest): string {
  // Check various headers for client IP (considering CDN/proxy scenarios)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  // Prioritize Cloudflare's CF-Connecting-IP, then X-Forwarded-For, then X-Real-IP
  if (cfConnectingIP) return cfConnectingIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  
  // Fallback to request IP
  return request.ip || '127.0.0.1';
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ 
        error: 'CAPTCHA token is required',
        code: 'missing-input-response'
      }, { status: 400 });
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    
    // Debug logging
    console.log('TURNSTILE_SECRET_KEY check:', {
      exists: !!secretKey,
      length: secretKey?.length || 0,
      prefix: secretKey?.substring(0, 10) || 'not-set'
    });
    
    if (!secretKey) {
      console.error('TURNSTILE_SECRET_KEY environment variable is not set');
      return NextResponse.json({ 
        error: 'Server configuration error',
        code: 'missing-input-secret'
      }, { status: 500 });
    }

    // Get client IP address
    const clientIP = getClientIP(request);
    
    // Prepare form data matching Cloudflare demo implementation
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    formData.append('remoteip', clientIP);

    // Verify the CAPTCHA token with Cloudflare
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    // Enhanced logging for debugging
    console.log('Turnstile verification:', {
      success: data.success,
      clientIP,
      errorCodes: data['error-codes'] || [],
      timestamp: new Date().toISOString(),
      challenge_ts: data.challenge_ts,
      hostname: data.hostname
    });

    if (data.success) {
      return NextResponse.json({ 
        success: true,
        challengeTs: data.challenge_ts,
        hostname: data.hostname
      });
    } else {
      const errorCodes = data['error-codes'] || [];
      const errorMessages = {
        'missing-input-secret': 'The secret parameter is missing',
        'invalid-input-secret': 'The secret parameter is invalid or malformed',
        'missing-input-response': 'The response parameter is missing',
        'invalid-input-response': 'The response parameter is invalid or malformed',
        'bad-request': 'The request is invalid or malformed',
        'timeout-or-duplicate': 'The response is no longer valid',
      };

      const specificError = errorCodes.length > 0 
        ? errorMessages[errorCodes[0]] || 'CAPTCHA verification failed'
        : 'CAPTCHA verification failed';

      return NextResponse.json({ 
        error: specificError,
        code: errorCodes[0] || 'verification-failed',
        details: errorCodes
      }, { status: 400 });
    }
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'internal-error'
    }, { status: 500 });
  }
}