import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Log all headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Get the raw body for signature verification
    const body = await request.text();
    
    // Log webhook details
    console.log('🔍 WEBHOOK HEADERS RECEIVED:');
    console.log('================================');
    Object.entries(headers).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    console.log('================================');
    console.log('BODY:', body.substring(0, 500) + (body.length > 500 ? '...' : ''));
    console.log('================================');
    
    // Check for ElevenLabs signature
    const signature = headers['elevenlabs-signature'] || headers['x-elevenlabs-signature'];
    if (signature) {
      console.log('✅ ElevenLabs signature found:', signature);
    } else {
      console.log('⚠️ No ElevenLabs signature header found');
    }
    
    // Parse body if JSON
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      parsedBody = { raw: body };
    }
    
    // Return detailed response
    return NextResponse.json({
      success: true,
      headers: headers,
      hasSignature: !!signature,
      bodyPreview: body.substring(0, 200),
      parsedBody: parsedBody
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'This endpoint logs webhook headers. Send a POST request to test.',
    expectedHeaders: {
      'elevenlabs-signature': 'HMAC signature for authentication',
      'content-type': 'application/json',
      'user-agent': 'ElevenLabs webhook sender'
    }
  });
}