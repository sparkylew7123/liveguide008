import { NextResponse } from 'next/server';

export async function GET() {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!agentId || !apiKey) {
    return NextResponse.json({ error: 'Missing ElevenLabs configuration' }, { status: 500 });
  }
  
  try {
    // Create a signed URL using the ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      return NextResponse.json({ error: 'Failed to get signed URL' }, { status: 500 });
    }
    
    const data = await response.json();
    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return NextResponse.json({ error: 'Failed to get signed URL' }, { status: 500 });
  }
}